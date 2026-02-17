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
    conversationId: v.string(),
    sessionToken: v.string(),
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
    const { conversationId, sessionToken, userMessage } = args;

    const conversationStatus: {
      exists: boolean;
      isActive: boolean;
      botId?: string;
    } = await ctx.runQuery(api.public.getConversationStatus, {
      conversationId,
      sessionToken,
    });

    if (!conversationStatus.exists) {
      return { success: false, error: "Conversation not found" };
    }

    if (!conversationStatus.isActive) {
      return { success: false, error: "Conversation is closed" };
    }

    if (!conversationStatus.botId) {
      return { success: false, error: "Conversation bot not found" };
    }

    // Delegate to unified streaming generator
    return await ctx.runAction(api.ai.generateBotResponseStream, {
      botId: conversationStatus.botId as any,
      conversationId: conversationId as any,
      userMessage,
      integration: "widget",
    });
  },
});
