"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, type PanInfo } from "framer-motion";
import {
  ChatContainer,
  type BotConfig,
  type Message,
  type ChatSession,
  type LeadClickPayload,
} from "@workspace/ui/components/widget";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex";
import {
  notifyReady,
  notifyError,
  notifyConfig,
  notifyClose,
  notifyInactive,
} from "@/lib/postmessage-bridge";

function WidgetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [currentDomain, setCurrentDomain] = useState<string | undefined>(
    undefined,
  );

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hydratedTheme, setHydratedTheme] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isWidgetActive, setIsWidgetActive] = useState<boolean | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const viewportBaselineRef = useRef<number | null>(null);
  const isInputFocusedRef = useRef(false);

  const blurActiveInput = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 480px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsSheetExpanded(false);
        isInputFocusedRef.current = false;
      }
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const closeWidget = useCallback(() => {
    blurActiveInput();
    isInputFocusedRef.current = false;
    setIsSheetExpanded(false);
    notifyClose();
  }, [blurActiveInput]);

  const handleSheetDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 120 || info.velocity.y > 700) {
        closeWidget();
      }
    },
    [closeWidget],
  );

  const handleInputFocus = useCallback(() => {
    if (isMobileViewport) {
      isInputFocusedRef.current = true;
      setIsSheetExpanded(true);

      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        viewportBaselineRef.current = Math.max(
          viewportBaselineRef.current ?? 0,
          currentHeight,
        );
      }
    }
  }, [isMobileViewport]);

  const handleInputBlur = useCallback(() => {
    isInputFocusedRef.current = false;
    if (isMobileViewport) {
      setIsSheetExpanded(false);
    }
  }, [isMobileViewport]);

  const handleMessagesInteract = useCallback(() => {
    if (!isMobileViewport) return;
    isInputFocusedRef.current = false;
    blurActiveInput();
    setIsSheetExpanded(false);
  }, [blurActiveInput, isMobileViewport]);

  useEffect(() => {
    if (!isMobileViewport || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    viewportBaselineRef.current = Math.max(
      viewportBaselineRef.current ?? 0,
      viewport.height,
    );

    const handleViewportResize = () => {
      const currentHeight = viewport.height;

      if (!isInputFocusedRef.current) {
        viewportBaselineRef.current = Math.max(
          viewportBaselineRef.current ?? 0,
          currentHeight,
        );
        return;
      }

      const baselineHeight =
        viewportBaselineRef.current ??
        Math.max(window.innerHeight, currentHeight);
      const collapseThreshold = baselineHeight - 80;

      if (currentHeight >= collapseThreshold) {
        isInputFocusedRef.current = false;
        setIsSheetExpanded(false);
        blurActiveInput();
      }
    };

    viewport.addEventListener("resize", handleViewportResize);
    return () => {
      viewport.removeEventListener("resize", handleViewportResize);
    };
  }, [blurActiveInput, isMobileViewport]);

  useEffect(() => {
    try {
      if (!document.referrer) {
        setCurrentDomain(undefined);
        return;
      }
      const hostname = new URL(document.referrer).hostname;
      setCurrentDomain(hostname || undefined);
    } catch {
      setCurrentDomain(undefined);
    }
  }, []);

  // Fetch bot config
  const config = useQuery(
    api.public.validateEmbedToken,
    token ? { token, currentDomain } : "skip",
  );

  // Create session
  const createSessionMutation = useMutation(api.public.createSession);

  // Send message
  const sendMessageMutation = useMutation(api.public.sendMessage);

  // End session (for restart)
  const endSessionMutation = useMutation(api.public.endSession);

  // Track lead events
  const trackEventMutation = useMutation(api.public.trackEvent);

  // Generate AI reply (this is an ACTION, not a mutation)
  const generateReplyAction = useAction(api.public.generateReplyStream);

  // Subscribe to messages — skip when no session
  const sessionMessages = useQuery(
    api.public.getMessages,
    session
      ? {
          conversationId: session.conversationId,
          sessionToken: session.sessionToken,
        }
      : "skip",
  );

  // Validate parameters and load bot config
  useEffect(() => {
    if (!token) {
      setError(new Error("Missing required parameters"));
      notifyError("Missing required parameters");
      setIsOnline(false);
      return;
    }

    if (config) {
      const botConfigData = config as BotConfig;
      const active = botConfigData.isActive ?? true;
      setIsWidgetActive(active);
      if (!active) {
        setBotConfig(null);
        notifyInactive();
        return;
      }

      setBotConfig(botConfigData);
      setIsOnline(true); // API key is configured, bot is online

      // Set theme mode immediately to prevent hydration flash
      if (!hydratedTheme) {
        setHydratedTheme(botConfigData.appearance.themeMode);
      }

      // Notify parent iframe of primary color and corner radius
      notifyConfig(
        botConfigData.appearance.primaryColor,
        botConfigData.appearance.cornerRadius,
      );
    }
  }, [token, config, hydratedTheme]);

  if (isWidgetActive === false) {
    return null;
  }

  // Sync messages from subscription
  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages as Message[]);
    }
  }, [sessionMessages]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!token) {
        setError(new Error("Missing required parameters"));
        return;
      }

      try {
        setIsStreaming(true);

        // Lazy initialization: create session only on first message
        let currentSession = session;
        if (!currentSession) {
          const newSession = await createSessionMutation({
            token,
            currentDomain,
          });

          const sessionData: ChatSession = {
            sessionToken: newSession.sessionToken,
            conversationId: newSession.conversationId,
            organizationId: botConfig?.organizationId ?? "",
            botId: botConfig?.id ?? "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setSession(sessionData);
          notifyReady(
            newSession.conversationId,
            botConfig?.appearance.primaryColor,
            botConfig?.appearance.cornerRadius,
          );
          currentSession = sessionData;
        }

        // Send message using the session
        await sendMessageMutation({
          conversationId: currentSession.conversationId,
          sessionToken: currentSession.sessionToken,
          content,
        });

        // Trigger AI response generation (streamed via DB updates)
        console.log("[Widget] Generating AI response (streaming)...");
        await generateReplyAction({
          conversationId: currentSession.conversationId,
          sessionToken: currentSession.sessionToken,
          userMessage: content,
        });

        console.log("[Widget] AI response streamed and saved");
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error(
          "[Widget] Error sending message or generating reply:",
          errorMessage,
        );

        // If error is from Convex/AI generation, set offline
        setIsOnline(false);

        setError(err as Error);
        notifyError(errorMessage);
      } finally {
        setIsStreaming(false);
      }
    },
    [
      token,
      currentDomain,
      session,
      botConfig,
      createSessionMutation,
      sendMessageMutation,
      generateReplyAction,
    ],
  );

  /**
   * Handle refresh/restart: end current session, clear state
   * A new session will be lazily created on the next message send
   */
  const handleRefresh = useCallback(async () => {
    if (session) {
      try {
        await endSessionMutation({
          conversationId: session.conversationId,
          sessionToken: session.sessionToken,
        });
      } catch (err) {
        console.warn("[Widget] Failed to end session:", err);
        // Continue with reset even if end fails
      }
    }

    // Clear all state — triggers fresh start
    setSession(null);
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, [session, endSessionMutation]);

  const handleLeadClick = useCallback(
    async (payload: LeadClickPayload) => {
      if (!session) return;

      const eventType =
        payload.type === "whatsapp"
          ? "lead_whatsapp_click"
          : "lead_email_click";

      try {
        await trackEventMutation({
          conversationId: session.conversationId,
          sessionToken: session.sessionToken,
          eventType,
          href: payload.href,
        });
      } catch (err) {
        console.warn("[Widget] Failed to track lead event:", err);
      }
    },
    [session, trackEventMutation],
  );

  // Error state
  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full p-4"
        style={{
          backgroundColor: hydratedTheme === "dark" ? "#18181B" : "#FFFFFF",
        }}
      >
        <div className="text-center text-red-500">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error.message}</p>
          <button
            className="mt-3 px-4 py-2 text-xs rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Loading state — simple spinner while waiting for config
  if (!botConfig) {
    return (
      <div
        suppressHydrationWarning
        className={hydratedTheme === "dark" ? "dark" : ""}
        style={{ height: "100%", width: "100%" }}
      >
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <span>Loading chat...</span>
          </div>
        </div>
      </div>
    );
  }

  const baseChat = (
    <div
      suppressHydrationWarning
      className={botConfig.appearance.themeMode === "dark" ? "dark" : ""}
      style={{ height: "100%", width: "100%" }}
    >
      <ChatContainer
        key={session?.conversationId || "no-session"}
        botConfig={botConfig}
        session={session}
        messages={messages}
        isLoading={false}
        isStreaming={isStreaming}
        error={error}
        onSendMessage={handleSendMessage}
        onLeadClick={handleLeadClick}
        onRefresh={handleRefresh}
        onInputFocus={handleInputFocus}
        onInputBlur={handleInputBlur}
        onMessagesInteract={handleMessagesInteract}
        isOnline={isOnline}
      />
    </div>
  );

  if (!isMobileViewport) {
    return baseChat;
  }

  return (
    <div
      suppressHydrationWarning
      className={botConfig.appearance.themeMode === "dark" ? "dark" : ""}
      style={{ height: "100%", width: "100%" }}
    >
      <motion.div
        className="fixed inset-0 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <button
          type="button"
          className="absolute inset-0 bg-transparent"
          aria-label="Close chat widget"
          onClick={closeWidget}
        />

        <motion.div
          className="absolute inset-x-0 bottom-0 z-10 overflow-hidden rounded-t-2xl bg-transparent"
          initial={{ y: "100%", height: "75dvh" }}
          animate={{ y: 0, height: isSheetExpanded ? "100dvh" : "75dvh" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          drag="y"
          dragDirectionLock
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.28 }}
          onDragEnd={handleSheetDragEnd}
        >
          <div className="relative flex h-full w-full flex-col pt-3">
            <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-1.5 w-10 -translate-x-1/2 rounded-full bg-zinc-400/70" />

            <div className="h-full overflow-hidden rounded-t-2xl">
              {baseChat}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
            <span>Loading chat...</span>
          </div>
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
