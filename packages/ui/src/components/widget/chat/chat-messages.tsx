"use client";

import { cn } from "../../../lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import type { ChatMessagesProps } from "../types.ts";

/**
 * ChatMessages - Pure UI component
 * Renders chat message history with loading and error states
 * No app-specific dependencies
 */
export function ChatMessages({
  messages,
  primaryColor,
  botName,
  botAvatar,
  themeMode,
  cornerRadius,
  enableFeedback,
  messageStyle,
  isLoadingSession,
  scrollRef,
  isStreaming = false,
  streamingContent,
  error,
  onFeedback,
  onLeadClick,
}: ChatMessagesProps) {
  const contentSubBgColor =
    themeMode === "light" ? "bg-zinc-50/50" : "bg-zinc-800/50";
  const textSecondaryColor =
    themeMode === "light" ? "text-zinc-400" : "text-zinc-500";

  // Loading state
  if (isLoadingSession) {
    return (
      <div
        className={cn(
          "flex-1 overflow-hidden w-full relative h-0 flex items-center justify-center",
          contentSubBgColor,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <p className={cn("text-xs font-medium", textSecondaryColor)}>
            Loading Configuration...
          </p>
        </div>
      </div>
    );
  }

  // Main messages area
  return (
    <div
      className={cn(
        "flex-1 overflow-hidden w-full relative h-0",
        contentSubBgColor,
      )}
    >
      <ScrollArea className={cn("h-full w-full relative", contentSubBgColor)}>
        <div className="flex flex-col gap-6 p-5">
          {/* Welcome message when no messages */}
          {messages.length < 5 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 transition-all duration-500">
              <Avatar className="h-20 w-20 mb-2 shadow-sm">
                <AvatarImage src={botAvatar} />
                <AvatarFallback
                  className="text-white text-3xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {botName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className={cn("text-xs font-medium", textSecondaryColor)}>
                Powered by Chatify
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg._id || msg.id}
              message={msg}
              primaryColor={primaryColor}
              botName={botName}
              botAvatar={botAvatar}
              themeMode={themeMode}
              cornerRadius={cornerRadius}
              messageStyle={messageStyle}
              enableFeedback={enableFeedback}
              onFeedback={onFeedback}
              onLeadClick={onLeadClick}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div
                className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tl-sm border"
                style={{
                  backgroundColor:
                    themeMode === "light" ? "#FFFFFF" : "#27272A",
                  color: themeMode === "light" ? "#18181B" : "#F4F4F5",
                  borderColor: themeMode === "light" ? "#E4E4E7" : "#3F3F46",
                  borderRadius: `${cornerRadius * 0.75}px`,
                  borderTopLeftRadius: `${cornerRadius * 0.15}px`,
                }}
              >
                <p className="text-sm leading-relaxed break-words">
                  {streamingContent}
                </p>
              </div>
            </div>
          )}

          {/* Loading indicator during streaming without content */}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div
                className="px-4 py-2.5 rounded-2xl rounded-tl-sm"
                style={{
                  backgroundColor:
                    themeMode === "light" ? "#FFFFFF" : "#27272A",
                }}
              >
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                Error: {error.message || "An error occurred"}
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>
    </div>
  );
}
