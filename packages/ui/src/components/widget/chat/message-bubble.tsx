"use client";

import { cn } from "../../../lib/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import type { MessageBubbleProps } from "../types.ts";

/**
 * MarkdownRenderer - Simple inline markdown support
 * For full markdown rendering, should be replaced with react-markdown
 */
function SimpleMarkdown({ content }: { content: string }) {
  const tokens = content
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean);

  return (
    <>
      {tokens.map((token, index) => {
        if (
          token.startsWith("**") &&
          token.endsWith("**") &&
          token.length > 4
        ) {
          return <strong key={index}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
          return <em key={index}>{token.slice(1, -1)}</em>;
        }
        if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
          return (
            <code key={index} className="bg-zinc-700/30 px-1 rounded text-xs">
              {token.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{token}</span>;
      })}
    </>
  );
}

/**
 * MessageBubble - Pure UI component
 * Renders a single message with optional feedback controls
 * No app-specific dependencies
 */
type CtaLink = {
  type: "whatsapp" | "email";
  href: string;
  label: string;
};

const CTA_HEADER_REGEX = /^#{2,6}\s*(.+)$/;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BARE_URL_REGEX = /(mailto:[^\s)]+)|(https?:\/\/[^\s)]+)/gi;
const WHATSAPP_HREF_REGEX =
  /^(whatsapp:|https?:\/\/(wa\.me\/|api\.whatsapp\.com\/|chat\.whatsapp\.com\/))/i;
const EMAIL_HREF_REGEX = /^mailto:/i;
const CTA_ORDER: Record<CtaLink["type"], number> = {
  whatsapp: 0,
  email: 1,
};

const getReadableTextColor = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "#FFFFFF";

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex!.length === 3) {
      hex = hex!
        .split("")
        .map((char) => `${char}${char}`)
        .join("");
    }
    const r = parseInt(hex!.slice(0, 2), 16);
    const g = parseInt(hex!.slice(2, 4), 16);
    const b = parseInt(hex!.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.6 ? "#111827" : "#F9FAFB";
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i,
  );
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.6 ? "#111827" : "#F9FAFB";
  }

  return "#FFFFFF";
};

const defaultCtaLabel = (type: CtaLink["type"]) =>
  type === "whatsapp" ? "Chat on WhatsApp" : "Email Support";

const normalizeHref = (href: string) => href.trim();

const classifyCtaHref = (href: string): CtaLink["type"] | null => {
  const normalized = normalizeHref(href);
  if (EMAIL_HREF_REGEX.test(normalized)) return "email";
  if (WHATSAPP_HREF_REGEX.test(normalized)) return "whatsapp";
  return null;
};

const labelFromLinkText = (text: string, type: CtaLink["type"]) => {
  const trimmed = text.trim();
  if (!trimmed) return defaultCtaLabel(type);
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return defaultCtaLabel(type);
  return trimmed;
};

function extractCtaLinks(content: string) {
  const lines = content.split(/\r?\n/);
  const cleanLines: string[] = [];
  const ctaLinks: CtaLink[] = [];
  const seen = new Set<string>();
  let ctaTitle: string | null = null;

  const addCta = (type: CtaLink["type"], href: string, label: string) => {
    const normalized = normalizeHref(href);
    const key = `${type}|${normalized}`;
    if (seen.has(key)) return;
    seen.add(key);
    ctaLinks.push({ type, href: normalized, label });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(CTA_HEADER_REGEX);
    if (headerMatch && !ctaTitle) {
      ctaTitle = headerMatch[1]!.trim();
      continue;
    }

    let lineWithoutCtas = line.replace(
      MARKDOWN_LINK_REGEX,
      (match, text, href) => {
        const type = classifyCtaHref(href);
        if (!type) return match;
        addCta(type, href, labelFromLinkText(text, type));
        return "";
      },
    );

    lineWithoutCtas = lineWithoutCtas.replace(BARE_URL_REGEX, (match) => {
      const type = classifyCtaHref(match);
      if (!type) return match;
      addCta(type, match, defaultCtaLabel(type));
      return "";
    });

    const cleaned = lineWithoutCtas.replace(/\s{2,}/g, " ").trim();
    if (cleaned) {
      cleanLines.push(cleaned);
    }
  }

  if (ctaLinks.length === 0) {
    return { cleanText: content, ctaLinks, ctaTitle: null };
  }

  const orderedLinks = ctaLinks
    .map((link, index) => [link, index] as const)
    .sort(([a, aIndex], [b, bIndex]) => {
      const typeDiff = CTA_ORDER[a.type] - CTA_ORDER[b.type];
      return typeDiff !== 0 ? typeDiff : aIndex - bIndex;
    })
    .map(([link]) => link);

  let cleanText = cleanLines.join("\n").trim();
  if (!cleanText) {
    cleanText = ctaTitle ?? "Contact Support";
  }

  return { cleanText, ctaLinks: orderedLinks, ctaTitle };
}

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
  onLeadClick,
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
  const ctaPanelStyle = {
    "--cta-panel-bg": themeMode === "light" ? "#F8FAFC" : "#1F1F22",
    "--cta-panel-border": themeMode === "light" ? "#E4E4E7" : "#3F3F46",
    borderRadius: `${cornerRadius * 0.75}px`,
  } as React.CSSProperties;
  const ctaButtonStyle = {
    backgroundColor: primaryColor,
    borderColor: primaryColor,
    color: getReadableTextColor(primaryColor ?? ""),
    borderRadius: `${cornerRadius}px`,
  } as React.CSSProperties;

  const handleFeedback = (feedback: "helpful" | "not-helpful") => {
    setFeedbackGiven(feedback);
    onFeedback?.(message.id, feedback);
  };

  const { cleanText, ctaLinks, ctaTitle } = isBot
    ? extractCtaLinks(message.content)
    : { cleanText: message.content, ctaLinks: [], ctaTitle: null };

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
          <SimpleMarkdown content={cleanText} />
        </div>
      </div>

      {isBot && ctaLinks.length > 0 && (
        <div className="ml-9 flex w-full max-w-[80%] flex-col gap-2">
          {ctaTitle && cleanText !== ctaTitle && (
            <span
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: textSecondaryColor }}
            >
              {ctaTitle}
            </span>
          )}
          <div
            className="flex flex-col gap-2 border px-3 py-2 bg-[var(--cta-panel-bg)] border-[var(--cta-panel-border)]"
            style={ctaPanelStyle}
          >
            {ctaLinks.map((link) => (
              <Button
                key={`${link.type}-${link.href}`}
                variant="secondary"
                size="sm"
                asChild
                className="w-full justify-center border transition-opacity hover:opacity-90"
                style={ctaButtonStyle}
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const messageId = message._id || message.id;
                    void onLeadClick?.({
                      type: link.type,
                      href: link.href,
                      messageId,
                    });
                  }}
                >
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}

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
