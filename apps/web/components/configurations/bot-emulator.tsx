"use client";

import { useState, useRef, useEffect } from "react";
import { RefreshCw, Loader2, ArrowUp, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Markdown } from "@/components/markdown";
import {
  useBotProfile,
  useGetOrCreateEmulatorSession,
  useAddEmulatorMessage,
  useRestartEmulatorSession,
  useGenerateBotResponseStream,
  useEmulatorMessages,
  type Message as ConvexMessage,
} from "@/lib/convex-client";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
  _id?: string;
}

export function BotEmulator() {
  // Backend hooks
  const botProfile = useBotProfile();
  const createOrGetSession = useGetOrCreateEmulatorSession();
  const addEmulatorMessage = useAddEmulatorMessage();
  const restartSession = useRestartEmulatorSession();
  const {
    startStream,
    chunks,
    isStreaming,
    cancelStream,
    fullText,
    error: streamError,
  } = useGenerateBotResponseStream();

  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [streamingBotMessage, setStreamingBotMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ✅ FIX: Subscribe to messages separately for real-time updates
  // This ensures UI updates when bot messages are added, fixing ghost messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emulatorMessages = useEmulatorMessages(sessionId as any);

  // ✅ Sync streaming chunks to local state for real-time UI display
  useEffect(() => {
    if (isStreaming && fullText) {
      setStreamingBotMessage(fullText);
    }
  }, [isStreaming, fullText]);

  // ✅ When streaming completes, wait a moment for DB save, then refresh messages
  useEffect(() => {
    if (!isStreaming && streamingBotMessage && !streamError) {
      // Stream completed successfully - wait for DB to save, then refresh
      const timer = setTimeout(() => {
        console.log(
          "[BotEmulator] Stream complete, triggering message refresh",
        );
        setStreamingBotMessage("");
        // Messages will refresh automatically via useEmulatorMessages subscription
      }, 500);

      return () => clearTimeout(timer);
    }

    if (streamError) {
      // Show error for a moment
      const timer = setTimeout(() => {
        setStreamingBotMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming, streamingBotMessage, streamError]);

  // Initialize emulator session on mount
  useEffect(() => {
    const initSession = async () => {
      if (!botProfile) return;

      // Clear stale state immediately
      setSessionId(null);
      setMessages([]);

      try {
        setIsLoadingSession(true);
        const session = await createOrGetSession({ botId: botProfile._id });
        if (session) {
          const id = typeof session === "string" ? session : session._id;
          setSessionId(id);
        }
      } catch (error) {
        console.error("Failed to initialize emulator session:", error);
      } finally {
        setIsLoadingSession(false);
      }
    };

    initSession();
  }, [botProfile, createOrGetSession]);

  // ✅ FIX: Subscribe to messages when they change (real-time reactivity)
  // This replaces the old getEmulatorSession.messages subscription
  // Now UI updates immediately when messages are added/modified
  useEffect(() => {
    if (!emulatorMessages) return;

    const convertedMessages: Message[] = emulatorMessages.map(
      (msg: ConvexMessage) => ({
        id: msg._id,
        role: msg.role as "user" | "bot",
        content: msg.content,
        timestamp: new Date(msg.created_at),
        _id: msg._id,
      }),
    );

    setMessages(convertedMessages);
  }, [emulatorMessages]); // ✅ Dependencies on emulatorMessages triggers re-render on updates

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !sessionId || !botProfile) return;

    const userContent = input;
    setInput("");
    setStreamingBotMessage("");

    try {
      // Add user message to database
      await addEmulatorMessage({
        botId: botProfile._id,
        role: "user",
        content: userContent,
      });

      console.log(
        "[BotEmulator] Starting streaming for user message:",
        userContent,
      );

      // Start streaming response
      await startStream(botProfile._id, sessionId, userContent);

      console.log("[BotEmulator] Stream completed, fullText:", fullText);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(errorMessage || "Failed to send message. Please try again.");
      setInput(userContent);
    }
  };

  const handleRestart = async () => {
    if (!botProfile) return;

    try {
      setIsLoadingSession(true);
      const newSessionId = await restartSession({ botId: botProfile._id });
      setSessionId(newSessionId);
      setMessages([]);
    } catch (error) {
      console.error("Failed to restart session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full w-full flex-col border-l bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 shrink-0">
        <h3 className="text-sm font-semibold">Bot Emulator</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={handleRestart}
          disabled={isLoadingSession}
        >
          <RefreshCw
            className={`h-3 w-3 ${isLoadingSession ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Chat Messages Area */}
      <ScrollArea className="flex-1 w-full">
        <div className="h-full w-full p-4">
          {!hasMessages && !isLoadingSession && (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed bg-muted/50">
                <span className="text-lg">🤖</span>
              </div>
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-semibold">Test your bot</h4>
                <p className="text-xs text-muted-foreground px-2">
                  Start chatting to preview your agent behavior
                </p>
              </div>
            </div>
          )}

          {hasMessages && (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.role === "bot" ? (
                      <Markdown content={msg.content} className="text-xs" />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              {/* ✅ NEW: Show streaming message in real-time */}
              {isStreaming && streamingBotMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <Markdown
                      content={streamingBotMessage}
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Loading indicator during streaming */}
              {isStreaming && !streamingBotMessage && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg bg-muted px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}

              {/* ✅ Error display */}
              {streamError && (
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    Error: {streamError}
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          )}

          {isLoadingSession && !hasMessages && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 shrink-0">
        <form onSubmit={handleSend} className="relative">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming || isLoadingSession}
            className="pr-10"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={cancelStream}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600"
              title="Cancel streaming"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isStreaming || isLoadingSession || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50 hover:opacity-100 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
