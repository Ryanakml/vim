import { v } from "convex/values";
import { action } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";

/**
 * PUBLIC ACTION: Generate bot reply with "streaming" updates for widget sessions.
 *
 * Streaming is implemented by incrementally updating a single bot message in the DB,
 * which the widget receives via the existing getMessages subscription.
 */
export const generateReplyStream = action({
  args: {
    sessionId: v.string(),
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
    userMessage: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    content?: string;
    model?: string;
    provider?: string;
    error?: string;
  }> => {
    const { sessionId, organizationId, botId, visitorId, userMessage } = args;

    // Validate session
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
      return {
        success: false,
        error: "Session validation failed - session not found or invalid",
      };
    }

    const conversationStatus = await ctx.runQuery(
      api.public.getConversationStatus,
      { conversationId: session.conversationId },
    );

    if (!conversationStatus.exists) {
      return { success: false, error: "Conversation not found" };
    }

    if (!conversationStatus.isActive) {
      return { success: false, error: "Conversation is closed" };
    }

    // Delegate to unified streaming generator
    return await ctx.runAction(api.ai.generateBotResponseStream, {
      botId: botId as any,
      conversationId: session.conversationId as any,
      userMessage,
      integration: "widget",
    });
  },
});
