import { v } from "convex/values";
import {
  action,
  internalAction,
  internalQuery,
  internalMutation,
  query,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Id } from "./_generated/dataModel.js";
import { parsePDFBuffer, validatePDFMeta } from "./pdfparser.js";
import {
  checkRobotsTxt,
  scrapeWebsite,
  validateWebsiteUrl,
  crawlWebsitePages,
  type PageMetadata,
} from "./websitescraper.js";
import { calculateOptimalChunkSize, chunkDocument } from "./documentchunker.js";
import { logAudit } from "./lib/security.js";

type SourceMetadata = {
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
  processing_timestamp: number;
};

type SourceMetadataInput = Omit<SourceMetadata, "processing_timestamp"> & {
  processing_timestamp?: number;
};

const sourceTypeValidator = v.union(
  v.literal("inline"),
  v.literal("pdf"),
  v.literal("website"),
  v.literal("notion"),
);

const sourceMetadataBaseValidator = {
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
};

const sourceMetadataInputValidator = v.object(sourceMetadataBaseValidator);

const sourceMetadataValidator = v.object({
  ...sourceMetadataBaseValidator,
  processing_timestamp: v.number(),
});

function normalizeSourceMetadata(
  metadata: SourceMetadataInput | undefined,
  fallbackTimestamp: number,
): SourceMetadata {
  if (!metadata) {
    return { processing_timestamp: fallbackTimestamp };
  }

  return {
    ...metadata,
    processing_timestamp: metadata.processing_timestamp ?? fallbackTimestamp,
  };
}

export const generateEmbedding = internalAction({
  args: {
    botId: v.id("botProfiles"),
    text: v.string(),
  },
  handler: async (ctx, args): Promise<number[]> => {
    const trimmed = args.text.trim();
    if (!trimmed) {
      throw new Error("Text is required to generate embeddings");
    }

    const botConfig = await ctx.runQuery(
      internal.configuration.getBotConfigByBotId,
      { botId: args.botId },
    );
    // Determine API key based on bot configuration or environment variables
    const isGoogleProvider = botConfig?.model_provider === "Google AI";
    const dbKey = isGoogleProvider ? botConfig?.api_key : undefined;

    const apiKey =
      dbKey ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Google API key is not configured. Set it in Configuration or GOOGLE_API_KEY env.",
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const model = google.embeddingModel("gemini-embedding-001");

    const { embedding } = await embed({
      model,
      value: trimmed,
    });

    return embedding;
  },
});

export const insertKnowledge = internalMutation({
  args: {
    user_id: v.string(), // ✅ Add user_id for isolation
    botId: v.id("botProfiles"),
    text: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const bot = await ctx.db.get(args.botId);
    let auditLogged = false;
    try {
      const id = await ctx.db.insert("documents", {
        user_id: args.user_id,
        botId: args.botId,
        text: args.text,
        embedding: args.embedding,
      });

      await logAudit(ctx, {
        user_id: args.user_id,
        organization_id: bot?.organization_id,
        action: "insert_document",
        resource_type: "document",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            chars: args.text.length,
          },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: args.user_id,
          organization_id: bot?.organization_id,
          action: "insert_document",
          resource_type: "document",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

export const insertKnowledgeWithMetadata = internalMutation({
  args: {
    user_id: v.string(),
    botId: v.id("botProfiles"),
    text: v.string(),
    embedding: v.array(v.float64()),
    source_type: sourceTypeValidator,
    source_metadata: sourceMetadataValidator,
  },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const bot = await ctx.db.get(args.botId);
    let auditLogged = false;
    try {
      const id = await ctx.db.insert("documents", {
        user_id: args.user_id,
        botId: args.botId,
        text: args.text,
        embedding: args.embedding,
        source_type: args.source_type,
        source_metadata: args.source_metadata,
      });

      await logAudit(ctx, {
        user_id: args.user_id,
        organization_id: bot?.organization_id,
        action: "insert_document",
        resource_type: "document",
        resource_id: String(id),
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            source_type: args.source_type,
            chars: args.text.length,
          },
        },
      });
      auditLogged = true;
      return id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: args.user_id,
          organization_id: bot?.organization_id,
          action: "insert_document",
          resource_type: "document",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

export const getDocumentsByIds = internalQuery({
  args: {
    ids: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return docs.filter((doc) => doc !== null);
  },
});

export const getKnowledgeDocuments = query({
  args: {
    botId: v.id("botProfiles"),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Filter documents by user_id and botId
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("botId", args.botId),
      )
      .collect();

    return documents.map((doc) => ({
      id: doc._id,
      text: doc.text,
      createdAt: doc._creationTime,
      source_type: doc.source_type,
      source_metadata: doc.source_metadata,
    }));
  },
});

export const addKnowledge = action({
  args: {
    botId: v.id("botProfiles"),
    text: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; id: Id<"documents"> }> => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const trimmed = args.text.trim();

    if (!trimmed) {
      throw new Error("Knowledge text cannot be empty");
    }

    const embedding: number[] = await ctx.runAction(
      internal.knowledge.generateEmbedding,
      {
        botId: args.botId,
        text: trimmed,
      },
    );

    const id = await ctx.runMutation(internal.knowledge.insertKnowledge, {
      user_id: userId,
      botId: args.botId,
      text: trimmed,
      embedding,
    });

    return { success: true, id };
  },
});

export const addKnowledgeWithMetadata = action({
  args: {
    botId: v.id("botProfiles"),
    text: v.string(),
    source_type: sourceTypeValidator,
    source_metadata: v.optional(sourceMetadataInputValidator),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; id: Id<"documents"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const trimmed = args.text.trim();

    if (!trimmed) {
      throw new Error("Document text cannot be empty");
    }

    const embedding: number[] = await ctx.runAction(
      internal.knowledge.generateEmbedding,
      {
        botId: args.botId,
        text: trimmed,
      },
    );

    const normalizedMetadata = normalizeSourceMetadata(
      args.source_metadata,
      Date.now(),
    );

    const id = await ctx.runMutation(
      internal.knowledge.insertKnowledgeWithMetadata,
      {
        user_id: userId,
        botId: args.botId,
        text: trimmed,
        embedding,
        source_type: args.source_type,
        source_metadata: normalizedMetadata,
      },
    );

    return { success: true, id };
  },
});

export const parsePDFAndAddKnowledge = action({
  args: {
    botId: v.id("botProfiles"),
    fileBuffer: v.bytes(),
    filename: v.string(),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    try {
      const validation = validatePDFMeta({
        filename: args.filename,
        sizeBytes: args.fileBuffer.byteLength,
        contentType: args.contentType,
      });

      if (!validation.valid) {
        throw new Error(validation.error ?? "Invalid PDF file");
      }

      const pdfResult = await parsePDFBuffer(args.fileBuffer, args.filename);

      if (pdfResult.metadata.extracted_pages.length === 0) {
        throw new Error("PDF contains no extractable text");
      }

      const optimalChunkSize = calculateOptimalChunkSize(pdfResult.text);
      const chunks = chunkDocument(pdfResult.text, optimalChunkSize);
      const addedIds: Array<Id<"documents">> = [];
      const processingTimestamp = Date.now();

      const extractedPageNumbers = pdfResult.metadata.extracted_pages.map(
        (page) => page.page_num,
      );
      const extractedRange =
        extractedPageNumbers.length > 0
          ? {
              start: Math.min(...extractedPageNumbers),
              end: Math.max(...extractedPageNumbers),
            }
          : undefined;

      for (const chunk of chunks) {
        const metadata: SourceMetadata = {
          filename: args.filename,
          file_size_bytes: args.fileBuffer.byteLength,
          total_pages: pdfResult.metadata.total_pages,
          extracted_page_range: extractedRange,
          original_size_chars: chunk.original_size,
          chunk_index: chunk.chunk_index,
          chunk_total: chunk.chunk_total,
          processing_timestamp: processingTimestamp,
        };

        const embedding: number[] = await ctx.runAction(
          internal.knowledge.generateEmbedding,
          {
            botId: args.botId,
            text: chunk.text,
          },
        );

        const id = await ctx.runMutation(
          internal.knowledge.insertKnowledgeWithMetadata,
          {
            user_id: identity.subject,
            botId: args.botId,
            text: chunk.text,
            embedding,
            source_type: "pdf",
            source_metadata: metadata,
          },
        );

        addedIds.push(id);
      }

      return {
        success: true,
        chunks_added: chunks.length,
        document_ids: addedIds,
        parse_result: pdfResult.metadata,
      };
    } catch (error) {
      throw new Error(
        `PDF processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  },
});

export const scrapeWebsiteAndAddKnowledge = action({
  args: {
    botId: v.id("botProfiles"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    try {
      const urlValidation = validateWebsiteUrl(args.url);
      if (!urlValidation.valid) {
        throw new Error(urlValidation.error ?? "Invalid URL");
      }

      const robotsAllowed = await checkRobotsTxt(args.url);
      if (!robotsAllowed) {
        throw new Error(
          "Website robots.txt disallows scraping. Please contact the site owner.",
        );
      }

      const scrapeResult = await scrapeWebsite(args.url, 15000);

      if (scrapeResult.metadata.content_size === 0) {
        throw new Error("Website contains no extractable content");
      }

      const optimalChunkSize = calculateOptimalChunkSize(scrapeResult.text);
      const chunks = chunkDocument(scrapeResult.text, optimalChunkSize);
      const addedIds: Array<Id<"documents">> = [];
      const processingTimestamp = Date.now();

      for (const chunk of chunks) {
        const metadata: SourceMetadata = {
          url: args.url,
          domain: scrapeResult.metadata.domain,
          scrape_timestamp: processingTimestamp,
          is_dynamic_content: scrapeResult.metadata.is_dynamic_content,
          original_size_chars: chunk.original_size,
          chunk_index: chunk.chunk_index,
          chunk_total: chunk.chunk_total,
          processing_timestamp: processingTimestamp,
        };

        const embedding: number[] = await ctx.runAction(
          internal.knowledge.generateEmbedding,
          {
            botId: args.botId,
            text: chunk.text,
          },
        );

        const id = await ctx.runMutation(
          internal.knowledge.insertKnowledgeWithMetadata,
          {
            user_id: identity.subject,
            botId: args.botId,
            text: chunk.text,
            embedding,
            source_type: "website",
            source_metadata: metadata,
          },
        );

        addedIds.push(id);
      }

      return {
        success: true,
        chunks_added: chunks.length,
        document_ids: addedIds,
        scrape_result: scrapeResult.metadata,
      };
    } catch (error) {
      throw new Error(
        `Website scraping failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  },
});

export const deleteDocument = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // Fetch the document to verify it exists and belongs to user
    const doc = await ctx.runQuery(internal.knowledge.getDocumentById, {
      documentId: args.documentId,
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // ✅ Verify document belongs to this user
    if (doc.user_id !== userId) {
      throw new Error("Unauthorized: Cannot delete other user's documents");
    }

    // Delete the document
    await ctx.runMutation(internal.knowledge.deleteDocumentInternal, {
      documentId: args.documentId,
    });

    return { success: true };
  },
});

export const getDocumentById = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

export const deleteDocumentInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.documentId);
    const bot = before ? await ctx.db.get(before.botId) : null;
    const auditUserId = before?.user_id ?? "system";

    let auditLogged = false;
    try {
      await ctx.db.delete(args.documentId);

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: bot?.organization_id,
        action: "delete_document",
        resource_type: "document",
        resource_id: String(args.documentId),
        status: "success",
        changes: {
          before: before
            ? {
                _id: before._id,
                botId: before.botId,
                source_type: before.source_type,
              }
            : null,
          after: null,
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: bot?.organization_id,
          action: "delete_document",
          resource_type: "document",
          resource_id: String(args.documentId),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

export const updateDocument = action({
  args: {
    documentId: v.id("documents"),
    text: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; updatedText: string }> => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const trimmed = args.text.trim();

    if (!trimmed) {
      throw new Error("Document text cannot be empty");
    }

    // Fetch the document to verify it exists and belongs to user
    const doc = await ctx.runQuery(internal.knowledge.getDocumentById, {
      documentId: args.documentId,
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // ✅ Verify document belongs to this user
    if (doc.user_id !== userId) {
      throw new Error("Unauthorized: Cannot update other user's documents");
    }

    // Generate new embedding for the updated text
    const embedding: number[] = await ctx.runAction(
      internal.knowledge.generateEmbedding,
      {
        botId: doc.botId,
        text: trimmed,
      },
    );

    // Update the document with new text and embedding
    await ctx.runMutation(internal.knowledge.updateDocumentInternal, {
      documentId: args.documentId,
      text: trimmed,
      embedding,
    });

    return { success: true, updatedText: trimmed };
  },
});

export const updateDocumentInternal = internalMutation({
  args: {
    documentId: v.id("documents"),
    text: v.string(),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.documentId);
    const bot = before ? await ctx.db.get(before.botId) : null;
    const auditUserId = before?.user_id ?? "system";

    let auditLogged = false;
    try {
      await ctx.db.patch(args.documentId, {
        text: args.text,
        embedding: args.embedding,
      });

      await logAudit(ctx, {
        user_id: auditUserId,
        organization_id: bot?.organization_id,
        action: "update_document",
        resource_type: "document",
        resource_id: String(args.documentId),
        status: "success",
        changes: {
          before: before
            ? {
                _id: before._id,
                botId: before.botId,
                source_type: before.source_type,
                chars: before.text?.length ?? 0,
              }
            : null,
          after: {
            _id: args.documentId,
            chars: args.text.length,
          },
        },
      });
      auditLogged = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (!auditLogged) {
        await logAudit(ctx, {
          user_id: auditUserId,
          organization_id: bot?.organization_id,
          action: "update_document",
          resource_type: "document",
          resource_id: String(args.documentId),
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

/**
 * Crawl a website to discover all pages and return metadata
 * Used in the first step of the multi-page KB ingestion flow
 */
export const crawlWebsiteMeta = action({
  args: {
    url: v.string(),
    maxPages: v.optional(v.number()),
    maxDepth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const urlValidation = validateWebsiteUrl(args.url);
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error ?? "Invalid URL");
    }

    const robotsAllowed = await checkRobotsTxt(args.url);
    if (!robotsAllowed) {
      throw new Error(
        "Website robots.txt disallows scraping. Please contact the site owner.",
      );
    }

    const crawlResult = await crawlWebsitePages(
      args.url,
      args.maxPages ?? 100,
      args.maxDepth ?? 3,
    );

    if (crawlResult.error) {
      throw new Error(crawlResult.error);
    }

    return crawlResult;
  },
});

/**
 * Scrape multiple website pages and add them as knowledge
 * Used in the final step of the multi-page KB ingestion flow
 */
export const scrapeMultipleWebsitesAndAddKnowledge = action({
  args: {
    botId: v.id("botProfiles"),
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    if (args.urls.length === 0) {
      throw new Error("No URLs provided");
    }

    if (args.urls.length > 50) {
      throw new Error("Maximum 50 URLs allowed per batch");
    }

    const allAddedIds: Array<Id<"documents">> = [];
    const errors: Array<{ url: string; error: string }> = [];
    const processingTimestamp = Date.now();

    // Process URLs concurrently with rate limiting (max 3 concurrent)
    const batchSize = 3;
    for (let i = 0; i < args.urls.length; i += batchSize) {
      const batch = args.urls.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (url) => {
          try {
            // Validate URL
            const urlValidation = validateWebsiteUrl(url);
            if (!urlValidation.valid) {
              return {
                success: false,
                url,
                error: urlValidation.error ?? "Invalid URL",
                ids: [] as Array<Id<"documents">>,
              };
            }

            // Scrape the page
            const scrapeResult = await scrapeWebsite(url, 15000);

            if (scrapeResult.metadata.content_size === 0) {
              return {
                success: false,
                url,
                error: "Website contains no extractable content",
                ids: [] as Array<Id<"documents">>,
              };
            }

            // Chunk and add to knowledge
            const optimalChunkSize = calculateOptimalChunkSize(
              scrapeResult.text,
            );
            const chunks = chunkDocument(scrapeResult.text, optimalChunkSize);
            const addedIds: Array<Id<"documents">> = [];

            for (const chunk of chunks) {
              const metadata: SourceMetadata = {
                url,
                domain: scrapeResult.metadata.domain,
                scrape_timestamp: processingTimestamp,
                is_dynamic_content: scrapeResult.metadata.is_dynamic_content,
                original_size_chars: chunk.original_size,
                chunk_index: chunk.chunk_index,
                chunk_total: chunk.chunk_total,
                processing_timestamp: processingTimestamp,
              };

              const embedding: number[] = await ctx.runAction(
                internal.knowledge.generateEmbedding,
                {
                  botId: args.botId,
                  text: chunk.text,
                },
              );

              const id = await ctx.runMutation(
                internal.knowledge.insertKnowledgeWithMetadata,
                {
                  user_id: identity.subject,
                  botId: args.botId,
                  text: chunk.text,
                  embedding,
                  source_type: "website",
                  source_metadata: metadata,
                },
              );

              addedIds.push(id);
            }

            return {
              success: true,
              url,
              ids: addedIds,
              error: null,
            };
          } catch (error) {
            return {
              success: false,
              url,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
              ids: [] as Array<Id<"documents">>,
            };
          }
        }),
      );

      // Collect results
      for (const result of results) {
        if (result.success) {
          allAddedIds.push(...result.ids);
        } else if (result.error) {
          errors.push({ url: result.url, error: result.error });
        }
      }
    }

    return {
      added_document_ids: allAddedIds,
      total_documents_added: allAddedIds.length,
      errors,
      success: allAddedIds.length > 0,
    };
  },
});
