import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// ===== CONFIGURATION =====

/**
 * Get bot configuration for the Configuration tab
 * Returns model provider, model ID, system prompt, temperature, max_tokens, api_key
 */
export const getBotConfig = query({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("botProfiles").collect();
    const profile = profiles[0];

    if (!profile) {
      return null;
    }

    return {
      id: profile._id,
      model_provider: profile.model_provider || null,
      model_id: profile.model_id || null,
      api_key: profile.api_key || null,
      system_prompt: profile.system_prompt || null,
      temperature: profile.temperature ?? null,
      max_tokens: profile.max_tokens ?? null,
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
 * - model_id: string (e.g., "gemini-2.5-pro", "gpt-4o")
 * - api_key: string (encrypted API key for the selected model)
 * - system_prompt: string
 * - temperature: optional number (only sent from Advanced tab)
 * - max_tokens: optional number (only sent from Advanced tab)
 * - isAdvancedMode: boolean (indicates if user is saving from Advanced tab)
 */
export const updateBotConfig = mutation({
  args: {
    model_provider: v.optional(v.string()),
    model_id: v.optional(v.string()),
    api_key: v.optional(v.string()),
    system_prompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    max_tokens: v.optional(v.number()),
    isAdvancedMode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the first (and typically only) bot profile
    const profiles = await ctx.db.query("botProfiles").collect();
    const profile = profiles[0];

    if (!profile) {
      throw new Error("Bot profile not found");
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
    if (model_provider !== undefined) updates.model_provider = model_provider;
    if (model_id !== undefined) updates.model_id = model_id;
    if (api_key !== undefined) updates.api_key = api_key;
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

    // Update the profile
    await ctx.db.patch(profile._id, updates);

    return {
      success: true,
      id: profile._id,
    };
  },
});
