import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import { Doc, Id } from "../../_generated/dataModel.js";

/**
 * PUBLIC MUTATION: Track business events (lead capture)
 *
 * Validates public session and records lead events for embed traffic only.
 */
export const trackEvent = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
    eventType: v.union(
      v.literal("lead_whatsapp_click"),
      v.literal("lead_email_click"),
    ),
    href: v.string(),
  },
  handler: async (ctx, args) => {
    const { sessionId, organizationId, botId, visitorId, eventType, href } =
      args;

    const session: {
      _id: string;
      conversationId: string;
      organizationId: string;
      botId: string;
      visitorId: string;
    } | null = await ctx.runQuery(api.public.getSessionDetails, {
      sessionId,
      organizationId,
      botId,
      visitorId,
    });

    if (!session) {
      throw new Error(
        "Session validation failed - session not found or invalid",
      );
    }

    const conversation: Doc<"conversations"> | null = await ctx.db.get(
      session.conversationId as Id<"conversations">,
    );
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (String(conversation.bot_id) !== botId) {
      throw new Error("Conversation does not belong to this bot");
    }

    if (conversation.integration !== "embed") {
      return { success: true, skipped: true, reason: "not_embed" };
    }

    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10); // UTC YYYY-MM-DD
    const dedupeKey = `${conversation._id}:${eventType}:${dayKey}`;

    const existing = await ctx.db
      .query("businessEvents")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
      .first();

    if (existing) {
      return { success: true, deduped: true };
    }

    await ctx.db.insert("businessEvents", {
      organizationId: conversation.organization_id || session.organizationId,
      botId: conversation.bot_id,
      conversationId: conversation._id,
      visitorId: conversation.visitor_id || session.visitorId,
      eventType,
      href,
      createdAt: now,
      dedupeKey,
    });

    return { success: true, deduped: false };
  },
});
