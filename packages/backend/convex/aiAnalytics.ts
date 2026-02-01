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

    const totalTokensGenerated = logs.reduce(
      (sum, l) => sum + l.botResponse.split(/\s+/).length,
      0,
    );

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
