import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import {
  createVisitorSession,
  logAudit,
  requireValidEmbedToken,
  requireBotProfile,
} from "../../lib/security.js";
import type { Id } from "../../_generated/dataModel.js";

function generateVisitorId(now: number): string {
  return `visitor_${now}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * PUBLIC MUTATION: Create a new public chat session
 *
 * No authentication required.
 * Validates organization_id and bot_id.
 * Creates a visitor sessionToken and a conversation.
 * Returns { conversationId, sessionToken, expiresAt }.
 *
 * Used by: Public widget embed script initialization
 * Access: public (no auth required)
 * Parameters: organizationId, botId
 * Returns: { conversationId, sessionToken, expiresAt }
 */
export const createSession = mutation({
  args: {
    token: v.string(),
    currentDomain: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    conversationId: string;
    sessionToken: string;
    expiresAt: number;
  }> => {
    let embedToken: Awaited<ReturnType<typeof requireValidEmbedToken>> | null =
      null;
    let botProfile: Awaited<ReturnType<typeof requireBotProfile>> | null = null;
    try {
      embedToken = await requireValidEmbedToken(ctx, {
        token: args.token,
        currentDomain: args.currentDomain,
      });
      botProfile = await requireBotProfile(ctx, embedToken.bot_id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await logAudit(ctx, {
        user_id: "unauthenticated",
        organization_id: undefined,
        action: "create_public_session",
        resource_type: "embedToken",
        resource_id: "(redacted)",
        status: "denied",
        error_message: errorMessage,
      });
      throw error;
    }

    const now = Date.now();
    const visitorId = generateVisitorId(now);

    const { sessionToken, expiresAt } = await createVisitorSession(ctx, {
      botId: botProfile._id,
      visitorId,
      now,
    });

    const conversationId: Id<"conversations"> = await ctx.runMutation(
      api.monitor.createConversation,
      {
        bot_id: botProfile._id,
        integration: "embed",
        topic: "Visitor Chat",
        sessionToken,
      },
    );

    await logAudit(ctx, {
      user_id: `visitor:${visitorId}`,
      organization_id: botProfile.organization_id,
      action: "create_public_session",
      resource_type: "conversation",
      resource_id: String(conversationId),
      status: "success",
      changes: {
        before: null,
        after: {
          botId: String(botProfile._id),
          conversationId: String(conversationId),
        },
      },
    });

    return {
      conversationId,
      sessionToken,
      expiresAt,
    };
  },
});
