"use client";

import { useMemo, useState } from "react";
import { Copy, Image as ImageIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import { useBotProfile, useGenerateEmbedToken } from "@/lib/convex-client";

const DEFAULT_WIDGET_URL =
  process.env.NEXT_PUBLIC_WIDGET_URL ?? "https://vim-widget.vercel.app";

function getEmbedScriptSrc(widgetUrl: string) {
  const trimmed = widgetUrl.trim();
  if (!trimmed) return "https://vim-widget.vercel.app/embed.js";

  // FIX: Jika sudah berakhiran .js, jangan ditimpa/ditambah lagi
  if (trimmed.endsWith(".js")) return trimmed;

  // Default behavior untuk URL folder
  return `${trimmed.replace(/\/$/, "")}/embed.js`;
}

export default function DeploySettingsPage() {
  const botProfile = useBotProfile();
  const generateEmbedToken = useGenerateEmbedToken();

  const [domain, setDomain] = useState("");
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const embedScript = useMemo(() => {
    const token = embedToken;
    if (!token) return null;

    const src = getEmbedScriptSrc(DEFAULT_WIDGET_URL);

    const attrs = [
      `src="${src}"`,
      `data-token="${token}"`,
      `data-position="bottom-right"`,
    ];

    if (botProfile?.primary_color) {
      attrs.push(`data-primary-color="${botProfile.primary_color}"`);
    }

    if (typeof botProfile?.corner_radius === "number") {
      attrs.push(`data-corner-radius="${botProfile.corner_radius}"`);
    }

    return `<script
  ${attrs.join("\n  ")}
  async
></script>`;
  }, [embedToken, botProfile]);

  // --- STATE MANAGEMENT ---
  const [chatInterface, setChatInterface] = useState<"toggle" | "embedded">(
    "toggle",
  );
  const [chatLauncher, setChatLauncher] = useState<"bubble" | "element">(
    "bubble",
  );
  const [isProactiveEnabled, setIsProactiveEnabled] = useState(false);
  const [useBotAvatar, setUseBotAvatar] = useState(true);

  // Fungsi copy to clipboard
  const handleCopy = () => {
    if (!embedScript) return;
    navigator.clipboard.writeText(embedScript);
    // Bisa tambah toast notification disini kalo mau
  };

  const handleGenerate = async () => {
    if (!botProfile || !domain.trim()) return;

    setIsGenerating(true);
    try {
      const result = await generateEmbedToken({
        botId: botProfile._id,
        domain: domain.trim(),
      });
      setEmbedToken(result.token);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* --- HEADER --- */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Deploy Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage deployment configurations and publishing options
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6">
          Publish Changes
        </Button>
      </div>

      <div className="mt-12 space-y-12">
        {/* --- 1. EMBED CODE --- */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">
              Embed Code
            </h2>
            <p className="text-sm text-muted-foreground">
              Copy and paste this code on your webpage.{" "}
              <span className="underline cursor-pointer hover:text-zinc-300">
                Learn more
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com or localhost:3000"
                disabled={!botProfile || isGenerating}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Token will be scoped to this domain
              </p>
            </div>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
              onClick={handleGenerate}
              disabled={!botProfile || !domain.trim() || isGenerating}
            >
              {isGenerating ? "Generating…" : "Generate Token"}
            </Button>
          </div>

          <div className="relative group">
            <div className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 font-mono text-sm text-zinc-300 leading-relaxed overflow-x-auto">
              {botProfile === undefined && (
                <div className="text-zinc-400">Loading embed code…</div>
              )}

              {botProfile === null && (
                <div className="text-zinc-400">
                  No bot profile found yet. Create/configure your bot first.
                </div>
              )}

              {botProfile && !embedScript && (
                <div className="text-zinc-400">
                  Generate an embed token by entering a domain above.
                </div>
              )}

              {embedScript &&
                embedScript
                  .split("\n")
                  .map((line, i) => <div key={i}>{line}</div>)}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 right-4 h-8 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
              onClick={handleCopy}
              disabled={!embedScript}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy
            </Button>
          </div>
        </div>

        <div className="border-t border-zinc-800/50" />

        {/* --- 2. CHAT INTERFACE --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Chat Interface
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Choose how you want to add chat to your website.
            </p>
          </div>
          {/* Rata Kanan Container */}
          <div className="col-span-2 flex justify-end">
            <div className="flex gap-4">
              {/* Option: TOGGLE */}
              <div
                onClick={() => setChatInterface("toggle")}
                className={cn(
                  "relative w-40 h-32 rounded-xl border-2 cursor-pointer transition-all overflow-hidden bg-zinc-900/30 flex flex-col items-center justify-center gap-3",
                  chatInterface === "toggle"
                    ? "border-blue-600 bg-blue-600/5"
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900",
                )}
              >
                {/* Visual Icon: Toggle Layout */}
                <div className="h-12 w-16 bg-zinc-800 rounded border border-zinc-700 relative p-1">
                  <div className="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-zinc-400" />
                  <div className="h-full w-full grid grid-cols-2 gap-0.5 opacity-20">
                    <div className="bg-zinc-500 rounded-[1px]" />
                    <div className="bg-zinc-500 rounded-[1px]" />
                    <div className="bg-zinc-500 rounded-[1px]" />
                    <div className="bg-zinc-500 rounded-[1px]" />
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    chatInterface === "toggle"
                      ? "text-blue-500"
                      : "text-zinc-400",
                  )}
                >
                  Toggle
                </span>
                {chatInterface === "toggle" && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>

              {/* Option: EMBEDDED */}
              <div
                onClick={() => setChatInterface("embedded")}
                className={cn(
                  "relative w-40 h-32 rounded-xl border-2 cursor-pointer transition-all overflow-hidden bg-zinc-900/30 flex flex-col items-center justify-center gap-3",
                  chatInterface === "embedded"
                    ? "border-blue-600 bg-blue-600/5"
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900",
                )}
              >
                {/* Visual Icon: Embedded Layout */}
                <div className="h-12 w-16 bg-zinc-800 rounded border border-zinc-700 flex flex-col items-center justify-center gap-1 p-1.5">
                  <div className="h-1.5 w-6 bg-zinc-500 rounded-sm" />
                  <div className="h-full w-full bg-zinc-900/50 rounded-[2px] border border-zinc-700/50" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    chatInterface === "embedded"
                      ? "text-blue-500"
                      : "text-zinc-400",
                  )}
                >
                  Embedded
                </span>
                {chatInterface === "embedded" && (
                  <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. CHAT LAUNCHER --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Chat Launcher
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              How should visitors open chat?
            </p>
          </div>
          <div className="col-span-2 flex justify-end">
            <div className="flex gap-4">
              {/* Option: CHAT BUBBLE */}
              <div
                onClick={() => setChatLauncher("bubble")}
                className={cn(
                  "relative w-40 h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden bg-zinc-900/30 flex flex-col items-center justify-center gap-3",
                  chatLauncher === "bubble"
                    ? "border-blue-600 bg-blue-600/5"
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900",
                )}
              >
                <div className="h-10 w-10 bg-zinc-200 rounded-full flex items-center justify-center">
                  <div className="h-5 w-5 bg-zinc-800 rounded-sm" />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    chatLauncher === "bubble"
                      ? "text-blue-500"
                      : "text-zinc-400",
                  )}
                >
                  Chat Bubble
                </span>
              </div>

              {/* Option: CUSTOM ELEMENT */}
              <div
                onClick={() => setChatLauncher("element")}
                className={cn(
                  "relative w-40 h-28 rounded-xl border-2 cursor-pointer transition-all overflow-hidden bg-zinc-900/30 flex flex-col items-center justify-center gap-3",
                  chatLauncher === "element"
                    ? "border-blue-600 bg-blue-600/5"
                    : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900",
                )}
              >
                <div className="px-3 py-1.5 bg-zinc-800 rounded-md border border-zinc-600 text-[10px] text-zinc-300">
                  Element
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    chatLauncher === "element"
                      ? "text-blue-500"
                      : "text-zinc-400",
                  )}
                >
                  Custom Element
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- 4. BUTTON IMAGE --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3 items-center">
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Button Image
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Upload an image for the button.
            </p>
          </div>
          <div className="col-span-2 flex justify-end items-center gap-4">
            <span className="text-sm font-medium text-zinc-300">
              Use bot avatar
            </span>
            <Switch
              checked={useBotAvatar}
              onCheckedChange={setUseBotAvatar}
              className="data-[state=checked]:bg-blue-600"
            />
            <div className="h-12 w-12 rounded-full border border-dashed border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-500 flex items-center justify-center cursor-pointer transition-colors">
              <ImageIcon className="h-5 w-5 text-zinc-500" />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/50" />

        {/* --- 5. PROACTIVE MESSAGE (SIMPLE & CLEAN) --- */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
          {/* Kiri: Judul */}
          <div className="col-span-1">
            <h2 className="text-base font-semibold text-foreground">
              Proactive Message
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              A short message that appears above the chat bubble.
              <span className="underline ml-1 cursor-pointer hover:text-foreground">
                Learn more
              </span>
            </p>
          </div>

          {/* Kanan: Toggle & Preview */}
          <div className="col-span-2 flex flex-col items-end gap-4">
            {/* Toggle Switch */}
            <Switch
              checked={isProactiveEnabled}
              onCheckedChange={setIsProactiveEnabled}
              className="data-[state=checked]:bg-blue-600"
            />

            {/* Preview Card */}
            {/* LOGIC SIMPEL: isProactiveEnabled ? "opacity-100" : "opacity-40 grayscale" */}
            <div
              className={cn(
                "relative w-[340px] h-[240px] rounded-xl border border-zinc-800 bg-[#09090b] overflow-hidden transition-all duration-300 shadow-sm",
                isProactiveEnabled
                  ? "opacity-100 border-zinc-700"
                  : "opacity-40 grayscale border-zinc-900 pointer-events-none", // Gelap & Gak bisa diklik
              )}
            >
              {/* Grid Background */}
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage: `linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)`,
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Container Chat (Posisi Statis di Kanan Bawah) */}
              <div className="absolute bottom-5 right-5 flex flex-col items-end gap-3">
                {/* Bubble Message */}
                <div className="flex max-w-[240px] gap-3 rounded-xl border border-zinc-800 bg-zinc-900/95 p-3.5 shadow-xl backdrop-blur-md">
                  <div className="relative h-8 w-8 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                    B
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-zinc-900"></span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[13px] font-medium text-zinc-100 leading-snug">
                      Hi! 👋 Need help?
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Bot • Just now
                    </p>
                  </div>
                </div>

                {/* Launcher Icon */}
                <div className="h-14 w-14 rounded-full bg-blue-600 shadow-lg shadow-blue-900/20 flex items-center justify-center transition-transform hover:scale-105 cursor-default">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-7 h-7 text-white"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
