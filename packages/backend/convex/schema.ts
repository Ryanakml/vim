import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tabel 1: Pengaturan Bot (Profil & Tampilan)
  botProfiles: defineTable({
    avatar_url: v.string(),
    bot_names: v.string(),
    bot_description: v.string(),
    msg_placeholder: v.string(),

    // Tampilan
    primary_color: v.string(),
    font: v.string(),
    theme_mode: v.string(),
    header_style: v.string(),
    message_style: v.string(),
    corner_radius: v.number(),

    // Fitur
    enable_feedback: v.boolean(),
    enable_file_upload: v.boolean(),
    enable_sound: v.boolean(),
    history_reset: v.string(),

    // Model Configuration
    model_provider: v.optional(v.string()),
    model_id: v.optional(v.string()),
    api_key: v.optional(v.string()),
    system_prompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    max_tokens: v.optional(v.number()),

    // Metadata
    created_at: v.number(),
    updated_at: v.number(),
  }),

  // Tabel 2: Conversations (Sesi Chat)
  conversations: defineTable({
    bot_id: v.id("botProfiles"),
    user_id: v.optional(v.id("users")), // Bisa null jika anonymous
    integration: v.string(), // "webchat", "wa", dll
    topic: v.string(),
    status: v.string(), // "active" atau "closed"
    created_at: v.number(),
    updated_at: v.number(),
    last_message_at: v.number(),
  }).index("by_status", ["status"]),

  // Tabel 3: Messages (Isi Chat)
  messages: defineTable({
    conversation_id: v.id("conversations"),
    user_id: v.optional(v.id("users")),
    role: v.string(), // "user" atau "bot"
    content: v.string(),
    created_at: v.number(),
  }).index("by_conversation", ["conversation_id"]),

  // Tabel 4: Users (Data Pengguna yang chat)
  users: defineTable({
    identifier: v.string(), // ID unik dari browser/session
    name: v.string(),
    created_at: v.number(),
    last_active_at: v.number(),
  }).index("by_identifier", ["identifier"]),
});
