import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel";

// ===== TYPES =====

export type BotProfile = Doc<"botProfiles">;
export type Conversation = Doc<"conversations"> & {
  messageCount?: number;
  lastMessage?: Doc<"messages"> | null;
  user?: Doc<"users"> | null;
};
export type Message = Doc<"messages">;
export type User = Doc<"users">;

// ===== BOT PROFILE HOOKS =====

/**
 * Hook to fetch the active bot profile
 * Returns undefined while loading, null if no profile exists, or the profile object
 */
export function useBotProfile() {
  return useQuery(api.webchat.getBotProfile);
}

/**
 * Hook to get all bot profiles (legacy)
 */
export function useBotProfiles() {
  return useQuery(api.webchat.getBotProfiles);
}

/**
 * Hook to ensure a bot profile exists (creates one if it doesn't)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEnsureBotProfile(): any {
  return useMutation(api.webchat.ensureBotProfile);
}

/**
 * Hook to update a bot profile with partial fields
 * Pass the profile ID and any fields you want to update
 */
export function useUpdateBotProfile() {
  return useMutation(api.webchat.updateBotProfile);
}

// ===== CONFIGURATION HOOKS =====

/**
 * Hook to fetch bot configuration (model, system prompt, parameters)
 * Returns configuration object with model_provider, model_id, system_prompt, temperature, max_tokens
 */
export function useGetBotConfig() {
  return useQuery(api.configuration.getBotConfig);
}

/**
 * Hook to update bot configuration
 * Supports both General mode (model + prompt) and Advanced mode (parameters)
 */
export function useUpdateBotConfig() {
  return useMutation(api.configuration.updateBotConfig);
}

// ===== CONVERSATION HOOKS =====

/**
 * Hook to fetch conversations for a specific bot
 * Pass botId to fetch, or pass "skip" to skip the query
 */
export function useConversations(botId?: Id<"botProfiles"> | "skip") {
  return useQuery(
    api.monitor.getConversations,
    botId && botId !== "skip" ? { botId } : "skip",
  );
}

/**
 * Hook to fetch all messages in a conversation
 * Pass conversationId to fetch, or pass "skip" to skip the query
 */
export function useConversationMessages(
  conversationId?: Id<"conversations"> | "skip",
) {
  return useQuery(
    api.monitor.getConversationMessages,
    conversationId && conversationId !== "skip" ? { conversationId } : "skip",
  );
}

/**
 * Hook to create a new conversation
 */
export function useCreateConversation() {
  return useMutation(api.monitor.createConversation);
}

/**
 * Hook to close a conversation
 */
export function useCloseConversation() {
  return useMutation(api.monitor.closeConversation);
}

/**
 * Hook to add a message to a conversation
 * Automatically updates conversation's last_message_at timestamp
 */
export function useAddMessage() {
  return useMutation(api.monitor.addMessage);
}

// ===== USER HOOKS =====

/**
 * Hook to fetch all users
 */
export function useUsers() {
  return useQuery(api.monitor.getUsers);
}

/**
 * Hook to get or create a user by identifier
 */
export function useGetOrCreateUser() {
  return useMutation(api.monitor.getOrCreateUser);
}

/**
 * Hook to update user's last activity timestamp
 */
export function useUpdateUserActivity() {
  return useMutation(api.monitor.updateUserActivity);
}

// ===== ANALYTICS HOOKS =====

/**
 * Hook to fetch dashboard statistics
 * Returns aggregated data: totalUsers, totalConversations, activeConversations, latestConversations
 */
export function useDashboardStats() {
  return useQuery(api.analytics.getDashboardStats);
}
