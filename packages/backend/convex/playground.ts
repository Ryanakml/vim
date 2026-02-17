import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import { api } from "./_generated/api.js";
import { Id } from "./_generated/dataModel.js";
import {
  assertCanAccessResource,
  assertIsOwner,
  getTenantContext,
  logAudit,
} from "./lib/security.js";

/**
 * Create or retrieve the active playground session for a bot
 * Each bot has ONE active playground session that persists until manually restarted
 */
export const getOrCreatePlaygroundSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "get_or_create_playground_session",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    // Query conversations for this bot with playground tag and this user
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    const playgroundSessions = sessions.filter(
      (c) => c.integration === "playground" && c.status === "active",
    );

    // If active playground session exists, return it
    if (playgroundSessions.length > 0) {
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "get_or_create_playground_session",
        resource_type: "conversation",
        resource_id: String(playgroundSessions[0]!._id),
        status: "success",
        changes: {
          before: { _id: playgroundSessions[0]!._id },
          after: { _id: playgroundSessions[0]!._id },
        },
      });
      return playgroundSessions[0];
    }

    // Create new playground session with authenticated user
    let auditLogged = false;
    try {
      const id = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
        integration: "playground",
        topic: "Playground Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "create_playground_session",
        resource_type: "conversation",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: { _id: id, botId: args.botId },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "create_playground_session",
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
 * Get the current active playground session for a bot
 */
export const getPlaygroundSession = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");

    const userId = tenant.userId;

    // ✅ Use indexed query instead of collecting all conversations
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    const playgroundSession = sessions.find(
      (c) => c.integration === "playground" && c.status === "active",
    );

    if (!playgroundSession) {
      return null;
    }

    // ✅ Get messages via indexed query
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversation_id", playgroundSession._id),
      )
      .collect();

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
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "add_playground_message",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    // Get or create playground session
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    let playgroundSession = sessions.find(
      (c) => c.integration === "playground" && c.status === "active",
    );

    if (!playgroundSession) {
      // Create new playground session with authenticated user
      const conversationId = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
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
        organization_id: bot.organization_id,
        integration: "playground",
        topic: "Playground Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      };
    }

    let auditLogged = false;
    try {
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

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "add_playground_message",
        resource_type: "message",
        resource_id: String(messageId),
        status: "success",
        changes: {
          before: null,
          after: { conversationId: playgroundSession._id, role: args.role },
        },
      });
      auditLogged = true;
      return messageId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "add_playground_message",
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
 * Restart the playground session
 * Closes the current session and clears the chat history for fresh test
 */
export const restartPlaygroundSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "restart_playground_session",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    // Find and close the current active playground session
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    const playgroundSession = sessions.find(
      (c) => c.integration === "playground" && c.status === "active",
    );

    if (playgroundSession) {
      await ctx.db.patch(playgroundSession._id, {
        status: "closed",
        updated_at: Date.now(),
      });
    }

    let auditLogged = false;
    try {
      // Create a fresh playground session with authenticated user
      const id = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
        integration: "playground",
        topic: "Playground Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "restart_playground_session",
        resource_type: "conversation",
        resource_id: String(id),
        status: "success",
        changes: {
          before: playgroundSession ? { _id: playgroundSession._id } : null,
          after: { _id: id },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "restart_playground_session",
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
 * Get messages for a playground session
 */
export const getPlaygroundMessages = query({
  args: {
    sessionId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    // ✅ Verify conversation ownership before returning messages
    const conversation = await ctx.db.get(args.sessionId);
    assertIsOwner(
      conversation,
      tenant,
      "Unauthorized: Cannot access this conversation",
    );

    // ✅ Use indexed query instead of collecting all messages
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversation_id", args.sessionId),
      )
      .collect();
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
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "get_or_create_emulator_session",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    const emulatorSessions = sessions.filter(
      (c) => c.integration === "emulator" && c.status === "active",
    );

    // If active emulator session exists, return it
    if (emulatorSessions.length > 0) {
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "get_or_create_emulator_session",
        resource_type: "conversation",
        resource_id: String(emulatorSessions[0]!._id),
        status: "success",
        changes: {
          before: { _id: emulatorSessions[0]!._id },
          after: { _id: emulatorSessions[0]!._id },
        },
      });
      return emulatorSessions[0];
    }

    let auditLogged = false;
    try {
      // Create new emulator session with authenticated user
      const id = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
        integration: "emulator",
        topic: "Emulator Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "create_emulator_session",
        resource_type: "conversation",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: { _id: id, botId: args.botId },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "create_emulator_session",
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
 * Get the current active emulator session for a bot
 */
export const getEmulatorSession = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args): Promise<any> => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");

    // ✅ Use indexed query scoped to user + bot
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", tenant.userId).eq("bot_id", args.botId),
      )
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
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "add_emulator_message",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    // Get or create emulator session
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    let emulatorSession = sessions.find(
      (c) => c.integration === "emulator" && c.status === "active",
    );

    if (!emulatorSession) {
      // Create new emulator session with authenticated user
      const conversationId = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
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
        organization_id: bot.organization_id,
        integration: "emulator",
        topic: "Emulator Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      };
    }

    let auditLogged = false;
    try {
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

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "add_emulator_message",
        resource_type: "message",
        resource_id: String(messageId),
        status: "success",
        changes: {
          before: null,
          after: { conversationId: emulatorSession._id, role: args.role },
        },
      });
      auditLogged = true;
      return messageId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "add_emulator_message",
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
 * Restart the emulator session
 * Closes the current session and creates a fresh one
 */
export const restartEmulatorSession = mutation({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    const bot = await ctx.db.get(args.botId);
    try {
      assertCanAccessResource(bot, tenant, "Unauthorized: Cannot access bot");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: tenant.orgId,
        action: "restart_emulator_session",
        resource_type: "botProfile",
        resource_id: String(args.botId),
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const userId = tenant.userId;

    // Find and close the current active emulator session
    const sessions = await ctx.db
      .query("conversations")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("bot_id", args.botId),
      )
      .collect();

    const emulatorSession = sessions.find(
      (c) => c.integration === "emulator" && c.status === "active",
    );

    if (emulatorSession) {
      await ctx.db.patch(emulatorSession._id, {
        status: "closed",
        updated_at: Date.now(),
      });
    }

    let auditLogged = false;
    try {
      // Create a fresh emulator session with authenticated user
      const id = await ctx.db.insert("conversations", {
        bot_id: args.botId,
        user_id: userId,
        organization_id: bot.organization_id,
        integration: "emulator",
        topic: "Emulator Test Session",
        status: "active",
        created_at: Date.now(),
        updated_at: Date.now(),
        last_message_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: tenant.userId,
        organization_id: bot.organization_id ?? tenant.orgId,
        action: "restart_emulator_session",
        resource_type: "conversation",
        resource_id: String(id),
        status: "success",
        changes: {
          before: emulatorSession ? { _id: emulatorSession._id } : null,
          after: { _id: id },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: tenant.userId,
          organization_id: bot.organization_id ?? tenant.orgId,
          action: "restart_emulator_session",
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
 * Get messages for an emulator session
 */
export const getEmulatorMessages = query({
  args: {
    sessionId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const tenant = await getTenantContext(ctx);

    // ✅ Verify conversation ownership before returning messages
    const conversation = await ctx.db.get(args.sessionId);
    assertIsOwner(
      conversation,
      tenant,
      "Unauthorized: Cannot access this conversation",
    );

    // ✅ Use indexed query instead of collecting all messages
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversation_id", args.sessionId),
      )
      .collect();
  },
});
