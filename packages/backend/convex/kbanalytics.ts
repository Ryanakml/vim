import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server.js";
import { logAudit } from "./lib/security.js";

export const logKBUsage = internalMutation({
  args: {
    user_id: v.optional(v.string()), // null for public/widget users
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    retrievedDocumentIds: v.array(v.id("documents")),
    querySimilarities: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    if (args.retrievedDocumentIds.length === 0) return;

    const auditUserId = args.user_id ?? "visitor";

    const now = Date.now();
    let inserted = 0;
    let auditLogged = false;

    try {
      for (let i = 0; i < args.retrievedDocumentIds.length; i += 1) {
        const docId = args.retrievedDocumentIds[i];
        if (!docId) continue;
        await ctx.db.insert("kb_usage_logs", {
          user_id: args.user_id,
          botId: args.botId,
          conversationId: args.conversationId,
          documentId: docId,
          similarity: args.querySimilarities[i] ?? 0,
          timestamp: now,
        });
        inserted += 1;
      }

      await logAudit(ctx, {
        user_id: auditUserId,
        action: "log_kb_usage",
        resource_type: "kb_usage_logs",
        status: "success",
        changes: {
          before: null,
          after: {
            botId: args.botId,
            conversationId: args.conversationId,
            inserted,
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
          action: "log_kb_usage",
          resource_type: "kb_usage_logs",
          status: "error",
          error_message: errorMessage,
        });
      }
      throw error;
    }
  },
});

export const getKBStats = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;
    const botProfile = await ctx.db.get(args.botId);
    if (!botProfile || botProfile.user_id !== userId) {
      throw new Error("Unauthorized: Cannot access this bot");
    }

    const lookbackMs = (args.days ?? 7) * 24 * 60 * 60 * 1000;
    const startTime = Date.now() - lookbackMs;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_bot", (q) =>
        q.eq("user_id", userId).eq("botId", args.botId),
      )
      .collect();

    const usageLogs = await ctx.db
      .query("kb_usage_logs")
      .withIndex("by_bot_timestamp", (q) =>
        q.eq("botId", args.botId).gt("timestamp", startTime),
      )
      .collect();

    // Query-level coverage (successful retrieval vs fallback/no-context)
    // We derive this from aiLogs, which are logged for every AI call and
    // contain knowledgeChunksRetrieved (0 when RAG returned nothing).
    const aiLogs = await ctx.db
      .query("aiLogs")
      .withIndex("by_botId_createdAt", (q) =>
        q.eq("botId", args.botId).gte("createdAt", startTime),
      )
      .collect();

    const totalQueries = aiLogs.length;
    const successfulRetrievalQueries = aiLogs.filter(
      (log) => log.knowledgeChunksRetrieved > 0,
    ).length;
    const fallbackNoContextQueries = totalQueries - successfulRetrievalQueries;
    const retrievalCoveragePercent =
      totalQueries > 0
        ? Math.min(
            100,
            Math.round((successfulRetrievalQueries / totalQueries) * 100),
          )
        : 0;

    const usageMap = new Map<string, { count: number; lastUsedAt: number }>();
    for (const log of usageLogs) {
      const key = String(log.documentId);
      const current = usageMap.get(key) || { count: 0, lastUsedAt: 0 };
      usageMap.set(key, {
        count: current.count + 1,
        lastUsedAt: Math.max(current.lastUsedAt, log.timestamp),
      });
    }

    const topDocuments = Array.from(usageMap.entries())
      .map(([documentId, stats]) => ({
        documentId,
        count: stats.count,
        lastUsedAt: stats.lastUsedAt,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const documentUsage = documents
      .map((doc) => {
        const key = String(doc._id);
        const usage = usageMap.get(key);
        return {
          documentId: key,
          count: usage?.count ?? 0,
          lastUsedAt: usage?.lastUsedAt ?? 0,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastUsedAt - a.lastUsedAt;
      });

    const usedDocumentIds = new Set(usageMap.keys());
    const unusedDocumentIds = documents
      .filter((doc) => !usedDocumentIds.has(String(doc._id)))
      .map((doc) => String(doc._id));

    const documentsUsedLastPeriod = usedDocumentIds.size;

    // Legacy field kept for backwards compatibility.
    // Previously this could appear >100% due to deleted documents still
    // present in kb_usage_logs. UI should prefer retrievalCoveragePercent.
    const hitRate = retrievalCoveragePercent;

    return {
      totalDocuments: documents.length,
      documentsUsedLastPeriod,
      totalRetrievals: usageLogs.length,
      hitRate,
      totalQueries,
      successfulRetrievalQueries,
      fallbackNoContextQueries,
      retrievalCoveragePercent,
      topDocuments,
      documentUsage,
      unusedDocumentIds,
      windowDays: args.days ?? 7,
    };
  },
});
