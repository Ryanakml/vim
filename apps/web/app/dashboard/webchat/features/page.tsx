"use client";

import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Mic,
  Volume2,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { useWebchatContext } from "@/contexts/webchat-context";

export default function FeaturesPage() {
  // --- STATE MANAGEMENT (USE CONTEXT) ---
  const {
    enableFeedback,
    setEnableFeedback,
    enableFileUpload,
    setEnableFileUpload,
    enableSound,
    setEnableSound,
    historyReset,
    setHistoryReset,
    isLoading,
    error,
    saveProfile,
  } = useWebchatContext();

  const [activeTab, setActiveTab] = useState("chat");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const handleSaveChanges = async () => {
    try {
      setSaveError(null);
      setIsSaving(true);
      await saveProfile();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err : new Error("Failed to save features"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* --- ERROR ALERT --- */}
      {(error || saveError) && (
        <div className="rounded-lg bg-red-900/20 border border-red-700 p-4 text-sm text-red-400">
          <p className="font-medium">Error: {(error || saveError)?.message}</p>
        </div>
      )}

      {/* --- LOADING STATE --- */}
      {isLoading && (
        <div className="rounded-lg bg-blue-900/20 border border-blue-700 p-4 text-sm text-blue-400">
          <p className="font-medium">Loading features settings...</p>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Features
          </h1>
        </div>
        <Button
          onClick={handleSaveChanges}
          disabled={isLoading || isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* --- TAB SWITCHER (Mirip Screenshot) --- */}
      <div className="flex p-1 bg-zinc-900/50 w-fit rounded-lg border border-zinc-800">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === "chat"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          Chat Settings
        </button>
        <button
          onClick={() => setActiveTab("advanced")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === "advanced"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200",
          )}
        >
          Advanced Settings
        </button>
      </div>

      <div className="mt-8 space-y-12">
        {/* --- 1. MESSAGE FEEDBACK --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Message Feedback
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Enables thumbs up/down reactions on bot messages for user
              feedback.
            </p>
          </div>
          <div className="col-span-2 flex flex-col items-end gap-6">
            <Switch
              checked={enableFeedback}
              onCheckedChange={setEnableFeedback}
              className="data-[state=checked]:bg-blue-600"
            />

            {/* PREVIEW CARD: Feedback */}
            <div className="w-[380px] rounded-xl border border-zinc-800 bg-[#09090b] p-6 flex items-center justify-center min-h-[140px]">
              <div className="flex gap-3 w-full max-w-[280px]">
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  B
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="bg-zinc-800 text-zinc-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm w-fit">
                    This is a message
                  </div>
                  {/* LOGIC: Feedback Icons */}
                  <div
                    className={cn(
                      "flex gap-3 px-1 transition-all duration-300 overflow-hidden",
                      enableFeedback
                        ? "h-6 opacity-100 mt-1"
                        : "h-0 opacity-0 mt-0",
                    )}
                  >
                    <ThumbsUp className="h-4 w-4 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
                    <ThumbsDown className="h-4 w-4 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/50" />

        {/* --- 2. ALLOW FILE UPLOAD (FIXED: Pop-up Above Logo & Left Aligned) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Allow File Upload
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Allow users to upload and share files in the chat conversation.
            </p>
          </div>

          <div className="col-span-2 flex flex-col items-end gap-6">
            <Switch
              checked={enableFileUpload}
              onCheckedChange={setEnableFileUpload}
              className="data-[state=checked]:bg-blue-600"
            />

            {/* PREVIEW CARD */}
            <div className="relative w-full max-w-[400px] rounded-xl border border-zinc-800 bg-[#09090b] p-6 flex items-center justify-center min-h-[160px]">
              {/* Input Field Simulator (Centered) */}
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-full h-12 flex items-center px-4 gap-3 z-10 relative">
                <div
                  className={cn(
                    "transition-all duration-300 flex items-center justify-center overflow-hidden",
                    enableFileUpload ? "w-6 opacity-100" : "w-0 opacity-0",
                  )}
                >
                  <Plus className="h-5 w-5 text-zinc-400 cursor-pointer hover:text-white" />
                </div>
                <div className="flex-1 text-sm text-zinc-500 truncate">
                  {enableFileUpload
                    ? "Type your message..."
                    : "Type a message..."}
                </div>
                <Mic className="h-4 w-4 text-zinc-500" />
              </div>

              {/* File Upload Pop-up (Above Logo, Left Aligned) */}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/50" />

      {/* --- 3. MESSAGE NOTIFICATION SOUND (REVISED: Header Zoom View) --- */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div className="col-span-1">
          <h2 className="text-base font-semibold text-foreground">
            Message Notification Sound
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Plays an alert when a new message arrives in the chat.
          </p>
        </div>
        <div className="col-span-2 flex flex-col items-end gap-6">
          <Switch
            checked={enableSound}
            onCheckedChange={setEnableSound}
            className="data-[state=checked]:bg-blue-600"
          />

          {/* PREVIEW CARD: Widget Header Zoom */}
          <div className="w-[380px] rounded-xl border border-zinc-800 bg-[#09090b] p-6 flex items-center justify-center min-h-[140px]">
            {/* Simulated Widget Header Component */}
            <div className="w-[280px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between shadow-sm relative overflow-hidden">
              {/* Left: Avatar & Identity (Skeleton) */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                  B
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-2 w-20 bg-zinc-700 rounded-full" />
                  <div className="h-1.5 w-12 bg-zinc-800 rounded-full" />
                </div>
              </div>

              {/* Right: Actions (Volume & Reload) */}
              <div className="flex items-center">
                {/* LOGIC: Volume Icon (Slide Reveal) */}
                <div
                  className={cn(
                    "flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out",
                    enableSound
                      ? "w-8 opacity-100 translate-x-0"
                      : "w-0 opacity-0 translate-x-4",
                  )}
                >
                  <div className="h-7 w-7 rounded-full hover:bg-zinc-800 flex items-center justify-center cursor-pointer">
                    <Volume2 className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>

                {/* Divider (Optional, muncul cuma pas sound on biar rapi) */}
                <div
                  className={cn(
                    "h-4 w-[1px] bg-zinc-800 mx-1 transition-all duration-300",
                    enableSound ? "opacity-100" : "opacity-0",
                  )}
                />

                {/* Reload Icon (Always There) */}
                <div className="h-7 w-7 rounded-full hover:bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors">
                  <RefreshCw className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-800/50" />

      {/* --- 4. CHAT HISTORY RESET --- */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div className="col-span-1">
          <h2 className="text-base font-semibold text-foreground">
            Chat History Reset
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Choose when to clear the chat history stored in the user's browser.
          </p>
        </div>
        <div className="col-span-2 flex justify-end">
          <Select value={historyReset} onValueChange={setHistoryReset}>
            <SelectTrigger className="w-[380px] bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:ring-blue-600 h-11">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
              <SelectItem value="never">Never (Default)</SelectItem>
              <SelectItem value="closed">After tab is closed</SelectItem>
              <SelectItem value="refresh">After page refresh</SelectItem>
              <SelectItem value="inactivity">
                After 30 mins inactivity
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
