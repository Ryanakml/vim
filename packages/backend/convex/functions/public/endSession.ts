import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import { requireValidVisitorSession, logAudit } from "../../lib/security.js";

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
    conversationId: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "end_public_session",
        resource_type: "conversation",
        resource_id: args.conversationId,
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    await ctx.runMutation(api.monitor.closeConversation, {
      conversationId,
      sessionToken: args.sessionToken,
    });

    const session = await requireValidVisitorSession(ctx, {
      sessionToken: args.sessionToken,
      now: Date.now(),
    });

    await ctx.db.patch(session._id, {
      revoked: true,
    });

    await logAudit(ctx, {
      user_id: `visitor:${session.visitor_id}`,
      action: "end_public_session",
      resource_type: "visitorSession",
      resource_id: String(session._id),
      status: "success",
      changes: {
        before: { _id: session._id, revoked: session.revoked },
        after: { _id: session._id, revoked: true },
      },
    });

    return { success: true };
  },
});
