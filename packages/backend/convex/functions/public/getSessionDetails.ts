import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import type { Id } from "../../_generated/dataModel.js";

/**
 * INTERNAL HELPER QUERY: Get session details with validation
 *
 * Used by: generateReply action for session validation
 * This query verifies that all provided IDs match before returning session data
 *
 * Parameters:
 * - sessionId: public session ID to retrieve
 * - organizationId: must match the session's organization
 * - botId: must match the session's bot
 * - visitorId: must match the session's visitor
 *
 * Returns: Session with conversationId if all validations pass, null otherwise
 */
export const getSessionDetails = query({
  args: {
    sessionId: v.string(),
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    // Query publicSessions table using the by_session_lookup index
    const sessions = await ctx.db
      .query("publicSessions")
      .withIndex("by_session_lookup", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("botId", args.botId)
          .eq("visitorId", args.visitorId),
      )
      .collect();

    // Find the specific session by ID
    const session = sessions.find((s) => String(s._id) === args.sessionId);

    if (!session) {
      return null;
    }

    if (session.status === "ended") {
      return null;
    }

    const conversation = await ctx.db.get(session.conversationId);
    if (!conversation) {
      return null;
    }

    if (
      String(conversation.bot_id) !== args.botId ||
      conversation.organization_id !== args.organizationId ||
      conversation.visitor_id !== args.visitorId
    ) {
      return null;
    }

    // Return session with conversationId for use in AI generation
    return {
      _id: session._id as Id<"publicSessions">,
      conversationId: session.conversationId as Id<"conversations">,
      organizationId: session.organizationId,
      botId: session.botId,
      visitorId: session.visitorId,
    };
  },
});
