"use client";

import { useState } from "react";
import {
  Search,
  MoreVertical,
  Share2,
  Sparkles,
  Filter,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  useBotProfile,
  useConversationMessages,
  useAdminConversations,
  usePublicConversations,
  type Message,
} from "@/lib/convex-client";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";

export default function ConversationsPage() {
  // Get bot profile
  const botProfile = useBotProfile();

  // ✅ Get admin conversations (my testing)
  const adminConversations = useAdminConversations(botProfile?._id);

  // ✅ Get visitor conversations (public chats)
  const publicConversations = usePublicConversations(botProfile?._id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"my-testing" | "visitor-chats">(
    "my-testing",
  );

  // 1. STATE UNTUK FILTER
  // Opsinya: 'all', 'active', 'closed'
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">(
    "all",
  );

  // ✅ Get conversations based on active tab
  const rawConversations =
    activeTab === "my-testing" ? adminConversations : publicConversations;

  // Sort conversations by most recent first (descending by last_message_at)
  const conversations = rawConversations
    ? [...rawConversations]
        // Filter berdasarkan Search Query (Nama user)
        .filter(
          (c) =>
            c.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.topic?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        // Filter berdasarkan Status (Dropdown)
        .filter((c) => {
          if (filterStatus === "all") return true;
          // Kalau filter 'active', kita anggap 'paused' juga masuk (opsional)
          if (filterStatus === "active")
            return c.status === "active" || c.status === "paused";
          return c.status === filterStatus;
        })
        // Sort by Latest (Descending)
        .sort((a, b) => (b.last_message_at || 0) - (a.last_message_at || 0))
    : rawConversations;

  // Get selected conversation
  const selectedConversation = selectedId
    ? conversations?.find((c) => c._id === selectedId)
    : conversations?.[0];

  // Fetch messages for selected conversation
  const messages = useConversationMessages(
    selectedConversation?._id
      ? (selectedConversation._id as Id<"conversations">)
      : "skip",
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

        {/* ✅ TAB SELECTION: My Testing vs Visitor Chats */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "my-testing" | "visitor-chats")
          }
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabsList className="w-full justify-start gap-0 rounded-none border-b border-zinc-800/50 bg-transparent p-0 h-auto">
            <TabsTrigger
              value="my-testing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white data-[state=active]:text-white"
            >
              My Testing
            </TabsTrigger>
            <TabsTrigger
              value="visitor-chats"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white data-[state=active]:text-white"
            >
              Visitor Chats
            </TabsTrigger>
          </TabsList>

          {/* ✅ TAB CONTENT: Search & Filter (same for both tabs) */}
          <TabsContent
            value={activeTab}
            className="flex flex-col flex-1 overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b border-zinc-800/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-8 h-9 bg-zinc-800 border-zinc-700 text-sm text-zinc-100 placeholder:text-zinc-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-zinc-400 hover:text-white hover:bg-zinc-800 px-2 h-9"
                  >
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span className="capitalize">
                        {filterStatus === "all" ? "All Chats" : filterStatus}
                      </span>
                    </div>
                    {/* Indikator kecil kalau sedang difilter */}
                    {filterStatus !== "all" && (
                      <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[280px] bg-[#0c0c0e] border-zinc-800 text-zinc-300"
                >
                  <DropdownMenuLabel className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
                    Filter by Status
                  </DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={() => setFilterStatus("all")}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-white justify-between"
                  >
                    All Chats
                    {filterStatus === "all" && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterStatus("active")}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-white justify-between"
                  >
                    Open / Active
                    {filterStatus === "active" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setFilterStatus("closed")}
                    className="cursor-pointer focus:bg-zinc-800 focus:text-white justify-between"
                  >
                    Closed
                    {filterStatus === "closed" && (
                      <Check className="h-4 w-4 text-zinc-500" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1 overflow-hidden">
              <div className="flex flex-col w-full">
                {!botProfile || conversations === undefined ? (
                  // ... (Loading state code tetap sama) ...
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  </div>
                ) : conversations === null || conversations.length === 0 ? (
                  // ... (Empty state code tetap sama) ...
                  <div className="p-4 text-center">
                    <p className="text-sm text-zinc-500">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    // Cek apakah statusnya closed
                    const isClosed = conv.status === "closed";

                    return (
                      <div
                        key={conv._id}
                        onClick={() => setSelectedId(conv._id)}
                        className={cn(
                          "flex items-start gap-3 p-4 cursor-pointer border-l-2 transition-all duration-200", // duration-200 biar smooth

                          // 1. Logic Selection (Active/Inactive Background)
                          selectedId === conv._id
                            ? "bg-zinc-800/60 border-blue-500"
                            : "border-transparent hover:bg-zinc-800/50",

                          // 2. Logic Closed (Gaya Proactive: Gelap & Grayscale)
                          // Kita terapkan jika closed DAN tidak sedang dipilih (biar kalau lagi baca isinya tetap terang)
                          // Atau kalau mau selalu gelap meski dipilih, hapus "&& selectedId !== conv._id"
                          isClosed && selectedId !== conv._id
                            ? "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
                            : "opacity-100",
                        )}
                      >
                        {/* Avatar */}
                        <Avatar className="h-10 w-10 mt-1">
                          <AvatarFallback
                            className={cn(
                              "text-white text-xs font-semibold",
                              // Kalau closed, warna avatar fallback jadi abu-abu juga (optional, karena parent udah grayscale)
                              isClosed
                                ? "bg-zinc-700"
                                : activeTab === "visitor-chats"
                                  ? "bg-purple-600"
                                  : "bg-blue-600",
                            )}
                          >
                            {conv.user?.name?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 overflow-hidden">
                          <div className="flex justify-between items-center mb-0.5">
                            <span
                              className={cn(
                                "font-semibold text-sm truncate",
                                isClosed ? "text-zinc-400" : "text-zinc-200",
                              )}
                            >
                              {conv.user?.name || "Anonymous"}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {conv.last_message_at
                                ? new Date(
                                    conv.last_message_at,
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Just now"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 truncate mb-1">
                            {conv.topic || "No topic"}
                          </p>
                        </div>

                        {/* Share Icon (Hover only ideally, but static for now) */}
                        <Share2 className="h-4 w-4 text-zinc-600" />
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </aside>

      {/* --- MAIN CONTENT (Detail Conversation) --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        {selectedConversation ? (
          <>
            {/* Header Detail */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090b]">
              <div className="flex flex-col gap-1">
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedConversation.topic || "No topic"}
                </h1>
                <span className="text-xs text-zinc-500">
                  {selectedConversation.messageCount || 0} Messages
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
                <div className="space-y-2 min-w-0">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Participants
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-blue-600 flex-shrink-0">
                      {selectedConversation.user?.name?.[0]?.toUpperCase() ||
                        "U"}
                    </span>
                    <span className="text-zinc-300 min-w-0 break-all whitespace-normal">
                      {selectedConversation.user?.name || "Anonymous"}
                    </span>
                  </div>
                </div>

                {/* Col 2: Last Activity */}
                <div className="space-y-2 min-w-0">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Last Activity
                  </span>
                  <span className="text-zinc-300 block break-words whitespace-normal">
                    {selectedConversation.last_message_at
                      ? new Date(
                          selectedConversation.last_message_at,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </span>
                </div>

                {/* Col 3: Status */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Status
                  </span>
                  <Badge
                    className={cn(
                      "text-[10px] font-medium",
                      selectedConversation.status === "active"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : selectedConversation.status === "paused"
                          ? "bg-yellow-600 text-white hover:bg-yellow-700"
                          : "bg-zinc-700 text-white hover:bg-zinc-600",
                    )}
                  >
                    {selectedConversation.status || "closed"}
                  </Badge>
                </div>

                {/* Col 4: Created */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Created At
                  </span>
                  <span className="text-zinc-300 block">
                    {selectedConversation.created_at
                      ? new Date(
                          selectedConversation.created_at,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
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
                      {selectedConversation._id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tags Row */}
              <div className="mt-6 space-y-3">
                <div>
                  <span className="text-zinc-500 text-xs font-medium block mb-2">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-zinc-600 text-xs italic">
                      No tags
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[#0c0c0e] p-6 overflow-y-auto flex flex-col min-h-0">
              <div className="flex items-center justify-center mb-8 opacity-50">
                <div className="h-[1px] bg-zinc-700 w-full" />
                <span className="px-4 text-xs font-medium text-zinc-500 whitespace-nowrap">
                  Start of conversation
                </span>
                <div className="h-[1px] bg-zinc-700 w-full" />
              </div>

              {/* Messages Loading State */}
              {messages === undefined ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <p className="text-sm text-zinc-400">Loading messages...</p>
                  </div>
                </div>
              ) : messages === null || messages.length === 0 ? (
                <div className="flex items-center justify-center flex-1">
                  <p className="text-center text-zinc-500">
                    No messages in this conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <MessageBubble
                      key={msg._id || idx}
                      message={msg}
                      botName={botProfile?.bot_names || "Bot"}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : !botProfile || conversations === undefined ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-sm text-zinc-400">Loading conversations...</p>
            </div>
          </div>
        ) : conversations === null || conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-lg font-medium">No conversations yet</p>
              <p className="text-sm text-zinc-400">
                Conversations will appear here when users chat with your bot
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select a conversation to view details
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * MessageBubble Component - Displays individual chat messages
 * Differentiates styling between user and bot messages
 */
interface MessageBubbleProps {
  message: Message;
  botName: string;
}

function MessageBubble({ message, botName }: MessageBubbleProps) {
  const isBot = message.role === "bot";
  const timestamp = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isBot ? "flex-row" : "flex-row-reverse",
      )}
    >
      {/* Avatar for Bot Messages */}
      {isBot && (
        <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
          <AvatarFallback className="text-white text-xs font-semibold bg-blue-600">
            {botName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Container */}
      <div
        className={cn(
          "flex flex-col gap-1",
          isBot ? "items-start" : "items-end",
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            "max-w-xs lg:max-w-md px-4 py-2.5 rounded-lg text-sm leading-relaxed break-words",
            isBot
              ? "bg-zinc-800 text-zinc-100 rounded-bl-none"
              : "bg-blue-600 text-white rounded-br-none",
          )}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-[11px] text-zinc-500 px-2">{timestamp}</span>
      </div>
    </div>
  );
}
