"use client";

import { cn } from "../../../lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { RefreshCw, Volume2 } from "lucide-react";
import type { ChatHeaderProps } from "../types.ts";

/**
 * ChatHeader - Pure UI component
 * No app-specific dependencies (Clerk, context, environment variables)
 * All state passed as props
 */
export function ChatHeader({
  botName,
  botAvatar,
  primaryColor,
  headerStyle,
  themeMode,
  enableSound,
  onRefresh,
  isLoading = false,
  isOnline = true,
}: ChatHeaderProps) {
  const nameToDisplay = botName || "Support Bot";

  // Apply headerStyle logic
  const headerBgColor =
    headerStyle === "branded"
      ? primaryColor
      : themeMode === "light"
        ? "#FFFFFF"
        : "#18181B";

  const headerTextColor =
    headerStyle === "branded"
      ? "#FFFFFF"
      : themeMode === "light"
        ? "#000000"
        : "#F4F4F5";

  const headerBorderColor = themeMode === "light" ? "#E4E4E7" : "#27272A";

  return (
    <div
      className="flex items-center justify-between px-5 py-4 z-20 border-b shrink-0"
      style={{
        backgroundColor: headerBgColor,
        color: headerTextColor,
        borderColor: headerBorderColor,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-white/20">
          <AvatarImage src={botAvatar} />
          <AvatarFallback
            className="text-white text-xs font-semibold"
            style={{ backgroundColor: primaryColor }}
          >
            {nameToDisplay.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span
            className="text-sm font-semibold leading-none"
            style={{ color: headerTextColor }}
          >
            {nameToDisplay}
          </span>
          <span
            className="text-[10px] font-medium mt-1 flex items-center gap-1"
            style={{
              color:
                headerStyle === "branded"
                  ? "rgba(255,255,255,0.7)"
                  : themeMode === "light"
                    ? "#999999"
                    : "#A1A1A6",
            }}
          >
            <span
              className={cn(
                "block h-1.5 w-1.5 rounded-full",
                isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400",
              )}
            />
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Sound Icon */}
        {enableSound && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 transition-all duration-300 ease-in-out overflow-hidden"
              style={{
                color: headerTextColor,
              }}
              title="Sound"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <div
              className="h-4 w-[1px] transition-all duration-300"
              style={{
                backgroundColor:
                  themeMode === "light"
                    ? "rgba(0,0,0,0.1)"
                    : "rgba(255,255,255,0.1)",
              }}
            />
          </>
        )}

        {/* Restart Conversation */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 gap-2"
            style={{
              color: headerTextColor,
            }}
            onClick={onRefresh}
            disabled={isLoading}
            title="Restart conversation"
            aria-label="Restart conversation"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        )}
      </div>
    </div>
  );
}
