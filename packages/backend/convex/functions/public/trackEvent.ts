import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import {
  assertConversationOwnedByVisitorSession,
  requireValidVisitorSession,
  logAudit,
} from "../../lib/security.js";
import { Doc, Id } from "../../_generated/dataModel.js";

/**
 * PUBLIC MUTATION: Track business events (lead capture)
 *
 * Validates public session and records lead events for embed traffic only.
 */
export const trackEvent = mutation({
  args: {
    conversationId: v.string(),
    sessionToken: v.string(),
    eventType: v.union(
      v.literal("lead_whatsapp_click"),
      v.literal("lead_email_click"),
    ),
    href: v.string(),
  },
  handler: async (ctx, args) => {
    const {
      conversationId: conversationIdString,
      sessionToken,
      eventType,
      href,
    } = args;

    const conversationId = ctx.db.normalizeId(
      "conversations",
      conversationIdString,
    );
    if (!conversationId) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "track_business_event",
        resource_type: "conversation",
        resource_id: conversationIdString,
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    const conversation: Doc<"conversations"> | null = await ctx.db.get(
      conversationId as Id<"conversations">,
    );
    if (!conversation) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "track_business_event",
        resource_type: "conversation",
        resource_id: String(conversationId),
        status: "error",
        error_message: "Conversation not found",
      });
      throw new Error("Conversation not found");
    }

    const session = await requireValidVisitorSession(ctx, {
      sessionToken,
      now: Date.now(),
    });

    await assertConversationOwnedByVisitorSession(ctx, {
      conversation,
      session,
    });

    const auditUserId = `visitor:${session.visitor_id}`;

    if (conversation.integration !== "embed") {
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: conversation.organization_id,
        action: "track_business_event",
        resource_type: "conversation",
        resource_id: String(conversation._id),
        status: "success",
        changes: {
          before: null,
          after: { skipped: true, reason: "not_embed" },
        },
      });
      return { success: true, skipped: true, reason: "not_embed" };
    }

    if (!conversation.organization_id) {
      await logAudit(ctx, {
        user_id: auditUserId,
        action: "track_business_event",
        resource_type: "conversation",
        resource_id: String(conversation._id),
        status: "error",
        error_message: "Organization not found",
      });
      throw new Error("Organization not found");
    }

    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10); // UTC YYYY-MM-DD
    const dedupeKey = `${conversation._id}:${eventType}:${dayKey}`;

    const existing = await ctx.db
      .query("businessEvents")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
      .first();

    if (existing) {
      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: conversation.organization_id,
        action: "track_business_event",
        resource_type: "businessEvent",
        resource_id: String(existing._id),
        status: "success",
        changes: {
          before: { dedupeKey },
          after: { deduped: true },
        },
      });
      return { success: true, deduped: true };
    }

    const eventId = await ctx.db.insert("businessEvents", {
      organizationId: conversation.organization_id,
      botId: conversation.bot_id,
      conversationId: conversation._id,
      visitorId: session.visitor_id,
      eventType,
      href,
      createdAt: now,
      dedupeKey,
    });

    await logAudit(ctx, {
      user_id: auditUserId,
      organization_id: conversation.organization_id,
      action: "track_business_event",
      resource_type: "businessEvent",
      resource_id: String(eventId),
      status: "success",
      changes: {
        before: null,
        after: { eventType, href },
      },
    });

    return { success: true, deduped: false };
  },
});
