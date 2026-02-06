import { v } from "convex/values";
import { action } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";

/**
 * PUBLIC ACTION: Generate bot reply for public widget sessions
 *
 * This is the public-facing wrapper for the internal AI response generator.
 * Securely triggers AI response generation for public widget conversations.
 *
 * Security:
 * - Validates session ownership (sessionId must match organizationId, botId, visitorId)
 * - Retrieves conversation_id from publicSessions table
 * - Passes conversation_id + botId to internal generateBotResponse action
 * - Marks integration as "widget" for analytics
 *
 * Flow:
 * 1. Widget calls sendMessage → user message saved
 * 2. Widget immediately calls generateReply → AI generates response
 * 3. Internal generateBotResponse saves bot message automatically
 * 4. Widget subscribes to getMessages → sees new bot message
 *
 * Used by: Public widget after user message is sent
 * Access: public (no auth required, validated via session IDs)
 * Parameters: sessionId, organizationId, botId, visitorId, userMessage
 * Returns: { success: boolean; content?: string; model?: string; provider?: string; error?: string }
 */
export const generateReply = action({
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

    console.log(
      `[generateReply] Starting - sessionId: ${sessionId}, botId: ${botId}, visitorId: ${visitorId}`,
    );

    // ✅ VALIDATION 1: Verify session exists and matches all IDs
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
      const error = "Session validation failed - session not found or invalid";
      console.error(`[generateReply] ${error}`);
      return { success: false, error };
    }

    // ✅ VALIDATION 2: Verify conversation still exists and is active
    const conversationStatus = await ctx.runQuery(
      api.public.getConversationStatus,
      {
        conversationId: session.conversationId,
      },
    );

    if (!conversationStatus.exists) {
      const error = "Conversation not found";
      console.error(`[generateReply] ${error}`);
      return { success: false, error };
    }

    if (!conversationStatus.isActive) {
      const error = "Conversation is closed";
      console.error(`[generateReply] ${error}`);
      return { success: false, error };
    }

    // ✅ SECURITY: Use validated conversation_id and botId
    // Call the internal AI action with "widget" integration type
    try {
      console.log(
        `[generateReply] Calling internal generateBotResponse with integration: widget`,
      );

      const result: {
        success: boolean;
        content?: string;
        model?: string;
        provider?: string;
        error?: string;
      } = await ctx.runAction(api.ai.generateBotResponse, {
        botId: botId as any, // botId is a string from widget, will be converted to Id type
        conversationId: session.conversationId as any, // conversationId is validated but needs type casting
        userMessage,
        integration: "widget", // Track widget-specific responses for analytics
      });

      console.log(`[generateReply] ✓ AI response generated successfully`);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[generateReply] ERROR calling generateBotResponse:`,
        errorMessage,
      );
      return {
        success: false,
        error: `Failed to generate response: ${errorMessage}`,
      };
    }
  },
});
