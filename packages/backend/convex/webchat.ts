import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

// ===== BOT PROFILES =====

// Get single bot profile (assume one profile for now)
export const getBotProfile = query({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("botProfiles").collect();
    return profiles[0] || null;
  },
});

// Create initial profile if doesn't exist
export const ensureBotProfile = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("botProfiles").collect();
    if (existing.length > 0) return existing[0];

    return await ctx.db.insert("botProfiles", {
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
      created_at: Date.now(),
      updated_at: Date.now(),
    });
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
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
  },
});

// Get all bot profiles (legacy, kept for backward compatibility)
export const getBotProfiles = query({
  handler: async (ctx) => {
    return await ctx.db.query("botProfiles").collect();
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
    await ctx.db.insert("botProfiles", {
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
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  },
});
