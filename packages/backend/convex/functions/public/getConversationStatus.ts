import { v } from "convex/values";
import { query } from "../../_generated/server.js";

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
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId as any);

    if (!conversation) {
      return { exists: false, isActive: false };
    }

    return {
      exists: true,
      isActive: (conversation as any).status !== "closed",
    };
  },
});
