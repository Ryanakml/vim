import { v } from "convex/values";
import { query } from "./_generated/server.js";

/**
 * AI Analytics Queries
 *
 * Provides aggregated metrics from aiLogs for dashboard displays.
 * Used by overview page to show performance insights.
 */

/**
 * Get comprehensive AI metrics for a bot over a time period
 * ✅ Automatically filtered to current user's bots only
 */
export const getAIMetrics = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // ✅ Filter logs by user_id and time
    const logs = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("user_id", userId).gte("createdAt", cutoff),
      )
      .collect()
      .then((allLogs) => allLogs.filter((l) => l.botId === args.botId));

    if (logs.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgExecutionTimeMs: 0,
        modelsUsed: [],
        totalTokensGenerated: 0,
        totalContextCharacters: 0,
        errors: [],
        successfulResponses: 0,
        failedResponses: 0,
        avgKnowledgeChunksUsed: 0,
      };
    }

    const successful = logs.filter((l) => l.success);
    const failed = logs.filter((l) => !l.success);

    const successRate =
      logs.length > 0 ? (successful.length / logs.length) * 100 : 0;

    const avgExecutionTimeMs =
      logs.reduce((sum, l) => sum + l.executionTimeMs, 0) / logs.length;

    const modelsUsed = [...new Set(logs.map((l) => l.model))];

    const totalTokensGenerated = logs.reduce((sum, l) => {
      const anyLog = l as any;
      if (typeof anyLog.totalTokens === "number")
        return sum + anyLog.totalTokens;
      if (
        typeof anyLog.promptTokens === "number" &&
        typeof anyLog.completionTokens === "number"
      ) {
        return sum + anyLog.promptTokens + anyLog.completionTokens;
      }
      // Fallback (legacy logs): estimate tokens from word count
      return sum + l.botResponse.split(/\s+/).length;
    }, 0);

    const totalPromptTokens = logs.reduce((sum, l) => {
      const v = (l as any).promptTokens;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);

    const totalCompletionTokens = logs.reduce((sum, l) => {
      const v = (l as any).completionTokens;
      return sum + (typeof v === "number" ? v : 0);
    }, 0);

    const totalContextCharacters = logs.reduce(
      (sum, l) => sum + l.contextUsed.length,
      0,
    );

    const avgKnowledgeChunksUsed =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + l.knowledgeChunksRetrieved, 0) /
          logs.length
        : 0;

    return {
      totalRequests: logs.length,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTimeMs: Math.round(avgExecutionTimeMs),
      modelsUsed,
      totalTokensGenerated,
      totalPromptTokens,
      totalCompletionTokens,
      totalContextCharacters,
      errors: failed.map((f) => ({
        message: f.errorMessage || "Unknown error",
        count: 1,
        timestamp: f.createdAt,
      })),
      successfulResponses: successful.length,
      failedResponses: failed.length,
      avgKnowledgeChunksUsed: Math.round(avgKnowledgeChunksUsed * 100) / 100,
    };
  },
});

function estimateTokensFromLog(log: any): number {
  if (typeof log?.totalTokens === "number") return log.totalTokens;
  if (
    typeof log?.promptTokens === "number" &&
    typeof log?.completionTokens === "number"
  ) {
    return log.promptTokens + log.completionTokens;
  }
  if (typeof log?.botResponse === "string") {
    return log.botResponse.split(/\s+/).length;
  }
  return 0;
}

/**
 * Time-series performance data for Overview chart.
 * Returns buckets with { time, calls, tokens }.
 */
export const getAIPerformanceSeries = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const now = Date.now();
    const start = now - args.days * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("user_id", userId).gte("createdAt", start),
      )
      .collect()
      .then((allLogs) => allLogs.filter((l) => l.botId === args.botId));

    const isHourly = args.days <= 1;
    const bucketMs = isHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const bucketCount = isHourly ? 24 : Math.max(1, Math.floor(args.days));
    const alignedStart = now - bucketCount * bucketMs;

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const bucketStart = alignedStart + i * bucketMs;
      const time = isHourly
        ? new Date(bucketStart).toLocaleTimeString("en-US", { hour: "numeric" })
        : new Date(bucketStart).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

      return {
        bucketStart,
        time,
        calls: 0,
        tokens: 0,
      };
    });

    for (const log of logs) {
      const createdAt = (log as any).createdAt;
      if (typeof createdAt !== "number") continue;
      const idx = Math.floor((createdAt - alignedStart) / bucketMs);
      if (idx < 0 || idx >= buckets.length) continue;
      const bucket = buckets[idx];
      if (bucket) {
        bucket.calls += 1;
        bucket.tokens += estimateTokensFromLog(log);
      }
    }

    return buckets.map(({ time, calls, tokens }) => ({ time, calls, tokens }));
  },
});

/**
 * Get recent AI logs for detailed inspection
 * ✅ Automatically filtered to current user's logs only
 */
export const getRecentLogs = query({
  args: {
    botId: v.id("botProfiles"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;

    // ✅ Filter logs by user_id and botId
    const logs = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_createdAt", (q) => q.eq("user_id", userId))
      .order("desc")
      .take(args.limit)
      .then((userLogs) => userLogs.filter((l) => l.botId === args.botId));

    return logs.map((log) => ({
      id: log._id,
      userMessage: log.userMessage,
      botResponse: log.botResponse.substring(0, 100) + "...",
      model: log.model,
      provider: log.provider,
      success: log.success,
      executionTimeMs: log.executionTimeMs,
      knowledgeChunksRetrieved: log.knowledgeChunksRetrieved,
      createdAt: new Date(log.createdAt).toLocaleDateString(),
      errorMessage: log.errorMessage,
    }));
  },
});

/**
 * Get model usage distribution
 * ✅ Automatically filtered to current user's logs only
 */
export const getModelUsageStats = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // ✅ Filter logs by user_id and time
    const logs = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("user_id", userId).gte("createdAt", cutoff),
      )
      .collect()
      .then((allLogs) => allLogs.filter((l) => l.botId === args.botId));

    const modelStats: Record<string, number> = {};
    logs.forEach((log) => {
      modelStats[log.model] = (modelStats[log.model] || 0) + 1;
    });

    return Object.entries(modelStats).map(([model, count]) => ({
      model,
      count,
      percentage: Math.round((count / logs.length) * 100),
    }));
  },
});

/**
 * Get knowledge base utilization stats
 * ✅ Automatically filtered to current user's logs only
 */
export const getKnowledgeUtilization = query({
  args: {
    botId: v.id("botProfiles"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    // ✅ Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const userId = identity.subject;
    const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;

    // ✅ Filter logs by user_id and time
    const logs = await ctx.db
      .query("aiLogs")
      .withIndex("by_user_createdAt", (q) =>
        q.eq("user_id", userId).gte("createdAt", cutoff),
      )
      .collect()
      .then((allLogs) => allLogs.filter((l) => l.botId === args.botId));

    if (logs.length === 0) {
      return {
        utilizationRate: 0,
        requestsWithContext: 0,
        requestsWithoutContext: 0,
        avgChunksPerRequest: 0,
      };
    }

    const requestsWithContext = logs.filter(
      (l) => l.knowledgeChunksRetrieved > 0,
    ).length;

    const requestsWithoutContext = logs.filter(
      (l) => l.knowledgeChunksRetrieved === 0,
    ).length;

    const avgChunksPerRequest =
      logs.reduce((sum, l) => sum + l.knowledgeChunksRetrieved, 0) /
      logs.length;

    return {
      utilizationRate:
        Math.round((requestsWithContext / logs.length) * 100 * 100) / 100,
      requestsWithContext,
      requestsWithoutContext,
      avgChunksPerRequest: Math.round(avgChunksPerRequest * 100) / 100,
    };
  },
});
