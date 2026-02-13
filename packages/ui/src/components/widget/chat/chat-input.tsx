"use client";

import { cn } from "../../../lib/utils";
import { Button } from "@workspace/ui/components/button";
import { ArrowUp, Loader2, Mic, Plus, X } from "lucide-react";
import { useRef } from "react";
import type { ChatInputProps } from "../types";

/**
 * ChatInput - Pure UI component
 * Renders message input with file upload and send button
 * No app-specific dependencies (no context, no custom hooks)
 */
export function ChatInput({
  placeholder,
  isLoading,
  isStreaming = false,
  primaryColor,
  cornerRadius,
  themeMode,
  enableFileUpload,
  onSendMessage,
  onCancel,
  value,
  onChange,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const placeholderText = placeholder || "Type your message...";
  const inputBorderColor = themeMode === "light" ? "#D4D4D8" : "#3F3F46";
  const footerBgColor = themeMode === "light" ? "#FFFFFF" : "#18181B";
  const iconColor = themeMode === "light" ? "text-zinc-400" : "text-zinc-500";

  // Explicit color values to prevent hydration flash in dark mode
  const inputBg = themeMode === "light" ? "#FFFFFF" : "#27272A";
  const inputText = themeMode === "light" ? "#18181B" : "#FAFAFA";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || isStreaming) return;

    onSendMessage(value);
  };

  const hasInput = value.trim().length > 0;

  return (
    <div
      className="p-4 z-20 shrink-0"
      style={{
        backgroundColor: footerBgColor,
        borderTop: `1px solid ${themeMode === "light" ? "#F4F4F5" : "#27272A"}`,
      }}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="relative flex items-center w-full gap-2"
      >
        {/* File Upload Icon */}
        {enableFileUpload && (
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg transition-colors hover:bg-zinc-700/50 disabled:opacity-50",
              iconColor,
            )}
            aria-label="Upload file"
            disabled={isLoading || isStreaming}
            title="Upload file"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}

        {/* Input Field */}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholderText}
          className="flex-1 h-12 px-4 text-sm transition-all duration-200 outline-none"
          style={{
            backgroundColor: inputBg,
            color: inputText,
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: hasInput ? primaryColor : inputBorderColor,
            borderRadius: `${cornerRadius * 0.5}px`,
            caretColor: primaryColor,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasInput
              ? primaryColor
              : inputBorderColor;
          }}
          disabled={isLoading || isStreaming}
        />

        {/* Send/Cancel Button */}
        <div className="relative">
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 transition-all duration-200 shadow-sm text-white bg-red-500 hover:bg-red-600"
              onClick={onCancel}
              aria-label="Cancel streaming"
              title="Cancel"
            >
              <X className="h-5 w-5" />
            </Button>
          ) : hasInput ? (
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 transition-all duration-200 shadow-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: primaryColor,
                borderRadius: `${cornerRadius * 0.3}px`,
              }}
              disabled={isLoading}
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              style={{
                color: themeMode === "light" ? "#D4D4D8" : "#71717A",
              }}
              disabled={isLoading || isStreaming}
              title="Voice input"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>

      {/* Powered by Chatify */}
      <div
        className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium"
        style={{ color: themeMode === "light" ? "#4B5563" : "#FFFFFF" }}
      >
        <span className="text-yellow-500">⚡</span>
        <span>Powered by Chatify</span>
      </div>
    </div>
  );
}
