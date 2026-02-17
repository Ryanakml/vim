import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";
import { requireValidVisitorSession, logAudit } from "../../lib/security.js";

/**
 * PUBLIC MUTATION: Send a message in a public chat session
 *
 * No authentication required.
 * Validates session ownership (organization_id, bot_id, visitor_id).
 * Auto-creates/updates user record for visitor.
 * Delegates actual message saving to internal handlers.
 * Triggers AI response generation.
 *
 * Used by: Public widget during chat interaction
 * Access: public (no auth required)
 * Parameters: conversationId, sessionToken, content
 * Returns: Message ID or { success: true, messageId }
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.string(),
    sessionToken: v.string(),
    content: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: true; messageId: Id<"messages"> }> => {
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "public_send_message",
        resource_type: "conversation",
        resource_id: args.conversationId,
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    const session = await requireValidVisitorSession(ctx, {
      sessionToken: args.sessionToken,
      now: Date.now(),
    });

    const userMessageId: Id<"messages"> = await ctx.runMutation(
      api.monitor.addMessage,
      {
        conversation_id: conversationId,
        role: "user",
        content: args.content,
        sessionToken: args.sessionToken,
      },
    );

    await logAudit(ctx, {
      user_id: `visitor:${session.visitor_id}`,
      organization_id: (session as any).organization_id as string | undefined,
      action: "public_send_message",
      resource_type: "message",
      resource_id: String(userMessageId),
      status: "success",
      changes: {
        before: null,
        after: {
          conversationId: String(conversationId),
          messageId: String(userMessageId),
        },
      },
    });

    return {
      success: true,
      messageId: userMessageId,
    };
  },
});
