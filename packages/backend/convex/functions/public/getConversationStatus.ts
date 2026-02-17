import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import {
  assertConversationOwnedByVisitorSession,
  requireValidVisitorSession,
} from "../../lib/security.js";

/**
 * INTERNAL HELPER QUERY: Check conversation status
 *
 * Used by: generateReply action to verify conversation is still active
 * Checks that the conversation exists and has not been closed/archived
 *
 * Parameters:
 * - conversationId: the conversation to check
 *
 * Returns: { exists: boolean; isActive: boolean }
 */
export const getConversationStatus = query({
  args: {
    conversationId: v.string(),
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) {
      return { exists: false, isActive: false };
    }

    const conversation = await ctx.db.get(conversationId);

    if (!conversation) {
      return { exists: false, isActive: false };
    }

    try {
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });
    } catch {
      return { exists: false, isActive: false };
    }

    return {
      exists: true,
      isActive: (conversation as any).status !== "closed",
      botId: String(conversation.bot_id),
    };
  },
});
