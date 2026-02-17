import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel.js";
import { api } from "../../convex/_generated/api.js";

type EscalationConfig = {
  enabled: boolean;
  whatsapp?: string;
  email?: string;
};

type SeedBotProfileParams = {
  userId?: string;
  organizationId?: string;
  modelProvider?: string | null;
  modelId?: string | null;
  apiKey?: string | null;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  escalation?: EscalationConfig;
  botNames?: string;
};

type SeedConversationParams = {
  botId: Id<"botProfiles">;
  organizationId?: string;
  userId?: string;
  visitorId?: string;
  participantId?: Id<"users">;
  integration?: string;
  topic?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
  lastMessageAt?: number;
};

type SeedMessageParams = {
  conversationId: Id<"conversations">;
  role?: string;
  content?: string;
  userId?: string;
  visitorId?: string;
  participantId?: Id<"users">;
  createdAt?: number;
};

type SeedKnowledgeParams = {
  botId: Id<"botProfiles">;
  userId?: string;
  text?: string;
  embedding?: number[];
  sourceType?: "inline" | "pdf" | "website" | "notion";
  sourceMetadata?: {
    filename?: string;
    file_size_bytes?: number;
    total_pages?: number;
    extracted_page_range?: {
      start: number;
      end: number;
    };
    url?: string;
    domain?: string;
    scrape_timestamp?: number;
    content_hash?: string;
    is_dynamic_content?: boolean;
    original_size_chars?: number;
    chunk_index?: number;
    chunk_total?: number;
    processing_timestamp?: number;
  };
};

type SeedPublicSessionParams = {
  organizationId?: string;
  botId: Id<"botProfiles">;
  visitorId?: string;
  conversationId: Id<"conversations">;
  createdAt?: number;
  status?: string;
  endedAt?: string;
};

export const DEFAULT_ORGANIZATION_ID = "org_test_1";
export const DEFAULT_USER_ID = "user_test_1";
export const DEFAULT_VISITOR_ID = "visitor_test_1";

let cachedClient: ConvexHttpClient | null = null;

function getConvexUrl() {
  const url =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
  if (!url) {
    throw new Error(
      "Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL before running integration tests.",
    );
  }
  return url;
}

export function getTestClient() {
  if (!cachedClient) {
    cachedClient = new ConvexHttpClient(getConvexUrl());
  }
  return cachedClient;
}

export function resetTestClient() {
  cachedClient = null;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

export async function resetTestData(
  organizationId = DEFAULT_ORGANIZATION_ID,
  client: ConvexHttpClient = getTestClient(),
) {
  return await client.mutation(api.testing.resetTestData, {
    organizationId,
  });
}

export async function seedBotProfile(
  params: SeedBotProfileParams = {},
  client: ConvexHttpClient = getTestClient(),
): Promise<Id<"botProfiles">> {
  const args = compact({
    user_id: params.userId ?? DEFAULT_USER_ID,
    organization_id: params.organizationId ?? DEFAULT_ORGANIZATION_ID,
    model_provider: params.modelProvider,
    model_id: params.modelId,
    api_key: params.apiKey,
    system_prompt: params.systemPrompt,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    escalation: params.escalation,
    bot_names: params.botNames,
  });

  return (await client.mutation(
    api.testing.insertBotProfile,
    args,
  )) as Id<"botProfiles">;
}

export async function seedConversation(
  params: SeedConversationParams,
  client: ConvexHttpClient = getTestClient(),
): Promise<Id<"conversations">> {
  const args = compact({
    bot_id: params.botId,
    organization_id: params.organizationId ?? DEFAULT_ORGANIZATION_ID,
    user_id: params.userId,
    visitor_id: params.visitorId,
    participant_id: params.participantId,
    integration: params.integration,
    topic: params.topic,
    status: params.status,
    created_at: params.createdAt,
    updated_at: params.updatedAt,
    last_message_at: params.lastMessageAt,
  });

  return (await client.mutation(
    api.testing.insertConversation,
    args,
  )) as Id<"conversations">;
}

export async function seedMessage(
  params: SeedMessageParams,
  client: ConvexHttpClient = getTestClient(),
): Promise<Id<"messages">> {
  const args = compact({
    conversation_id: params.conversationId,
    role: params.role ?? "user",
    content: params.content ?? "Test message",
    user_id: params.userId,
    visitor_id: params.visitorId,
    participant_id: params.participantId,
    created_at: params.createdAt,
  });

  return (await client.mutation(
    api.testing.insertMessage,
    args,
  )) as Id<"messages">;
}

export async function seedKnowledge(
  params: SeedKnowledgeParams,
  client: ConvexHttpClient = getTestClient(),
): Promise<Id<"documents">> {
  const args = compact({
    botId: params.botId,
    user_id: params.userId,
    text: params.text ?? "Test knowledge content",
    embedding: params.embedding,
    source_type: params.sourceType,
    source_metadata: params.sourceMetadata,
  });

  return (await client.mutation(
    api.testing.insertDocument,
    args,
  )) as Id<"documents">;
}

export async function seedPublicSession(
  params: SeedPublicSessionParams,
  client: ConvexHttpClient = getTestClient(),
): Promise<Id<"publicSessions">> {
  const args = compact({
    organizationId: params.organizationId ?? DEFAULT_ORGANIZATION_ID,
    botId: params.botId,
    visitorId: params.visitorId ?? DEFAULT_VISITOR_ID,
    conversationId: params.conversationId,
    createdAt: params.createdAt,
    status: params.status,
    endedAt: params.endedAt,
  });

  return (await client.mutation(
    api.testing.insertPublicSession,
    args,
  )) as Id<"publicSessions">;
}
