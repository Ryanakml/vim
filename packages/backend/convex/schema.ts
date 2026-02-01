import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Tabel 1: Pengaturan Bot (Profil & Tampilan)
  botProfiles: defineTable({
    // Multi-tenancy: Link to user/organization
    // Optional temporarily to handle migration of existing records without user_id
    user_id: v.string(), // Clerk user ID
    organization_id: v.optional(v.string()), // Clerk organization ID (if org member)

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
  })
    .index("by_user_id", ["user_id"])
    .index("by_organization_id", ["organization_id"]),

  // Tabel 2: Conversations (Sesi Chat)
  conversations: defineTable({
    // ✅ Multi-tenancy: Isolate conversations by owner (bot creator)
    user_id: v.optional(v.string()), // Clerk user ID (bot owner/creator)

    bot_id: v.id("botProfiles"),
    // Note: This user_id refers to the chat participant, not the bot owner
    participant_id: v.optional(v.id("users")), // End user in the chat
    integration: v.string(), // "webchat", "wa", dll
    topic: v.string(),
    status: v.string(), // "active" atau "closed"
    created_at: v.number(),
    updated_at: v.number(),
    last_message_at: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_user_id", ["user_id"])
    .index("by_bot_id", ["bot_id"])
    .index("by_user_bot", ["user_id", "bot_id"]),

  // Tabel 3: Messages (Isi Chat)
  messages: defineTable({
    // ✅ Multi-tenancy: Isolate messages by bot owner
    user_id: v.optional(v.string()), // Clerk user ID (bot owner)

    conversation_id: v.id("conversations"),
    participant_id: v.optional(v.id("users")), // End user in the chat
    role: v.string(), // "user" atau "bot"
    content: v.string(),
    created_at: v.number(),
  })
    .index("by_conversation", ["conversation_id"])
    .index("by_user_id", ["user_id"])
    .index("by_user_created", ["user_id", "created_at"]),

  // Tabel 4: Documents (Knowledge Base Snippets)
  documents: defineTable({
    // ✅ Multi-tenancy: Isolate knowledge base by owner
    user_id: v.optional(v.string()), // Clerk user ID (knowledge owner)

    botId: v.id("botProfiles"),
    text: v.string(),
    embedding: v.array(v.float64()),
  })
    .index("by_bot", ["botId"])
    .index("by_user_id", ["user_id"])
    .index("by_user_bot", ["user_id", "botId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 768,
      filterFields: ["botId"],
    }),

  // Tabel 5: Users (Data Pengguna yang chat)
  users: defineTable({
    identifier: v.string(), // ID unik dari browser/session
    name: v.string(),
    created_at: v.number(),
    last_active_at: v.number(),
  }).index("by_identifier", ["identifier"]),

  // Tabel 6: AI Logs (AI Response History & Analytics)
  aiLogs: defineTable({
    // ✅ Multi-tenancy: Isolate logs by bot owner
    user_id: v.optional(v.string()), // Clerk user ID (bot owner)

    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    botResponse: v.string(),
    model: v.string(),
    provider: v.string(),
    temperature: v.number(),
    executionTimeMs: v.number(),
    knowledgeChunksRetrieved: v.number(),
    contextUsed: v.string(), // Full RAG context block
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    integration: v.string(), // "playground", "emulator", etc.
    createdAt: v.number(),
  })
    .index("by_botId", ["botId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_botId_createdAt", ["botId", "createdAt"])
    .index("by_user_id", ["user_id"])
    .index("by_user_createdAt", ["user_id", "createdAt"]),
});
