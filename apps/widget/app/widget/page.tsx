"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChatContainer,
  ChatSkeleton,
  type BotConfig,
  type Message,
  type ChatSession,
} from "@workspace/ui/components/widget";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex";
import {
  notifyReady,
  notifyError,
  notifyClose,
  notifyConfig,
} from "@/lib/postmessage-bridge";

function WidgetContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");
  const botId = searchParams.get("botId");
  const visitorId = searchParams.get("visitorId");

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hydratedTheme, setHydratedTheme] = useState<string | null>(null);

  // Fetch bot config
  const config = useQuery(
    api.public.getBotProfile,
    orgId && botId ? { organizationId: orgId, botId } : "skip",
  );

  // Create session
  const createSessionMutation = useMutation(api.public.createSession);

  // Send message
  const sendMessageMutation = useMutation(api.public.sendMessage);

  // End session (for restart)
  const endSessionMutation = useMutation(api.public.endSession);

  // Generate AI reply (this is an ACTION, not a mutation)
  const generateReplyAction = useAction(api.public.generateReply);

  // Subscribe to messages — skip when no session
  const sessionMessages = useQuery(
    api.public.getMessages,
    session
      ? {
          sessionId: session.id,
          organizationId: orgId || "",
          botId: botId || "",
          visitorId: session.visitorId,
        }
      : "skip",
  );

  // Validate parameters and load bot config
  useEffect(() => {
    if (!orgId || !botId || !visitorId) {
      setError(new Error("Missing required parameters"));
      notifyError("Missing required parameters");
      return;
    }

    if (config) {
      const botConfigData = config as BotConfig;
      setBotConfig(botConfigData);

      // Set theme mode immediately to prevent hydration flash
      if (!hydratedTheme) {
        setHydratedTheme(botConfigData.appearance.themeMode);
      }

      // Notify parent iframe of primary color for launcher button
      notifyConfig(botConfigData.appearance.primaryColor);
    }
  }, [orgId, botId, visitorId, config, hydratedTheme]);

  // Sync messages from subscription
  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages as Message[]);
    }
  }, [sessionMessages]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!orgId || !botId || !visitorId) {
        setError(new Error("Missing required parameters"));
        return;
      }

      try {
        setIsStreaming(true);

        // Lazy initialization: create session only on first message
        let currentSession = session;
        if (!currentSession) {
          const newSession = await createSessionMutation({
            organizationId: orgId,
            botId,
            visitorId,
          });

          const sessionData: ChatSession = {
            id: newSession.sessionId,
            organizationId: orgId,
            botId,
            visitorId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setSession(sessionData);
          notifyReady(newSession.sessionId, botConfig?.appearance.primaryColor);
          currentSession = sessionData;
        }

        // Send message using the session
        await sendMessageMutation({
          sessionId: currentSession.id,
          organizationId: currentSession.organizationId,
          botId: currentSession.botId,
          visitorId: currentSession.visitorId,
          content,
        });

        // Trigger AI response generation
        console.log("[Widget] Generating AI response...");
        await generateReplyAction({
          sessionId: currentSession.id,
          organizationId: currentSession.organizationId,
          botId: currentSession.botId,
          visitorId: currentSession.visitorId,
          userMessage: content,
        });

        console.log("[Widget] AI response generated and saved");
      } catch (err) {
        setError(err as Error);
        notifyError((err as Error).message);
      } finally {
        setIsStreaming(false);
      }
    },
    [
      orgId,
      botId,
      visitorId,
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
    if (session && orgId && botId) {
      try {
        await endSessionMutation({
          sessionId: session.id,
          organizationId: orgId,
          botId,
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
  }, [session, orgId, botId, endSessionMutation]);

  /**
   * Handle close: clear state and notify parent to hide iframe
   */
  const handleClose = useCallback(() => {
    // Don't destroy session on close — user can reopen and continue
    notifyClose();
  }, []);

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

  // Loading state — show skeleton that matches final layout
  if (!botConfig) {
    return (
      <div
        suppressHydrationWarning
        className={hydratedTheme === "dark" ? "dark" : ""}
      >
        <ChatSkeleton
          primaryColor="#6366f1"
          themeMode={hydratedTheme === "dark" ? "dark" : "light"}
        />
      </div>
    );
  }

  return (
    <div
      suppressHydrationWarning
      className={botConfig.appearance.themeMode === "dark" ? "dark" : ""}
      style={{ height: "100%", width: "100%" }}
    >
      <ChatContainer
        key={session?.id || "no-session"}
        botConfig={botConfig}
        session={session}
        messages={messages}
        isLoading={false}
        isStreaming={isStreaming}
        error={error}
        onSendMessage={handleSendMessage}
        onRefresh={handleRefresh}
        onClose={handleClose}
      />
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={<ChatSkeleton primaryColor="#6366f1" themeMode="light" />}
    >
      <WidgetContent />
    </Suspense>
  );
}
