"use client";

import { useState } from "react";
import {
  Search,
  MoreVertical,
  Share2,
  Sparkles,
  Filter,
  User,
  ExternalLink,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

// --- 1. STRUKTUR DATA (Mirip API Backend) ---
// Kita definisikan tipe datanya dulu biar konsisten nanti pas connect API
interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  shortId: string;
  userName: string;
  userAvatarColor: string; // Utk simulasi warna avatar beda2
  topic: string;
  lastActive: string;
  integration: "Webchat" | "Whatsapp" | "Telegram";
  dateCreated: string;
  status: "Active" | "Closed";
  tags: string[];
  messages: Message[];
}

// --- 2. MOCK DATA (Hardcoded buat Preview UI) ---
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_01KFYJ8WQKZ...",
    shortId: "conv_01KFY...",
    userName: "Anonymous User",
    userAvatarColor: "bg-pink-600",
    topic: "Conversation Topic Unknown",
    lastActive: "Tue, Jan 27, 4:14 PM",
    integration: "Webchat",
    dateCreated: "Tue, Jan 27, 8:49 AM",
    status: "Active",
    tags: [
      "conversation-insights#message_count 2",
      "conversation-insights#participant_count 1",
      "webchat:owner user_01KFY...",
    ],
    messages: [
      { id: "m1", role: "user", content: "hi", timestamp: "4:14 PM" },
      {
        id: "m2",
        role: "bot",
        content: "Hello! How can I assist you today?",
        timestamp: "4:14 PM",
      },
    ],
  },
  {
    id: "conv_02ABC...",
    shortId: "conv_02ABC...",
    userName: "Anonymous User",
    userAvatarColor: "bg-purple-600",
    topic: "Asking about pricing",
    lastActive: "Tue, Jan 27, 9:20 AM",
    integration: "Webchat",
    dateCreated: "Tue, Jan 27, 9:00 AM",
    status: "Active",
    tags: ["pricing", "leads"],
    messages: [
      {
        id: "m3",
        role: "user",
        content: "How much is the pro plan?",
        timestamp: "9:20 AM",
      },
    ],
  },
  {
    id: "conv_03XYZ...",
    shortId: "conv_03XYZ...",
    userName: "Anonymous User",
    userAvatarColor: "bg-blue-600",
    topic: "Conversation Topic Unknown",
    lastActive: "Tue, Jan 27, 8:35 AM",
    integration: "Webchat",
    dateCreated: "Tue, Jan 27, 8:30 AM",
    status: "Closed",
    tags: [],
    messages: [],
  },
];

export default function ConversationsPage() {
  const [selectedId, setSelectedId] = useState<string>(
    MOCK_CONVERSATIONS[0]!.id,
  );

  // Cari conversation yang lagi dipilih
  const selectedConversation = MOCK_CONVERSATIONS.find(
    (c) => c.id === selectedId,
  );

  return (
    // Layout Utama: Flex Row (Sidebar Kiri + Main Content Kanan)
    <div className="flex h-full w-full bg-[#09090b] text-zinc-100 overflow-hidden">
      {/* --- SIDEBAR (List Conversation) --- */}
      <aside className="w-[320px] flex flex-col border-r border-zinc-800 shrink-0 bg-[#0c0c0e]">
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-800/50">
          <h2 className="text-lg font-bold tracking-tight">Conversations</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-zinc-700 bg-zinc-900 text-zinc-300 gap-1.5 hover:bg-zinc-800 hover:text-white"
          >
            <Sparkles className="h-3 w-3" />
            Insights Off
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 h-9"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {MOCK_CONVERSATIONS.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={cn(
                  "flex items-start gap-3 p-4 cursor-pointer border-l-2 transition-all hover:bg-zinc-800/50",
                  selectedId === conv.id
                    ? "bg-zinc-800/60 border-blue-500" // Active State
                    : "border-transparent",
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarFallback
                    className={cn(
                      "text-white text-xs font-semibold",
                      conv.userAvatarColor,
                    )}
                  >
                    A
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm truncate text-zinc-200">
                      {conv.userName}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {conv.lastActive.split(",")[2]?.trim() || "Just now"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mb-1">
                    {conv.topic}
                  </p>
                </div>

                {/* Share Icon (Hover only ideally, but static for now) */}
                <Share2 className="h-4 w-4 text-zinc-600" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* --- MAIN CONTENT (Detail Conversation) --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {selectedConversation ? (
          <>
            {/* Header Detail */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b]">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedConversation.topic}
                </h1>
                <span className="text-xs text-zinc-500">
                  {selectedConversation.messages.length} Messages
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </header>

            {/* Metadata Grid (1:1 sesuai screenshot) */}
            <div className="px-6 py-6 border-b border-zinc-800 bg-[#09090b]">
              <div className="grid grid-cols-5 gap-8 text-sm">
                {/* Col 1: Participants */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Participants
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold text-white",
                        selectedConversation.userAvatarColor,
                      )}
                    >
                      A
                    </span>
                    <span className="text-zinc-300">
                      {selectedConversation.userName}
                    </span>
                  </div>
                </div>

                {/* Col 2: Last Activity */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Last Activity
                  </span>
                  <span className="text-zinc-300 block">
                    {selectedConversation.lastActive}
                  </span>
                </div>

                {/* Col 3: Integration */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Integration
                  </span>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Share2 className="h-3 w-3" />{" "}
                    {/* Icon placeholder for integration */}
                    {selectedConversation.integration}
                  </div>
                </div>

                {/* Col 4: Date Created */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Date Created
                  </span>
                  <span className="text-zinc-300 block">
                    {selectedConversation.dateCreated}
                  </span>
                </div>

                {/* Col 5: Conversation ID */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Conversation ID
                  </span>
                  <div className="flex items-center gap-1 text-zinc-400 group cursor-pointer hover:text-zinc-200">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate max-w-[100px] underline decoration-zinc-700 underline-offset-2">
                      {selectedConversation.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Tags Row */}
              <div className="mt-6 space-y-3">
                <div>
                  <span className="text-zinc-500 text-xs font-medium block mb-2">
                    Status
                  </span>
                  <Badge
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      selectedConversation.status === "Active"
                        ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                        : "bg-zinc-800 text-zinc-400",
                    )}
                  >
                    {selectedConversation.status}
                  </Badge>
                </div>

                <div>
                  <span className="text-zinc-500 text-xs font-medium block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedConversation.tags.length > 0 ? (
                      selectedConversation.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600 text-xs italic">
                        No tags
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[#0c0c0e] p-6 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-center mb-8 opacity-50">
                <div className="h-[1px] bg-zinc-700 w-full" />
                <span className="px-4 text-xs font-medium text-zinc-500 whitespace-nowrap">
                  Start of conversation
                </span>
                <div className="h-[1px] bg-zinc-700 w-full" />
              </div>

              <div className="space-y-6">
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex w-full",
                      msg.role === "user" ? "justify-start" : "justify-end",
                    )}
                  >
                    <div
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        msg.role === "bot" && "flex-row-reverse",
                      )}
                    >
                      {/* Avatar */}
                      {msg.role === "user" ? (
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0",
                            selectedConversation.userAvatarColor,
                          )}
                        >
                          A
                        </div>
                      ) : (
                        // Bot Avatar (Kotak Biru standard lo)
                        <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white shrink-0">
                          <span className="text-[10px] font-bold">B</span>
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-zinc-800 text-zinc-200 rounded-tl-none"
                            : "bg-blue-600 text-white rounded-tr-none",
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a conversation to view details
          </div>
        )}
      </main>
    </div>
  );
}
