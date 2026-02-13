"use client";

import React, { useState, useEffect } from "react";
import { cn } from "../../../lib/utils";
import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import type { ChatContainerProps } from "../types";

/**
 * ChatContainer - Main widget component
 * Pure UI composition - no app-specific dependencies
 * All state passed as props from parent
 *
 * Props:
 * - botConfig: Bot profile, appearance, and features
 * - session: Current chat session info
 * - messages: List of messages to display
 * - isLoading: Whether waiting for initial data
 * - isStreaming: Whether bot is streaming a response
 * - error: Any error to display
 * - onSendMessage: Callback to send a message
 * - onRefresh: Optional callback to restart conversation
 * - onClose: Optional callback to close the widget
 * - onFeedback: Optional callback for message feedback
 * - className: Optional CSS class
 */
export function ChatContainer({
  botConfig,
  session,
  messages,
  isLoading,
  isStreaming,
  error,
  onSendMessage,
  onRefresh,
  onFeedback,
  onLeadClick,
  className,
  isOnline = true,
}: ChatContainerProps) {
  const [input, setInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Reset input when session changes (e.g. after refresh)
  useEffect(() => {
    setInput("");
    setIsRefreshing(false);
  }, [session?.id]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    setInput("");
    await onSendMessage(content);
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      // Input reset handled by session change effect
    } catch {
      setIsRefreshing(false);
    }
  };

  // Get font family
  const getFontFamily = () => {
    switch (botConfig.appearance.font) {
      case "roboto":
        return "'Roboto', sans-serif";
      case "system":
        return "system-ui, -apple-system, sans-serif";
      case "inter":
      default:
        return "'Inter', sans-serif";
    }
  };

  // Theme background
  const bgColor =
    botConfig.appearance.themeMode === "light" ? "#FFFFFF" : "#18181B";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={{ background: "transparent" }}
    >
      {/* Chat window - Fills iframe container smoothly */}
      <div
        className="relative z-10 flex flex-col overflow-hidden w-full h-full"
        style={{
          borderRadius: `${botConfig.appearance.cornerRadius}px`,
          fontFamily: getFontFamily(),
          border: "none",
          outline: "none",
          backgroundColor: bgColor,
        }}
      >
        {/* Header */}
        <ChatHeader
          botName={botConfig.profile.displayName}
          botAvatar={botConfig.profile.avatarUrl}
          primaryColor={botConfig.appearance.primaryColor}
          headerStyle={botConfig.appearance.headerStyle}
          themeMode={botConfig.appearance.themeMode}
          enableSound={botConfig.features.enableSound}
          onRefresh={onRefresh ? handleRefresh : undefined}
          isLoading={isLoading || isRefreshing}
          isOnline={isOnline}
        />

        {/* Messages */}
        <ChatMessages
          messages={messages}
          primaryColor={botConfig.appearance.primaryColor}
          botName={botConfig.profile.displayName}
          botAvatar={botConfig.profile.avatarUrl}
          themeMode={botConfig.appearance.themeMode}
          cornerRadius={botConfig.appearance.cornerRadius}
          enableFeedback={botConfig.features.enableFeedback}
          messageStyle={botConfig.appearance.messageStyle}
          isLoadingSession={isLoading}
          scrollRef={scrollRef}
          isStreaming={isStreaming}
          error={error}
          onFeedback={onFeedback}
          onLeadClick={onLeadClick}
        />

        {/* Input */}
        <ChatInput
          placeholder={botConfig.profile.placeholder}
          isLoading={isLoading}
          isStreaming={isStreaming}
          primaryColor={botConfig.appearance.primaryColor}
          cornerRadius={botConfig.appearance.cornerRadius}
          themeMode={botConfig.appearance.themeMode}
          enableFileUpload={botConfig.features.enableFileUpload}
          onSendMessage={handleSend}
          value={input}
          onChange={setInput}
          onCancel={() => {
            // Handle cancel if needed
          }}
        />
      </div>
    </div>
  );
}
