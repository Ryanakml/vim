import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";

/**
 * PUBLIC MUTATION: End a public chat session
 *
 * No authentication required.
 * Validates session ownership via organizationId and botId.
 * Marks the session as "ended" without deleting data (admin can still review).
 *
 * Used by: Widget refresh/restart button and session cleanup
 * Access: public (no auth required)
 * Parameters: sessionId, organizationId, botId
 * Returns: { success: boolean }
 */
export const endSession = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.string(),
    botId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // ✅ VALIDATION: Look up the session in publicSessions table
    const session = await ctx.db
      .query("publicSessions")
      .filter((q) =>
        q.and(
          q.eq(q.field("_id"), args.sessionId),
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("botId"), args.botId),
        ),
      )
      .first();

    if (!session) {
      throw new Error(
        "Session not found or does not belong to this organization/bot",
      );
    }

    // ✅ UPDATE: Mark session as ended (don't delete for admin review)
    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});
