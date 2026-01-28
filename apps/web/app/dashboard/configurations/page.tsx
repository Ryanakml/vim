// app/dashboard/configurations/page.tsx
"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea"; // Pastikan ada Textarea component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { BotEmulator } from "@/components/configurations/bot-emulator"; // Import emulator yang tadi
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { KnowledgeBaseSection } from "@/components/configurations/knowledge-base-section";

export default function ConfigurationsPage() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");

  const MODEL_CONFIG = {
    "gemini-2.5-pro": {
      provider: "Google AI",
      placeholder: "AIzaSy........................",
      link: "https://aistudio.google.com/app/api-keys",
    },
    "gpt-4o": {
      provider: "OpenAI",
      placeholder: "sk-........................",
      link: "https://platform.openai.com/api-keys",
    },
    "claude-3.5-sonnet": {
      provider: "Anthropic",
      placeholder: "sk-ant-....................",
      link: "https://console.anthropic.com/settings/keys",
    },
    grok: {
      provider: "Groq",
      placeholder: "gsk_........................",
      link: "https://console.groq.com/keys",
    },
  };

  const modelConfig = MODEL_CONFIG[selectedModel as keyof typeof MODEL_CONFIG];

  const DEFAULT_PROMPT = `You are a helpful AI assistant. Answer concisely and clearly. Follow system instructions strictly.`;

  const [prompt, setPrompt] = useState("");

  return (
    // Wrapper Utama: Flex Row biar Kiri (Form) dan Kanan (Emulator) sebelahan
    <div className="flex h-[calc(100vh-4rem)] w-full items-start">
      {/* BAGIAN TENGAH (FORM) - Scrollable sendiri */}
      <div className="flex-1 overflow-y-auto h-full p-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Configuration
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your agen&rsquo;s personality and knowledge.
              </p>
            </div>
            <Button>Save Changes</Button>
          </div>

          {/* MODEL SELECTION & API KEY */}
          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b bg-muted/40 p-6 pb-4">
              <h2 className="text-base font-semibold">Model Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the intelligence behind your agent.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Select Model */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Select Model</label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 focus:ring-blue-600">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="gemini-2.5-pro">
                      Gemini 2.5 Pro
                    </SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="claude-3.5-sonnet">
                      Claude 3.5 Sonnet
                    </SelectItem>
                    <SelectItem value="grok">Grok (Groq)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API Key */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5" />
                    {modelConfig.provider} API Key
                  </label>

                  <a
                    href={modelConfig.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary uppercase tracking-wider underline underline-offset-4 hover:decoration-2"
                  >
                    get api key
                  </a>
                </div>

                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder={modelConfig.placeholder}
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-[12px] text-muted-foreground">
                  Your API key is encrypted and stored securely.
                </p>
              </div>
            </div>
          </section>

          {/* Prompt Section */}
          <section className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">System Instructions</h2>
                <p className="text-sm text-muted-foreground">
                  Define how your agent should behave and interact with users.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrompt(DEFAULT_PROMPT)}
                className="mt-1 text-[10px] text-primary uppercase tracking-wider underline underline-offset-4 hover:decoration-2 whitespace-nowrap"
              >
                use default prompt
              </button>
            </div>

            {/* Textarea */}
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[250px] font-mono text-sm leading-relaxed"
              placeholder="You are a helpful AI assistant..."
            />
          </section>

          {/* Knowledge Base Section */}
          <KnowledgeBaseSection />
        </div>
      </div>

      {/* BAGIAN KANAN (EMULATOR) - Tetap diam (fixed width) */}
      <BotEmulator />
    </div>
  );
}
