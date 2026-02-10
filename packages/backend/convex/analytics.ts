import { query } from "./_generated/server";
import { v } from "convex/values";
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

/**
 * Query: Get lead capture stats for a bot over a time period
 * ✅ Filtered to current user's bot
 */
export const getLeadStats = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const orgId = (identity.org_id as string | undefined) || undefined;

    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile) {
      throw new Error("Bot not found");
    }

    const isOwner = botProfile.user_id === userId;
    const isOrgMatch = Boolean(orgId) && botProfile.organization_id === orgId;

    if (!isOwner && !isOrgMatch) {
      throw new Error("Unauthorized: Cannot access other user's bot");
    }

    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;

    const events = await ctx.db
      .query("businessEvents")
      .withIndex("by_bot_createdAt", (q) =>
        q.eq("botId", args.botId).gte("createdAt", cutoff),
      )
      .collect();

    const leadsWhatsapp = events.filter(
      (e) => e.eventType === "lead_whatsapp_click",
    ).length;
    const leadsEmail = events.filter(
      (e) => e.eventType === "lead_email_click",
    ).length;

    return {
      leadsTotal: events.length,
      leadsWhatsapp,
      leadsEmail,
    };
  },
});
