import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";

/**
 * PUBLIC MUTATION: Send a message in a public chat session
 *
 * No authentication required.
 * Validates session ownership (organization_id, bot_id, visitor_id).
 * Delegates actual message saving to internal handlers.
 * Triggers AI response generation.
 *
 * Used by: Public widget during chat interaction
 * Access: public (no auth required)
 * Parameters: sessionId, organizationId, botId, visitorId (implicit), content
 * Returns: Message ID or { success: true, messageId }
 */
export const sendMessage = mutation({
  args: {
    sessionId: v.string(), // v.id("publicSessions") - but client doesn't know Convex types
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ VALIDATION 1: Verify session exists and matches provided IDs
    const session = await ctx.db
      .query("publicSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("_id"), args.sessionId as any),
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("botId"), args.botId),
          q.eq(q.field("visitorId"), args.visitorId),
        ),
      )
      .first();

    if (!session) {
      throw new Error(
        "Session not found or does not match provided organization/bot/visitor",
      );
    }

    // ✅ VALIDATION 2: Verify conversation still exists
    const conversation = await ctx.db.get(session.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // ✅ VALIDATION 3: Verify conversation status is active
    if (conversation.status !== "active") {
      throw new Error("Conversation is closed");
    }

    // ✅ SAVE: User message
    const userMessageId = await ctx.db.insert("messages", {
      conversation_id: session.conversationId,
      visitor_id: args.visitorId,
      role: "user",
      content: args.content,
      created_at: Date.now(),
      user_id: undefined, // Public visitor, no user_id
    });

    // ✅ TODO: Delegate to AI response handler (phase 4+)
    // This will:
    // - Fetch bot config
    // - Get conversation history
    // - Call AI provider
    // - Save bot response
    // - Log metrics

    return {
      success: true,
      messageId: userMessageId,
    };
  },
});
