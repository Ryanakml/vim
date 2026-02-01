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
 * Get all messages for a specific conversation
 * ✅ Automatically filtered to current user's messages only
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Verify the conversation belongs to this user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.user_id !== userId) {
      throw new Error("Unauthorized: Cannot access other user's conversations");
    }

    // ✅ Get messages filtered by user_id
    return await ctx.db
      .query("messages")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .collect()
      .then((msgs) =>
        msgs.filter((m) => m.conversation_id === args.conversationId),
      );
  },
});

/**
 * Create a new conversation
 * ✅ Automatically associates with current authenticated user
 */
export const createConversation = mutation({
  args: {
    bot_id: v.id("botProfiles"),
    participant_id: v.id("users"),
    integration: v.string(),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Verify bot belongs to this user
    const bot = await ctx.db.get(args.bot_id);
    if (!bot || bot.user_id !== userId) {
      throw new Error(
        "Unauthorized: Cannot create conversation for other user's bot",
      );
    }

    return await ctx.db.insert("conversations", {
      user_id: userId,
      bot_id: args.bot_id,
      participant_id: args.participant_id,
      integration: args.integration,
      topic: args.topic || "Conversation Topic Unknown",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    });
  },
});

/**
 * Close a conversation
 * ✅ Verifies user owns the conversation
 */
export const closeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Verify conversation belongs to this user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.user_id !== userId) {
      throw new Error("Unauthorized: Cannot close other user's conversations");
    }

    await ctx.db.patch(args.conversationId, {
      status: "closed",
      updated_at: Date.now(),
    });
  },
});

/**
 * Add a message to a conversation
 * ✅ Verifies user owns the conversation
 * Updates the conversation's last_message_at timestamp
 */
export const addMessage = mutation({
  args: {
    conversation_id: v.id("conversations"),
    participant_id: v.optional(v.id("users")),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Verify conversation belongs to this user
    const conversation = await ctx.db.get(args.conversation_id);
    if (!conversation || conversation.user_id !== userId) {
      throw new Error(
        "Unauthorized: Cannot add messages to other user's conversations",
      );
    }

    // Insert message with user_id
    const messageId = await ctx.db.insert("messages", {
      user_id: userId,
      conversation_id: args.conversation_id,
      participant_id: args.participant_id,
      role: args.role,
      content: args.content,
      created_at: Date.now(),
    });

    // Update conversation's last_message_at
    await ctx.db.patch(args.conversation_id, {
      last_message_at: Date.now(),
      updated_at: Date.now(),
    });

    return messageId;
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
