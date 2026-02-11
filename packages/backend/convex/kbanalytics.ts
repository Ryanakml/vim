import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server.js";

export const logKBUsage = internalMutation({
  args: {
    user_id: v.string(),
    botId: v.id("botProfiles"),
    conversationId: v.id("conversations"),
    retrievedDocumentIds: v.array(v.id("documents")),
    querySimilarities: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    if (args.retrievedDocumentIds.length === 0) return;

    const now = Date.now();
    for (let i = 0; i < args.retrievedDocumentIds.length; i += 1) {
      await ctx.db.insert("kb_usage_logs", {
        user_id: args.user_id,
        botId: args.botId,
        conversationId: args.conversationId,
        documentId: args.retrievedDocumentIds[i],
        similarity: args.querySimilarities[i] ?? 0,
        timestamp: now,
      });
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

    const usedDocumentIds = new Set(usageMap.keys());
    const unusedDocumentIds = documents
      .filter((doc) => !usedDocumentIds.has(String(doc._id)))
      .map((doc) => String(doc._id));

    const documentsUsedLastPeriod = usedDocumentIds.size;
    const hitRate =
      documents.length > 0
        ? Math.round((documentsUsedLastPeriod / documents.length) * 100)
        : 0;

    return {
      totalDocuments: documents.length,
      documentsUsedLastPeriod,
      totalRetrievals: usageLogs.length,
      hitRate,
      topDocuments,
      unusedDocumentIds,
      windowDays: args.days ?? 7,
    };
  },
});
