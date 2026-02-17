import { v } from "convex/values";
import { query } from "../../_generated/server.js";
import {
  requireValidEmbedToken,
  requireBotProfile,
} from "../../lib/security.js";

/**
 * PUBLIC QUERY: Validate an embed token and return ONLY public bot config.
 *
 * `currentDomain` should be derived from an unspoofable browser source when possible
 * (e.g. `document.referrer` hostname from inside the widget iframe).
 */
export const validateEmbedToken = query({
  args: {
    token: v.string(),
    currentDomain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const embedToken = await requireValidEmbedToken(ctx, {
      token: args.token,
      currentDomain: args.currentDomain,
    });

    const botProfile = await requireBotProfile(ctx, embedToken.bot_id);

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
        enableMarkdown: true,
      },
    };
  },
});
