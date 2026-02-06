import { query } from "./_generated/server";
import type { RegisteredQuery } from "convex/server";
import type { Doc } from "./_generated/dataModel";

/**
 * DashboardStats type for the returned analytics data
 */
export type DashboardStats = {
  totalUsers: number;
  totalConversations: number;
  activeConversations: number;
  latestConversations: Array<
    Doc<"conversations"> & {
      messageCount?: number;
      user?: Doc<"users"> | null;
    }
  >;
};

/**
 * Query: Get aggregated dashboard statistics
 * ✅ Automatically filtered to current user's data only
 *
 * Returns:
 * - totalUsers: Total number of conversation participants
 * - totalConversations: Total number of this user's conversations
 * - activeConversations: Count of conversations with "active" status
 * - latestConversations: Last 5 conversations sorted by desc, with participant & message count
 */
export const getDashboardStats: RegisteredQuery<
  "public",
  Record<string, never>,
  Promise<DashboardStats>
> = query(async (ctx): Promise<DashboardStats> => {
  // ✅ Get authenticated user
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }

  const userId = identity.subject;

  // ✅ Fetch only current user's conversations
  const userConversations = await ctx.db
    .query("conversations")
    .withIndex("by_user_id", (q) => q.eq("user_id", userId))
    .collect();

  // Calculate basic metrics
  const totalConversations = userConversations.length;
  const activeConversations = userConversations.filter(
    (c) => c.status === "active",
  ).length;

  // Get latest 5 conversations sorted by last_message_at descending
  const sortedConversations = [...userConversations].sort(
    (a, b) => b.last_message_at - a.last_message_at,
  );
  const latest = sortedConversations.slice(0, 5);

  // Enrich latest conversations with participant data and message count
  const enrichedLatest = await Promise.all(
    latest.map(async (conv) => {
      // Fetch participant (end user in chat) if participant_id exists
      const participant = conv.participant_id
        ? await ctx.db.get(conv.participant_id)
        : null;

      // Count messages in this conversation (filtered by user_id for added security)
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_user_id", (q) => q.eq("user_id", userId))
        .collect()
        .then((msgs) => msgs.filter((m) => m.conversation_id === conv._id));

      return {
        ...conv,
        messageCount: messages.length,
        user: participant,
      };
    }),
  );

  return {
    totalUsers: enrichedLatest.filter((c) => c.user).length,
    totalConversations,
    activeConversations,
    latestConversations: enrichedLatest,
  };
});
