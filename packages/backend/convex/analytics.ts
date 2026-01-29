import { query } from "./_generated/server";
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
 *
 * Returns:
 * - totalUsers: Total number of users in the system
 * - totalConversations: Total number of conversations
 * - activeConversations: Count of conversations with "active" status
 * - latestConversations: Last 5 conversations sorted by desc, with user & message count
 */
export const getDashboardStats = query(async (ctx): Promise<DashboardStats> => {
  // Fetch all users and conversations
  const users = await ctx.db.query("users").collect();
  const conversations = await ctx.db.query("conversations").collect();

  // Calculate basic metrics
  const totalUsers = users.length;
  const totalConversations = conversations.length;
  const activeConversations = conversations.filter(
    (c) => c.status === "active",
  ).length;

  // Get latest 5 conversations sorted by last_message_at descending
  const sortedConversations = [...conversations].sort(
    (a, b) => b.last_message_at - a.last_message_at,
  );
  const latest = sortedConversations.slice(0, 5);

  // Enrich latest conversations with user data and message count
  const enrichedLatest = await Promise.all(
    latest.map(async (conv) => {
      // Fetch user if user_id exists
      const user = conv.user_id ? await ctx.db.get(conv.user_id) : null;

      // Count messages in this conversation
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversation_id", conv._id))
        .collect();

      return {
        ...conv,
        messageCount: messages.length,
        user,
      };
    }),
  );

  return {
    totalUsers,
    totalConversations,
    activeConversations,
    latestConversations: enrichedLatest,
  };
});
