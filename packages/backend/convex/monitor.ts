import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

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
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Filter conversations by user_id and botId
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
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
          .withIndex("by_user_id", (q) => q.eq("user_id", userId))
          .collect()
          .then((msgs) => msgs.filter((m) => m.conversation_id === conv._id));

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
    // ✅ Get authenticated user (required for admin conversations)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Filter conversations by user_id and botId
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
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
    // ✅ Get authenticated user (required to view visitor conversations)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Verify user owns this bot
    const bot = await ctx.db.get(args.botId);
    if (!bot || bot.user_id !== userId) {
      throw new Error(
        "Unauthorized: Cannot view visitor conversations for other user's bots",
      );
    }

    // Get all conversations for this bot where visitor_id is set (public visitors)
    const allConversations = await ctx.db
      .query("conversations")
      .withIndex("by_bot_id", (q) => q.eq("bot_id", args.botId))
      .collect()
      .then((convs) => convs.filter((c) => c.visitor_id && !c.user_id)); // Only visitor conversations

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
            name: conv.visitor_id
              ? `Visitor (${conv.visitor_id.slice(0, 8)})`
              : "Unknown",
          },
        };
      }),
    );
  },
});

/**
 * Get all messages for a specific conversation
 * ✅ Supports both authenticated users AND public visitors
 * For public visitors, provide visitorId instead of relying on auth
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    visitorId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get conversation first to verify access
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Determine access: either authenticated user OR visitor
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Verify access: must be either the bot owner, conversation owner, or the visitor
    if (userId && conversation.user_id === userId) {
      // Case 1: Authenticated user viewing their own test conversation
      return await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversation_id", args.conversationId),
        )
        .collect();
    } else if (args.visitorId && conversation.visitor_id === args.visitorId) {
      // Case 2: Public visitor viewing their own conversation
      return await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversation_id", args.conversationId),
        )
        .collect();
    } else if (userId && conversation.bot_id) {
      // Case 3: Authenticated user (admin) viewing any conversation on their bot
      const bot = await ctx.db.get(conversation.bot_id);
      if (bot && bot.user_id === userId) {
        // Admin owns this bot, so they can view all conversations (admin testing + visitor chats)
        return await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) =>
            q.eq("conversation_id", args.conversationId),
          )
          .collect();
      }
    }

    throw new Error("Unauthorized: Cannot access this conversation");
  },
});

/**
 * Create a new conversation
 * ✅ Supports BOTH authenticated users AND public visitors
 * - Authenticated: Create admin test conversation with user_id
 * - Public Visitor: Create visitor conversation with visitor_id (no auth required)
 */
export const createConversation = mutation({
  args: {
    bot_id: v.id("botProfiles"),
    organization_id: v.optional(v.string()),
    participant_id: v.optional(v.id("users")),
    integration: v.string(),
    topic: v.optional(v.string()),
    visitor_id: v.optional(v.string()), // For public visitors
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

    if (userId) {
      // Authenticated user: verify bot belongs to this user
      const bot = await ctx.db.get(args.bot_id);
      if (!bot || bot.user_id !== userId) {
        throw new Error(
          "Unauthorized: Cannot create conversation for other user's bot",
        );
      }

      conversationData.user_id = userId;
      conversationData.participant_id = args.participant_id;
    } else if (args.visitor_id) {
      // Public visitor: no authentication required
      // Use organization_id and bot_id for lookups instead
      conversationData.visitor_id = args.visitor_id;
      conversationData.organization_id = args.organization_id;
    } else {
      // Neither authenticated nor visitor ID provided
      throw new Error("Unauthorized: Must be logged in or provide visitor_id");
    }

    return await ctx.db.insert("conversations", conversationData);
  },
});

/**
 * Close a conversation
 * ✅ Supports BOTH authenticated users AND public visitors
 */
export const closeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    visitor_id: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get conversation first
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Verify access: must be either bot owner or the visitor
    if (userId) {
      // Authenticated user: verify they own this conversation
      if (conversation.user_id !== userId) {
        throw new Error(
          "Unauthorized: Cannot close other user's conversations",
        );
      }
    } else if (args.visitor_id) {
      // Public visitor: verify they own this conversation
      if (conversation.visitor_id !== args.visitor_id) {
        throw new Error(
          "Unauthorized: Visitor cannot close other visitor's conversations",
        );
      }
    } else {
      throw new Error("Unauthorized: Must be logged in or provide visitor_id");
    }

    await ctx.db.patch(args.conversationId, {
      status: "closed",
      updated_at: Date.now(),
    });
  },
});

/**
 * Add a message to a conversation (sendMessage equivalent)
 * ✅ Supports BOTH authenticated users AND public visitors
 * - Authenticated: Associate message with user_id
 * - Public Visitor: Associate message with visitor_id (no auth required)
 * Updates the conversation's last_message_at timestamp
 */
export const addMessage = mutation({
  args: {
    conversation_id: v.id("conversations"),
    participant_id: v.optional(v.id("users")),
    role: v.string(),
    content: v.string(),
    visitor_id: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get conversation first to verify it exists
    const conversation = await ctx.db.get(args.conversation_id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Verify access and determine who is sending the message
    let messageData: any = {
      conversation_id: args.conversation_id,
      participant_id: args.participant_id,
      role: args.role,
      content: args.content,
      created_at: Date.now(),
    };

    if (userId) {
      // Authenticated user: verify they own this conversation
      if (conversation.user_id !== userId) {
        throw new Error(
          "Unauthorized: Cannot add messages to other user's conversations",
        );
      }
      messageData.user_id = userId;
    } else if (args.visitor_id) {
      // Public visitor: verify they own this conversation
      if (conversation.visitor_id !== args.visitor_id) {
        throw new Error(
          "Unauthorized: Visitor cannot add messages to other visitor's conversations",
        );
      }
      messageData.visitor_id = args.visitor_id;
    } else {
      throw new Error("Unauthorized: Must be logged in or provide visitor_id");
    }

    // Insert message
    const messageId = await ctx.db.insert("messages", messageData);

    // Update conversation's last_message_at
    await ctx.db.patch(args.conversation_id, {
      last_message_at: Date.now(),
      updated_at: Date.now(),
    });

    return messageId;
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
    visitor_id: v.optional(v.string()), // For public visitors
  },
  handler: async (ctx, args) => {
    // Get message and conversation to verify they exist
    const message = await ctx.db.get(args.message_id);
    if (!message) {
      throw new Error("Message not found");
    }

    const conversation = await ctx.db.get(args.conversation_id);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Attempt to get authenticated user (may be null for public visitors)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;

    // Verify access: must be either bot owner or the visitor
    if (userId) {
      // Authenticated user: verify they own this conversation
      if (conversation.user_id !== userId) {
        throw new Error(
          "Unauthorized: Cannot update feedback for other user's conversations",
        );
      }
    } else if (args.visitor_id) {
      // Public visitor: verify they own this conversation
      if (conversation.visitor_id !== args.visitor_id) {
        throw new Error(
          "Unauthorized: Visitor cannot update feedback in other visitor's conversations",
        );
      }
    } else {
      throw new Error("Unauthorized: Must be logged in or provide visitor_id");
    }

    // Update message with feedback (store in message if schema supports it)
    // Note: If messages table doesn't have a feedback field,
    // this can be extended to create a separate feedback table
    // For now, we just verify the feedback is valid
    if (args.feedback !== "helpful" && args.feedback !== "not-helpful") {
      throw new Error(
        "Invalid feedback value: must be 'helpful' or 'not-helpful'",
      );
    }

    // In a real implementation, patch the message with feedback metadata
    // await ctx.db.patch(args.message_id, { feedback: args.feedback });

    return { success: true, messageId: args.message_id };
  },
});

// ===== USERS =====

/**
 * Get all users
 */
export const getUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

/**
 * Get or create a user by identifier
 * If user exists, return existing user
 * If not, create new user with the provided identifier and name
 */
export const getOrCreateUser = mutation({
  args: {
    identifier: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const allUsers = await ctx.db.query("users").collect();
    const existing = allUsers.find((u) => u.identifier === args.identifier);

    if (existing) return existing;

    // Create new user
    return await ctx.db.insert("users", {
      identifier: args.identifier,
      name: args.name || "Unknown User",
      created_at: Date.now(),
      last_active_at: Date.now(),
    });
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
    await ctx.db.patch(args.userId, {
      last_active_at: Date.now(),
    });
  },
});
