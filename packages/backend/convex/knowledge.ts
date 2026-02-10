import { v } from "convex/values";
import {
  action,
  internalAction,
  internalQuery,
  internalMutation,
  query,
} from "./_generated/server.js";
import { api, internal } from "./_generated/api.js";
import { embed } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Id } from "./_generated/dataModel.js";

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

    const model = google.embeddingModel("text-embedding-004");

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
    return await ctx.db.insert("documents", {
      user_id: args.user_id,
      botId: args.botId,
      text: args.text,
      embedding: args.embedding,
    });
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
    await ctx.db.delete(args.documentId);
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
    await ctx.db.patch(args.documentId, {
      text: args.text,
      embedding: args.embedding,
    });
  },
});
