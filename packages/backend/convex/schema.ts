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
    model_provider: v.optional(v.union(v.string(), v.null())),
    model_id: v.optional(v.union(v.string(), v.null())),
    api_key: v.optional(v.union(v.string(), v.null())),
    system_prompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    max_tokens: v.optional(v.number()),
    // Escalation / Lead Capture (Structured)
    escalation: v.optional(
      v.object({
        enabled: v.boolean(),
        whatsapp: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    ),
    embed_token: v.optional(v.string()), // Token for embed script deployment
    embed_token_created_at: v.optional(v.number()), // Timestamp when embed token was created
    embed_token_domain: v.optional(v.string()), // Domain where embed token is deployed

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
    organization_id: v.optional(v.string()), // Organization ID for public lookups
    visitor_id: v.optional(v.string()), // Anonymous visitor ID for public chats

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
    .index("by_user_bot", ["user_id", "bot_id"])
    .index("by_bot_and_visitor", ["bot_id", "visitor_id"])
    .index("by_organization", ["organization_id"]),

  // Tabel 3: Messages (Isi Chat)
  messages: defineTable({
    // ✅ Multi-tenancy: Isolate messages by bot owner
    user_id: v.optional(v.string()), // Clerk user ID (bot owner)
    visitor_id: v.optional(v.string()), // Anonymous visitor ID (for public chats)

    conversation_id: v.id("conversations"),
    participant_id: v.optional(v.id("users")), // End user in the chat
    role: v.string(), // "user" atau "bot"
    content: v.string(),
    created_at: v.number(),
  })
    .index("by_conversation", ["conversation_id"])
    .index("by_user_id", ["user_id"])
    .index("by_user_created", ["user_id", "created_at"])
    .index("by_visitor", ["visitor_id"]),

  // Tabel 4: Documents (Knowledge Base Snippets)
  documents: defineTable({
    // ✅ Multi-tenancy: Isolate knowledge base by owner
    user_id: v.optional(v.string()), // Clerk user ID (knowledge owner)

    botId: v.id("botProfiles"),
    text: v.string(),
    embedding: v.array(v.float64()),

    // Source tracking
    source_type: v.optional(
      v.union(
        v.literal("inline"),
        v.literal("pdf"),
        v.literal("website"),
        v.literal("notion"),
      ),
    ),
    source_metadata: v.optional(
      v.object({
        // PDF metadata
        filename: v.optional(v.string()),
        file_size_bytes: v.optional(v.number()),
        total_pages: v.optional(v.number()),
        extracted_page_range: v.optional(
          v.object({
            start: v.number(),
            end: v.number(),
          }),
        ),

        // Website metadata
        url: v.optional(v.string()),
        domain: v.optional(v.string()),
        scrape_timestamp: v.optional(v.number()),
        content_hash: v.optional(v.string()),
        is_dynamic_content: v.optional(v.boolean()),

        // Common metadata
        original_size_chars: v.optional(v.number()),
        chunk_index: v.optional(v.number()),
        chunk_total: v.optional(v.number()),
        processing_timestamp: v.number(),
      }),
    ),
  })
    .index("by_bot", ["botId"])
    .index("by_user_id", ["user_id"])
    .index("by_user_bot", ["user_id", "botId"])
    .index("by_source_type", ["botId", "source_type"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 3072,
      filterFields: ["botId"],
    }),

  // Tabel 5: Users (Data Pengguna yang chat)
  users: defineTable({
    // ✅ Multi-tenancy: Isolate users by organization
    organization_id: v.optional(v.string()), // Clerk organization ID

    identifier: v.string(), // ID unik dari browser/session
    name: v.string(),
    created_at: v.number(),
    last_active_at: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_organization", ["organization_id"])
    .index("by_org_and_identifier", ["organization_id", "identifier"]),

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

  // Tabel 6.1: Knowledge Base Usage Logs
  kb_usage_logs: defineTable({
    user_id: v.optional(v.string()),
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    documentId: v.id("documents"),
    similarity: v.float64(),
    timestamp: v.number(),
  })
    .index("by_bot_timestamp", ["botId", "timestamp"])
    .index("by_document", ["documentId"])
    .index("by_conversation", ["conversationId"]),

  // Tabel 7: Public Sessions (Stateless public chat tokens)
  // ✅ Used for public widget authentication (no Clerk required)
  // Validates: organizationId, botId, visitorId in a single lookup
  // Prevents unauthorized access to public visitor conversations
  publicSessions: defineTable({
    organizationId: v.string(), // Organization owning the bot
    botId: v.string(), // Bot ID (stored as string for public access)
    visitorId: v.string(), // Unique visitor identifier
    conversationId: v.id("conversations"), // Reference to actual conversation
    createdAt: v.number(),
    status: v.optional(v.string()), // "active" or "ended"
    endedAt: v.optional(v.string()), // ISO timestamp when session ended
  })
    .index("by_session_lookup", ["organizationId", "botId", "visitorId"])
    .index("by_conversation", ["conversationId"]),

  // Tabel 8: Business Events (Lead capture, etc)
  businessEvents: defineTable({
    organizationId: v.string(),
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    visitorId: v.optional(v.string()),
    eventType: v.union(
      v.literal("lead_whatsapp_click"),
      v.literal("lead_email_click"),
    ),
    href: v.optional(v.string()),
    createdAt: v.number(),
    dedupeKey: v.string(),
  })
    .index("by_bot_createdAt", ["botId", "createdAt"])
    .index("by_org_createdAt", ["organizationId", "createdAt"])
    .index("by_dedupeKey", ["dedupeKey"]),
});
