"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { BotSidebar } from "@/components/configurations/bot-sidebar";
import { Markdown } from "@/components/markdown";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { KnowledgeBaseSection } from "@/components/configurations/knowledge-base-section";
import { useGetBotConfig, useUpdateBotConfig } from "@/lib/convex-client";
import type { Doc } from "@workspace/backend/convex/_generated/dataModel";

export default function ConfigurationsPage() {
  // ===== UI STATES =====
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  // ===== SIDEBAR STATES (LIFTED FOR BOT STUDIO) =====
  const [sidebarTab, setSidebarTab] = useState<"emulator" | "inspector">(
    "emulator",
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [selectedPrompt, setSelectedPrompt] = useState(false);

  // ===== GENERAL TAB STATES =====
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [, setModelProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // ===== ADVANCED TAB STATES =====
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // ===== BACKEND HOOKS =====
  const botConfig = useGetBotConfig();
  const updateBotConfig = useUpdateBotConfig();

  // ===== LOAD CONFIG FROM BACKEND ON MOUNT OR WHEN BOTCONFIG CHANGES =====
  useEffect(() => {
    if (botConfig) {
      // Load from backend configuration
      if (botConfig.model_id) {
        setSelectedModel(botConfig.model_id);
      }
      if (botConfig.model_provider) {
        setModelProvider(botConfig.model_provider);
      }
      if (botConfig.api_key) {
        setApiKey(botConfig.api_key);
      }
      if (botConfig.system_prompt) {
        setSystemPrompt(botConfig.system_prompt);
      }
      if (
        botConfig.temperature !== null &&
        botConfig.temperature !== undefined
      ) {
        setTemperature(botConfig.temperature);
      }
      if (botConfig.max_tokens !== null && botConfig.max_tokens !== undefined) {
        setMaxTokens(botConfig.max_tokens);
      }
    }
  }, [botConfig]);

  // ===== HANDLER FOR DOCUMENT SELECTION =====
  const handleDocumentSelect = (doc: Doc<"documents">) => {
    setSelectedDocumentId(String(doc._id));
    setSelectedPrompt(false);
    setSidebarTab("inspector");
  };

  // ===== HANDLER FOR PROMPT SELECTION =====
  const handleSelectSystemInstructions = () => {
    setSelectedPrompt(true);
    setSelectedDocumentId(null);
    setSidebarTab("inspector");
  };

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
    // Groq Models - Updated to latest supported models
    "llama-3.3-70b-versatile": {
      provider: "Groq",
      placeholder: "gsk_........................",
      link: "https://console.groq.com/keys",
    },
    "llama-3.1-8b-instant": {
      provider: "Groq",
      placeholder: "gsk_........................",
      link: "https://console.groq.com/keys",
    },
    "openai/gpt-oss-120b": {
      provider: "Groq",
      placeholder: "gsk_........................",
      link: "https://console.groq.com/keys",
    },
    "openai/gpt-oss-20b": {
      provider: "Groq",
      placeholder: "gsk_........................",
      link: "https://console.groq.com/keys",
    },
  };

  const modelConfig = MODEL_CONFIG[selectedModel as keyof typeof MODEL_CONFIG];

  // Guard against undefined modelConfig - reset to valid default if needed
  // This happens when old deprecated model is loaded from DB
  if (!modelConfig) {
    setSelectedModel("gemini-2.5-pro");
    // Return early to prevent render errors - component will re-render after state updates
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <p className="text-zinc-400">Loading configuration...</p>
      </div>
    );
  }

  // ===== SAVE HANDLER (API KEY & MODEL ONLY) =====
  const handleSaveApiKeyAndModel = async () => {
    setSaveError(null);

    // Safety check - ensure modelConfig exists
    if (!modelConfig) {
      setSaveError(new Error("Invalid model selected"));
      return;
    }

    setIsSaving(true);
    try {
      // Prepare payload - only API key and model
      const payload: Record<string, unknown> = {
        model_provider: modelConfig.provider,
        model_id: selectedModel,
      };

      // Only include api_key if it's been provided
      if (apiKey.trim()) {
        payload.api_key = apiKey;
      }

      // Call backend mutation
      await updateBotConfig(payload);

      // Optional: Show success feedback
      console.log("API Key and Model saved successfully", payload);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error
          : new Error("Failed to save configuration"),
      );
      console.error("Error saving configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = botConfig === undefined;

  return (
    // Wrapper Utama: Flex Row biar Kiri (Form) dan Kanan (Emulator) sebelahan
    <div className="flex h-[calc(100vh-4rem)] w-full items-start">
      {/* BAGIAN KIRI (FORM) - Scrollable sendiri */}
      <div className="flex-1 overflow-y-auto h-full p-6">
        <div className="mx-auto max-w-4xl h-full flex flex-col">
          {/* --- ERROR ALERT --- */}
          {saveError && (
            <div className="mb-6 rounded-lg bg-red-900/20 border border-red-700 p-4 text-sm text-red-400">
              <p className="font-medium">Error: {saveError.message}</p>
            </div>
          )}

          {/* Header Section (Selalu Muncul) */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Configuration
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your agent&rsquo;s personality and knowledge.
              </p>
            </div>
          </div>

          {/* --- CONTENT SWITCHER --- */}
          {isLoading ? (
            /* --- CENTERED LOADING STATE --- */
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500">
              <div className="relative mb-4">
                {/* Efek Glow di belakang spinner */}
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="relative h-10 w-10 text-blue-500 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-zinc-100">
                Loading Configuration...
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Syncing with neural network
              </p>
            </div>
          ) : (
            /* --- TABS & FORM CONTENT --- */
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full animate-in slide-in-from-bottom-2 duration-500"
            >
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-900/50 border border-zinc-800 p-1 rounded-lg mb-6">
                <TabsTrigger
                  value="general"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>

              {/* ===== GENERAL TAB ===== */}
              <TabsContent
                value="general"
                className="space-y-6 focus-visible:outline-none"
              >
                {/* MODEL SELECTION & API KEY */}
                <section className="rounded-xl border border-zinc-800 bg-card shadow-sm overflow-hidden">
                  <div className="border-b border-zinc-800 bg-muted/40 p-6 pb-4">
                    <h2 className="text-base font-semibold">
                      Model Configuration
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose the intelligence behind your agent.
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Select Model */}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Select Model
                      </label>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-800 text-zinc-100 focus:ring-blue-600 focus:border-blue-600">
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
                          {/* Groq Models - Latest supported */}
                          <SelectItem value="llama-3.3-70b-versatile">
                            Llama 3.3 70B (Groq)
                          </SelectItem>
                          <SelectItem value="llama-3.1-8b-instant">
                            Llama 3.1 8B Instant (Groq)
                          </SelectItem>
                          <SelectItem value="openai/gpt-oss-120b">
                            GPT OSS 120B (Groq)
                          </SelectItem>
                          <SelectItem value="openai/gpt-oss-20b">
                            GPT OSS 20B (Groq)
                          </SelectItem>
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
                          className="text-[10px] text-blue-500 uppercase tracking-wider underline underline-offset-4 hover:text-blue-400"
                        >
                          get api key
                        </a>
                      </div>

                      <div className="relative">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder={modelConfig.placeholder}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="pr-10 font-mono text-sm bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-zinc-800/50"
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

                    {/* Save Button - Moved below API Key */}
                    <div className="flex gap-2 pt-4 border-t border-zinc-800">
                      <Button
                        onClick={handleSaveApiKeyAndModel}
                        disabled={isSaving || isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save API Key"
                        )}
                      </Button>
                    </div>
                  </div>
                </section>

                {/* System Instructions - Read-only Preview Card */}
                <section
                  onClick={handleSelectSystemInstructions}
                  className={`rounded-xl border cursor-pointer transition-all ${
                    selectedPrompt
                      ? "border-blue-600/50 bg-blue-900/20"
                      : "border-zinc-800 bg-card hover:border-zinc-700 hover:bg-zinc-900/30"
                  } p-6 shadow-sm space-y-3 min-h-[280px] flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h2 className="text-base font-semibold">
                        System Instructions
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Click to edit how your agent should behave and interact
                        with users.
                      </p>
                    </div>
                  </div>

                  {/* Preview Text */}
                  <div className="flex-1 min-h-[150px] max-h-[200px] overflow-hidden rounded-md bg-zinc-900/40 border border-zinc-800 p-3 font-mono text-xs leading-relaxed text-zinc-300 line-clamp-8">
                    {systemPrompt ? (
                      <Markdown content={systemPrompt} className="text-xs" />
                    ) : (
                      "No system instructions defined."
                    )}
                  </div>
                </section>

                {/* Knowledge Base Section */}
                <KnowledgeBaseSection onDocumentSelect={handleDocumentSelect} />
              </TabsContent>

              {/* ===== ADVANCED TAB ===== */}
              <TabsContent
                value="advanced"
                className="space-y-6 focus-visible:outline-none"
              >
                <section className="rounded-xl border border-zinc-800 bg-card shadow-sm overflow-hidden">
                  <div className="border-b border-zinc-800 bg-muted/40 p-6 pb-4">
                    <h2 className="text-base font-semibold">
                      Advanced Parameters
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fine-tune model behavior with manual parameter overrides.
                    </p>
                  </div>

                  <div className="p-6 space-y-8">
                    {/* Temperature Control */}
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          Temperature
                        </label>
                        <span className="text-xs text-blue-400 font-mono bg-blue-900/30 px-3 py-1 rounded-md">
                          {temperature.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) =>
                            setTemperature(parseFloat(e.target.value))
                          }
                          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          style={{
                            background: `linear-gradient(to right, rgb(37 99 235) 0%, rgb(37 99 235) ${
                              (temperature / 2) * 100
                            }%, rgb(39 39 42) ${(temperature / 2) * 100}%, rgb(39 39 42) 100%)`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Deterministic</span>
                        <span>Random</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">
                        Controls randomness: 0 = deterministic (same output), 2
                        = very random (creative). Default: 0.7
                      </p>
                    </div>

                    {/* Max Tokens Control */}
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                          Max Tokens
                        </label>
                        <span className="text-xs text-blue-400 font-mono bg-blue-900/30 px-3 py-1 rounded-md">
                          {maxTokens}
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max="8000"
                        value={maxTokens}
                        onChange={(e) =>
                          setMaxTokens(
                            Math.min(
                              8000,
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            ),
                          )
                        }
                        className="font-mono bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                      />
                      <p className="text-[12px] text-muted-foreground">
                        Maximum length of response in tokens (1-8000). Higher
                        values = longer responses. Default: 1000
                      </p>
                    </div>
                  </div>
                </section>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-600/30 bg-blue-900/20 p-4">
                  <p className="text-sm text-blue-300">
                    <strong>Note:</strong> Parameters saved here will persist.
                    When you save from the General tab, these settings will be
                    preserved.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* BAGIAN KANAN (EMULATOR) - Tetap diam (fixed width) */}
      <div className="w-[450px] shrink-0 h-full overflow-hidden border-l border-zinc-800 bg-zinc-950/50">
        <BotSidebar
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          selectedDocumentId={selectedDocumentId}
          selectedPrompt={selectedPrompt}
          onDocumentSelect={handleDocumentSelect}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
        />
      </div>
    </div>
  );
}
