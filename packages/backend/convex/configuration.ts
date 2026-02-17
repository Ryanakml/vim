import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server.js";
import { logAudit } from "./lib/security.js";
import {
  decryptSecretFromStorage,
  encryptSecretForStorage,
} from "./secrets.js";

// ===== CONFIGURATION =====

/**
 * Get bot configuration for the Configuration tab
 * Returns model provider, model ID, system prompt, temperature, max_tokens, api_key
 */
export const getBotConfig: ReturnType<typeof query> = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    const profile = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .first();

    if (!profile) {
      return null;
    }

    const hasApiKey = Boolean(profile.api_key);

    return {
      id: profile._id,
      model_provider: profile.model_provider || null,
      model_id: profile.model_id || null,
      has_api_key: hasApiKey,
      system_prompt: profile.system_prompt || null,
      temperature: profile.temperature ?? null,
      max_tokens: profile.max_tokens ?? null,
      escalation: {
        enabled: profile.escalation?.enabled ?? false,
        whatsapp: profile.escalation?.whatsapp ?? "",
        email: profile.escalation?.email ?? "",
      },
    };
  },
});

/**
 * INTERNAL: Get bot configuration by bot profile ID.
 *
 * Used by server-side/public flows (e.g., widget reply generation) where the caller
 * has already validated bot ownership/session and needs access to api_key.
 */
export const getBotConfigByBotId = internalQuery({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.botId);
    if (!profile) return null;

    const apiKey = await decryptSecretFromStorage(profile.api_key || null);

    return {
      id: profile._id,
      model_provider: profile.model_provider || null,
      model_id: profile.model_id || null,
      api_key: apiKey,
      system_prompt: profile.system_prompt || null,
      temperature: profile.temperature ?? null,
      max_tokens: profile.max_tokens ?? null,
      escalation: {
        enabled: profile.escalation?.enabled ?? false,
        whatsapp: profile.escalation?.whatsapp ?? "",
        email: profile.escalation?.email ?? "",
      },
    };
  },
});

/**
 * Update bot configuration with smart defaults
 * If user updates from "General" tab only, system sets default temperature (0.7) and max_tokens (1000)
 * If user updates from "Advanced" tab, they override these defaults and preserve existing values
 *
 * Parameters:
 * - model_provider: string (e.g., "Google AI", "OpenAI", "Anthropic", "Groq")
 * - model_id: string (e.g., "gemini-2.5-flash", "gpt-4o")
 * - api_key: string (encrypted API key for the selected model)
 * - system_prompt: string
 * - temperature: optional number (only sent from Advanced tab)
 * - max_tokens: optional number (only sent from Advanced tab)
 * - isAdvancedMode: boolean (indicates if user is saving from Advanced tab)
 */
export const updateBotConfig: ReturnType<typeof mutation> = mutation({
  args: {
    model_provider: v.optional(v.union(v.string(), v.null())),
    model_id: v.optional(v.union(v.string(), v.null())),
    api_key: v.optional(v.union(v.string(), v.null())),
    system_prompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    max_tokens: v.optional(v.number()),
    isAdvancedMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_bot_config",
        resource_type: "botProfile",
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    const profile = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .first();

    if (!profile) {
      await logAudit(ctx, {
        user_id: userId,
        organization_id: (identity.org_id as string | undefined) || undefined,
        action: "update_bot_config",
        resource_type: "botProfile",
        status: "error",
        error_message:
          "Bot profile not found. Visit Webchat → Bot Profile once to initialize your bot.",
      });
      throw new Error(
        "Bot profile not found. Visit Webchat → Bot Profile once to initialize your bot.",
      );
    }

    const {
      model_provider,
      model_id,
      api_key,
      system_prompt,
      temperature,
      max_tokens,
      isAdvancedMode,
    } = args;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: Date.now(),
    };

    // Add provided fields from General tab
    // Distinguish undefined (not sent) from null (explicitly cleared)
    if (model_provider !== undefined) updates.model_provider = model_provider;
    if (model_id !== undefined) updates.model_id = model_id;
    if (api_key !== undefined) {
      if (api_key === null) {
        updates.api_key = null;
      } else {
        const encrypted = await encryptSecretForStorage(api_key);
        updates.api_key = encrypted;
      }
    }
    if (system_prompt !== undefined) updates.system_prompt = system_prompt;

    // Smart defaults: if not in advanced mode, ensure defaults are set
    if (!isAdvancedMode) {
      // From General tab: only update temperature/max_tokens if not already set
      if (temperature === undefined && profile.temperature === undefined) {
        updates.temperature = 0.7; // Default temperature
      } else if (temperature !== undefined) {
        updates.temperature = temperature;
      }
      if (max_tokens === undefined && profile.max_tokens === undefined) {
        updates.max_tokens = 1000; // Default max tokens
      } else if (max_tokens !== undefined) {
        updates.max_tokens = max_tokens;
      }
      // If already set in Advanced tab, DO NOT overwrite
    } else {
      // In advanced mode, apply provided values (do not overwrite with defaults)
      if (temperature !== undefined) updates.temperature = temperature;
      if (max_tokens !== undefined) updates.max_tokens = max_tokens;
    }

    const before = profile;

    let auditLogged = false;
    try {
      // Update the profile
      await ctx.db.patch(profile._id, updates);

      await logAudit(ctx, {
        user_id: userId,
        organization_id: profile.organization_id,
        action: "update_bot_config",
        resource_type: "botProfile",
        resource_id: String(profile._id),
        status: "success",
        changes: {
          before,
          after: { ...before, ...updates },
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
          action: "update_bot_config",
          resource_type: "botProfile",
          resource_id: String(profile._id),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }

    return {
      success: true,
      id: profile._id,
    };
  },
});

/**
 * Update structured escalation configuration
 * Stores WhatsApp + Email contact info separately from system prompt
 */
export const updateEscalationConfig: ReturnType<typeof mutation> = mutation({
  args: {
    enabled: v.boolean(),
    whatsapp: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await logAudit(ctx, {
        user_id: "unauthenticated",
        action: "update_escalation_config",
        resource_type: "botProfile",
        status: "denied",
        error_message: "Unauthorized: Must be logged in",
      });
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    const profile = await ctx.db
      .query("botProfiles")
      .withIndex("by_user_id", (q) => q.eq("user_id", userId))
      .first();

    if (!profile) {
      await logAudit(ctx, {
        user_id: userId,
        organization_id: (identity.org_id as string | undefined) || undefined,
        action: "update_escalation_config",
        resource_type: "botProfile",
        status: "error",
        error_message:
          "Bot profile not found. Visit Webchat → Bot Profile once to initialize your bot.",
      });
      throw new Error(
        "Bot profile not found. Visit Webchat → Bot Profile once to initialize your bot.",
      );
    }

    const whatsappRaw = (args.whatsapp || "").trim();
    const emailRaw = (args.email || "").trim();
    const whatsappDigits = whatsappRaw.replace(/\D/g, "");

    if (args.enabled) {
      if (!whatsappDigits) {
        throw new Error("WhatsApp number is required when escalation is on.");
      }
      if (!emailRaw || !emailRaw.includes("@")) {
        throw new Error("Valid email is required when escalation is on.");
      }
    }

    const before = profile;
    const patch = {
      escalation: {
        enabled: args.enabled,
        whatsapp: whatsappRaw,
        email: emailRaw,
      },
      updated_at: Date.now(),
    };

    let auditLogged = false;
    try {
      await ctx.db.patch(profile._id, patch);

      await logAudit(ctx, {
        user_id: userId,
        organization_id: profile.organization_id,
        action: "update_escalation_config",
        resource_type: "botProfile",
        resource_id: String(profile._id),
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
          action: "update_escalation_config",
          resource_type: "botProfile",
          resource_id: String(profile._id),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }

    return { success: true, id: profile._id };
  },
});
