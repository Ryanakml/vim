import type { GenericId } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server.js";
import type { Doc, Id } from "../_generated/dataModel.js";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type TenantContext = {
  userId: string;
  orgId?: string;
  orgRole?: OrgRole;
};

export type AuditStatus = "success" | "denied" | "error";

const DEFAULT_VISITOR_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function fnv1aHex(value: string): string {
  // FNV-1a 32-bit hash to avoid Node crypto dependency in Convex runtimes.
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === "localhost";
}

function getDomainHashForStorage(normalizedHostname: string): string {
  // Development convenience: allow tokens scoped to localhost without strict hashing.
  // This makes local dev resilient to differing schemes/ports.
  if (isLocalhostHostname(normalizedHostname)) {
    return "localhost";
  }
  return hashDomainToHex16(normalizedHostname);
}

function isLocalhostDomainHash(domainHash: string): boolean {
  return domainHash === "localhost";
}

export function hashDomainToHex16(domain: string): string {
  // 16-hex chars by concatenating two hashes with different salts.
  const a = fnv1aHex(`d1:${domain}`);
  const b = fnv1aHex(`d2:${domain}`);
  return `${a}${b}`;
}

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  // Accept either "example.com" or "https://example.com".
  const asUrl = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const url = new URL(asUrl);
  return url.hostname;
}

export function generateOpaqueToken(): string {
  const cryptoAny = globalThis.crypto as unknown as
    | {
        randomUUID?: () => string;
        getRandomValues?: (a: Uint8Array) => Uint8Array;
      }
    | undefined;

  if (cryptoAny?.randomUUID) {
    return cryptoAny.randomUUID();
  }

  if (cryptoAny?.getRandomValues) {
    const bytes = cryptoAny.getRandomValues(new Uint8Array(32));
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Fallback: best-effort opaque value. (Foundation only; replace with crypto in prod.)
  return `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

export async function requireIdentity(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<{ userId: string; orgId?: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: Must be logged in");
  }

  const orgId = (identity.org_id as string | undefined) || undefined;
  return { userId: identity.subject, orgId };
}

export async function getTenantContext(
  ctx: QueryCtx | MutationCtx,
): Promise<TenantContext> {
  const { userId, orgId } = await requireIdentity(ctx);
  if (!orgId) {
    return { userId };
  }

  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organization_id", orgId).eq("user_id", userId),
    )
    .first();

  const disabled = Boolean(membership?.disabled);
  if (!membership || disabled) {
    return { userId, orgId };
  }

  return {
    userId,
    orgId,
    orgRole: membership.role,
  };
}

export function canAccessResource(
  resource: { user_id?: string; organization_id?: string } | null | undefined,
  tenant: TenantContext,
): boolean {
  if (!resource) return false;

  if (resource.user_id && resource.user_id === tenant.userId) {
    return true;
  }

  if (
    tenant.orgId &&
    tenant.orgRole &&
    resource.organization_id &&
    resource.organization_id === tenant.orgId
  ) {
    return true;
  }

  return false;
}

export function assertCanAccessResource<
  T extends { user_id?: string; organization_id?: string },
>(
  resource: T | null | undefined,
  tenant: TenantContext,
  errorMessage = "Unauthorized",
): asserts resource is T {
  if (!canAccessResource(resource, tenant)) {
    throw new Error(errorMessage);
  }
}

export function assertIsOwner(
  resource: { user_id?: string } | null | undefined,
  tenant: TenantContext,
  errorMessage = "Unauthorized: Not owner",
) {
  if (!resource || resource.user_id !== tenant.userId) {
    throw new Error(errorMessage);
  }
}

export function assertOrgAdmin(
  tenant: TenantContext,
  errorMessage = "Unauthorized: Must be org admin",
) {
  const role = tenant.orgRole;
  if (!tenant.orgId || !role || (role !== "owner" && role !== "admin")) {
    throw new Error(errorMessage);
  }
}

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as unknown as T;
  }
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = { ...value };

  const sensitiveKeys = new Set([
    "api_key",
    "_encrypted_api_key",
    "authorization",
    "auth_token",
    "token",
    "session_token",
    "serverSecret",
    "secret",
    "password",
  ]);

  for (const [key, val] of Object.entries(result)) {
    if (sensitiveKeys.has(key)) {
      result[key] = val ? "***REDACTED***" : val;
      continue;
    }
    if (isRecord(val) || Array.isArray(val)) {
      result[key] = redactSecrets(val);
    }
  }

  return result as T;
}

export async function logAudit(
  ctx: MutationCtx,
  entry: {
    user_id: string;
    organization_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    status: AuditStatus;
    error_message?: string;
    changes?: { before: unknown; after: unknown };
    ip_address?: string;
    user_agent?: string;
    timestamp?: number;
  },
): Promise<Id<"auditLogs">> {
  const timestamp = entry.timestamp ?? Date.now();

  return await ctx.db.insert("auditLogs", {
    user_id: entry.user_id,
    organization_id: entry.organization_id,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    status: entry.status,
    error_message: entry.error_message,
    changes: entry.changes
      ? {
          before: redactSecrets(entry.changes.before),
          after: redactSecrets(entry.changes.after),
        }
      : undefined,
    ip_address: entry.ip_address,
    user_agent: entry.user_agent,
    timestamp,
  });
}

export async function requireValidVisitorSession(
  ctx: QueryCtx | MutationCtx,
  args: {
    sessionToken: string;
    now?: number;
  },
): Promise<Doc<"visitorSessions">> {
  const now = args.now ?? Date.now();

  const session = await ctx.db
    .query("visitorSessions")
    .withIndex("by_token", (q) => q.eq("session_token", args.sessionToken))
    .first();

  if (!session) {
    throw new Error("Invalid session token");
  }

  if (session.revoked) {
    throw new Error("Session revoked");
  }

  if (session.expires_at < now) {
    throw new Error("Session expired");
  }

  return session;
}

export async function createVisitorSession(
  ctx: MutationCtx,
  args: {
    botId: Id<"botProfiles">;
    visitorId: string;
    ttlMs?: number;
    ip_address?: string;
    user_agent_hash?: string;
    now?: number;
  },
): Promise<{ sessionToken: string; expiresAt: number }> {
  const now = args.now ?? Date.now();
  const ttlMs = args.ttlMs ?? DEFAULT_VISITOR_SESSION_TTL_MS;
  const expiresAt = now + ttlMs;

  const token = generateOpaqueToken();

  await ctx.db.insert("visitorSessions", {
    visitor_id: args.visitorId,
    bot_id: args.botId,
    session_token: token,
    created_at: now,
    expires_at: expiresAt,
    revoked: false,
    ip_address: args.ip_address,
    user_agent_hash: args.user_agent_hash,
  });

  return { sessionToken: token, expiresAt };
}

export async function assertConversationOwnedByVisitorSession(
  ctx: QueryCtx | MutationCtx,
  args: {
    conversation: Doc<"conversations">;
    session: Doc<"visitorSessions">;
  },
) {
  if (args.conversation.bot_id !== args.session.bot_id) {
    throw new Error("Unauthorized: Wrong bot");
  }
  if (
    !args.conversation.visitor_id ||
    args.conversation.visitor_id !== args.session.visitor_id
  ) {
    throw new Error("Unauthorized: Wrong visitor");
  }
}

export async function countRecentMessagesInConversation(
  ctx: QueryCtx,
  args: {
    conversationId: Id<"conversations">;
    sinceMs: number;
  },
): Promise<number> {
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) =>
      q.eq("conversation_id", args.conversationId),
    )
    .collect();

  return messages.filter((m) => m.created_at >= args.sinceMs).length;
}

export async function assertRateLimitMessagesPerWindow(
  ctx: QueryCtx,
  args: {
    conversationId: Id<"conversations">;
    limit: number;
    windowMs: number;
    now?: number;
    errorMessage?: string;
  },
) {
  const now = args.now ?? Date.now();
  const sinceMs = now - args.windowMs;
  const count = await countRecentMessagesInConversation(ctx, {
    conversationId: args.conversationId,
    sinceMs,
  });

  if (count >= args.limit) {
    throw new Error(args.errorMessage ?? "Rate limited");
  }
}

export async function requireValidEmbedToken(
  ctx: QueryCtx | MutationCtx,
  args: {
    token: string;
    currentDomain?: string;
    now?: number;
  },
): Promise<Doc<"embedTokens">> {
  const now = args.now ?? Date.now();

  const embedToken = await ctx.db
    .query("embedTokens")
    .withIndex("by_token", (q) => q.eq("token", args.token))
    .first();

  if (!embedToken) {
    throw new Error("Invalid token");
  }

  if (embedToken.revoked) {
    throw new Error("Token revoked");
  }

  if (embedToken.expires_at < now) {
    throw new Error("Token expired");
  }

  // Domain enforcement:
  // - For localhost-scoped tokens, allow missing/localhost currentDomain.
  // - For non-local tokens, require currentDomain and compare hash.
  if (!args.currentDomain) {
    if (!isLocalhostDomainHash(embedToken.domain_hash)) {
      throw new Error("Origin required");
    }
    return embedToken;
  }

  const normalized = normalizeDomain(args.currentDomain);
  if (isLocalhostDomainHash(embedToken.domain_hash)) {
    if (!isLocalhostHostname(normalized)) {
      throw new Error("Domain mismatch");
    }
    return embedToken;
  }

  const currentHash = hashDomainToHex16(normalized);
  if (currentHash !== embedToken.domain_hash) {
    throw new Error("Domain mismatch");
  }

  return embedToken;
}

export async function requireBotProfile(
  ctx: QueryCtx | MutationCtx,
  botId: Id<"botProfiles">,
): Promise<Doc<"botProfiles">> {
  const bot = await ctx.db.get(botId);
  if (!bot) {
    throw new Error("Bot not found");
  }
  return bot;
}

export function toPublicBotProfile(bot: Doc<"botProfiles">): {
  _id: Id<"botProfiles">;
  avatar_url: string;
  bot_names: string;
  bot_description: string;
  msg_placeholder: string;
  primary_color: string;
  font: string;
  theme_mode: string;
  header_style: string;
  message_style: string;
  corner_radius: number;
  enable_feedback: boolean;
  enable_file_upload: boolean;
  enable_sound: boolean;
  history_reset: string;
} {
  // Intentionally excludes: api_key, _encrypted_api_key, model settings, prompts, embed token metadata.
  return {
    _id: bot._id,
    avatar_url: bot.avatar_url,
    bot_names: bot.bot_names,
    bot_description: bot.bot_description,
    msg_placeholder: bot.msg_placeholder,
    primary_color: bot.primary_color,
    font: bot.font,
    theme_mode: bot.theme_mode,
    header_style: bot.header_style,
    message_style: bot.message_style,
    corner_radius: bot.corner_radius,
    enable_feedback: bot.enable_feedback,
    enable_file_upload: bot.enable_file_upload,
    enable_sound: bot.enable_sound,
    history_reset: bot.history_reset,
  };
}

export function redactBotProfileSecrets(bot: Doc<"botProfiles">): Omit<
  Doc<"botProfiles">,
  "api_key" | "_encrypted_api_key"
> & {
  api_key?: "***REDACTED***" | null;
  _encrypted_api_key?: "***REDACTED***";
} {
  const rest = { ...bot } as Record<string, unknown>;
  if ("api_key" in rest)
    rest.api_key = rest.api_key ? "***REDACTED***" : rest.api_key;
  if ("_encrypted_api_key" in rest) {
    rest._encrypted_api_key = rest._encrypted_api_key
      ? "***REDACTED***"
      : rest._encrypted_api_key;
  }
  return rest as any;
}

export async function createEmbedToken(
  ctx: MutationCtx,
  args: {
    bot: Doc<"botProfiles">;
    domain: string;
    expiresAt: number;
    now?: number;
  },
): Promise<{
  token: string;
  domain: string;
  domainHash: string;
  id: Id<"embedTokens">;
}> {
  const now = args.now ?? Date.now();
  const domain = normalizeDomain(args.domain);
  const domainHash = getDomainHashForStorage(domain);

  const token = generateOpaqueToken();
  const id = await ctx.db.insert("embedTokens", {
    bot_id: args.bot._id,
    user_id: args.bot.user_id,
    organization_id: args.bot.organization_id,
    token,
    domain_hash: domainHash,
    domain,
    created_at: now,
    expires_at: args.expiresAt,
    revoked: false,
    requests_today: 0,
    last_request: undefined,
  });

  return { token, domain, domainHash, id };
}

export function assertDocIdEquals<T extends GenericId<string>>(
  a: T,
  b: T,
  errorMessage = "Unauthorized",
) {
  if (a !== b) {
    throw new Error(errorMessage);
  }
}
