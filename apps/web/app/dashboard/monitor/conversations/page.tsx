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
  Loader2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Separator } from "@workspace/ui/components/separator";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";
import { useConversations, useBotProfile } from "@/lib/convex-client";

export default function ConversationsPage() {
  // Get bot profile and conversations
  const botProfile = useBotProfile();
  const conversations = useConversations(botProfile?._id);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading state
  if (!botProfile || conversations === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations === null || conversations.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium">No conversations yet</p>
          <p className="text-sm text-zinc-400">
            Conversations will appear here when users chat with your bot
          </p>
        </div>
      </div>
    );
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get selected conversation
  const selectedConversation = selectedId
    ? filteredConversations.find((c) => c._id === selectedId)
    : filteredConversations[0];

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
            {filteredConversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => setSelectedId(conv._id)}
                className={cn(
                  "flex items-start gap-3 p-4 cursor-pointer border-l-2 transition-all hover:bg-zinc-800/50",
                  selectedId === conv._id
                    ? "bg-zinc-800/60 border-blue-500" // Active State
                    : "border-transparent",
                )}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarFallback className="text-white text-xs font-semibold bg-blue-600">
                    {conv.user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-semibold text-sm truncate text-zinc-200">
                      {conv.user?.name || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {conv.last_message_at
                        ? new Date(conv.last_message_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
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
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Participants
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-blue-600">
                      {selectedConversation.user?.name?.[0]?.toUpperCase() ||
                        "U"}
                    </span>
                    <span className="text-zinc-300">
                      {selectedConversation.user?.name || "Anonymous"}
                    </span>
                  </div>
                </div>

                {/* Col 2: Last Activity */}
                <div className="space-y-2">
                  <span className="text-zinc-500 text-xs font-medium block">
                    Last Activity
                  </span>
                  <span className="text-zinc-300 block">
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
            <div className="flex-1 bg-[#0c0c0e] p-6 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-center mb-8 opacity-50">
                <div className="h-[1px] bg-zinc-700 w-full" />
                <span className="px-4 text-xs font-medium text-zinc-500 whitespace-nowrap">
                  Start of conversation
                </span>
                <div className="h-[1px] bg-zinc-700 w-full" />
              </div>

              <div className="space-y-6 text-sm text-zinc-300">
                <p className="text-center text-zinc-500 py-8">
                  Message history loaded from Convex backend.
                  {selectedConversation.messageCount && (
                    <span className="block mt-2">
                      {selectedConversation.messageCount} messages in this
                      conversation
                    </span>
                  )}
                </p>
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
