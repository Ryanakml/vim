"use client";

import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  MessageSquare,
  Mic,
  ArrowUp,
  ChevronDown,
  Volume2,
  ThumbsUp,
  ThumbsDown,
  Plus,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Input } from "@workspace/ui/components/input";
import { useWebchatContext } from "@/contexts/webchat-context";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

interface BotWidgetProps {
  className?: string;
}

const GRID_BG_SVG =
  "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' width='16' height='16' fill='none' stroke='white'%3e%3cpath d='M0 .5H16V16'/%3e%3c/svg%3e";
const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "bot",
  content: "Hello! How can I assist you today?",
  timestamp: new Date(),
};
const BOT_RESPONSE_DELAY = 1000;

export function BotWidget({ className }: BotWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    font,
    themeMode,
    cornerRadius,
    enableFeedback,
    enableFileUpload,
    enableSound,
  } = useWebchatContext();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Testing answer from bot!",
          timestamp: new Date(),
        },
      ]);
    }, BOT_RESPONSE_DELAY);
  };

  // Get font family based on selection
  const getFontFamily = () => {
    switch (font) {
      case "roboto":
        return "'Roboto', sans-serif";
      case "system":
        return "system-ui, -apple-system, sans-serif";
      case "inter":
      default:
        return "'Inter', sans-serif";
    }
  };

  // Theme colors
  const bgColor = themeMode === "light" ? "bg-white" : "bg-zinc-900";

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-zinc-900",
        className,
      )}
    >
      <div
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `url("${GRID_BG_SVG}")`,
        }}
      />

      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#18181b_100%)] pointer-events-none" />

      <div
        className={cn(
          "relative z-10 flex flex-col overflow-hidden transition-all duration-500 ease-in-out w-[380px] h-[640px] max-h-[90vh] max-w-[95%] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]",
          isOpen
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-90 opacity-0 translate-y-20 pointer-events-none absolute",
          bgColor,
        )}
        style={{
          borderRadius: `${cornerRadius}px`,
          fontFamily: getFontFamily(),
        }}
      >
        <WidgetHeader onRefresh={() => setMessages([])} />

        <ChatArea messages={messages} scrollRef={scrollRef} />

        <WidgetFooter
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
        />
      </div>

      <FloatingButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </div>
  );
}

interface WidgetHeaderProps {
  onRefresh: () => void;
}

function WidgetHeader({ onRefresh }: WidgetHeaderProps) {
  const {
    displayName,
    primaryColor,
    avatarUrl,
    headerStyle,
    themeMode,
    enableSound,
  } = useWebchatContext();

  const nameToDisplay = displayName || "Support Bot";

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
      className="flex items-center justify-between px-5 py-4 z-20 border-b"
      style={{
        backgroundColor: headerBgColor,
        color: headerTextColor,
        borderColor: headerBorderColor,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 border border-white/20">
          <AvatarImage src={avatarUrl} />
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
            <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>
      <div className="flex items-center">
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
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <div
              className="h-4 w-[1px] mx-1 transition-all duration-300"
              style={{
                backgroundColor:
                  themeMode === "light"
                    ? "rgba(0,0,0,0.1)"
                    : "rgba(255,255,255,0.1)",
              }}
            />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 transition-colors"
          style={{
            color: headerTextColor,
          }}
          onClick={onRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface ChatAreaProps {
  messages: Message[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

function ChatArea({ messages, scrollRef }: ChatAreaProps) {
  const { primaryColor, displayName, avatarUrl, themeMode } =
    useWebchatContext();

  const nameToDisplay = displayName || "Support Bot";
  const contentSubBgColor =
    themeMode === "light" ? "bg-zinc-50/50" : "bg-zinc-800/50";
  const textSecondaryColor =
    themeMode === "light" ? "text-zinc-400" : "text-zinc-500";

  return (
    <div
      className={cn(
        "flex-1 overflow-hidden w-full relative h-0",
        contentSubBgColor,
      )}
    >
      <ScrollArea className={cn("h-full w-full relative", contentSubBgColor)}>
        <div className="flex flex-col gap-6 p-5">
          {messages.length < 5 && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 transition-all duration-500 ">
              <Avatar className="h-20 w-20 mb-2 shadow-sm">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback
                  className="text-white text-3xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {nameToDisplay.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className={cn("text-xs font-medium", textSecondaryColor)}>
                Powered by Chatify
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              primaryColor={primaryColor}
              botName={nameToDisplay}
              botAvatar={avatarUrl}
            />
          ))}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  primaryColor: string;
  botName: string;
  botAvatar?: string;
}

function MessageBubble({
  message,
  primaryColor,
  botName,
  botAvatar,
}: MessageBubbleProps) {
  const { messageStyle, cornerRadius, themeMode, enableFeedback } =
    useWebchatContext();
  const isBot = message.role === "bot";

  // Theme colors for bubbles
  const botBubbleBgColor = themeMode === "light" ? "#FFFFFF" : "#27272A";
  const botBubbleTextColor = themeMode === "light" ? "#18181B" : "#F4F4F5";
  const botBubbleBorderColor = themeMode === "light" ? "#E4E4E7" : "#3F3F46";
  const textSecondaryColor = themeMode === "light" ? "#71717A" : "#A1A1A6";

  const getBubbleRadius = () => `${cornerRadius * 0.75}px`;

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
          {message.content}
        </div>
      </div>

      {/* Feedback Icons for Bot Messages */}
      {isBot && enableFeedback && (
        <div className="flex gap-2 ml-9 transition-all duration-300">
          <button
            className="p-1 rounded hover:bg-zinc-800/50 transition-colors"
            style={{ color: textSecondaryColor }}
            aria-label="Like message"
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            className="p-1 rounded hover:bg-zinc-800/50 transition-colors"
            style={{ color: textSecondaryColor }}
            aria-label="Dislike message"
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      )}

      <span
        className={cn("text-[10px] px-1", isBot ? "ml-9" : "mr-1")}
        style={{ color: textSecondaryColor }}
      >
        {message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

interface WidgetFooterProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: (e?: React.FormEvent) => void;
}

function WidgetFooter({ input, onInputChange, onSend }: WidgetFooterProps) {
  const {
    primaryColor,
    placeholder,
    themeMode,
    cornerRadius,
    enableFileUpload,
  } = useWebchatContext();

  const placeholderText = placeholder || "Type your message...";
  const inputBgColor = themeMode === "light" ? "bg-white" : "bg-zinc-800";
  const inputBorderColor =
    themeMode === "light" ? "border-zinc-300" : "border-zinc-700";
  const inputTextColor =
    themeMode === "light" ? "text-zinc-900" : "text-zinc-100";
  const inputPlaceholderColor =
    themeMode === "light"
      ? "placeholder:text-zinc-400"
      : "placeholder:text-zinc-500";
  const footerBgColor = themeMode === "light" ? "bg-white" : "bg-zinc-900";
  const powerBgColor = themeMode === "light" ? "#4B5563" : "#A1A1A6";
  const iconColor = themeMode === "light" ? "text-zinc-400" : "text-zinc-500";

  return (
    <div className="p-4 z-20" style={{ backgroundColor: footerBgColor }}>
      <form
        onSubmit={onSend}
        className="relative flex items-center w-full gap-2"
      >
        {/* File Upload Icon */}
        {enableFileUpload && (
          <button
            type="button"
            className={cn(
              "p-2 rounded-lg transition-colors hover:bg-zinc-700/50",
              iconColor,
            )}
            aria-label="Upload file"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}

        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholderText}
          className={cn(
            "flex-1 h-12 transition-all duration-200 border",
            inputPlaceholderColor,
            themeMode === "light" && "!bg-white text-zinc-900",
          )}
          style={{
            backgroundColor: themeMode === "light" ? "white" : inputBgColor,
            color: themeMode === "light" ? "#18181B" : inputTextColor,
            borderColor: input.trim() ? primaryColor : inputBorderColor,
            borderRadius: `${cornerRadius * 0.5}px`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = primaryColor;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = input.trim()
              ? primaryColor
              : inputBorderColor;
          }}
        />

        <div className="relative">
          {input.trim() ? (
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 transition-all duration-200 shadow-sm text-white"
              style={{
                backgroundColor: primaryColor,
                borderRadius: `${cornerRadius * 0.3}px`,
              }}
            >
              <ArrowUp className="h-5 w-5" />
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
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>

      <div
        className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium"
        style={{ color: powerBgColor }}
      >
        <span className="text-yellow-500">⚡</span>
        <span>Powered by</span>
        <span>Chatify</span>
      </div>
    </div>
  );
}

interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

function FloatingButton({ isOpen, onClick }: FloatingButtonProps) {
  const { primaryColor } = useWebchatContext();

  return (
    // 'right-[110px]': horizontal position. 'bottom-12': vertical position
    <div className="absolute bottom-12 right-[110px] z-30">
      <Button
        size="lg"
        // - h-16 w-16: Size of icons
        // - shadow-[...]: Custom shadow for 'pop out'.
        className="h-16 w-16 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.3)]"
        style={{
          backgroundColor: primaryColor,
          // Add shadow with primary color for a glowing effect (optional, but cool)
          boxShadow: `0 10px 25px -5px ${primaryColor}80`,
        }}
        onClick={onClick}
      >
        <div
          className={`transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
        >
          {isOpen ? (
            <ChevronDown className="h-8 w-8 text-white" />
          ) : (
            <MessageSquare className="h-7 w-7 text-white" fill="currentColor" />
          )}
        </div>
      </Button>
    </div>
  );
}
