import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import type { Id } from "../../_generated/dataModel.js";
import {
  assertConversationOwnedByVisitorSession,
  requireValidVisitorSession,
} from "../../lib/security.js";

/**
 * HELPER QUERY: Validate a sessionToken against a conversation
 *
 * Used by: generateReply action for session validation
 * This query verifies that all provided IDs match before returning session data
 *
 * Parameters:
 * - sessionToken: visitor session token
 * - conversationId: conversation to validate
 *
 * Returns: Minimal session details if validation passes, null otherwise
 */
export const getSessionDetails = query({
  args: {
    sessionToken: v.string(),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversationId = ctx.db.normalizeId(
      "conversations",
      args.conversationId,
    );
    if (!conversationId) return null;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;

    try {
      const session = await requireValidVisitorSession(ctx, {
        sessionToken: args.sessionToken,
        now: Date.now(),
      });

      await assertConversationOwnedByVisitorSession(ctx, {
        conversation,
        session,
      });

      return {
        conversationId: conversation._id as Id<"conversations">,
        botId: conversation.bot_id,
      };
    } catch {
      return null;
    }
  },
});
