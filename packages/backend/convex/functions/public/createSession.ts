import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";

function getNextUtcMidnight(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
}

function extractVisitorTimestamp(visitorId: string): number | null {
  if (!visitorId.startsWith("visitor_")) {
    return null;
  }
  const parts = visitorId.split("_");
  if (parts.length < 3) {
    return null;
  }
  const timestamp = Number(parts[1]);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isVisitorExpired(createdAt: number, now: number): boolean {
  if (!Number.isFinite(createdAt) || createdAt > now) {
    return true;
  }
  const expiresAt = getNextUtcMidnight(createdAt);
  return now >= expiresAt;
}

function generateVisitorId(now: number): string {
  return `visitor_${now}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * PUBLIC MUTATION: Create a new public chat session
 *
 * No authentication required.
 * Validates organization_id and bot_id.
 * Creates both a conversation (in DB) and a public session token.
 * Returns session ID and visitor ID for subsequent requests.
 *
 * Used by: Public widget embed script initialization
 * Access: public (no auth required)
 * Parameters: organizationId, botId, visitorId (optional, auto-generated if omitted)
 * Returns: { sessionId, conversationId, visitorId }
 */
export const createSession = mutation({
  args: {
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    sessionId: string;
    conversationId: string;
    visitorId: string;
  }> => {
    // ✅ VALIDATION 1: Verify bot exists and belongs to organization
    const botId = ctx.db.normalizeId("botProfiles", args.botId);
    if (!botId) {
      throw new Error("Bot not found or does not belong to this organization");
    }
    const botProfile = await ctx.db.get(botId);

    if (!botProfile || botProfile.organization_id !== args.organizationId) {
      throw new Error("Bot not found or does not belong to this organization");
    }

    // ✅ VALIDATION 2: Validate or generate visitor ID (midnight UTC TTL)
    if (args.visitorId) {
      const timestamp = extractVisitorTimestamp(args.visitorId);
      if (!timestamp || isVisitorExpired(timestamp, Date.now())) {
        throw new Error("Visitor ID expired; refresh required");
      }
    }

    const visitorId = args.visitorId || generateVisitorId(Date.now());

    if (args.visitorId) {
      const existingSessions = await ctx.db
        .query("publicSessions")
        .withIndex("by_session_lookup", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("botId", args.botId)
            .eq("visitorId", visitorId),
        )
        .collect();

      const activeSessions = existingSessions.filter(
        (session) => session.status !== "ended",
      );

      if (activeSessions.length > 0) {
        const latestSession = activeSessions.sort(
          (a, b) => b.createdAt - a.createdAt,
        )[0];

        if (latestSession) {
          const conversation = await ctx.db.get(latestSession.conversationId);
          if (conversation && conversation.status !== "closed") {
            return {
              sessionId: latestSession._id,
              conversationId: latestSession.conversationId,
              visitorId,
            };
          }

          if (latestSession.status !== "ended") {
            await ctx.db.patch(latestSession._id, {
              status: "ended",
              endedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // ✅ DELEGATION: Call internal createConversation (supports visitor_id)
    const conversationId: Id<"conversations"> = await ctx.runMutation(
      api.monitor.createConversation,
      {
        bot_id: botId,
        organization_id: args.organizationId,
        integration: "embed",
        topic: "Visitor Chat",
        visitor_id: visitorId,
      },
    );

    // ✅ CREATE: Public session record for stateless verification
    const sessionId: Id<"publicSessions"> = await ctx.db.insert(
      "publicSessions",
      {
        organizationId: args.organizationId,
        botId: args.botId,
        visitorId: visitorId,
        conversationId,
        createdAt: Date.now(),
        status: "active",
      },
    );

    return {
      sessionId,
      conversationId,
      visitorId,
    };
  },
});
