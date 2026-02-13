import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";

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
    visitorId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
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
        "Session not found or does not belong to this organization/bot",
      );
    }

    // ✅ UPDATE: Mark session as ended (don't delete for admin review)
    await ctx.db.patch(session._id, {
      status: "ended",
      endedAt: new Date().toISOString(),
    });

    const conversation = await ctx.db.get(session.conversationId);
    if (conversation && conversation.status !== "closed") {
      await ctx.db.patch(session.conversationId, {
        status: "closed",
        updated_at: Date.now(),
      });
    }

    return { success: true };
  },
});
