import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { generateText, streamText, tool, hasToolCall } from "ai";
import { z } from "zod";
import type { Doc } from "./_generated/dataModel.js";
import { normalizeModelProvider } from "./modelproviders.js";
import { retrieveRagContext } from "./rag.js";
import {
  assertCanAccessResource,
  assertIsOwner,
  getTenantContext,
  logAudit,
  redactBotProfileSecrets,
  requireBotProfile,
  toPublicBotProfile,
} from "./lib/security.js";
import {
  decryptSecretFromStorage,
  encryptSecretForStorage,
} from "./secrets.js";

type EscalationConfig = {
  enabled?: boolean;
  whatsapp?: string | null;
  email?: string | null;
};

function buildEscalationContactSection(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  if (!whatsappDigits && !email) return null;

  const contactLinks: string[] = [];
  if (whatsappDigits) {
    const whatsappLink = `https://wa.me/${whatsappDigits}`;
    contactLinks.push(`[Chat WhatsApp](${whatsappLink})`);
  }
  if (email) {
    const emailLink = `mailto:${email}`;
    contactLinks.push(`[Email Us](${emailLink})`);
  }

  return ["### Contact Us", ...contactLinks].join("\n");
}

function responseAlreadyContainsEscalation(
  responseText: string,
  escalation?: EscalationConfig,
) {
  const whatsappDigits = (escalation?.whatsapp || "").replace(/\D/g, "");
  const email = (escalation?.email || "").trim();

  const hasWhatsApp = whatsappDigits
    ? responseText.includes(`https://wa.me/${whatsappDigits}`)
    : true;
  const hasEmail = email ? responseText.includes(`mailto:${email}`) : true;
  return hasWhatsApp && hasEmail;
}

/** Regex to strip any leaked tool-name text the AI might emit. */
const TOOL_LEAK_RE = /trigger_escalation/gi;

/** Default bridge sentence when escalation fires but text is empty/short. */
const DEFAULT_BRIDGE_TEXT =
  "I can connect you with our team for further assistance.";

/** Sanitise response text: remove leaked tool name and trim whitespace. */
function sanitizeToolLeak(text: string): {
  sanitized: string;
  leaked: boolean;
} {
  if (!TOOL_LEAK_RE.test(text)) return { sanitized: text, leaked: false };
  return {
    sanitized: text
      .replace(TOOL_LEAK_RE, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    leaked: true,
  };
}

function buildEscalationPrompt(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  if (!whatsappDigits && !email) {
    return null;
  }

  return [
    "Escalation Protocol (TOOL-BASED):",
    "- PRIMARY RULE: If the Knowledge Base context contains a relevant, direct answer to the user's question, you MUST answer using it. Do not escalate in that case.",
    "- You have access to a tool called `trigger_escalation`.",
    "- When the user asks about purchasing, pricing, contact information, speaking to sales, or needs human assistance, you MUST call the `trigger_escalation` tool.",
    "- When the user expresses frustration, anger, dissatisfaction, or repeatedly fails to get a satisfactory answer, you MUST call the `trigger_escalation` tool.",
    "- If (and only if) the user asks for contact details / human support and you find contact details (phone numbers, emails, WhatsApp numbers) in the Knowledge Base context, you MUST call the `trigger_escalation` tool instead of outputting them as plain text.",
    "- You are STRICTLY FORBIDDEN from outputting phone numbers, WhatsApp numbers, or email addresses in plain text, even if they exist in the Knowledge Base. ALWAYS use the `trigger_escalation` tool instead.",
    "- DO NOT write 'trigger_escalation' as text. Just call the tool function.",
    "- DO NOT say things like 'Sistem akan memunculkan tombol' or 'tombol akan muncul'. The UI is not your responsibility.",
    "- If you are going to say you will connect the user to Admin/CS/Sales (or suggest pressing buttons), you MUST call the `trigger_escalation` tool instead of writing that as plain text.",
    "- Before calling the tool, generate a short, polite bridge sentence (e.g., 'I can connect you with our team for further assistance.').",
    "- Do NOT make up contact information.",
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

    // Optional but critical for production debugging/billing
    toolCalls: v.optional(v.array(v.any())),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const botProfile = await ctx.db.get(args.botId);

    const auditUserId = botProfile?.user_id ?? "system";
    const auditOrgId = botProfile?.organization_id;

    let auditLogged = false;
    try {
      const logId = await ctx.db.insert("aiLogs", {
        ...args,
        // Ensure dashboard queries can filter reliably by owner
        user_id: botProfile?.user_id,
        organization_id: botProfile?.organization_id,
        createdAt: Date.now(),
      });

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "log_ai_response",
        resource_type: "aiLog",
        resource_id: String(logId),
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            conversationId: args.conversationId,
            provider: args.provider,
            model: args.model,
            success: args.success,
          },
        },
      });
      auditLogged = true;

      console.log("[logAIResponse] ✓ Logged AI response with ID:", logId);
      return logId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "log_ai_response",
          resource_type: "aiLog",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

/**
 * Internal Mutation: Save Bot Message
 *
 * Safely inserts bot response into messages table without auth checks.
 * Used by: generateBotResponse action for "widget" and unknown integrations
 * Parameters: conversationId, botResponse
 *
 * W  hy internal mutation?
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
    const conversation = await ctx.db.get(args.conversationId);
    const auditUserId = conversation?.user_id ?? "system";
    const auditOrgId = (conversation as any)?.organization_id as
      | string
      | undefined;

    let auditLogged = false;
    try {
      const msgId = await ctx.db.insert("messages", {
        conversation_id: args.conversationId,
        role: "bot",
        content: args.botResponse,
        created_at: Date.now(),
        // No user_id for public widget (visitor-based)
      });

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "save_bot_message",
        resource_type: "message",
        resource_id: String(msgId),
        status: "success",
        changes: {
          before: null,
          after: {
            conversationId: args.conversationId,
            role: "bot",
          },
        },
      });
      auditLogged = true;

      console.log(
        `[saveBotMessage] ✓ Saved bot message - conversationId: ${args.conversationId}, msgId: ${msgId}`,
      );
      return msgId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "save_bot_message",
          resource_type: "message",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
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

/**
 * Internal Query: Get bot profile by ID
 * Used by: getRagContextForStream action for database access
 * Security: This is called from getRagContextForStream which performs auth checks
 */
export const getBotProfileById = internalQuery({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.botId);
  },
});

/**
 * Internal Query: Get conversation by ID
 * Used by: getRagContextForStream action for database access
 * Security: This is called from getRagContextForStream which performs auth checks
 */
export const getConversationById = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Internal Query: Resolve tenant context (userId/orgId/orgRole).
 *
 * Actions don't have direct `ctx.db`, so they can call this internal query
 * to enforce org-aware authorization using shared helpers.
 */
export const getTenantContextInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getTenantContext(ctx);
  },
});

// ===== GAP #2: SAFE BOT CONFIG SURFACES =====

/**
 * Query: Public bot profile config (NO credentials).
 *
 * AuthZ: Owner or org member (role-based via `orgMembers`).
 */
export const getBotConfigPublic = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);
    const bot = await requireBotProfile(ctx, args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    return toPublicBotProfile(bot);
  },
});

/**
 * Query: Admin bot profile config (redacted secrets).
 *
 * Intentionally DOES NOT return api_key.
 * AuthZ: Owner or org member (role-based via `orgMembers`).
 */
export const getBotConfigForAdmin = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);
    const bot = await requireBotProfile(ctx, args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    return redactBotProfileSecrets(bot);
  },
});

/**
 * Action: Fetch bot configuration for streaming (server-only, returns api_key).
 *
 * This is designed for server environments (e.g. Next.js route handlers) and
 * requires `CONVEX_SERVER_SHARED_SECRET` to be set and provided by the caller.
 */
export const getBotConfigForStream: ReturnType<typeof action> = action({
  args: {
    botId: v.id("botProfiles"),
    serverSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONVEX_SERVER_SHARED_SECRET;
    if (!expected) {
      throw new Error(
        "Server misconfigured: CONVEX_SERVER_SHARED_SECRET is not set",
      );
    }
    if (args.serverSecret !== expected) {
      throw new Error("Unauthorized: Invalid server secret");
    }

    const tenant = await ctx.runQuery(internal.ai.getTenantContextInternal, {});
    const botProfile = await ctx.runQuery(internal.ai.getBotProfileById, {
      botId: args.botId,
    });
    if (!botProfile) return null;

    assertCanAccessResource(
      botProfile,
      tenant,
      "Unauthorized: Cannot access other user's bot",
    );

    const apiKey = await decryptSecretFromStorage(botProfile.api_key || null);

    return {
      id: botProfile._id,
      model_provider: botProfile.model_provider || null,
      model_id: botProfile.model_id || null,
      api_key: apiKey,
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
 * Mutation: Rotate bot API key (owner-only).
 */
export const rotateApiKey = mutation({
  args: {
    botId: v.id("botProfiles"),
    newApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);
    const bot = await requireBotProfile(ctx, args.botId);
    try {
      assertIsOwner(bot, tenant, "Unauthorized: Not bot owner");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "rotate_api_key",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const newApiKey = args.newApiKey.trim();
    if (!newApiKey) {
      throw new Error("newApiKey is required");
    }

    const encrypted = await encryptSecretForStorage(newApiKey);

    const before = bot;
    const afterPatch = {
      api_key: encrypted,
      _encrypted_api_key: encrypted,
      updated_at: Date.now(),
    };

    let auditLogged = false;
    try {
      await ctx.db.patch(args.botId, afterPatch);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "rotate_api_key",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "success",
        changes: {
          before,
          after: { ...before, ...afterPatch },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "rotate_api_key",
          resource_type: "botProfile",
          resource_id: String(args.botId),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }

    return { success: true, id: args.botId };
  },
});

// ===== STREAMING HELPERS =====

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
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "save_streamed_response",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
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
      await logAudit(ctx, {
        user_id: userId,
        organization_id: orgId,
        action: "save_streamed_response",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "denied",
        error_message: "Unauthorized: Cannot access other user's bot",
      });
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.bot_id !== args.botId) {
      await logAudit(ctx, {
        user_id: userId,
        organization_id: orgId,
        action: "save_streamed_response",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "denied",
        error_message: "Unauthorized: Conversation does not belong to bot",
      });
      throw new Error("Unauthorized: Conversation does not belong to bot");
    }

    const integration = args.integration || "streaming";

    let auditLogged = false;
    try {
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

      await logAudit(ctx, {
        user_id: userId,
        organization_id: botProfile.organization_id ?? orgId,
        action: "save_streamed_response",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            msgId,
            aiLogId: logId,
          },
        },
      });
      auditLogged = true;

      console.log(
        `[saveStreamedResponse] ✓ Saved streamed response - msgId: ${msgId}, logId: ${logId}`,
      );
      return { msgId, logId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: userId,
          organization_id: botProfile.organization_id ?? orgId,
          action: "save_streamed_response",
          resource_type: "conversation",
          resource_id: String(args.conversationId),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

// ===== STREAMING (PUBLIC WIDGET) =====

export const createStreamingBotMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    const auditUserId = conversation?.user_id ?? "system";
    const auditOrgId = (conversation as any)?.organization_id as
      | string
      | undefined;

    let auditLogged = false;
    try {
      const msgId = await ctx.db.insert("messages", {
        conversation_id: args.conversationId,
        user_id: conversation?.user_id,
        visitor_id: conversation?.visitor_id,
        participant_id: (conversation as any)?.participant_id,
        role: "bot",
        content: "",
        created_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "create_streaming_bot_message",
        resource_type: "message",
        resource_id: String(msgId),
        status: "success",
        changes: {
          before: null,
          after: { conversationId: args.conversationId },
        },
      });
      auditLogged = true;

      return msgId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "create_streaming_bot_message",
          resource_type: "message",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

export const updateStreamingBotMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.messageId);
    const auditUserId = (before as any)?.user_id ?? "system";
    const auditOrgId = (before as any)?.organization_id as string | undefined;
    try {
      await ctx.db.patch(args.messageId, {
        content: args.content,
      });
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Intentionally do NOT log every streaming update as a success audit event.
      // Streaming updates can happen hundreds/thousands of times per message and would
      // quickly explode the auditLogs table. We only log errors here (rare) and log a
      // single completion audit entry from the streaming action.
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "update_streaming_bot_message",
        resource_type: "message",
        resource_id: String(args.messageId),
        status: "error",
        error_message: errorMessage,
      });
      throw error;
    }
  },
});

export const logStreamingBotMessageCompletion = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(v.literal("success"), v.literal("error")),
    error_message: v.optional(v.string()),
    chunks: v.optional(v.number()),
    final_length: v.optional(v.number()),
    execution_time_ms: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    const conversation = message
      ? await ctx.db.get(message.conversation_id)
      : null;

    const auditUserId =
      (conversation as any)?.user_id ?? (message as any)?.user_id ?? "system";
    const auditOrgId = (conversation as any)?.organization_id as
      | string
      | undefined;

    await logAudit(ctx, {
      user_id: auditUserId,
      organization_id: auditOrgId,
      action: "complete_streaming_bot_message",
      resource_type: "message",
      resource_id: String(args.messageId),
      status: args.status,
      error_message: args.error_message,
      changes: {
        before: null,
        after: {
          chunks: args.chunks,
          final_length: args.final_length,
          execution_time_ms: args.execution_time_ms,
        },
      },
    });

    return { success: true };
  },
});

/**
 * Action: Retrieve RAG context for dashboard streaming route
 * ✅ FIXED: Changed from query to action (was violating Convex query/action boundary)
 * Reason: retrieveRagContext calls generateEmbedding which performs network I/O via embed()
 * Queries cannot perform network I/O; only actions and mutations can
 * Note: Uses ctx.runQuery for database access since actions don't have ctx.db
 * Used by: apps/web/app/api/chat/stream/route.ts (call via convex.action instead of convex.query)
 */
export const getRagContextForStream = action({
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

    // Use ctx.runQuery for database access in actions
    const botProfile = await ctx.runQuery(internal.ai.getBotProfileById, {
      botId: args.botId,
    });

    if (!botProfile) {
      throw new Error("Bot not found");
    }

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;
    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const conversation = await ctx.runQuery(internal.ai.getConversationById, {
      conversationId: args.conversationId,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if ((conversation as any).bot_id !== args.botId) {
      throw new Error("Unauthorized: Conversation does not belong to bot");
    }

    const decryptedApiKey = await decryptSecretFromStorage(
      botProfile.api_key || null,
    );

    const botConfig = {
      model_provider: botProfile.model_provider || null,
      api_key: decryptedApiKey,
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
    let toolCallsForLog: any[] | undefined;
    let promptTokensForLog: number | undefined;
    let completionTokensForLog: number | undefined;
    let totalTokensForLog: number | undefined;

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

      // Build the trigger_escalation tool (only if escalation is enabled & configured)
      const escalationContactSection = buildEscalationContactSection(
        botConfig.escalation,
      );
      const tools = escalationContactSection
        ? {
            trigger_escalation: tool({
              description:
                "Call this tool whenever the user asks for support, sales, human contact, or expresses frustration/anger. Also use this tool if you find contact details in the Context/Knowledge Base that answer the user's request.",
              inputSchema: z.object({}),
            }),
          }
        : undefined;

      const result = await generateText({
        model,
        system: finalSystemPrompt,
        messages: messagesForAI,
        temperature: botConfig.temperature ?? 0.7,
        tools,
        stopWhen: tools ? hasToolCall("trigger_escalation") : undefined,
      });

      const usage = (result as any).usage;
      promptTokensForLog = usage?.promptTokens;
      completionTokensForLog = usage?.completionTokens;
      totalTokensForLog = usage?.totalTokens;

      toolCallsForLog = (result as any).steps
        ? ((result as any).steps as any[])
            .flatMap((step) => step?.toolCalls ?? [])
            .filter(Boolean)
        : undefined;

      botResponseText = result.text;

      // Sanitize: remove any leaked tool name from the response text
      const { sanitized, leaked: toolNameLeaked } =
        sanitizeToolLeak(botResponseText);
      botResponseText = sanitized;

      // Check if the AI called the trigger_escalation tool
      const escalationToolCalled = result.steps?.some((step: any) =>
        step.toolCalls?.some((tc: any) => tc.toolName === "trigger_escalation"),
      );

      if (
        (escalationToolCalled || toolNameLeaked) &&
        escalationContactSection &&
        !responseAlreadyContainsEscalation(
          botResponseText,
          botConfig.escalation,
        )
      ) {
        // If the remaining text is empty/too short, prepend a bridge sentence
        if (botResponseText.trim().length < 5) {
          botResponseText = DEFAULT_BRIDGE_TEXT;
        }
        botResponseText = `${botResponseText}\n\n${escalationContactSection}`;
      }
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
          toolCalls: toolCallsForLog,
          promptTokens: promptTokensForLog,
          completionTokens: completionTokensForLog,
          totalTokens: totalTokensForLog,
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
        toolCalls: toolCallsForLog,
        promptTokens: promptTokensForLog,
        completionTokens: completionTokensForLog,
        totalTokens: totalTokensForLog,
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
    let streamChunkCount = 0;
    let streamToolCallsForLog: any[] | undefined;
    let streamPromptTokensForLog: number | undefined;
    let streamCompletionTokensForLog: number | undefined;
    let streamTotalTokensForLog: number | undefined;
    try {
      // Build the trigger_escalation tool (only if escalation is enabled & configured)
      const escalationContactSection = buildEscalationContactSection(
        botConfig.escalation,
      );
      const tools = escalationContactSection
        ? {
            trigger_escalation: tool({
              description:
                "Call this tool whenever the user asks for support, sales, human contact, or expresses frustration/anger. Also use this tool if you find contact details in the Context/Knowledge Base that answer the user's request.",
              inputSchema: z.object({}),
            }),
          }
        : undefined;

      const streamResult = await streamText({
        model,
        system: finalSystemPrompt,
        messages: [
          ...messageHistory,
          { role: "user" as const, content: userMessage },
        ],
        temperature: botConfig.temperature ?? 0.7,
        tools,
        stopWhen: tools ? hasToolCall("trigger_escalation") : undefined,
      });

      const { textStream, steps } = streamResult as any;
      const usage = (streamResult as any).usage;
      streamPromptTokensForLog = usage?.promptTokens;
      streamCompletionTokensForLog = usage?.completionTokens;
      streamTotalTokensForLog = usage?.totalTokens;

      let toolNameLeaked = false;

      for await (const delta of textStream as AsyncIterable<string>) {
        fullResponseText += delta;
        streamChunkCount += 1;

        // Detect & sanitize leaked tool name in the accumulated text
        if (TOOL_LEAK_RE.test(fullResponseText)) {
          toolNameLeaked = true;
          fullResponseText = fullResponseText
            .replace(TOOL_LEAK_RE, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        }

        await ctx.runMutation(internal.ai.updateStreamingBotMessage, {
          messageId,
          content: fullResponseText,
        });
      }

      // Check if the AI called the trigger_escalation tool
      const resolvedSteps = await steps;
      streamToolCallsForLog = resolvedSteps
        ? (resolvedSteps as any[])
            .flatMap((step) => step?.toolCalls ?? [])
            .filter(Boolean)
        : undefined;
      const escalationToolCalled = resolvedSteps?.some((step: any) =>
        step.toolCalls?.some((tc: any) => tc.toolName === "trigger_escalation"),
      );

      if (
        (escalationToolCalled || toolNameLeaked) &&
        escalationContactSection &&
        !responseAlreadyContainsEscalation(
          fullResponseText,
          botConfig.escalation,
        )
      ) {
        // If the remaining text is empty/too short, prepend a bridge sentence
        if (fullResponseText.trim().length < 5) {
          fullResponseText = DEFAULT_BRIDGE_TEXT;
        }
        fullResponseText = `${fullResponseText}\n\n${escalationContactSection}`;
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
        await ctx.runMutation(internal.ai.logStreamingBotMessageCompletion, {
          messageId,
          status: "error",
          error_message: errorMessage,
          chunks: streamChunkCount,
          final_length: fullResponseText.length,
          execution_time_ms: executionTimeMs,
        });
      } catch {
        // ignore
      }

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
          toolCalls: streamToolCallsForLog,
          promptTokens: streamPromptTokensForLog,
          completionTokens: streamCompletionTokensForLog,
          totalTokens: streamTotalTokensForLog,
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
        toolCalls: streamToolCallsForLog,
        promptTokens: streamPromptTokensForLog,
        completionTokens: streamCompletionTokensForLog,
        totalTokens: streamTotalTokensForLog,
      });
    } catch {
      // ignore
    }

    try {
      await ctx.runMutation(internal.ai.logStreamingBotMessageCompletion, {
        messageId,
        status: "success",
        chunks: streamChunkCount,
        final_length: fullResponseText.length,
        execution_time_ms: executionTimeMs,
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
