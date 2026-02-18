"use client";

import React from "react";

interface ChatSkeletonProps {
  /** Primary color for skeleton accent elements */
  primaryColor?: string;
  /** Theme mode for background/text colors */
  themeMode?: "light" | "dark";
  /** Corner radius matching bot config */
  cornerRadius?: number;
  /** Header style to match bot config */
  headerStyle?: "basic" | "branded";
}

/**
 * ChatSkeleton - Skeleton loading component that mirrors ChatContainer structure
 * Shows a polished loading state while bot config/session initializes
 * Matches the visual layout of the real chat for zero layout shift
 */
export function ChatSkeleton({ themeMode = "light" }: ChatSkeletonProps) {
  const isDark = themeMode === "dark";
  const bgColor = isDark ? "#18181B" : "#FFFFFF";
  const textColor = isDark ? "#D4D4D8" : "#52525B";
  const borderColor = isDark ? "#3F3F46" : "#D4D4D8";
  const borderTopColor = isDark ? "#E4E4E7" : "#52525B";

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="flex items-center gap-3 text-sm"
        style={{ color: textColor }}
      >
        <div
          className="h-4 w-4 animate-spin rounded-full border-2"
          style={{ borderColor, borderTopColor }}
        />
        <span>Loading chat...</span>
      </div>
    </div>
  );
}
