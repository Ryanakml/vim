"use client";

import { cn } from "../../../lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { MessageBubbleProps } from "../types.ts";

/**
 * MarkdownRenderer - Simple inline markdown support
 * For full markdown rendering, should be replaced with react-markdown
 */
function SimpleMarkdown({ content }: { content: string }) {
  // Simple markdown support for bold, italic, code
  const parts = [];
  let lastIndex = 0;
  const patterns = [
    {
      regex: /\*\*(.+?)\*\*/g,
      wrapper: (text: string) => <strong key={text}>{text}</strong>,
    },
    {
      regex: /\*(.+?)\*/g,
      wrapper: (text: string) => <em key={text}>{text}</em>,
    },
    {
      regex: /`(.+?)`/g,
      wrapper: (text: string) => (
        <code key={text} className="bg-zinc-700/30 px-1 rounded text-xs">
          {text}
        </code>
      ),
    },
  ];

  let result: React.ReactNode = content;
  for (const { regex, wrapper } of patterns) {
    const matches = [...content.matchAll(regex)];
    if (matches.length > 0) {
      result = content.replace(regex, (match, group) => {
        return group; // Simplified - actual implementation would need more care
      });
    }
  }

  return <>{result}</>;
}

/**
 * MessageBubble - Pure UI component
 * Renders a single message with optional feedback controls
 * No app-specific dependencies
 */
export function MessageBubble({
  message,
  primaryColor,
  botName,
  botAvatar,
  themeMode,
  cornerRadius,
  messageStyle,
  enableFeedback,
  onFeedback,
}: MessageBubbleProps) {
  const isBot = message.role === "bot";
  const [feedbackGiven, setFeedbackGiven] = useState<
    "helpful" | "not-helpful" | null
  >(null);

  // Theme colors for bubbles
  const botBubbleBgColor = themeMode === "light" ? "#FFFFFF" : "#27272A";
  const botBubbleTextColor = themeMode === "light" ? "#18181B" : "#F4F4F5";
  const botBubbleBorderColor = themeMode === "light" ? "#E4E4E7" : "#3F3F46";
  const textSecondaryColor = themeMode === "light" ? "#71717A" : "#A1A1A6";

  const getBubbleRadius = () => `${cornerRadius * 0.75}px`;

  const handleFeedback = (feedback: "helpful" | "not-helpful") => {
    setFeedbackGiven(feedback);
    onFeedback?.(message.id, feedback);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isBot ? "items-start" : "items-end",
      )}
    >
      <div
        className={cn(
          "flex max-w-[80%] gap-2",
          isBot ? "flex-row" : "flex-row-reverse",
        )}
      >
        {/* Bot Avatar */}
        {isBot && (
          <Avatar className="h-6 w-6 mt-1 flex-shrink-0 border border-zinc-100">
            <AvatarImage src={botAvatar} />
            <AvatarFallback
              style={{ backgroundColor: primaryColor }}
              className="text-[9px] text-white"
            >
              {botName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-2.5 text-[14px] shadow-sm leading-relaxed break-words",
            messageStyle === "filled"
              ? isBot
                ? "rounded-2xl rounded-tl-sm border"
                : "text-white rounded-2xl rounded-tr-sm"
              : isBot
                ? "rounded-2xl rounded-tl-sm border bg-transparent"
                : "rounded-2xl rounded-tr-sm border bg-transparent",
          )}
          style={
            isBot
              ? {
                  backgroundColor:
                    messageStyle === "filled"
                      ? botBubbleBgColor
                      : "transparent",
                  color: botBubbleTextColor,
                  borderColor: botBubbleBorderColor,
                  borderWidth: "1px",
                  borderRadius: getBubbleRadius(),
                  borderTopLeftRadius: `${cornerRadius * 0.15}px`,
                }
              : messageStyle === "filled"
                ? {
                    backgroundColor: primaryColor,
                    borderRadius: getBubbleRadius(),
                    borderTopRightRadius: `${cornerRadius * 0.15}px`,
                  }
                : {
                    borderColor: primaryColor,
                    color: primaryColor,
                    borderRadius: getBubbleRadius(),
                    borderTopRightRadius: `${cornerRadius * 0.15}px`,
                  }
          }
        >
          <SimpleMarkdown content={message.content} />
        </div>
      </div>

      {/* Feedback Icons for Bot Messages */}
      {isBot && enableFeedback && (
        <div className="flex gap-2 ml-9 transition-all duration-300">
          <button
            className={cn(
              "p-1 rounded transition-colors",
              feedbackGiven === "helpful"
                ? "bg-green-500/20 text-green-500"
                : "hover:bg-zinc-800/50",
            )}
            style={{
              color:
                feedbackGiven === "helpful"
                  ? "currentColor"
                  : textSecondaryColor,
            }}
            onClick={() => handleFeedback("helpful")}
            aria-label="Like message"
            title="Helpful"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            className={cn(
              "p-1 rounded transition-colors",
              feedbackGiven === "not-helpful"
                ? "bg-red-500/20 text-red-500"
                : "hover:bg-zinc-800/50",
            )}
            style={{
              color:
                feedbackGiven === "not-helpful"
                  ? "currentColor"
                  : textSecondaryColor,
            }}
            onClick={() => handleFeedback("not-helpful")}
            aria-label="Dislike message"
            title="Not helpful"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Timestamp */}
      <span
        className={cn("text-[10px] px-1", isBot ? "ml-9" : "mr-1")}
        style={{ color: textSecondaryColor }}
      >
        {new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
