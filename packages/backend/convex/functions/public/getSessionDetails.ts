import { v } from "convex/values";
import { query } from "../../_generated/server.js";

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
    // Query for session matching all provided IDs
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
      return null;
    }

    // Return session with conversationId for use in AI generation
    return {
      _id: session._id,
      conversationId: session.conversationId,
      organizationId: session.organizationId,
      botId: session.botId,
      visitorId: session.visitorId,
    };
  },
});
