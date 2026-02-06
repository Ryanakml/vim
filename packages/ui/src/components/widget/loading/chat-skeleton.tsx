"use client";

import React from "react";
import { cn } from "../../../lib/utils";

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
export function ChatSkeleton({
  primaryColor = "#6366f1",
  themeMode = "light",
  cornerRadius = 12,
  headerStyle = "branded",
}: ChatSkeletonProps) {
  const isLight = themeMode === "light";
  const bgColor = isLight ? "bg-white" : "bg-zinc-900";
  const shimmerBase = isLight ? "bg-zinc-200" : "bg-zinc-700";
  const shimmerAccent = isLight ? "bg-zinc-100" : "bg-zinc-800";
  const contentBg = isLight ? "bg-zinc-50/50" : "bg-zinc-800/50";
  const headerBg =
    headerStyle === "branded" ? primaryColor : isLight ? "#FFFFFF" : "#18181B";
  const headerBorder = isLight ? "#E4E4E7" : "#27272A";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-transparent",
      )}
    >
      <div
        className={cn(
          "relative z-10 flex flex-col overflow-hidden w-[380px] h-[640px] max-h-[90vh] max-w-[95%]",
          bgColor,
        )}
        style={{
          borderRadius: `${cornerRadius}px`,
          boxShadow: "0 5px 40px rgba(0, 0, 0, 0.16)",
          border: "0",
        }}
      >
        {/* Header Skeleton */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{
            backgroundColor: headerBg,
            borderColor: headerBorder,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Avatar skeleton */}
            <div
              className={cn(
                "h-9 w-9 rounded-full animate-pulse",
                headerStyle === "branded" ? "bg-white/20" : shimmerBase,
              )}
            />
            <div className="flex flex-col gap-1.5">
              {/* Name skeleton */}
              <div
                className={cn(
                  "h-3.5 w-24 rounded animate-pulse",
                  headerStyle === "branded" ? "bg-white/20" : shimmerBase,
                )}
              />
              {/* Status skeleton */}
              <div
                className={cn(
                  "h-2.5 w-14 rounded animate-pulse",
                  headerStyle === "branded" ? "bg-white/15" : shimmerAccent,
                )}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Action button skeletons */}
            <div
              className={cn(
                "h-8 w-8 rounded-full animate-pulse",
                headerStyle === "branded" ? "bg-white/10" : shimmerAccent,
              )}
            />
            <div
              className={cn(
                "h-8 w-8 rounded-full animate-pulse",
                headerStyle === "branded" ? "bg-white/10" : shimmerAccent,
              )}
            />
          </div>
        </div>

        {/* Messages Area Skeleton */}
        <div className={cn("flex-1 overflow-hidden w-full p-5", contentBg)}>
          <div className="flex flex-col gap-6">
            {/* Welcome avatar skeleton */}
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <div
                className={cn("h-20 w-20 rounded-full animate-pulse")}
                style={{ backgroundColor: `${primaryColor}30` }}
              />
              <div
                className={cn(
                  "h-2.5 w-28 rounded animate-pulse mt-2",
                  shimmerBase,
                )}
              />
            </div>

            {/* Bot message skeleton 1 */}
            <div className="flex items-start gap-2">
              <div
                className={cn("h-6 w-6 rounded-full animate-pulse shrink-0")}
                style={{ backgroundColor: `${primaryColor}30` }}
              />
              <div className="flex flex-col gap-1.5 max-w-[75%]">
                <div
                  className={cn(
                    "h-10 w-52 rounded-2xl rounded-tl-sm animate-pulse",
                    shimmerBase,
                  )}
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className={cn(
                    "h-6 w-36 rounded-2xl rounded-tl-sm animate-pulse",
                    shimmerBase,
                  )}
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>

            {/* User message skeleton */}
            <div className="flex justify-end">
              <div
                className="h-8 w-40 rounded-2xl rounded-tr-sm animate-pulse"
                style={{
                  backgroundColor: `${primaryColor}30`,
                  animationDelay: "0.3s",
                }}
              />
            </div>

            {/* Bot message skeleton 2 */}
            <div className="flex items-start gap-2">
              <div
                className={cn("h-6 w-6 rounded-full animate-pulse shrink-0")}
                style={{ backgroundColor: `${primaryColor}30` }}
              />
              <div className="flex flex-col gap-1.5 max-w-[75%]">
                <div
                  className={cn(
                    "h-14 w-56 rounded-2xl rounded-tl-sm animate-pulse",
                    shimmerBase,
                  )}
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Input Skeleton */}
        <div className={cn("p-4 shrink-0", bgColor)}>
          <div className="flex items-center gap-2">
            <div
              className={cn("flex-1 h-12 rounded animate-pulse", shimmerBase)}
              style={{ borderRadius: `${cornerRadius * 0.5}px` }}
            />
            <div
              className={cn("h-9 w-9 rounded animate-pulse", shimmerAccent)}
              style={{ borderRadius: `${cornerRadius * 0.3}px` }}
            />
          </div>
          {/* Powered by */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div
              className={cn("h-2.5 w-24 rounded animate-pulse", shimmerAccent)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
