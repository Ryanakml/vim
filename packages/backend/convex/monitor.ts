import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import {
  assertCanAccessResource,
  assertConversationOwnedByVisitorSession,
  assertRateLimitMessagesPerWindow,
  createVisitorSession as createVisitorSessionHelper,
  getTenantContext,
  logAudit,
  requireBotProfile,
  requireValidVisitorSession,
} from "./lib/security.js";

const VISITOR_HASH_LENGTH = 8;

const VISITOR_MESSAGE_RATE_LIMIT_PER_MINUTE = 10;
const VISITOR_MESSAGE_RATE_WINDOW_MS = 60 * 1000;
const VISITOR_MESSAGE_MAX_CHARS = 4000;

function hashVisitorIdToHex8(value: string): string {
  // FNV-1a 32-bit hash to avoid Node "crypto" dependency
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(VISITOR_HASH_LENGTH, "0");
}

function formatAnonymousVisitorName(visitorId?: string): string {
  if (!visitorId) {
    return "anonymousid_unknown";
  }
  const hash = hashVisitorIdToHex8(visitorId).slice(0, VISITOR_HASH_LENGTH);
  return `anonymousid_${hash}`;
}

function normalizeVisitorId(input: string): string {
  const visitorId = input.trim();
  if (!visitorId) {
    throw new Error("visitorId is required");
  }
  if (visitorId.length > 200) {
    throw new Error("visitorId too long");
  }
  return visitorId;
}

function normalizeMessageContent(input: string): string {
  const content = input.trim();
  if (!content) {
    throw new Error("Message content is required");
  }
  if (content.length > VISITOR_MESSAGE_MAX_CHARS) {
    throw new Error("Message too long");
  }
  return content;
}

// ===== CONVERSATIONS =====

/**
 * Get all conversations for a specific bot
 * ✅ Automatically filtered to current user's bots only
 * Optionally filter by status (active/closed)
 */
export const getConversations = query({
  args: {
    botId: v.id("botProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");

    // ✅ Filter conversations by botId (authorization is via bot access)
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_bot_id", (q) => q.eq("bot_id", args.botId))
      .collect();

    // Filter by status if provided
    let filtered = allConversations;
    if (args.status) {
      filtered = filtered.filter((c) => c.status === args.status);
    }

    // Apply limit if provided
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with message count and last message
    return Promise.all(
      filtered.map(async (conv) => {
        const convMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversation_id", conv._id),
          )
          .collect();

        const lastMessage = convMessages[convMessages.length - 1] || null;
        const participant = conv.participant_id
          ? await ctx.db.get(conv.participant_id)
          : null;

        return {
          ...conv,
          messageCount: convMessages.length,
          lastMessage,
          user: participant,
        };
      }),
    );
  },
});

/**
 * Get admin's own test conversations (conversations where user_id === admin)
 * ✅ Used for "My Testing" tab in admin dashboard
 * ✅ Automatically filtered to current user's bots only
 * Optionally filter by status (active/closed)
 */
export const getAdminConversations = query({
  args: {
    botId: v.id("botProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");

    const userId = tenant.userId;

    // ✅ Filter conversations by user_id and botId
    // NOTE: Visitor conversations are also owned by the bot owner (user_id set)
    // for monitoring isolation, so we must explicitly exclude visitor_id here.
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    // Only admin testing conversations (no visitor_id)
    const adminOnly = allConversations.filter((c) => !c.visitor_id);

    // Filter by status if provided
    let filtered = adminOnly;
    if (args.status) {
      filtered = filtered.filter((c) => c.status === args.status);
    }

    // Apply limit if provided
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with message count and last message
    return Promise.all(
      filtered.map(async (conv) => {
        const convMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversation_id", conv._id),
          )
          .collect();

        const lastMessage = convMessages[convMessages.length - 1] || null;
        const participant = conv.participant_id
          ? await ctx.db.get(conv.participant_id)
          : null;

        return {
          ...conv,
          messageCount: convMessages.length,
          lastMessage,
          user: participant,
        };
      }),
    );
  },
});

/**
 * Get public visitor conversations (conversations with visitor_id, no user_id)
 * ✅ Used for "Visitor Chats" tab in admin dashboard
 * ✅ Requires authentication to view others' visitor conversations
 * ✅ Optionally filter by status (active/closed)
 */
export const getPublicConversations = query({
  args: {
    botId: v.id("botProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    assertCanAccessResource(
      bot,
      tenant,
      "Unauthorized: Cannot view visitor conversations for this bot",
    );

    // Get all conversations for this bot where visitor_id is set (public visitors)
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_bot_id", (q) => q.eq("bot_id", args.botId))
      .collect()
      // Visitor conversations may still carry user_id (bot owner) for admin monitoring.
      .then((convs) => convs.filter((c) => Boolean(c.visitor_id)));

    // Filter by status if provided
    let filtered = allConversations;
    if (args.status) {
      filtered = filtered.filter((c) => c.status === args.status);
    }

    // Apply limit if provided
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with message count and last message
    return Promise.all(
      filtered.map(async (conv) => {
        const convMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversation_id", conv._id),
          )
          .collect();

        const lastMessage = convMessages[convMessages.length - 1] || null;

        return {
          ...conv,
          messageCount: convMessages.length,
          lastMessage,
          user: {
            name: formatAnonymousVisitorName(conv.visitor_id),
          },
        };
      }),
    );
  },
});

/**
 * Get all messages for a specific conversation
 * ✅ Supports both authenticated users AND public visitors
 * For public visitors, provide a sessionToken instead of visitor_id to prevent impersonation
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get conversation first to verify access
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Determine access: either authenticated user OR visitor
    const identity = await ctx.auth.getUserIdentity();

    // Verify access: either tenant access OR the visitor
    if (identity) {
      // Case 1: Authenticated tenant (owner or org member) viewing any conversation on an accessible bot
      const tenant = await getTenantContext(ctx);

      const bot = await ctx.db.get(conversation.bot_id);
      assertCanAccessResource(
        bot,
        tenant,
        "Unauthorized: Cannot access this conversation",
      );

      return await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversation_id", args.conversationId),
        )
        .collect();
    } else if (args.sessionToken) {
      // Case 2: Public visitor viewing their own conversation via session token
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });

      return await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversation_id", args.conversationId),
        )
        .collect();
    }

    throw new Error("Unauthorized: Cannot access this conversation");
  },
});

/**
 * Create a new conversation
 * ✅ Supports BOTH authenticated users AND public visitors
 * - Authenticated: Create admin test conversation with user_id
 * - Public Visitor: Create visitor conversation using sessionToken (no auth required)
 */
export const createConversation = mutation({
  args: {
    bot_id: v.id("botProfiles"),
    participant_id: v.optional(v.id("users")),
    integration: v.string(),
    topic: v.optional(v.string()),
    sessionToken: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Determine who is creating the conversation
    let conversationData: any = {
      bot_id: args.bot_id,
      integration: args.integration,
      topic: args.topic || "Conversation Topic Unknown",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    };

    let auditUserId: string = userId ?? "unauthenticated";
    let auditOrgId: string | undefined =
      (identity?.org_id as string | undefined) || undefined;

    if (userId) {
      const tenant = await getTenantContext(ctx);

      const bot = await ctx.db.get(args.bot_id);
      assertCanAccessResource(
        bot,
        tenant,
        "Unauthorized: Cannot create conversation for this bot",
      );

      conversationData.user_id = userId;
      conversationData.participant_id = args.participant_id;
      if (bot.organization_id) {
        conversationData.organization_id = bot.organization_id;
      }
      auditUserId = tenant.userId;
      auditOrgId = bot.organization_id ?? tenant.orgId;
    } else if (args.sessionToken) {
      // Public visitor: no authentication required. Token validation prevents impersonation.
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      if (session.bot_id !== args.bot_id) {
        throw new Error("Unauthorized: Wrong bot");
      }

      const bot = await requireBotProfile(ctx, args.bot_id);

      conversationData.visitor_id = session.visitor_id;
      if (bot.organization_id) {
        conversationData.organization_id = bot.organization_id;
      }
      // Preserve bot owner isolation for monitoring/admin queries.
      conversationData.user_id = bot.user_id;
      auditUserId = `visitor:${session.visitor_id}`;
      auditOrgId = bot.organization_id;
    } else {
      // Neither authenticated nor visitor ID provided
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "create_conversation",
        resource_type: "conversation",
        status: "denied",
        error_message:
          "Unauthorized: Must be logged in or provide sessionToken",
      });
      throw new Error(
        "Unauthorized: Must be logged in or provide sessionToken",
      );
    }

    let auditLogged = false;
    try {
      const id = await ctx.db.insert("conversations", conversationData);
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "create_conversation",
        resource_type: "conversation",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: {
            _id: id,
            bot_id: args.bot_id,
            integration: args.integration,
          },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "create_conversation",
          resource_type: "conversation",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

/**
 * Close a conversation
 * ✅ Supports BOTH authenticated users AND public visitors
 */
export const closeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    sessionToken: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get conversation first
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "close_conversation",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();

    let auditUserId = identity?.subject ?? "unauthenticated";
    let auditOrgId = (conversation as any).organization_id as
      | string
      | undefined;

    // Verify access: must be either authenticated tenant with bot access or the visitor
    if (identity) {
      const tenant = await getTenantContext(ctx);
      const bot = await ctx.db.get(conversation.bot_id);
      try {
        assertCanAccessResource(
          bot,
          tenant,
          "Unauthorized: Cannot close conversations for this bot",
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: tenant.orgId,
          action: "close_conversation",
          resource_type: "conversation",
          resource_id: String(args.conversationId),
          status: "denied",
          error_message: errorMessage,
        });
        throw error;
      }
      auditUserId = tenant.userId;
      auditOrgId = (bot as any)?.organization_id ?? tenant.orgId;
    } else if (args.sessionToken) {
      // Public visitor: verify they own this conversation via session token
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });

      auditUserId = `visitor:${session.visitor_id}`;
    } else {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "close_conversation",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "denied",
        error_message:
          "Unauthorized: Must be logged in or provide sessionToken",
      });
      throw new Error(
        "Unauthorized: Must be logged in or provide sessionToken",
      );
    }

    const before = conversation;
    const patch = {
      status: "closed",
      updated_at: Date.now(),
    };

    let auditLogged = false;
    try {
      await ctx.db.patch(args.conversationId, patch);
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "close_conversation",
        resource_type: "conversation",
        resource_id: String(args.conversationId),
        status: "success",
        changes: {
          before,
          after: { ...before, ...patch },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "close_conversation",
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

/**
 * Add a message to a conversation (sendMessage equivalent)
 * ✅ Supports BOTH authenticated users AND public visitors
 * - Authenticated: Associate message with user_id
 * - Public Visitor: Associate message with visitor_id derived from sessionToken (no auth required)
 * Updates the conversation's last_message_at timestamp
 */
export const addMessage = mutation({
  args: {
    conversation_id: v.id("conversations"),
    participant_id: v.optional(v.id("users")),
    role: v.string(),
    content: v.string(),
    sessionToken: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get conversation first to verify it exists
    const conversation = await ctx.db.get(args.conversation_id);
    if (!conversation) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "add_message",
        resource_type: "conversation",
        resource_id: String(args.conversation_id),
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    let auditUserId = userId ?? "unauthenticated";
    let auditOrgId = (conversation as any).organization_id as
      | string
      | undefined;

    // Verify access and determine who is sending the message
    let messageData: any = {
      conversation_id: args.conversation_id,
      participant_id: args.participant_id,
      role: args.role,
      content: args.content,
      created_at: Date.now(),
    };

    if (userId) {
      const tenant = await getTenantContext(ctx);
      const bot = await ctx.db.get(conversation.bot_id);
      try {
        assertCanAccessResource(
          bot,
          tenant,
          "Unauthorized: Cannot add messages to conversations for this bot",
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: tenant.orgId,
          action: "add_message",
          resource_type: "conversation",
          resource_id: String(args.conversation_id),
          status: "denied",
          error_message: errorMessage,
        });
        throw error;
      }
      messageData.user_id = userId;
      auditUserId = tenant.userId;
      auditOrgId = (bot as any)?.organization_id ?? tenant.orgId;
    } else if (args.sessionToken) {
      // Public visitor: verify they own this conversation via session token
      const now = Date.now();
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now,
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });

      await assertRateLimitMessagesPerWindow(ctx, {
        conversationId: args.conversation_id,
        limit: VISITOR_MESSAGE_RATE_LIMIT_PER_MINUTE,
        windowMs: VISITOR_MESSAGE_RATE_WINDOW_MS,
        now,
        errorMessage: "Rate limited: Too many messages",
      });

      messageData.visitor_id = session.visitor_id;
      messageData.role = "user";
      messageData.content = normalizeMessageContent(args.content);
      messageData.created_at = now;

      auditUserId = `visitor:${session.visitor_id}`;
    } else {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "add_message",
        resource_type: "conversation",
        resource_id: String(args.conversation_id),
        status: "denied",
        error_message:
          "Unauthorized: Must be logged in or provide sessionToken",
      });
      throw new Error(
        "Unauthorized: Must be logged in or provide sessionToken",
      );
    }

    let auditLogged = false;
    try {
      // Insert message
      const messageId = await ctx.db.insert("messages", messageData);

      // Update conversation's last_message_at
      await ctx.db.patch(args.conversation_id, {
        last_message_at: Date.now(),
        updated_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "add_message",
        resource_type: "message",
        resource_id: String(messageId),
        status: "success",
        changes: {
          before: null,
          after: {
            conversation_id: args.conversation_id,
            role: messageData.role,
          },
        },
      });
      auditLogged = true;

      return messageId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: auditOrgId,
          action: "add_message",
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
 * Gap #1: Visitor Session Validation
 * PUBLIC MUTATION: Create a visitor session token scoped to (visitor_id, bot_id)
 * Used by public widget / embed flows before calling any public mutations.
 */
export const createVisitorSession = mutation({
  args: {
    botId: v.id("botProfiles"),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    const visitorId = normalizeVisitorId(args.visitorId);

    await requireBotProfile(ctx, args.botId);

    let auditLogged = false;
    try {
      const { sessionToken, expiresAt } = await createVisitorSessionHelper(
        ctx,
        {
          botId: args.botId,
          visitorId,
        },
      );

      await logAudit(ctx, {
        user_id: `visitor:${visitorId}`,
        action: "create_visitor_session",
        resource_type: "visitorSession",
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            visitorId,
            expiresAt,
          },
        },
      });
      auditLogged = true;

      return { sessionToken, expiresAt };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: `visitor:${visitorId}`,
          action: "create_visitor_session",
          resource_type: "visitorSession",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

/**
 * Update feedback for a message
 * ✅ Supports BOTH authenticated users AND public visitors
 * - Authenticated: User's feedback on their own messages
 * - Public Visitor: Visitor's feedback on messages in their conversation
 */
export const updateFeedback = mutation({
  args: {
    message_id: v.id("messages"),
    conversation_id: v.id("conversations"),
    feedback: v.string(), // "helpful" or "not-helpful"
    sessionToken: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get message and conversation to verify they exist
    const message = await ctx.db.get(args.message_id);
    if (!message) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_feedback",
        resource_type: "message",
        resource_id: String(args.message_id),
        status: "error",
        error_message: "Message not found",
      });
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(args.conversation_id);
    if (!conversation) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_feedback",
        resource_type: "conversation",
        resource_id: String(args.conversation_id),
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();

    let auditUserId = identity?.subject ?? "unauthenticated";
    const auditOrgId = (conversation as any).organization_id as
      | string
      | undefined;

    // Verify access: must be either authenticated tenant with bot access or the visitor
    if (identity) {
      const tenant = await getTenantContext(ctx);
      const bot = await ctx.db.get(conversation.bot_id);
      try {
        assertCanAccessResource(
          bot,
          tenant,
          "Unauthorized: Cannot update feedback for conversations on this bot",
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: tenant.orgId,
          action: "update_feedback",
          resource_type: "message",
          resource_id: String(args.message_id),
          status: "denied",
          error_message: errorMessage,
        });
        throw error;
      }
      auditUserId = tenant.userId;
    } else if (args.sessionToken) {
      // Public visitor: verify they own this conversation via session token
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });

      auditUserId = `visitor:${session.visitor_id}`;
    } else {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_feedback",
        resource_type: "message",
        resource_id: String(args.message_id),
        status: "denied",
        error_message:
          "Unauthorized: Must be logged in or provide sessionToken",
      });
      throw new Error(
        "Unauthorized: Must be logged in or provide sessionToken",
      );
    }

    // Update message with feedback (store in message if schema supports it)
    // Note: If messages table doesn't have a feedback field,
    // this can be extended to create a separate feedback table
    // For now, we just verify the feedback is valid
    if (args.feedback !== "helpful" && args.feedback !== "not-helpful") {
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: auditOrgId,
        action: "update_feedback",
        resource_type: "message",
        resource_id: String(args.message_id),
        status: "error",
        error_message:
          "Invalid feedback value: must be 'helpful' or 'not-helpful'",
      });
      throw new Error(
        "Invalid feedback value: must be 'helpful' or 'not-helpful'",
      );
    }

    // In a real implementation, patch the message with feedback metadata
    // await ctx.db.patch(args.message_id, { feedback: args.feedback });

    await logAudit(ctx, {
      user_id: auditUserId,
      organization_id: auditOrgId,
      action: "update_feedback",
      resource_type: "message",
      resource_id: String(args.message_id),
      status: "success",
      changes: {
        before: { _id: args.message_id },
        after: { _id: args.message_id, feedback: args.feedback },
      },
    });

    return { success: true, messageId: args.message_id };
  },
});

// ===== USERS =====

/**
 * Get all users for the current organization
 * Filters by organization_id from auth context
 * Includes active/inactive status based on last activity
 */
export const getUsers = query({
  handler: async (ctx) => {
    // Get organization from auth identity
    const identity = await ctx.auth.getUserIdentity();
    const organizationId =
      (identity?.org_id as string | undefined) || undefined;

    if (!organizationId) {
      // Return empty if no organization context
      return [];
    }

    // Query users by organization
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) =>
        q.eq("organization_id", organizationId),
      )
      .collect();

    // Add active/inactive status based on last_active_at
    const now = Date.now();
    const ACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

    return users.map((user) => ({
      ...user,
      is_active:
        user.last_active_at && now - user.last_active_at < ACTIVE_THRESHOLD_MS,
    }));
  },
});

/**
 * Get or create a user by identifier
 * Scoped to the current organization
 * If user exists, return existing user
 * If not, create new user with the provided identifier and name
 */
export const getOrCreateUser = mutation({
  args: {
    identifier: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get organization from auth identity
    const identity = await ctx.auth.getUserIdentity();
    const organizationId =
      (identity?.org_id as string | undefined) || undefined;

    if (!organizationId) {
      await logAudit(ctx, {
        user_id: identity?.subject ?? "unauthenticated",
        action: "get_or_create_user",
        resource_type: "user",
        status: "denied",
        error_message: "Organization context required",
      });
      throw new Error("Organization context required");
    }

    // Check if user exists in current organization
    const existing = await ctx.db
      .query("users")
      .withIndex("by_org_and_identifier", (q) =>
        q
          .eq("organization_id", organizationId)
          .eq("identifier", args.identifier),
      )
      .first();

    if (existing) return existing;

    // Create new user with organization_id
    let auditLogged = false;
    try {
      const id = await ctx.db.insert("users", {
        organization_id: organizationId,
        identifier: args.identifier,
        name: args.name || "Unknown User",
        created_at: Date.now(),
        last_active_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: identity?.subject ?? "unauthenticated",
        organization_id: organizationId,
        action: "create_user",
        resource_type: "user",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: { _id: id, identifier: args.identifier },
        },
      });
      auditLogged = true;

      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: identity?.subject ?? "unauthenticated",
          organization_id: organizationId,
          action: "create_user",
          resource_type: "user",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

/**
 * Update user's last_active_at timestamp
 */
export const updateUserActivity = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    if (!identity.subject) {
      throw new Error("Unauthorized: Missing user identity");
    }

    const organizationId = (identity.org_id as string | undefined) || undefined;
    if (!organizationId) {
      await logAudit(ctx, {
        user_id: identity.subject,
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "denied",
        error_message: "Organization context required",
      });
      throw new Error("Organization context required");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      await logAudit(ctx, {
        user_id: identity.subject,
        organization_id: organizationId,
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "error",
        error_message: "User not found",
      });
      throw new Error("User not found");
    }

    if (user.organization_id !== organizationId) {
      await logAudit(ctx, {
        user_id: identity.subject,
        organization_id: organizationId,
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "denied",
        error_message: "Unauthorized: Cannot update other organization's user",
      });
      throw new Error("Unauthorized: Cannot update other organization's user");
    }

    // Prevent updating arbitrary users within the same organization.
    // Only the authenticated user can update their own activity record.
    if (user.identifier !== identity.subject) {
      await logAudit(ctx, {
        user_id: identity.subject,
        organization_id: organizationId,
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "denied",
        error_message: "Unauthorized: Cannot update another user's activity",
      });
      throw new Error("Unauthorized: Cannot update another user's activity");
    }

    const before = user;
    const patch = { last_active_at: Date.now() };

    let auditLogged = false;
    try {
      await ctx.db.patch(args.userId, patch);
      await logAudit(ctx, {
        user_id: identity.subject,
        organization_id: organizationId,
        action: "update_user_activity",
        resource_type: "user",
        resource_id: String(args.userId),
        status: "success",
        changes: {
          before,
          after: { ...before, ...patch },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: identity.subject,
          organization_id: organizationId,
          action: "update_user_activity",
          resource_type: "user",
          resource_id: String(args.userId),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});
