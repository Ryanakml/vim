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
    conversationId: v.string(),
    sessionToken: v.string(),
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
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) {
      throw new Error("Conversation not found");
    }

    const allMessages = await ctx.runQuery(
      api.monitor.getConversationMessages,
      {
        conversationId,
        sessionToken: args.sessionToken,
      },
    );

    // ✅ RETURN: Formatted messages for widget
    return allMessages.map((msg) => ({
      id: msg._id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.created_at,
    }));
  },
});
