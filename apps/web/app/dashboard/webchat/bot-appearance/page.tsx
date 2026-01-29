"use client";

import { useState } from "react";
import { RotateCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Slider } from "@workspace/ui/components/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { useWebchatContext } from "@/contexts/webchat-context";

export default function BotAppearancePage() {
  // --- STATE FROM CONTEXT ---
  const {
    primaryColor,
    setPrimaryColor,
    font,
    setFont,
    themeMode,
    setThemeMode,
    headerStyle,
    setHeaderStyle,
    messageStyle,
    setMessageStyle,
    cornerRadius,
    setCornerRadius,
    isLoading,
    error,
    saveProfile,
  } = useWebchatContext();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const handleSaveChanges = async () => {
    try {
      setSaveError(null);
      setIsSaving(true);
      await saveProfile();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err : new Error("Failed to save appearance"),
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
          <p className="font-medium">Loading appearance settings...</p>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Bot Appearance
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Customize the look and feel of your webchat widget.
          </p>
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

      <div className="mt-12 space-y-10">
        {/* --- 1. PRIMARY COLOR (Rata Kanan) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-b border-zinc-800 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Primary Color
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Choose the primary brand color for your webchat interface.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <div
                  className="absolute left-2 h-6 w-6 rounded-md border border-white/10 shadow-sm z-10"
                  style={{ backgroundColor: primaryColor }}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="pl-10 w-36 font-mono uppercase bg-zinc-900 border-zinc-700 text-zinc-100 focus-visible:ring-blue-600 text-right pr-4"
                  maxLength={7}
                />
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                onClick={() => setPrimaryColor("#3276EA")}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* --- 2. FONT FAMILY (Rata Kanan) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-b border-zinc-800 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">Font</h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Select the primary font family for your interface.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger className="w-[300px] bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-blue-600">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectItem value="inter">Inter (Default)</SelectItem>
                <SelectItem value="roboto">Roboto</SelectItem>
                <SelectItem value="system">System UI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* --- 3. THEME MODE (Rata Kanan) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-b border-zinc-800 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Theme Mode
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Choose between light and dark appearance modes.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <div className="flex gap-4">
              {/* Option: LIGHT */}
              <div
                onClick={() => setThemeMode("light")}
                className={cn(
                  "relative w-40 h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group",
                  themeMode === "light"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                <div className="absolute inset-0 bg-[#F4F4F5] p-3 flex flex-col gap-2">
                  <div className="h-2 w-16 bg-zinc-200 rounded-full" />
                  <div className="flex-1 bg-white rounded-lg border border-zinc-200 shadow-sm p-2 space-y-2">
                    <div className="self-end ml-auto h-2 w-12 bg-blue-500 rounded-full opacity-30" />
                    <div className="h-2 w-16 bg-zinc-100 rounded-full" />
                  </div>
                </div>
                {themeMode === "light" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Option: DARK */}
              <div
                onClick={() => setThemeMode("dark")}
                className={cn(
                  "relative w-40 h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group",
                  themeMode === "dark"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                <div className="absolute inset-0 bg-[#18181B] p-3 flex flex-col gap-2">
                  <div className="h-2 w-16 bg-zinc-700 rounded-full" />
                  <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 p-2 space-y-2">
                    <div className="self-end ml-auto h-2 w-12 bg-blue-500 rounded-full opacity-30" />
                    <div className="h-2 w-16 bg-zinc-800 rounded-full" />
                  </div>
                </div>
                {themeMode === "dark" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 4. HEADER STYLE (Rata Kanan) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-b border-zinc-800 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Header Style
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Choose the chat header appearance and styling.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <div className="flex gap-4">
              {/* Option: BASIC */}
              <div
                onClick={() => setHeaderStyle("basic")}
                className={cn(
                  "relative w-40 h-24 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group flex flex-col bg-zinc-950",
                  headerStyle === "basic"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                <div className="h-8 w-full border-b border-zinc-800 bg-zinc-900 flex items-center px-2 gap-2">
                  <div className="h-4 w-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-white">
                    B
                  </div>
                  <div className="h-1.5 w-8 bg-zinc-600 rounded-full" />
                </div>
                <div className="flex-1 bg-zinc-950/50" />
                {headerStyle === "basic" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Option: BRANDED */}
              <div
                onClick={() => setHeaderStyle("branded")}
                className={cn(
                  "relative w-40 h-24 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group flex flex-col bg-zinc-950",
                  headerStyle === "branded"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                <div
                  className="h-8 w-full flex items-center px-2 gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] text-white">
                    B
                  </div>
                  <div className="h-1.5 w-8 bg-white/50 rounded-full" />
                </div>
                <div className="flex-1 bg-zinc-950/50" />
                {headerStyle === "branded" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 5. MESSAGE STYLING (NEW SECTION) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 border-b border-zinc-800 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Message Styling
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Customize the appearance of chat bubbles.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <div className="flex gap-4">
              {/* Option 1: FILLED (Branded Bubble) */}
              <div
                onClick={() => setMessageStyle("filled")}
                className={cn(
                  "relative w-40 h-24 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group flex flex-col justify-center items-center bg-zinc-950 p-3 gap-2",
                  messageStyle === "filled"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                {/* Incoming Bubble (Gray) */}
                <div className="self-start bg-zinc-800 rounded-lg rounded-tl-sm px-3 py-1.5 text-[10px] text-zinc-300">
                  Hi
                </div>
                {/* Outgoing Bubble (Primary Color) */}
                <div
                  className="self-end rounded-lg rounded-br-sm px-3 py-1.5 text-[10px] text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Hey
                </div>
                {messageStyle === "filled" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Option 2: DARK / CLASSIC */}
              <div
                onClick={() => setMessageStyle("outlined")}
                className={cn(
                  "relative w-40 h-24 rounded-xl border-2 cursor-pointer transition-all overflow-hidden group flex flex-col justify-center items-center bg-zinc-950 p-3 gap-2",
                  messageStyle === "outlined"
                    ? "border-blue-600 ring-1 ring-blue-600/20"
                    : "border-zinc-800 hover:border-zinc-600",
                )}
              >
                {/* Incoming Bubble (Gray) */}
                <div className="self-start bg-zinc-800 rounded-lg rounded-tl-sm px-3 py-1.5 text-[10px] text-zinc-300">
                  Hi
                </div>
                {/* Outgoing Bubble (Dark Zinc) */}
                <div className="self-end bg-zinc-700 rounded-lg rounded-br-sm px-3 py-1.5 text-[10px] text-zinc-100">
                  Hey
                </div>
                {messageStyle === "outlined" && (
                  <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 6. CORNER RADIUS (Rata Kanan Container) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 pb-12 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Corner Radius
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Adjust the roundness of interface elements.
            </p>
          </div>
          {/* FIX: Tambahkan 'flex justify-end' */}
          <div className="col-span-2 flex justify-end">
            <div className="w-[340px] space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <span>Sharp</span>
                <span>Round</span>
              </div>
              <Slider
                value={[cornerRadius]}
                onValueChange={(value) => setCornerRadius(value[0] ?? 16)}
                max={32}
                step={2}
                className="py-4"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
