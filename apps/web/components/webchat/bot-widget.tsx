"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChatContainer,
  type BotConfig,
  type Message,
  type ChatSession,
} from "@workspace/ui/components/widget";
import { useWebchatContext } from "@/contexts/webchat-context";
import {
  useBotProfile,
  useGetPlaygroundSession,
  useAddPlaygroundMessage,
  useRestartPlaygroundSession,
  useGetOrCreatePlaygroundSession,
  useGetPlaygroundMessages,
  useGenerateBotResponse,
  useGenerateBotResponseStream,
  type Message as ConvexMessage,
} from "@/lib/convex-client";

interface BotWidgetProps {
  className?: string;
}

export function BotWidget({ className }: BotWidgetProps) {
  // Context and backend hooks
  const botProfile = useBotProfile();
  const createOrGetSession = useGetOrCreatePlaygroundSession();
  const addPlaygroundMessage = useAddPlaygroundMessage();
  const restartSession = useRestartPlaygroundSession();
  const generateBotResponse = useGenerateBotResponse();
  const {
    startStream,
    chunks,
    isStreaming,
    cancelStream: cancelStreamFunc,
    error: streamError,
  } = useGenerateBotResponseStream();

  // Local state
  const [dbMessages, setDbMessages] = useState<Message[]>([]); // Source of truth from DB only
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [useStreamingMode, setUseStreamingMode] = useState(true); // Toggle between streaming and non-streaming
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { font, themeMode, cornerRadius } = useWebchatContext();

  // ✅ FIX: Subscribe to messages separately for real-time updates
  // This ensures UI updates when bot messages are added, fixing ghost messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playgroundMessages = useGetPlaygroundMessages(sessionId as any);

  // Initialize playground session on mount
  useEffect(() => {
    const initSession = async () => {
      if (!botProfile) return;

      // Clear stale state immediately
      setSessionId(null);
      setDbMessages([]);

      try {
        setIsLoadingSession(true);
        const session = await createOrGetSession({ botId: botProfile._id });
        if (session) {
          const id = typeof session === "string" ? session : session._id;
          setSessionId(id);
        }
      } catch (error) {
        console.error("Failed to initialize playground session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    initSession();
  }, [botProfile, createOrGetSession]);

  // ✅ SYNC: Update dbMessages when playgroundMessages changes (DB source of truth only)
  useEffect(() => {
    if (!playgroundMessages) return;

    const convertedMessages: Message[] = playgroundMessages.map(
      (msg: ConvexMessage) => ({
        id: msg._id,
        role: msg.role as "user" | "bot",
        content: msg.content,
        createdAt: new Date(msg.created_at),
        _id: msg._id,
      }),
    );

    setDbMessages(convertedMessages);
  }, [playgroundMessages]);

  // ✅ DERIVED STATE: Compute displayMessages (DB + streaming placeholder)
  // This is computed on-the-fly, NOT synced via useEffect
  // Chunks updates trigger re-renders but NOT state updates = smooth streaming!
  const displayMessages = useMemo(() => {
    if (isStreaming && streamingMessageId && chunks.length > 0) {
      // STREAMING MODE: Append streaming placeholder with current chunks
      return [
        ...dbMessages,
        {
          id: streamingMessageId,
          role: "bot" as const,
          content: chunks.join(""), // Direct chunk rendering = no intermediate state
          createdAt: new Date(),
          _id: streamingMessageId,
        },
      ];
    }
    // NORMAL MODE: Just display DB messages
    return dbMessages;
  }, [dbMessages, isStreaming, streamingMessageId, chunks]);

  // Auto-scroll to latest message (smooth streaming because displayMessages updates reactively)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages]);

  const handleSend = async (e?: React.FormEvent, messageContent?: string) => {
    e?.preventDefault();

    // Accept content from either state or parameter (for shared component)
    const userContent = messageContent || input;

    if (!userContent.trim() || !sessionId || !botProfile) return;

    setInput("");
    setIsSendingMessage(true);

    try {
      // Add user message to database
      await addPlaygroundMessage({
        botId: botProfile._id,
        role: "user",
        content: userContent,
      });

      if (useStreamingMode) {
        // STREAMING MODE
        console.log("[handleSend] Using streaming mode");

        // Create streaming message ID - displayMessages will compute the placeholder
        const streamMsgId = `stream-${Date.now()}`;
        setStreamingMessageId(streamMsgId);

        try {
          // Start streaming - this will populate chunks in real-time
          await startStream(botProfile._id, sessionId, userContent);

          // Stream completed successfully - response is now in database
          console.log("[handleSend] Streaming completed successfully");

          // Wait a tick for database to sync, then clear streaming placeholder
          // This ensures the actual bot message from DB replaces the placeholder
          await new Promise((resolve) => setTimeout(resolve, 100));
          setStreamingMessageId(null);

          if (streamError) {
            console.error("[handleSend] Stream had error:", streamError);
            toast.error(streamError || "Streaming failed");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("[handleSend] Stream error:", errorMessage);
          toast.error("Failed to stream response");
          // Clear streaming state on error
          setStreamingMessageId(null);
        }
      } else {
        // NON-STREAMING MODE (fallback)
        console.log("[handleSend] Using non-streaming mode");

        // Generate AI response using the unified AI engine
        await generateBotResponse({
          botId: botProfile._id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conversationId: sessionId as any,
          userMessage: userContent,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Failed to send message. Please try again.");
      setInput(userContent);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCancelStream = useCallback(() => {
    cancelStreamFunc();
    // Clear streaming state - displayMessages will revert to dbMessages
    setStreamingMessageId(null);
  }, [cancelStreamFunc]);

  const handleRestart = async () => {
    if (!botProfile) return;

    try {
      setIsLoadingSession(true);
      const newSessionId = await restartSession({ botId: botProfile._id });
      setSessionId(newSessionId);
      setDbMessages([]); // Clear DB messages when restarting session
      setStreamingMessageId(null); // Clear any streaming state
    } catch (error) {
      console.error("Failed to restart session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Wrapper for shared component callback signature
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Pass content directly to handleSend
      return handleSend(undefined, content);
    },
    [handleSend],
  );

  // Map web app context to BotConfig for shared component
  const {
    displayName,
    description,
    placeholder,
    primaryColor,
    avatarUrl,
    headerStyle,
    messageStyle,
    enableFeedback,
    enableFileUpload,
    enableSound,
  } = useWebchatContext();

  const botConfig: BotConfig = {
    id: botProfile?._id || "preview",
    organizationId: "web-app",
    profile: {
      displayName: displayName || "Support Bot",
      description: description || "",
      placeholder: placeholder || "Type your message...",
      avatarUrl: avatarUrl || undefined,
    },
    appearance: {
      primaryColor,
      font: (font as "inter" | "roboto" | "system") || "inter",
      themeMode,
      cornerRadius,
      headerStyle,
      messageStyle,
    },
    features: {
      enableFeedback,
      enableFileUpload,
      enableSound,
      enableMarkdown: true,
    },
  };

  // Create mock session for shared component
  const session: ChatSession = {
    id: sessionId || "preview-session",
    organizationId: "web-app",
    botId: botProfile?._id || "preview",
    visitorId: "admin-test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const GRID_BG_SVG =
    "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='16' height='16' fill='none' stroke='white'%3e%3cpath d='M0 .5H16V16'/%3e%3c/svg%3e";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-zinc-900",
        className,
      )}
    >
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url("${GRID_BG_SVG}")`,
        }}
      />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#18181b_100%)] pointer-events-none" />

      <div
        className={cn(
          "relative z-10 flex flex-col overflow-hidden transition-all duration-500 ease-in-out w-[380px] h-[640px] max-h-[90vh] max-w-[95%] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]",
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-90 opacity-0 translate-y-20 pointer-events-none absolute",
        )}
      >
        <ChatContainer
          botConfig={botConfig}
          session={session}
          messages={displayMessages}
          isLoading={isLoadingSession}
          isStreaming={isStreaming}
          error={null}
          onSendMessage={handleSendMessage}
          onClose={() => setIsOpen(false)}
        />
      </div>

      <div className="absolute bottom-12 right-[110px] z-30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-16 w-16 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.3)]"
          style={{
            backgroundColor: primaryColor,
            boxShadow: `0 10px 25px -5px ${primaryColor}80`,
          }}
          aria-label="Toggle chat widget"
        >
          <div
            className={`transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "▼" : "💬"}
          </div>
        </button>
      </div>
    </div>
  );
}
