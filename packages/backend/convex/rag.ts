import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Id } from "./_generated/dataModel.js";
import { internal } from "./_generated/api.js";

type BotConfigForRag = {
  model_provider?: string | null;
  api_key?: string | null;
};

/**
 * Generate embedding for text (use in actions/mutations only)
 * Cannot be used in queries due to fetch() usage
 */
export async function generateEmbedding(args: {
  userMessage: string;
  apiKey: string;
}): Promise<number[]> {
  const { userMessage, apiKey } = args;
  const google = createGoogleGenerativeAI({ apiKey });
  const embeddingModel = google.embeddingModel("gemini-embedding-001");

  const { embedding } = await embed({
    model: embeddingModel,
    value: userMessage,
  });

  return embedding;
}

/**
 * Retrieve RAG context using pre-computed embedding (safe for queries)
 */
export async function retrieveRagContextWithEmbedding(args: {
  ctx: any;
  botId: Id<"botProfiles">;
  conversationId?: Id<"conversations">;
  embedding: number[];
  userIdForLogging?: string;
  limit?: number;
}): Promise<{
  contextBlock: string;
  knowledgeChunksCount: number;
  retrievedDocumentIds: Array<Id<"documents">>;
  querySimilarities: number[];
}> {
  const {
    ctx,
    botId,
    conversationId,
    embedding,
    userIdForLogging,
    limit = 4,
  } = args;

  if (!embedding || embedding.length === 0) {
    return {
      contextBlock: "",
      knowledgeChunksCount: 0,
      retrievedDocumentIds: [],
      querySimilarities: [],
    };
  }

  const nearest = await ctx.vectorSearch("documents", "by_embedding", {
    vector: embedding,
    limit,
    filter: (q: any) => q.eq("botId", botId),
  });

  const retrievedDocumentIds = nearest.map((match: any) => match._id);
  const querySimilarities = nearest.map((match: any) => match._score ?? 0);
  const knowledgeChunksCount = nearest.length;

  if (conversationId && retrievedDocumentIds.length > 0) {
    try {
      await ctx.runMutation((internal as any)["kbanalytics"].logKBUsage, {
        user_id: userIdForLogging, // optional - null for public/widget users
        botId,
        conversationId,
        retrievedDocumentIds,
        querySimilarities,
      });
    } catch (error) {
      // Best-effort; do not fail AI response if analytics fails.
      console.warn(
        `[retrieveRagContext] Failed to log KB usage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  if (retrievedDocumentIds.length === 0) {
    return {
      contextBlock: "",
      knowledgeChunksCount,
      retrievedDocumentIds: [],
      querySimilarities: [],
    };
  }

  const docs = await ctx.runQuery(internal.knowledge.getDocumentsByIds, {
    ids: retrievedDocumentIds,
  });

  const chunks = (docs as any[])
    .map((doc) => doc?.text)
    .filter((text): text is string => Boolean(text));

  return {
    contextBlock: chunks.length > 0 ? chunks.join("\n\n") : "",
    knowledgeChunksCount,
    retrievedDocumentIds,
    querySimilarities,
  };
}

/**
 * Legacy function that combines embedding generation and retrieval
 * Only use in actions/mutations where fetch() is allowed
 */
export async function retrieveRagContext(args: {
  ctx: any;
  botId: Id<"botProfiles">;
  conversationId?: Id<"conversations">;
  userMessage: string;
  botConfig: BotConfigForRag;
  userIdForLogging?: string;
  limit?: number;
}): Promise<{
  contextBlock: string;
  knowledgeChunksCount: number;
  retrievedDocumentIds: Array<Id<"documents">>;
  querySimilarities: number[];
}> {
  const {
    ctx,
    botId,
    conversationId,
    userMessage,
    botConfig,
    userIdForLogging,
    limit = 4,
  } = args;

  const trimmedUserMessage = userMessage.trim();
  if (trimmedUserMessage.length <= 5) {
    return {
      contextBlock: "",
      knowledgeChunksCount: 0,
      retrievedDocumentIds: [],
      querySimilarities: [],
    };
  }

  const embeddingApiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    (botConfig.model_provider === "Google AI" ? botConfig.api_key : undefined);

  if (!embeddingApiKey) {
    return {
      contextBlock: "",
      knowledgeChunksCount: 0,
      retrievedDocumentIds: [],
      querySimilarities: [],
    };
  }

  const embedding = await generateEmbedding({
    userMessage: trimmedUserMessage,
    apiKey: embeddingApiKey,
  });

  return retrieveRagContextWithEmbedding({
    ctx,
    botId,
    conversationId,
    embedding,
    userIdForLogging,
    limit,
  });
}
