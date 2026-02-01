import { useQuery, useMutation, useAction, useConvexAuth } from "convex/react";
import { useCallback, useRef, useState } from "react";
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
  const { isAuthenticated } = useConvexAuth();
  // If not authenticated, send "skip" instead of an empty object to prevent blank space bugs
  return useQuery(api.webchat.getBotProfile, isAuthenticated ? {} : "skip");
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

// ===== PLAYGROUND HOOKS =====

/**
 * Hook to get or create the active playground session for a bot
 * Returns the playground conversation session
 */
export function useGetOrCreatePlaygroundSession() {
  return useMutation(api.playground.getOrCreatePlaygroundSession);
}

/**
 * Hook to get the current active playground session for a bot
 * Returns the playground conversation with its messages, or null if none exists
 */
export function useGetPlaygroundSession(botId?: Id<"botProfiles"> | "skip") {
  return useQuery(
    api.playground.getPlaygroundSession,
    botId && botId !== "skip" ? { botId } : "skip",
  );
}

/**
 * Hook to add a message to the playground session
 * Automatically creates the session if it doesn't exist
 */
export function useAddPlaygroundMessage() {
  return useMutation(api.playground.addPlaygroundMessage);
}

/**
 * Hook to restart the playground session
 * Closes the current session and creates a fresh one
 */
export function useRestartPlaygroundSession() {
  return useMutation(api.playground.restartPlaygroundSession);
}

/**
 * Hook to get messages for a playground session
 */
export function useGetPlaygroundMessages(
  sessionId?: Id<"conversations"> | "skip",
) {
  return useQuery(
    api.playground.getPlaygroundMessages,
    sessionId && sessionId !== "skip" ? { sessionId } : "skip",
  );
}

// ===== EMULATOR HOOKS =====

/**
 * Hook to get or create the active emulator session for a bot
 * Returns the emulator conversation session (isolated from playground)
 */
export function useGetOrCreateEmulatorSession() {
  return useMutation(api.playground.getOrCreateEmulatorSession);
}

/**
 * Hook to get the current active emulator session for a bot
 * Returns the emulator conversation with its messages, or null if none exists
 */
export function useGetEmulatorSession(botId?: Id<"botProfiles"> | "skip") {
  return useQuery(
    api.playground.getEmulatorSession,
    botId && botId !== "skip" ? { botId } : "skip",
  );
}

/**
 * Hook to add a message to the emulator session
 * Automatically creates the session if it doesn't exist
 */
export function useAddEmulatorMessage() {
  return useMutation(api.playground.addEmulatorMessage);
}

/**
 * Hook to restart the emulator session
 * Closes the current session and creates a fresh one
 */
export function useRestartEmulatorSession() {
  return useMutation(api.playground.restartEmulatorSession);
}

/**
 * Hook to get messages for an emulator session
 */
export function useGetEmulatorMessages(
  sessionId?: Id<"conversations"> | "skip",
) {
  return useQuery(
    api.playground.getEmulatorMessages,
    sessionId && sessionId !== "skip" ? { sessionId } : "skip",
  );
}

// ===== AI GENERATION HOOKS =====

/**
 * Hook to generate a bot response using the unified AI engine
 * Call this after the user message has been saved to start AI generation
 * Automatically saves the bot response to the database
 *
 * Returns: { success: boolean; content: string; model: string; provider: string }
 */
export function useGenerateBotResponse() {
  return useAction(api.ai.generateBotResponse);
}

// ===== STREAMING HOOKS =====

/**
 * Hook for real-time streaming bot responses
 *
 * Usage:
 * ```tsx
 * const { startStream, chunks, isStreaming, cancelStream, fullText } =
 *   useGenerateBotResponseStream();
 *
 * const handleStream = async () => {
 *   await startStream(botId, conversationId, userMessage);
 * };
 * ```
 *
 * Returns:
 * - chunks: Array of text chunks received so far
 * - isStreaming: Boolean indicating if stream is active
 * - error: Error message if stream failed
 * - startStream: Function to start streaming
 * - cancelStream: Function to cancel mid-stream
 * - fullText: Computed property joining all chunks
 */
export function useGenerateBotResponseStream() {
  const [chunks, setChunks] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      botId: string,
      conversationId: string,
      userMessage: string,
    ): Promise<void> => {
      console.log("[stream] 🚀 START - streaming bot response");
      setChunks([]);
      setError(null);
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ botId, conversationId, userMessage }),
          signal: abortControllerRef.current.signal,
        });

        console.log(
          "[stream] Response received:",
          response.status,
          response.headers.get("content-type"),
        );

        if (!response.ok) {
          throw new Error(`Stream failed with status ${response.status}`);
        }

        // ✅ CRITICAL FIX: Use ReadableStream for true real-time streaming
        // This processes chunks as they arrive, not waiting for entire response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let chunkCount = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(`[stream] ✅ COMPLETE - received ${chunkCount} chunks`);
            break;
          }

          // Decode received bytes
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines (SSE format)
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr);

                if (data.type === "text-delta" && data.delta) {
                  chunkCount++;
                  console.log(
                    `[stream] 📥 Chunk #${chunkCount}: "${data.delta.slice(0, 50)}${data.delta.length > 50 ? "..." : ""}"`,
                  );

                  // ✅ CRITICAL: Update state immediately with new chunk
                  setChunks((prev) => [...prev, data.delta]);
                }
              } catch (parseErr) {
                console.error(
                  "[stream] Failed to parse chunk:",
                  parseErr,
                  "line:",
                  line,
                );
              }
            }
          }
        }

        // Finish decoding
        const finalChunk = decoder.decode();
        if (finalChunk) {
          buffer += finalChunk;
          const lines = buffer.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr);
                if (data.type === "text-delta" && data.delta) {
                  setChunks((prev) => [...prev, data.delta]);
                }
              } catch (e) {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[stream] Stream cancelled by user");
        } else {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("[stream] ❌ ERROR:", errorMsg);
          setError(errorMsg);
        }
      } finally {
        console.log("[stream] 🛑 Stream ended");
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [],
  );

  const cancelStream = useCallback(() => {
    console.log("[stream] User cancelled streaming");
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    chunks,
    isStreaming,
    error,
    startStream,
    cancelStream,
    fullText: chunks.join(""),
  };
}

// ===== ANALYTICS HOOKS =====

/**
 * Hook to fetch dashboard statistics
 * Returns aggregated data: totalUsers, totalConversations, activeConversations, latestConversations
 */
/**
 * Hook to fetch AI metrics and analytics
 * Pass botId to fetch, or pass "skip" to skip the query
 */
export function useAIMetrics(
  botId?: Id<"botProfiles"> | "skip",
  days: number = 1,
) {
  return useQuery(
    api.aiAnalytics.getAIMetrics,
    botId && botId !== "skip" ? { botId, days } : "skip",
  );
}

/**
 * Hook to fetch knowledge base utilization stats
 */
export function useKnowledgeUtilization(
  botId?: Id<"botProfiles"> | "skip",
  days: number = 1,
) {
  return useQuery(
    api.aiAnalytics.getKnowledgeUtilization,
    botId && botId !== "skip" ? { botId, days } : "skip",
  );
}

/**
 * Hook to fetch all knowledge documents for a bot
 * Returns array of documents with id, text, and createdAt
 */
export function useKnowledgeDocuments(botId?: Id<"botProfiles"> | "skip") {
  return useQuery(
    api.knowledge.getKnowledgeDocuments,
    botId && botId !== "skip" ? { botId } : "skip",
  );
}

/**
 * Hook to delete a knowledge document
 */
export function useDeleteDocument() {
  return useAction(api.knowledge.deleteDocument);
}

/**
 * Hook to update a knowledge document with new text (regenerates embedding)
 */
export function useUpdateDocument() {
  return useAction(api.knowledge.updateDocument);
}

// ===== REAL-TIME MESSAGE SUBSCRIPTION FIX =====

/**
 * Hook to subscribe to messages for an emulator session in real-time
 * Returns messages as they're added or modified, enabling live chat updates
 * This fixes the ghost message/stale UI bug by creating a separate reactive subscription
 */
export function useEmulatorMessages(sessionId?: Id<"conversations"> | "skip") {
  return useQuery(
    api.playground.getEmulatorMessages,
    sessionId && sessionId !== "skip" ? { sessionId } : "skip",
  );
}

export function useDashboardStats() {
  return useQuery(api.analytics.getDashboardStats);
}
