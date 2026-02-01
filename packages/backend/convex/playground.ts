import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import { api } from "./_generated/api.js";
import { Id } from "./_generated/dataModel.js";

/**
 * Create or retrieve the active playground session for a bot
 * Each bot has ONE active playground session that persists until manually restarted
 */
export const getOrCreatePlaygroundSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Query all conversations for this bot with playground tag and this user
    const allConversations = await ctx.db.query("conversations").collect();
    const playgroundSessions = allConversations.filter(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "playground" &&
        c.status === "active",
    );

    // If active playground session exists, return it
    if (playgroundSessions.length > 0) {
      return playgroundSessions[0];
    }

    // Create new playground session with authenticated user
    return await ctx.db.insert("conversations", {
      bot_id: args.botId,
      user_id: userId,
      integration: "playground",
      topic: "Playground Test Session",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    });
  },
});

/**
 * Get the current active playground session for a bot
 */
export const getPlaygroundSession = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const allConversations = await ctx.db.query("conversations").collect();
    const playgroundSession = allConversations.find(
      (c) =>
        c.bot_id === args.botId &&
        c.integration === "playground" &&
        c.status === "active",
    );

    if (!playgroundSession) {
      return null;
    }

    // Enrich with messages
    const allMessages = await ctx.db.query("messages").collect();
    const messages = allMessages.filter(
      (m) => m.conversation_id === playgroundSession._id,
    );

    return {
      ...playgroundSession,
      messages,
    };
  },
});

/**
 * Add a message to the playground session
 * Automatically creates the session if it doesn't exist
 */
export const addPlaygroundMessage = mutation({
  args: {
    botId: v.id("botProfiles"),
    role: v.string(), // "user" or "bot"
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Get or create playground session
    const allConversations = await ctx.db.query("conversations").collect();
    let playgroundSession = allConversations.find(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "playground" &&
        c.status === "active",
    );

    if (!playgroundSession) {
      // Create new playground session with authenticated user
      const conversationId = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        integration: "playground",
        topic: "Playground Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      playgroundSession = {
        _id: conversationId,
        _creationTime: Date.now(),
        bot_id: args.botId,
        user_id: userId,
        integration: "playground",
        topic: "Playground Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      };
    }

    // Add message to conversation
    const messageId = await ctx.db.insert("messages", {
      conversation_id: playgroundSession._id,
      user_id: userId,
      role: args.role,
      content: args.content,
      created_at: Date.now(),
    });

    // Update conversation's last_message_at
    await ctx.db.patch(playgroundSession._id, {
      last_message_at: Date.now(),
      updated_at: Date.now(),
    });

    return messageId;
  },
});

/**
 * Restart the playground session
 * Closes the current session and clears the chat history for fresh test
 */
export const restartPlaygroundSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Find and close the current active playground session
    const allConversations = await ctx.db.query("conversations").collect();
    const playgroundSession = allConversations.find(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "playground" &&
        c.status === "active",
    );

    if (playgroundSession) {
      await ctx.db.patch(playgroundSession._id, {
        status: "closed",
        updated_at: Date.now(),
      });
    }

    // Create a fresh playground session with authenticated user
    return await ctx.db.insert("conversations", {
      bot_id: args.botId,
      user_id: userId,
      integration: "playground",
      topic: "Playground Test Session",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    });
  },
});

/**
 * Get messages for a playground session
 */
export const getPlaygroundMessages = query({
  args: {
    sessionId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("messages").collect();
    return allMessages.filter((m) => m.conversation_id === args.sessionId);
  },
});

// ===== EMULATOR-SPECIFIC FUNCTIONS =====
// These create a separate "emulator" integration type for isolated testing

/**
 * Create or retrieve the active emulator session for a bot
 * Each bot has ONE active emulator session (distinct from playground)
 * Emulator messages are isolated from the public playground
 */
export const getOrCreateEmulatorSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Query all conversations for this bot with emulator tag and this user
    const allConversations = await ctx.db.query("conversations").collect();
    const emulatorSessions = allConversations.filter(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "emulator" &&
        c.status === "active",
    );

    // If active emulator session exists, return it
    if (emulatorSessions.length > 0) {
      return emulatorSessions[0];
    }

    // Create new emulator session with authenticated user
    return await ctx.db.insert("conversations", {
      bot_id: args.botId,
      user_id: userId,
      integration: "emulator",
      topic: "Emulator Test Session",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    });
  },
});

/**
 * Get the current active emulator session for a bot
 */
export const getEmulatorSession = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args): Promise<any> => {
    // ✅ Use indexed query instead of collecting all conversations
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_bot_id", (q) => q.eq("bot_id", args.botId))
      .collect();

    const emulatorSession = sessions.find(
      (c) => c.integration === "emulator" && c.status === "active",
    );

    if (!emulatorSession) {
      return null;
    }

    // ✅ Get messages via the dedicated reactive query (avoids fetching all messages)
    const messages: any[] = await ctx.runQuery(
      api.playground.getEmulatorMessages,
      {
        sessionId: emulatorSession._id,
      },
    );

    return {
      ...emulatorSession,
      messages,
    };
  },
});

/**
 * Add a message to the emulator session
 * Automatically creates the session if it doesn't exist
 */
export const addEmulatorMessage = mutation({
  args: {
    botId: v.id("botProfiles"),
    role: v.string(), // "user" or "bot"
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Get or create emulator session
    const allConversations = await ctx.db.query("conversations").collect();
    let emulatorSession = allConversations.find(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "emulator" &&
        c.status === "active",
    );

    if (!emulatorSession) {
      // Create new emulator session with authenticated user
      const conversationId = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        integration: "emulator",
        topic: "Emulator Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      emulatorSession = {
        _id: conversationId,
        _creationTime: Date.now(),
        bot_id: args.botId,
        user_id: userId,
        integration: "emulator",
        topic: "Emulator Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      };
    }

    // Add message to conversation
    const messageId = await ctx.db.insert("messages", {
      conversation_id: emulatorSession._id,
      user_id: userId,
      role: args.role,
      content: args.content,
      created_at: Date.now(),
    });

    // Update conversation's last_message_at
    await ctx.db.patch(emulatorSession._id, {
      last_message_at: Date.now(),
      updated_at: Date.now(),
    });

    return messageId;
  },
});

/**
 * Restart the emulator session
 * Closes the current session and creates a fresh one
 */
export const restartEmulatorSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    // Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Find and close the current active emulator session
    const allConversations = await ctx.db.query("conversations").collect();
    const emulatorSession = allConversations.find(
      (c) =>
        c.bot_id === args.botId &&
        c.user_id === userId &&
        c.integration === "emulator" &&
        c.status === "active",
    );

    if (emulatorSession) {
      await ctx.db.patch(emulatorSession._id, {
        status: "closed",
        updated_at: Date.now(),
      });
    }

    // Create a fresh emulator session with authenticated user
    return await ctx.db.insert("conversations", {
      bot_id: args.botId,
      user_id: userId,
      integration: "emulator",
      topic: "Emulator Test Session",
      status: "active",
      created_at: Date.now(),
      updated_at: Date.now(),
      last_message_at: Date.now(),
    });
  },
});

/**
 * Get messages for an emulator session
 */
export const getEmulatorMessages = query({
  args: {
    sessionId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const allMessages = await ctx.db.query("messages").collect();
    return allMessages.filter((m) => m.conversation_id === args.sessionId);
  },
});
