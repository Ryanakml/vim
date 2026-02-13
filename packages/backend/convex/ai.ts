import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { generateText, streamText } from "ai";
import type { Doc } from "./_generated/dataModel.js";
import { normalizeModelProvider } from "./modelproviders.js";
import { retrieveRagContext } from "./rag.js";

type EscalationConfig = {
  enabled?: boolean;
  whatsapp?: string | null;
  email?: string | null;
};

function buildEscalationPrompt(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  // ✅ FIX: Allow escalation if at least ONE contact method is provided
  if (!whatsappDigits && !email) {
    return null;
  }

  const contactLinks: string[] = [];
  if (whatsappDigits) {
    const whatsappLink = `https://wa.me/${whatsappDigits}`;
    contactLinks.push(`[Chat WhatsApp](${whatsappLink})`);
  }
  if (email) {
    const emailLink = `mailto:${email}`;
    contactLinks.push(`[Email Us](${emailLink})`);
  }

  return [
    "Escalation Protocol:",
    "- When users ask about purchasing, pricing, contact information, speaking to sales, or need human assistance, you MUST include the contact section below.",
    "- If you cannot answer from the Knowledge Base, you MUST provide the contact information.",
    "- Do NOT make up contact information - ONLY use the links provided below.",
    "- Do not add any other contact links anywhere in the response.",
    "",
    "### Contact Us",
    ...contactLinks,
  ].join("\n");
}

/**
 * Log AI Response Metrics to Database
 *
 * Stores comprehensive information about each AI response for analytics and debugging.
 * Enables overview dashboard to display performance metrics.
 */
export const logAIResponse = internalMutation({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    botResponse: v.string(),
    model: v.string(),
    provider: v.string(),
    temperature: v.number(),
    executionTimeMs: v.number(),
    knowledgeChunksRetrieved: v.number(),
    contextUsed: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    integration: v.string(),
  },
  handler: async (ctx, args) => {
    const logId = await ctx.db.insert("aiLogs", {
      ...args,
      createdAt: Date.now(),
    });
    console.log("[logAIResponse] ✓ Logged AI response with ID:", logId);
    return logId;
  },
});

/**
 * Internal Mutation: Save Bot Message
 *
 * Safely inserts bot response into messages table without auth checks.
 * Used by: generateBotResponse action for "widget" and unknown integrations
 * Parameters: conversationId, botResponse
 *
 * Why internal mutation?
 * - Public actions can't directly access ctx.db
 * - This bypasses auth checks (safe because it's server-side only)
 * - Simplest way to save messages for public widget
 */
export const saveBotMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    botResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const msgId = await ctx.db.insert("messages", {
      conversation_id: args.conversationId,
      role: "bot",
      content: args.botResponse,
      created_at: Date.now(),
      // No user_id for public widget (visitor-based)
    });

    console.log(
      `[saveBotMessage] ✓ Saved bot message - conversationId: ${args.conversationId}, msgId: ${msgId}`,
    );
    return msgId;
  },
});

/**
 * Internal Query: Load conversation messages without auth checks
 *
 * Used by: generateBotResponse for non-authenticated integrations (e.g., widget)
 * Security: Only called server-side after session validation in public actions
 */
export const getConversationMessages = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversation_id", args.conversationId),
      )
      .collect();
  },
});

// ===== NEW: STREAMING HELPERS =====

/**
 * Query: Fetch bot configuration for streaming
 * Used by: Next.js /api/chat/stream route
 * Returns: Model, provider, API key, system prompt, temperature
 */
export const getBotConfigForStream = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const orgId = (identity.org_id as string | undefined) || undefined;

    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile) return null;

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;

    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    // Return only what the streaming route needs (avoid leaking full profile)
    return {
      id: botProfile._id,
      model_provider: botProfile.model_provider || null,
      model_id: botProfile.model_id || null,
      api_key: botProfile.api_key || null,
      system_prompt: botProfile.system_prompt || null,
      temperature: botProfile.temperature ?? null,
      max_tokens: botProfile.max_tokens ?? null,
      escalation: {
        enabled: botProfile.escalation?.enabled ?? false,
        whatsapp: botProfile.escalation?.whatsapp ?? "",
        email: botProfile.escalation?.email ?? "",
      },
    };
  },
});

/**
 * Query: Fetch conversation history for streaming
 * Used by: Next.js /api/chat/stream route
 * Returns: Array of message objects
 */
export const getConversationHistoryForStream = query({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const orgId = (identity.org_id as string | undefined) || undefined;

    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile) {
      throw new Error("Bot not found");
    }

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;

    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.bot_id !== args.botId) {
      throw new Error("Unauthorized: Conversation does not belong to bot");
    }

    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversation_id"), args.conversationId))
      .collect();
    return messages;
  },
});

/**
 * Mutation: Save streamed response after completion
 * Called by: Next.js /api/chat/stream after stream finishes
 * Parameters: botId, conversationId, full response text, metrics
 */
export const saveStreamedResponse = mutation({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    botResponse: v.string(),
    model: v.string(),
    provider: v.string(),
    executionTimeMs: v.number(),
    knowledgeChunksRetrieved: v.number(),
    streamingEnabled: v.boolean(),
    firstTokenTime: v.optional(v.number()),
    integration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const orgId = (identity.org_id as string | undefined) || undefined;

    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile) {
      throw new Error("Bot not found");
    }

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;

    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.bot_id !== args.botId) {
      throw new Error("Unauthorized: Conversation does not belong to bot");
    }

    const integration = args.integration || "streaming";

    // Save message to database
    const msgId = await ctx.db.insert("messages", {
      user_id: userId,
      conversation_id: args.conversationId,
      role: "bot",
      content: args.botResponse,
      created_at: Date.now(),
    });

    // Log metrics with streaming-specific fields
    const logId = await ctx.db.insert("aiLogs", {
      user_id: userId,
      botId: args.botId,
      conversationId: args.conversationId,
      userMessage: args.userMessage,
      botResponse: args.botResponse,
      model: args.model,
      provider: args.provider,
      temperature: 0.7,
      executionTimeMs: args.executionTimeMs,
      knowledgeChunksRetrieved: args.knowledgeChunksRetrieved,
      contextUsed: "",
      success: true,
      integration,
      createdAt: Date.now(),
    });

    console.log(
      `[saveStreamedResponse] ✓ Saved streamed response - msgId: ${msgId}, logId: ${logId}`,
    );
    return { msgId, logId };
  },
});

// ===== STREAMING (PUBLIC WIDGET) =====

export const createStreamingBotMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const msgId = await ctx.db.insert("messages", {
      conversation_id: args.conversationId,
      role: "bot",
      content: "",
      created_at: Date.now(),
    });
    return msgId;
  },
});

export const updateStreamingBotMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
    });
    return { success: true };
  },
});

/**
 * Query: Retrieve RAG context for dashboard streaming route
 * Used by: apps/web/app/api/chat/stream/route.ts
 */
export const getRagContextForStream = query({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const orgId = (identity.org_id as string | undefined) || undefined;

    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile) {
      throw new Error("Bot not found");
    }

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;
    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if ((conversation as any).bot_id !== args.botId) {
      throw new Error("Unauthorized: Conversation does not belong to bot");
    }

    const botConfig = {
      model_provider: botProfile.model_provider || null,
      api_key: botProfile.api_key || null,
    };

    try {
      const { contextBlock, knowledgeChunksCount } = await retrieveRagContext({
        ctx,
        botId: args.botId,
        conversationId: args.conversationId,
        userMessage: args.userMessage,
        botConfig,
        userIdForLogging: userId,
      });

      return { contextBlock, knowledgeChunksCount };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `[getRagContextForStream] RAG retrieval failed (continuing without context): ${errorMessage}`,
      );
      return { contextBlock: "", knowledgeChunksCount: 0 };
    }
  },
});

/**
 * Unified AI Response Generator
 *
 * This is the single source of truth for generating bot responses.
 * Used by: WebChat Widget, Bot Emulator, Playground, future API endpoints
 *
 * Flow:
 * 1. Load bot configuration (model, API key, system prompt, parameters)
 * 2. Load conversation history (messages)
 * 3. Call AI SDK with proper configuration
 * 4. Save bot response to database
 * 5. Log metrics to analytics table
 * 6. Return response to frontend
 */
export const generateBotResponse = action({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    integration: v.optional(v.string()), // "playground", "emulator", or other - defaults to "playground"
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    content?: string;
    model?: string;
    provider?: string;
    error?: string;
  }> => {
    const {
      botId,
      conversationId,
      userMessage,
      integration = "playground",
    } = args;

    const startTime = Date.now();
    let knowledgeChunksCount = 0;

    console.log(
      `[generateBotResponse] Starting - botId: ${botId}, conversationId: ${conversationId}, integration: ${integration}, userMessage: ${userMessage.substring(0, 50)}...`,
    );

    // ===== STEP 1: Load Configuration =====
    console.log("[generateBotResponse] STEP 1: Loading bot configuration...");
    const botConfig = await ctx.runQuery(
      internal.configuration.getBotConfigByBotId,
      { botId },
    );

    if (!botConfig) {
      const error = "Bot configuration not found";
      console.error(`[generateBotResponse] ERROR STEP 1: ${error}`);
      return { success: false, error };
    }

    console.log(
      `[generateBotResponse] ✓ Configuration loaded - provider: ${botConfig.model_provider}, model: ${botConfig.model_id}`,
    );

    // Validate required fields
    if (!botConfig.model_provider || !botConfig.model_id) {
      const error =
        "Model provider and model ID must be configured before generating responses";
      console.error(
        `[generateBotResponse] ERROR STEP 1 (validation): ${error} - provider: ${botConfig.model_provider}, model: ${botConfig.model_id}`,
      );
      return { success: false, error };
    }

    if (!botConfig.api_key) {
      const error = `API key is not configured for ${botConfig.model_provider}`;
      console.error(`[generateBotResponse] ERROR STEP 1 (api_key): ${error}`);
      return { success: false, error };
    }

    // ===== STEP 2: Get Conversation History =====
    console.log(
      `[generateBotResponse] STEP 2: Loading conversation history for conversationId: ${conversationId}...`,
    );
    let allMessages: Doc<"messages">[] = [];
    if (integration === "playground") {
      allMessages = await ctx.runQuery(api.playground.getPlaygroundMessages, {
        sessionId: conversationId,
      });
    } else if (integration === "emulator") {
      allMessages = await ctx.runQuery(api.playground.getEmulatorMessages, {
        sessionId: conversationId,
      });
    } else {
      allMessages = await ctx.runQuery(internal.ai.getConversationMessages, {
        conversationId,
      });
    }

    console.log(
      `[generateBotResponse] ✓ Found ${allMessages?.length || 0} messages in conversation history`,
    );

    // Prepare message history for AI SDK - FIX: Convert "bot" role to "assistant"
    console.log("[generateBotResponse] STEP 2: Preparing message history...");
    const messageHistory = (allMessages || []).map((msg: Doc<"messages">) => {
      // Convert "bot" role to "assistant" for AI SDK compatibility
      const role =
        msg.role === "bot" ? "assistant" : (msg.role as "user" | "assistant");
      console.log(
        `[generateBotResponse]   Message: role="${msg.role}" (converted to "${role}"), content length=${msg.content.length}`,
      );
      return {
        role: role,
        content: msg.content,
      };
    });

    console.log(
      `[generateBotResponse] ✓ Message history prepared with ${messageHistory.length} messages`,
    );

    // ===== STEP 3: Retrieve Knowledge Base Context (RAG) =====
    console.log(
      "[generateBotResponse] STEP 3: Retrieving knowledge context...",
    );
    let contextBlock = "";
    try {
      const identity = await ctx.auth.getUserIdentity();
      const { contextBlock: retrievedContext, knowledgeChunksCount: count } =
        await retrieveRagContext({
          ctx,
          botId,
          conversationId,
          userMessage,
          botConfig,
          userIdForLogging: identity?.subject,
        });

      contextBlock = retrievedContext;
      knowledgeChunksCount = count;

      if (knowledgeChunksCount > 0) {
        console.log(
          `[generateBotResponse] ✓ Retrieved ${knowledgeChunksCount} knowledge chunks for context`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `[generateBotResponse] RAG retrieval failed (continuing without context): ${errorMessage}`,
      );
    }

    // ===== STEP 4: Select and Configure AI Model =====
    console.log(
      `[generateBotResponse] STEP 4: Initializing AI model (${botConfig.model_provider}/${botConfig.model_id})...`,
    );
    let model;

    const provider = normalizeModelProvider(botConfig.model_provider);
    if (!provider) {
      const error = `Unsupported model provider: ${botConfig.model_provider}`;
      console.error(`[generateBotResponse] ERROR STEP 4: ${error}`);
      return { success: false, error };
    }

    try {
      switch (provider) {
        case "Groq": {
          console.log("[generateBotResponse]   Importing Groq provider...");
          const { createGroq } = await import("@ai-sdk/groq");
          console.log(
            "[generateBotResponse]   Creating Groq instance with API key...",
          );
          const groqProvider = createGroq({ apiKey: botConfig.api_key });
          console.log(
            "[generateBotResponse]   Creating model reference for: " +
              botConfig.model_id,
          );
          model = groqProvider(botConfig.model_id);
          console.log("[generateBotResponse] ✓ Groq model initialized");
          break;
        }

        case "OpenAI": {
          console.log("[generateBotResponse]   Importing OpenAI provider...");
          const { createOpenAI } = await import("@ai-sdk/openai");
          console.log(
            "[generateBotResponse]   Creating OpenAI instance with API key...",
          );
          const openaiProvider = createOpenAI({ apiKey: botConfig.api_key });
          console.log(
            "[generateBotResponse]   Creating model reference for: " +
              botConfig.model_id,
          );
          model = openaiProvider(botConfig.model_id);
          console.log("[generateBotResponse] ✓ OpenAI model initialized");
          break;
        }

        case "Google AI": {
          console.log(
            "[generateBotResponse]   Importing Google Generative AI provider...",
          );
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          const googleProvider = createGoogleGenerativeAI({
            apiKey: botConfig.api_key,
          });
          model = googleProvider(botConfig.model_id);
          console.log("[generateBotResponse] ✓ Google AI model initialized");
          break;
        }

        case "Anthropic": {
          console.log(
            "[generateBotResponse]   Importing Anthropic provider...",
          );
          const { createAnthropic } = await import("@ai-sdk/anthropic");
          const anthropicProvider = createAnthropic({
            apiKey: botConfig.api_key,
          });
          model = anthropicProvider(botConfig.model_id);
          console.log("[generateBotResponse] ✓ Anthropic model initialized");
          break;
        }

        default: {
          const error = `Unsupported model provider: ${provider}`;
          console.error(`[generateBotResponse] ERROR STEP 4: ${error}`);
          return { success: false, error };
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[generateBotResponse] ERROR STEP 4 (model init): ${errorMessage}`,
      );
      console.error(
        "[generateBotResponse] Full error:",
        error instanceof Error ? error.stack : error,
      );
      return {
        success: false,
        error: `Failed to initialize AI model: ${errorMessage}. Please check your API key and model configuration.`,
      };
    }

    // ===== STEP 5: Call AI SDK =====
    console.log(
      "[generateBotResponse] STEP 5: Preparing generateText parameters...",
    );
    let botResponseText = "";

    try {
      const messagesForAI = [
        ...messageHistory,
        {
          role: "user" as const,
          content: userMessage,
        },
      ];

      console.log(
        "[generateBotResponse]   Messages array structure:",
        messagesForAI.map((m) => ({
          role: m.role,
          contentLength: m.content.length,
        })),
      );
      const baseSystemPrompt =
        botConfig.system_prompt || "You are a helpful assistant.";
      const systemPrompt = contextBlock
        ? `${baseSystemPrompt}\n\nRelevant Knowledge Base Information:\n-----------------------------------\n${contextBlock}\n-----------------------------------\nUse the information above to answer the user's question if relevant.`
        : baseSystemPrompt;
      const escalationPrompt = buildEscalationPrompt(botConfig.escalation);
      const finalSystemPrompt = escalationPrompt
        ? `${systemPrompt}\n\n${escalationPrompt}`
        : systemPrompt;

      console.log(
        `[generateBotResponse]   System prompt: "${finalSystemPrompt.substring(0, 60)}${finalSystemPrompt.length > 60 ? "..." : ""}"`,
      );
      console.log(
        `[generateBotResponse]   Temperature: ${botConfig.temperature ?? 0.7}`,
      );
      console.log("[generateBotResponse]   Calling generateText()...");

      const result = await generateText({
        model,
        system: finalSystemPrompt,
        messages: messagesForAI,
        temperature: botConfig.temperature ?? 0.7,
      });

      botResponseText = result.text;
      console.log(
        `[generateBotResponse] ✓ AI response generated successfully (${botResponseText.length} chars)`,
      );
    } catch (error) {
      // AI SDK error (API key invalid, rate limit, etc.)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[generateBotResponse] ERROR STEP 5 (AI generation):");
      console.error(`[generateBotResponse]   Error message: ${errorMessage}`);
      console.error(
        "[generateBotResponse]   Full error:",
        error instanceof Error ? error.stack : error,
      );

      // Log error to analytics
      const executionTimeMs = Date.now() - startTime;
      try {
        await ctx.runMutation(internal.ai.logAIResponse, {
          botId,
          conversationId,
          userMessage,
          botResponse: "",
          model: botConfig.model_id,
          provider: botConfig.model_provider,
          temperature: botConfig.temperature ?? 0.7,
          executionTimeMs,
          knowledgeChunksRetrieved: knowledgeChunksCount,
          contextUsed: contextBlock,
          success: false,
          errorMessage: errorMessage,
          integration,
        });
      } catch (logError) {
        console.warn("[generateBotResponse] Failed to log error metrics");
      }

      // Return friendly error message to user
      botResponseText = `I encountered an error generating a response: ${errorMessage}. Please check your API key and model configuration.`;
    }

    // ===== STEP 6: Save Bot Response to Database =====
    console.log(
      "[generateBotResponse] STEP 6: Saving bot response to database...",
    );
    try {
      // Route message saving based on integration type
      if (integration === "emulator") {
        console.log(
          "[generateBotResponse]   Using emulator session save function...",
        );
        await ctx.runMutation(api.playground.addEmulatorMessage, {
          botId,
          role: "bot",
          content: botResponseText,
        });
      } else if (integration === "playground") {
        console.log(
          "[generateBotResponse]   Using playground session save function...",
        );
        await ctx.runMutation(api.playground.addPlaygroundMessage, {
          botId,
          role: "bot",
          content: botResponseText,
        });
      } else if (integration === "widget") {
        // Widget integration: Use internal mutation (no admin auth required)
        console.log(
          "[generateBotResponse]   Using internal message save for widget...",
        );
        await ctx.runMutation(internal.ai.saveBotMessage, {
          conversationId,
          botResponse: botResponseText,
        });
      } else {
        // Fallback for unknown integration types
        console.log(
          "[generateBotResponse]   Using default internal message save...",
        );
        await ctx.runMutation(internal.ai.saveBotMessage, {
          conversationId,
          botResponse: botResponseText,
        });
      }
      console.log("[generateBotResponse] ✓ Bot response saved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[generateBotResponse] ERROR STEP 6 (save): ${errorMessage}`,
      );
      console.error(
        "[generateBotResponse] Full error:",
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }

    // ===== STEP 7: Log Metrics to Database =====
    console.log(
      "[generateBotResponse] STEP 7: Logging metrics to analytics database...",
    );
    const executionTimeMs = Date.now() - startTime;
    try {
      await ctx.runMutation(internal.ai.logAIResponse, {
        botId,
        conversationId,
        userMessage,
        botResponse: botResponseText,
        model: botConfig.model_id,
        provider: botConfig.model_provider,
        temperature: botConfig.temperature ?? 0.7,
        executionTimeMs,
        knowledgeChunksRetrieved: knowledgeChunksCount,
        contextUsed: contextBlock,
        success: true,
        integration,
      });
      console.log(
        `[generateBotResponse] ✓ Metrics logged (${executionTimeMs}ms execution time)`,
      );
    } catch (logError) {
      const errorMessage =
        logError instanceof Error ? logError.message : String(logError);
      console.warn(
        `[generateBotResponse] Warning: Failed to log metrics: ${errorMessage}`,
      );
    }

    // ===== STEP 8: Return Response =====
    console.log("[generateBotResponse] STEP 8: Returning response to frontend");
    console.log(
      `[generateBotResponse] ✓ Complete - model: ${botConfig.model_id}, provider: ${botConfig.model_provider}, execution: ${executionTimeMs}ms`,
    );

    return {
      success: true,
      content: botResponseText,
      model: botConfig.model_id,
      provider: botConfig.model_provider,
    };
  },
});

/**
 * Streaming AI response generator for public widget.
 * Writes incremental deltas into a single bot message so the widget can "stream" via subscriptions.
 */
export const generateBotResponseStream = action({
  args: {
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    integration: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    content?: string;
    model?: string;
    provider?: string;
    error?: string;
  }> => {
    const { botId, conversationId, userMessage, integration = "widget" } = args;

    const startTime = Date.now();
    let knowledgeChunksCount = 0;

    const botConfig: any = await ctx.runQuery(
      internal.configuration.getBotConfigByBotId,
      { botId },
    );

    if (!botConfig) {
      return { success: false, error: "Bot configuration not found" };
    }

    if (!botConfig.model_provider || !botConfig.model_id) {
      return {
        success: false,
        error:
          "Model provider and model ID must be configured before generating responses",
      };
    }

    if (!botConfig.api_key) {
      return {
        success: false,
        error: `API key is not configured for ${botConfig.model_provider}`,
      };
    }

    // Load conversation history
    let allMessages: Doc<"messages">[] = [];
    if (integration === "playground") {
      allMessages = await ctx.runQuery(api.playground.getPlaygroundMessages, {
        sessionId: conversationId,
      });
    } else if (integration === "emulator") {
      allMessages = await ctx.runQuery(api.playground.getEmulatorMessages, {
        sessionId: conversationId,
      });
    } else {
      allMessages = await ctx.runQuery(internal.ai.getConversationMessages, {
        conversationId,
      });
    }

    const messageHistory = (allMessages || []).map((msg: Doc<"messages">) => ({
      role:
        msg.role === "bot" ? "assistant" : (msg.role as "user" | "assistant"),
      content: msg.content,
    }));

    // RAG
    let contextBlock = "";
    try {
      const identity = await ctx.auth.getUserIdentity();
      const { contextBlock: retrievedContext, knowledgeChunksCount: count } =
        await retrieveRagContext({
          ctx,
          botId,
          conversationId,
          userMessage,
          botConfig,
          userIdForLogging: identity?.subject,
        });
      contextBlock = retrievedContext;
      knowledgeChunksCount = count;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `[generateBotResponseStream] RAG retrieval failed (continuing without context): ${errorMessage}`,
      );
    }

    const baseSystemPrompt =
      botConfig.system_prompt || "You are a helpful assistant.";
    const systemPrompt = contextBlock
      ? `${baseSystemPrompt}\n\nRelevant Knowledge Base Information:\n-----------------------------------\n${contextBlock}\n-----------------------------------\nUse the information above to answer the user's question if relevant.`
      : baseSystemPrompt;
    const escalationPrompt = buildEscalationPrompt(botConfig.escalation);
    const finalSystemPrompt = escalationPrompt
      ? `${systemPrompt}\n\n${escalationPrompt}`
      : systemPrompt;

    // Provider/model init
    const provider = normalizeModelProvider(botConfig.model_provider);
    if (!provider) {
      return {
        success: false,
        error: `Unsupported model provider: ${botConfig.model_provider}`,
      };
    }

    let model;
    try {
      switch (provider) {
        case "Groq": {
          const { createGroq } = await import("@ai-sdk/groq");
          model = createGroq({ apiKey: botConfig.api_key })(botConfig.model_id);
          break;
        }
        case "OpenAI": {
          const { createOpenAI } = await import("@ai-sdk/openai");
          model = createOpenAI({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        case "Google AI": {
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          model = createGoogleGenerativeAI({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        case "Anthropic": {
          const { createAnthropic } = await import("@ai-sdk/anthropic");
          model = createAnthropic({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to initialize AI model: ${errorMessage}`,
      };
    }

    // Create placeholder bot message for widget streaming
    const messageId = await ctx.runMutation(
      internal.ai.createStreamingBotMessage,
      {
        conversationId,
      },
    );

    let fullResponseText = "";
    try {
      const { textStream } = await streamText({
        model,
        system: finalSystemPrompt,
        messages: [
          ...messageHistory,
          { role: "user" as const, content: userMessage },
        ],
        temperature: botConfig.temperature ?? 0.7,
      });

      for await (const delta of textStream as AsyncIterable<string>) {
        fullResponseText += delta;
        await ctx.runMutation(internal.ai.updateStreamingBotMessage, {
          messageId,
          content: fullResponseText,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const executionTimeMs = Date.now() - startTime;
      try {
        await ctx.runMutation(internal.ai.logAIResponse, {
          botId,
          conversationId,
          userMessage,
          botResponse: "",
          model: botConfig.model_id,
          provider: botConfig.model_provider,
          temperature: botConfig.temperature ?? 0.7,
          executionTimeMs,
          knowledgeChunksRetrieved: knowledgeChunksCount,
          contextUsed: contextBlock,
          success: false,
          errorMessage,
          integration,
        });
      } catch {
        // ignore
      }

      return {
        success: false,
        error: `Failed to stream response: ${errorMessage}`,
      };
    }

    // Metrics
    const executionTimeMs = Date.now() - startTime;
    try {
      await ctx.runMutation(internal.ai.logAIResponse, {
        botId,
        conversationId,
        userMessage,
        botResponse: fullResponseText,
        model: botConfig.model_id,
        provider: botConfig.model_provider,
        temperature: botConfig.temperature ?? 0.7,
        executionTimeMs,
        knowledgeChunksRetrieved: knowledgeChunksCount,
        contextUsed: contextBlock,
        success: true,
        integration,
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      content: fullResponseText,
      model: botConfig.model_id,
      provider: botConfig.model_provider,
    };
  },
});
