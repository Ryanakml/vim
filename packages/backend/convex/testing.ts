import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { Doc, Id, TableNames } from "./_generated/dataModel.js";

type EscalationConfig = {
  enabled: boolean;
  whatsapp?: string;
  email?: string;
};

const DEFAULT_ESCALATION: EscalationConfig = {
  enabled: false,
  whatsapp: "",
  email: "",
};

const DEFAULT_MODEL_PROVIDER = "OpenAI";
const DEFAULT_MODEL_ID = "gpt-4o-mini";
const DEFAULT_API_KEY = "test-api-key";

function assertTestingEnabled() {
  if (process.env.CONVEX_TESTING !== "1") {
    throw new Error(
      "Testing helpers are disabled. Set CONVEX_TESTING=1 in the Convex environment.",
    );
  }
}

type InsertableDoc<TableName extends TableNames> = Omit<
  Doc<TableName>,
  "_id" | "_creationTime"
>;

async function deleteByIds(
  ctx: { db: { delete: (id: Id<any>) => Promise<void> } },
  ids: Array<Id<any>>,
) {
  if (ids.length === 0) return;
  await Promise.all(ids.map((id) => ctx.db.delete(id)));
}

export const resetTestData = mutation({
  args: {
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertTestingEnabled();

    const matchOrg = (value?: string) =>
      !args.organizationId || value === args.organizationId;

    const botProfiles = await ctx.db.query("botProfiles").collect();
    const botIds = botProfiles
      .filter((bot) => matchOrg(bot.organization_id))
      .map((bot) => bot._id);
    const botIdSet = new Set(botIds);

    const conversations = await ctx.db.query("conversations").collect();
    const conversationIds = conversations
      .filter(
        (conv) => matchOrg(conv.organization_id) || botIdSet.has(conv.bot_id),
      )
      .map((conv) => conv._id);
    const conversationIdSet = new Set(conversationIds);

    const documents = await ctx.db.query("documents").collect();
    const documentIds = documents
      .filter((doc) => botIdSet.has(doc.botId))
      .map((doc) => doc._id);
    const documentIdSet = new Set(documentIds);

    const messages = await ctx.db.query("messages").collect();
    const messageIds = messages
      .filter((msg) => conversationIdSet.has(msg.conversation_id))
      .map((msg) => msg._id);

    const aiLogs = await ctx.db.query("aiLogs").collect();
    const aiLogIds = aiLogs
      .filter(
        (log) =>
          botIdSet.has(log.botId) || conversationIdSet.has(log.conversationId),
      )
      .map((log) => log._id);

    const kbUsageLogs = await ctx.db.query("kb_usage_logs").collect();
    const kbUsageLogIds = kbUsageLogs
      .filter(
        (log) =>
          botIdSet.has(log.botId) ||
          conversationIdSet.has(log.conversationId) ||
          documentIdSet.has(log.documentId),
      )
      .map((log) => log._id);

    const publicSessions = await ctx.db.query("publicSessions").collect();
    const publicSessionIds = publicSessions
      .filter(
        (session) =>
          matchOrg(session.organizationId) ||
          conversationIdSet.has(session.conversationId),
      )
      .map((session) => session._id);

    const businessEvents = await ctx.db.query("businessEvents").collect();
    const businessEventIds = businessEvents
      .filter(
        (event) =>
          matchOrg(event.organizationId) ||
          botIdSet.has(event.botId) ||
          conversationIdSet.has(event.conversationId),
      )
      .map((event) => event._id);

    await deleteByIds(ctx, messageIds);
    await deleteByIds(ctx, aiLogIds);
    await deleteByIds(ctx, kbUsageLogIds);
    await deleteByIds(ctx, publicSessionIds);
    await deleteByIds(ctx, businessEventIds);
    await deleteByIds(ctx, conversationIds);
    await deleteByIds(ctx, documentIds);
    await deleteByIds(ctx, botIds);

    return {
      deleted: {
        botProfiles: botIds.length,
        conversations: conversationIds.length,
        messages: messageIds.length,
        documents: documentIds.length,
        publicSessions: publicSessionIds.length,
        aiLogs: aiLogIds.length,
        kbUsageLogs: kbUsageLogIds.length,
        businessEvents: businessEventIds.length,
      },
    };
  },
});

export const insertBotProfile = mutation({
  args: {
    user_id: v.string(),
    organization_id: v.optional(v.string()),
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
    model_provider: v.optional(v.union(v.string(), v.null())),
    model_id: v.optional(v.union(v.string(), v.null())),
    api_key: v.optional(v.union(v.string(), v.null())),
    system_prompt: v.optional(v.string()),
    temperature: v.optional(v.number()),
    max_tokens: v.optional(v.number()),
    escalation: v.optional(
      v.object({
        enabled: v.boolean(),
        whatsapp: v.optional(v.string()),
        email: v.optional(v.string()),
      }),
    ),
    embed_token: v.optional(v.string()),
    embed_token_created_at: v.optional(v.number()),
    embed_token_domain: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"botProfiles">> => {
    assertTestingEnabled();

    const now = Date.now();
    const record: InsertableDoc<"botProfiles"> = {
      user_id: args.user_id,
      avatar_url: args.avatar_url ?? "",
      bot_names: args.bot_names ?? "Test Bot",
      bot_description: args.bot_description ?? "",
      msg_placeholder: args.msg_placeholder ?? "Type your message...",
      primary_color: args.primary_color ?? "#3276EA",
      font: args.font ?? "inter",
      theme_mode: args.theme_mode ?? "light",
      header_style: args.header_style ?? "basic",
      message_style: args.message_style ?? "filled",
      corner_radius: args.corner_radius ?? 16,
      enable_feedback: args.enable_feedback ?? false,
      enable_file_upload: args.enable_file_upload ?? false,
      enable_sound: args.enable_sound ?? false,
      history_reset: args.history_reset ?? "never",
      model_provider:
        args.model_provider === undefined
          ? DEFAULT_MODEL_PROVIDER
          : args.model_provider,
      model_id: args.model_id === undefined ? DEFAULT_MODEL_ID : args.model_id,
      api_key: args.api_key === undefined ? DEFAULT_API_KEY : args.api_key,
      escalation: args.escalation ?? DEFAULT_ESCALATION,
      created_at: args.created_at ?? now,
      updated_at: args.updated_at ?? now,
    };

    if (args.organization_id !== undefined) {
      record.organization_id = args.organization_id;
    }
    if (args.system_prompt !== undefined) {
      record.system_prompt = args.system_prompt;
    }
    if (args.temperature !== undefined) {
      record.temperature = args.temperature;
    }
    if (args.max_tokens !== undefined) {
      record.max_tokens = args.max_tokens;
    }
    if (args.embed_token !== undefined) {
      record.embed_token = args.embed_token;
    }
    if (args.embed_token_created_at !== undefined) {
      record.embed_token_created_at = args.embed_token_created_at;
    }
    if (args.embed_token_domain !== undefined) {
      record.embed_token_domain = args.embed_token_domain;
    }

    return await ctx.db.insert("botProfiles", record);
  },
});

export const insertConversation = mutation({
  args: {
    bot_id: v.id("botProfiles"),
    organization_id: v.optional(v.string()),
    participant_id: v.optional(v.id("users")),
    user_id: v.optional(v.string()),
    visitor_id: v.optional(v.string()),
    integration: v.optional(v.string()),
    topic: v.optional(v.string()),
    status: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
    last_message_at: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    assertTestingEnabled();

    const now = Date.now();
    const createdAt = args.created_at ?? now;
    const updatedAt = args.updated_at ?? createdAt;
    const lastMessageAt = args.last_message_at ?? updatedAt;

    const record: InsertableDoc<"conversations"> = {
      bot_id: args.bot_id,
      integration: args.integration ?? "embed",
      topic: args.topic ?? "Test Conversation",
      status: args.status ?? "active",
      created_at: createdAt,
      updated_at: updatedAt,
      last_message_at: lastMessageAt,
    };

    if (args.organization_id !== undefined) {
      record.organization_id = args.organization_id;
    }
    if (args.participant_id !== undefined) {
      record.participant_id = args.participant_id;
    }
    if (args.user_id !== undefined) {
      record.user_id = args.user_id;
    }
    if (args.visitor_id !== undefined) {
      record.visitor_id = args.visitor_id;
    }

    return await ctx.db.insert("conversations", record);
  },
});

export const insertMessage = mutation({
  args: {
    conversation_id: v.id("conversations"),
    role: v.string(),
    content: v.string(),
    user_id: v.optional(v.string()),
    visitor_id: v.optional(v.string()),
    participant_id: v.optional(v.id("users")),
    created_at: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"messages">> => {
    assertTestingEnabled();

    const record: InsertableDoc<"messages"> = {
      conversation_id: args.conversation_id,
      role: args.role,
      content: args.content,
      created_at: args.created_at ?? Date.now(),
    };

    if (args.user_id !== undefined) {
      record.user_id = args.user_id;
    }
    if (args.visitor_id !== undefined) {
      record.visitor_id = args.visitor_id;
    }
    if (args.participant_id !== undefined) {
      record.participant_id = args.participant_id;
    }

    return await ctx.db.insert("messages", record);
  },
});

export const insertDocument = mutation({
  args: {
    botId: v.id("botProfiles"),
    user_id: v.optional(v.string()),
    text: v.string(),
    embedding: v.optional(v.array(v.float64())),
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
        filename: v.optional(v.string()),
        file_size_bytes: v.optional(v.number()),
        total_pages: v.optional(v.number()),
        extracted_page_range: v.optional(
          v.object({
            start: v.number(),
            end: v.number(),
          }),
        ),
        url: v.optional(v.string()),
        domain: v.optional(v.string()),
        scrape_timestamp: v.optional(v.number()),
        content_hash: v.optional(v.string()),
        is_dynamic_content: v.optional(v.boolean()),
        original_size_chars: v.optional(v.number()),
        chunk_index: v.optional(v.number()),
        chunk_total: v.optional(v.number()),
        processing_timestamp: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    assertTestingEnabled();

    const embedding = args.embedding ?? Array.from({ length: 768 }, () => 0);

    const sourceMetadata = args.source_metadata
      ? {
          ...args.source_metadata,
          processing_timestamp:
            args.source_metadata.processing_timestamp ?? Date.now(),
        }
      : undefined;

    let userId = args.user_id;
    if (userId === undefined) {
      const bot = await ctx.db.get(args.botId);
      userId = bot?.user_id;
    }

    const record: InsertableDoc<"documents"> = {
      botId: args.botId,
      text: args.text,
      embedding,
      source_type: args.source_type ?? "inline",
    };

    if (userId !== undefined) {
      record.user_id = userId;
    }
    if (sourceMetadata) {
      record.source_metadata = sourceMetadata;
    }

    return await ctx.db.insert("documents", record);
  },
});

export const insertPublicSession = mutation({
  args: {
    organizationId: v.string(),
    botId: v.string(),
    visitorId: v.string(),
    conversationId: v.id("conversations"),
    createdAt: v.optional(v.number()),
    status: v.optional(v.string()),
    endedAt: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"publicSessions">> => {
    assertTestingEnabled();

    const record: InsertableDoc<"publicSessions"> = {
      organizationId: args.organizationId,
      botId: args.botId,
      visitorId: args.visitorId,
      conversationId: args.conversationId,
      createdAt: args.createdAt ?? Date.now(),
      status: args.status ?? "active",
    };

    if (args.endedAt !== undefined) {
      record.endedAt = args.endedAt;
    }

    return await ctx.db.insert("publicSessions", record);
  },
});

// 1. Fungsi buat narik data Public Session
export const getPublicSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Pake ilmu yang tadi: Cast ke Id biar ga any
    return await ctx.db.get(args.sessionId as Id<"publicSessions">);
  },
});

// 2. Fungsi buat narik data Conversation
export const getConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId as Id<"conversations">);
  },
});

// 3. Fungsi buat narik data AI Logs
export const getAiLogsForConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    // Karena AI logs biasanya banyak, kita pake metode filter/index
    return await ctx.db
      .query("aiLogs")
      // Asumsi lu punya kolom 'conversation_id' di tabel aiLogs
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .collect();
  },
});
