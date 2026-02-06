import { v } from "convex/values";
import { query } from "../../_generated/server.js";

/**
 * PUBLIC QUERY: Get all messages for a public chat session
 *
 * No authentication required.
 * Validates session ownership (organization_id, bot_id, visitor_id).
 * Returns all messages in conversation for widget rendering.
 *
 * Used by: Public widget to display chat history
 * Access: public (no auth required)
 * Parameters: sessionId, organizationId, botId, visitorId (implicit)
 * Returns: Array of Message objects with timestamps and content
 */
export const getMessages = query({
  args: {
    sessionId: v.string(), // v.id("publicSessions")
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
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

    // ✅ VALIDATION 2: Verify conversation exists
    const conversation = await ctx.db.get(session.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // ✅ FETCH: All messages in conversation
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversation_id", session.conversationId),
      )
      .collect();

    // ✅ RETURN: Formatted messages for widget
    return allMessages.map((msg) => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.created_at,
    }));
  },
});
