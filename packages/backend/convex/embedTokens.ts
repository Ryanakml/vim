import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import {
  createEmbedToken,
  requireIdentity,
  requireBotProfile,
} from "./lib/security.js";

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * AUTHENTICATED MUTATION: Generate a secure embed token scoped to a domain.
 *
 * - Validates the caller owns the bot.
 * - Accepts domains like "example.com" or "localhost:3000".
 * - Special-cases localhost for development.
 */
export const generateEmbedToken = mutation({
  args: {
    botId: v.id("botProfiles"),
    domain: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireIdentity(ctx);
    const bot = await requireBotProfile(ctx, args.botId);
    if (bot.user_id !== userId) {
      throw new Error("Unauthorized: Not bot owner");
    }

    const now = Date.now();
    const expiresAt = now + ONE_YEAR_MS;

    const created = await createEmbedToken(ctx, {
      bot,
      domain: args.domain,
      expiresAt,
      now,
    });

    return {
      token: created.token,
      domain: created.domain,
      domainHash: created.domainHash,
      expiresAt,
    };
  },
});
