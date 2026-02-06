import { v } from "convex/values";
import {
  action,
  internalMutation,
  query,
  mutation,
} from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { embed, generateText, streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Doc } from "./_generated/dataModel.js";

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
    const botConfig = await ctx.db
      .query("botProfiles")
      .filter((q) => q.eq(q.field("_id"), args.botId))
      .first();
    return botConfig;
  },
});

/**
 * Query: Fetch conversation history for streaming
 * Used by: Next.js /api/chat/stream route
 * Returns: Array of message objects
 */
export const getConversationHistoryForStream = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
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
    const integration = args.integration || "streaming";

    // Save message to database
    const msgId = await ctx.db.insert("messages", {
      user_id: undefined,
      conversation_id: args.conversationId,
      role: "bot",
      content: args.botResponse,
      created_at: Date.now(),
    });

    // Log metrics with streaming-specific fields
    const logId = await ctx.db.insert("aiLogs", {
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
    const botConfig = await ctx.runQuery(api.configuration.getBotConfig, {});

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
    const allMessages = await ctx.runQuery(
      api.playground.getPlaygroundMessages,
      {
        sessionId: conversationId,
      },
    );

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
    const trimmedUserMessage = userMessage.trim();

    if (trimmedUserMessage.length > 5) {
      try {
        const embeddingApiKey =
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GOOGLE_API_KEY ||
          (botConfig.model_provider === "Google AI"
            ? botConfig.api_key
            : undefined);

        if (!embeddingApiKey) {
          console.warn(
            "[generateBotResponse] Skipping RAG: Google API key not configured for embeddings.",
          );
        } else {
          const google = createGoogleGenerativeAI({ apiKey: embeddingApiKey });
          const embeddingModel = google.embeddingModel("text-embedding-004");

          const { embedding } = await embed({
            model: embeddingModel,
            value: trimmedUserMessage,
          });

          const nearest = await ctx.vectorSearch("documents", "by_embedding", {
            vector: embedding,
            limit: 4,
            filter: (q) => q.eq("botId", botId),
          });

          knowledgeChunksCount = nearest.length;

          if (nearest.length > 0) {
            const docs = await ctx.runQuery(
              internal.knowledge.getDocumentsByIds,
              {
                ids: nearest.map((match) => match._id),
              },
            );

            const chunks = docs
              .map((doc: any) => doc?.text)
              .filter((text: any): text is string => Boolean(text));

            if (chunks.length > 0) {
              contextBlock = chunks.join("\n\n");
              console.log(
                `[generateBotResponse] ✓ Retrieved ${chunks.length} knowledge chunks for context`,
              );
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[generateBotResponse] RAG retrieval failed (continuing without context): ${errorMessage}`,
        );
      }
    } else {
      console.log(
        "[generateBotResponse] Skipping RAG: user message too short for vector search.",
      );
    }

    // ===== STEP 4: Select and Configure AI Model =====
    console.log(
      `[generateBotResponse] STEP 4: Initializing AI model (${botConfig.model_provider}/${botConfig.model_id})...`,
    );
    let model;

    try {
      switch (botConfig.model_provider) {
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

        default: {
          const error = `Unsupported model provider: ${botConfig.model_provider}`;
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

      console.log(
        `[generateBotResponse]   System prompt: "${systemPrompt.substring(0, 60)}${systemPrompt.length > 60 ? "..." : ""}"`,
      );
      console.log(
        `[generateBotResponse]   Temperature: ${botConfig.temperature ?? 0.7}`,
      );
      console.log("[generateBotResponse]   Calling generateText()...");

      const result = await generateText({
        model,
        system: systemPrompt,
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
