import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.js";
import { logAudit } from "./lib/security.js";

// ===== BOT PROFILES =====

// Get single bot profile for current authenticated user
export const getBotProfile = query({
  handler: async (ctx) => {
    // ✅ Get authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject; // Clerk user ID

    // ✅ Filter by user_id - get only current user's profile
    const profilesWithUserId = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .collect();

    if (profilesWithUserId.length > 0) {
      const profile = profilesWithUserId[0];
      if (profile) {
        const hasApiKey = Boolean(profile.api_key);
        return {
          ...profile,
          api_key: null,
          has_api_key: hasApiKey,
        };
      }
    }

    // ⚠️ Fallback: If no profile exists, return null (ensureBotProfile will create one)
    return null;
  },
});

// Create initial profile if doesn't exist
export const ensureBotProfile = mutation({
  handler: async (ctx): Promise<Id<"botProfiles">> => {
    // ✅ Get authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "ensure_bot_profile",
        resource_type: "botProfile",
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const organizationId = (identity.org_id as string | undefined) || undefined;

    // ✅ Check if profile already exists for this user
    const existing = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .collect();

    if (existing.length > 0) {
      const profile = existing[0];
      if (!profile) {
        await logAudit(ctx, {
          user_id: userId,
          organization_id: organizationId,
          action: "ensure_bot_profile",
          resource_type: "botProfile",
          status: "error",
          error_message: "Invariant: existing bot profile missing",
        });
        throw new Error("Invariant: existing bot profile missing");
      }
      await logAudit(ctx, {
        user_id: userId,
        organization_id: organizationId,
        action: "ensure_bot_profile",
        resource_type: "botProfile",
        resource_id: String(profile._id),
        status: "success",
        changes: {
          before: { _id: profile._id },
          after: { _id: profile._id },
        },
      });
      return profile._id;
    }

    let auditLogged = false;
    try {
      const id = await ctx.db.insert("botProfiles", {
        user_id: userId,
        organization_id: organizationId,
        avatar_url: "",
        bot_names: "My Bot",
        bot_description: "",
        msg_placeholder: "Type your message...",
        primary_color: "#3276EA",
        font: "inter",
        theme_mode: "light",
        header_style: "basic",
        message_style: "filled",
        corner_radius: 16,
        enable_feedback: false,
        enable_file_upload: false,
        enable_sound: false,
        history_reset: "never",
        escalation: {
          enabled: false,
          whatsapp: "",
          email: "",
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: userId,
        organization_id: organizationId,
        action: "create_bot_profile",
        resource_type: "botProfile",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: { _id: id },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: userId,
          organization_id: organizationId,
          action: "create_bot_profile",
          resource_type: "botProfile",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

// Update bot profile (all fields optional)
export const updateBotProfile = mutation({
  args: {
    id: v.id("botProfiles"),
    avatar_url: v.optional(v.string()),
    bot_names: v.optional(v.string()),
    bot_description: v.optional(v.string()),
    msg_placeholder: v.optional(v.string()),
    primary_color: v.optional(v.string()),
    font: v.optional(v.string()),
    theme_mode: v.optional(v.string()),
    header_style: v.optional(v.string()),
    message_style: v.optional(v.string()),
    corner_radius: v.optional(v.number()),
    enable_feedback: v.optional(v.boolean()),
    enable_file_upload: v.optional(v.boolean()),
    enable_sound: v.optional(v.boolean()),
    history_reset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✅ Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_bot_profile",
        resource_type: "botProfile",
        resource_id: String(args.id),
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const { id, ...updates } = args;

    // ✅ Verify this profile belongs to the authenticated user
    const profile = await ctx.db.get(id);
    if (!profile) {
      await logAudit(ctx, {
        user_id: userId,
        organization_id: (identity.org_id as string | undefined) || undefined,
        action: "update_bot_profile",
        resource_type: "botProfile",
        resource_id: String(id),
        status: "error",
        error_message: "Profile not found",
      });
      throw new Error("Profile not found");
    }
    if (profile.user_id !== userId) {
      await logAudit(ctx, {
        user_id: userId,
        organization_id: (identity.org_id as string | undefined) || undefined,
        action: "update_bot_profile",
        resource_type: "botProfile",
        resource_id: String(id),
        status: "denied",
        error_message: "Unauthorized: Cannot update other user's profile",
      });
      throw new Error("Unauthorized: Cannot update other user's profile");
    }

    const before = profile;
    const patch = {
      ...updates,
      updated_at: Date.now(),
    };

    let auditLogged = false;
    try {
      await ctx.db.patch(id, patch);
      await logAudit(ctx, {
        user_id: userId,
        organization_id: profile.organization_id,
        action: "update_bot_profile",
        resource_type: "botProfile",
        resource_id: String(id),
        status: "success",
        changes: {
          before,
          after: { ...before, ...patch },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: userId,
          organization_id: profile.organization_id,
          action: "update_bot_profile",
          resource_type: "botProfile",
          resource_id: String(id),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

// Get all bot profiles for current user (no longer returns all profiles)
export const getBotProfiles = query({
  handler: async (ctx) => {
    // ✅ Get authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Return only current user's profiles
    const profiles = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .collect();

    return profiles.map((profile) => ({
      ...profile,
      api_key: null,
      has_api_key: Boolean(profile.api_key),
    }));
  },
});

// Insert bot profile (legacy, replaced by ensureBotProfile + updateBotProfile)
export const updateBotProfiles = mutation({
  args: {
    avatar_url: v.string(),
    bot_names: v.string(),
    bot_description: v.string(),
    msg_placeholder: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user's identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "create_bot_profile_legacy",
        resource_type: "botProfile",
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const organizationId = (identity.org_id as string | undefined) || undefined;

    let auditLogged = false;
    try {
      const id = await ctx.db.insert("botProfiles", {
        user_id: userId,
        organization_id: organizationId,
        avatar_url: args.avatar_url,
        bot_names: args.bot_names,
        bot_description: args.bot_description,
        msg_placeholder: args.msg_placeholder,
        primary_color: "#3276EA",
        font: "inter",
        theme_mode: "light",
        header_style: "basic",
        message_style: "filled",
        corner_radius: 16,
        enable_feedback: false,
        enable_file_upload: false,
        enable_sound: false,
        history_reset: "never",
        escalation: {
          enabled: false,
          whatsapp: "",
          email: "",
        },
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      await logAudit(ctx, {
        user_id: userId,
        organization_id: organizationId,
        action: "create_bot_profile_legacy",
        resource_type: "botProfile",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: { _id: id },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: userId,
          organization_id: organizationId,
          action: "create_bot_profile_legacy",
          resource_type: "botProfile",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});
