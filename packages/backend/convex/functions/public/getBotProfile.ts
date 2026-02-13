import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import { Id } from "../../_generated/dataModel.js";

/**
 * PUBLIC QUERY: Get bot profile for embed widget
 *
 * No authentication required.
 * Validates organization_id and bot_id to ensure the bot exists.
 * Returns full profile configuration for widget rendering.
 *
 * Used by: Public widget embed script
 * Access: public (no auth required)
 * Parameters: organization_id, bot_id
 * Returns: BotProfile with all configuration
 */
export const getBotProfile = query({
  args: {
    organizationId: v.string(),
    botId: v.string(),
  },
  handler: async (ctx, args) => {
    const botProfile = await ctx.db.get(args.botId as Id<"botProfiles">);

    if (!botProfile || botProfile.organization_id !== args.organizationId) {
      throw new Error("Bot not found or organization mismatch");
    }

    // ✅ RETURN: Full profile for widget configuration
    return {
      id: botProfile._id,
      organizationId: botProfile.organization_id,
      profile: {
        displayName: botProfile.bot_names,
        description: botProfile.bot_description,
        placeholder: botProfile.msg_placeholder,
        avatarUrl: botProfile.avatar_url,
      },
      appearance: {
        primaryColor: botProfile.primary_color,
        font: botProfile.font,
        themeMode: botProfile.theme_mode,
        cornerRadius: botProfile.corner_radius,
        headerStyle: botProfile.header_style,
        messageStyle: botProfile.message_style,
      },
      features: {
        enableFeedback: botProfile.enable_feedback,
        enableFileUpload: botProfile.enable_file_upload,
        enableSound: botProfile.enable_sound,
        enableMarkdown: true, // Default to enabled for markdown rendering
      },
    };
  },
});
