import { v } from "convex/values";
import { mutation } from "../../_generated/server.js";
import { api } from "../../_generated/api.js";
import type { Id } from "../../_generated/dataModel.js";

// Helper function to format visitor name consistently
function formatAnonymousVisitorName(visitorId?: string): string {
  if (!visitorId) {
    return "anonymousid_unknown";
  }
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < visitorId.length; i += 1) {
    hash ^= visitorId.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `anonymousid_${hex.slice(0, 8)}`;
}

/**
 * PUBLIC MUTATION: Send a message in a public chat session
 *
 * No authentication required.
 * Validates session ownership (organization_id, bot_id, visitor_id).
 * Auto-creates/updates user record for visitor.
 * Delegates actual message saving to internal handlers.
 * Triggers AI response generation.
 *
 * Used by: Public widget during chat interaction
 * Access: public (no auth required)
 * Parameters: sessionId, organizationId, botId, visitorId (implicit), content
 * Returns: Message ID or { success: true, messageId }
 */
export const sendMessage = mutation({
  args: {
    sessionId: v.string(), // v.id("publicSessions") - but client doesn't know Convex types
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
    content: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: true; messageId: Id<"messages"> }> => {
    const session: {
      _id: Id<"publicSessions">;
      conversationId: Id<"conversations">;
      organizationId: string;
      botId: string;
      visitorId: string;
    } | null = await ctx.runQuery(api.public.getSessionDetails, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      botId: args.botId,
      visitorId: args.visitorId,
    });

    if (!session) {
      throw new Error(
        "Session not found or does not match provided organization/bot/visitor",
      );
    }

    // ✅ VALIDATION 2: Verify conversation still exists
    const conversation = await ctx.db.get(session.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // ✅ VALIDATION 3: Verify conversation is not closed
    if (conversation.status === "closed") {
      throw new Error("Conversation is closed");
    }

    // ✅ AUTO-CREATE/UPDATE USER for visitor
    // Check if user already exists for this visitor in this organization
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_org_and_identifier", (q) =>
        q
          .eq("organization_id", args.organizationId)
          .eq("identifier", args.visitorId),
      )
      .first();

    const now = Date.now();
    const userName = formatAnonymousVisitorName(args.visitorId);

    if (existingUser) {
      // Update last_active_at
      await ctx.db.patch(existingUser._id, {
        last_active_at: now,
      });
    } else {
      // Create new user record
      await ctx.db.insert("users", {
        organization_id: args.organizationId,
        identifier: args.visitorId,
        name: userName,
        created_at: now,
        last_active_at: now,
      });
    }

    // ✅ SAVE: User message
    const userMessageId = await ctx.db.insert("messages", {
      conversation_id: session.conversationId,
      visitor_id: args.visitorId,
      role: "user",
      content: args.content,
      created_at: Date.now(),
      user_id: undefined, // Public visitor, no user_id
    });

    // ✅ TODO: Delegate to AI response handler (phase 4+)
    // This will:
    // - Fetch bot config
    // - Get conversation history
    // - Call AI provider
    // - Save bot response
    // - Log metrics

    return {
      success: true,
      messageId: userMessageId,
    };
  },
});
