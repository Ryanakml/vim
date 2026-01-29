import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// ===== CONVERSATIONS =====

/**
 * Get all conversations for a specific bot
 * Optionally filter by status (active/closed)
 */
export const getConversations = query({
  args: {
    botId: v.id("botProfiles"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();

    // Filter by botId and optionally by status
    let filtered = allConversations.filter(
      (c) =>
        c.bot_id === args.botId && (!args.status || c.status === args.status),
    );

    // Apply limit if provided
    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    // Enrich with message count and last message
    return Promise.all(
      filtered.map(async (conv) => {
        const allMessages = await ctx.db.query("messages").collect();
        const convMessages = allMessages.filter(
          (m) => m.conversation_id === conv._id,
        );

        const lastMessage = convMessages[convMessages.length - 1] || null;
        const user = conv.user_id ? await ctx.db.get(conv.user_id) : null;

        return {
          ...conv,
          messageCount: convMessages.length,
          lastMessage,
          user,
        };
      }),
    );
  },
});

/**
 * Get all messages for a specific conversation
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("messages").collect();
    return allMessages.filter((m) => m.conversation_id === args.conversationId);
  },
});

/**
 * Create a new conversation
 */
export const createConversation = mutation({
  args: {
    bot_id: v.id("botProfiles"),
    user_id: v.id("users"),
    integration: v.string(),
    topic: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      bot_id: args.bot_id,
      user_id: args.user_id,
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
 */
export const closeConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      status: "closed",
      updated_at: Date.now(),
    });
  },
});

/**
 * Add a message to a conversation
 * Updates the conversation's last_message_at timestamp
 */
export const addMessage = mutation({
  args: {
    conversation_id: v.id("conversations"),
    user_id: v.optional(v.id("users")),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert message
    const messageId = await ctx.db.insert("messages", {
      conversation_id: args.conversation_id,
      user_id: args.user_id,
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
