import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";

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
    const botProfile = await ctx.db
      .query("botProfiles")
      .filter((q) =>
        q.and(
          q.eq(q.field("_id"), args.botId),
          q.eq(q.field("organization_id"), args.organizationId),
        ),
      )
      .first();

    if (!botProfile) {
      throw new Error("Bot not found or does not belong to this organization");
    }

    // ✅ VALIDATION 2: Generate or use provided visitor ID
    const visitorId =
      args.visitorId ||
      `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ DELEGATION: Call internal createConversation (supports visitor_id)
    const conversationId: string = await ctx.runMutation(
      api.monitor.createConversation,
      {
        bot_id: args.botId as any, // botId is v.id("botProfiles")
        organization_id: args.organizationId,
        integration: "embed",
        topic: "Visitor Chat",
        visitor_id: visitorId,
      },
    );

    // ✅ CREATE: Public session record for stateless verification
    const sessionId: string = await ctx.db.insert("publicSessions" as any, {
      organizationId: args.organizationId,
      botId: args.botId,
      visitorId: visitorId,
      conversationId: conversationId,
      createdAt: Date.now(),
    });

    return {
      sessionId,
      conversationId,
      visitorId,
    };
  },
});
