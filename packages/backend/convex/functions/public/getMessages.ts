import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";

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
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      id: Id<"messages">;
      role: string;
      content: string;
      createdAt: number;
    }>
  > => {
    const session: {
      _id: Id<"publicSessions">;
      conversationId: Id<"conversations">;
      organizationId: string;
      botId: string;
      visitorId: string;
    } | null = await ctx.runQuery(api.public.getSessionDetails, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      botId: args.botId,
      visitorId: args.visitorId,
    });

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
