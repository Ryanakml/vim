"use client";

import { Input } from "@workspace/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { BotSidebar } from "@/components/configurations/bot-sidebar";
import { Markdown } from "@/components/markdown";
import { KeyRound, Loader2, Check } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { KnowledgeBaseSection } from "@/components/configurations/knowledge-base-section";
import { KBAnalytics } from "@/components/configurations/kb-analytics";
import {
  useBotProfile,
  useEnsureBotProfile,
  useGetBotConfig,
  useKnowledgeDocuments,
} from "@/lib/convex-client";
import type { Doc } from "@workspace/backend/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import { MODEL_CONFIG, type ModelId } from "@/lib/model-config";
import {
  analyzeKBCompleteness,
  generateKBInstructions,
} from "@/lib/system-prompt-builder";

export default function ConfigurationsPage() {
  const { userId } = useAuth();

  // ===== UI STATES =====
  const [activeTab, setActiveTab] = useState("general");

  // ===== SIDEBAR STATES (LIFTED FOR BOT STUDIO) =====
  const [sidebarTab, setSidebarTab] = useState<"emulator" | "inspector">(
    "emulator",
  );
  const [selectedComponent, setSelectedComponent] = useState<string | null>(
    null,
  );

  // ===== GENERAL TAB STATES =====
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini-2.5-pro");
  const [, setModelProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelProvider, setModelProviderState] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationWhatsapp, setEscalationWhatsapp] = useState("");
  const [escalationEmail, setEscalationEmail] = useState("");

  // ===== ADVANCED TAB STATES =====
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // ===== BACKEND HOOKS =====
  const ensureBotProfile = useEnsureBotProfile();
  const botConfig = useGetBotConfig();
  const botProfile = useBotProfile();
  const knowledgeDocuments = useKnowledgeDocuments(botProfile?._id);

  const kbDocsLoading = knowledgeDocuments === undefined;
  const kbDocsForScore = useMemo(
    () => knowledgeDocuments?.map((doc) => ({ text: doc.text || "" })) ?? [],
    [knowledgeDocuments],
  );
  const kbCompleteness = useMemo(
    () => analyzeKBCompleteness(systemPrompt || "", kbDocsForScore),
    [systemPrompt, kbDocsForScore],
  );
  const kbInstructions = useMemo(
    () => generateKBInstructions(kbDocsForScore.length),
    [kbDocsForScore.length],
  );
  const kbScoreClass =
    kbCompleteness.score >= 70
      ? "border-green-600/40 text-green-400 bg-green-900/20"
      : kbCompleteness.score >= 50
        ? "border-yellow-600/40 text-yellow-400 bg-yellow-900/20"
        : "border-red-600/40 text-red-400 bg-red-900/20";

  // Ensure a bot profile exists for this user before interacting with config
  useEffect(() => {
    if (!userId) return;
    void ensureBotProfile();
  }, [userId, ensureBotProfile]);

  // ===== LOAD CONFIG FROM BACKEND ON MOUNT OR WHEN BOTCONFIG CHANGES =====
  useEffect(() => {
    if (botConfig) {
      // Load from backend configuration
      if (botConfig.model_id) {
        if (
          Object.prototype.hasOwnProperty.call(MODEL_CONFIG, botConfig.model_id)
        ) {
          setSelectedModel(botConfig.model_id as ModelId);
        }
      }
      if (botConfig.model_provider) {
        setModelProvider(botConfig.model_provider);
        setModelProviderState(botConfig.model_provider);
      }
      if (botConfig.api_key) {
        setApiKey(botConfig.api_key);
      }
      if (botConfig.system_prompt) {
        setSystemPrompt(botConfig.system_prompt);
      }
      if (botConfig.escalation) {
        setEscalationEnabled(Boolean(botConfig.escalation.enabled));
        setEscalationWhatsapp(botConfig.escalation.whatsapp || "");
        setEscalationEmail(botConfig.escalation.email || "");
      } else {
        setEscalationEnabled(false);
        setEscalationWhatsapp("");
        setEscalationEmail("");
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
    const next = `kb_${String(doc._id)}`;
    if (selectedComponent === next) return;
    setSelectedComponent(next);
    setSidebarTab("inspector");
  };

  // ===== HANDLER FOR SYSTEM INSTRUCTIONS SELECTION =====
  const handleSelectSystemInstructions = () => {
    if (selectedComponent === "prompt") return;
    setSelectedComponent("prompt");
    setSidebarTab("inspector");
  };

  // ===== HANDLER FOR ESCALATION SETTINGS SELECTION =====
  const handleSelectEscalationSettings = () => {
    if (selectedComponent === "escalation") return;
    setSelectedComponent("escalation");
    setSidebarTab("inspector");
  };

  // ===== HANDLER FOR MODEL CONFIG SELECTION =====
  const handleSelectModelConfig = () => {
    if (selectedComponent === "model") return;
    setSelectedComponent("model");
    setSidebarTab("inspector");
  };

  // ===== HANDLER FOR KNOWLEDGE BASE SECTION SELECTION =====
  const handleSelectKnowledgeBaseSection = () => {
    if (selectedComponent === "kb") return;
    setSelectedComponent("kb");
    setSidebarTab("inspector");
  };

  const modelConfig = MODEL_CONFIG[selectedModel];

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

  const isLoading = botConfig === undefined;
  const isConfigured = !!apiKey && !!modelProvider;
  const selectedDocumentId = selectedComponent?.startsWith("kb_")
    ? selectedComponent.slice(3)
    : null;
  const selectedPrompt = selectedComponent === "prompt";
  const selectedEscalation = selectedComponent === "escalation";
  const selectedModelConfig = selectedComponent === "model";
  const selectedKbSection = selectedComponent === "kb";

  return (
    // Wrapper Utama: Flex Row biar Kiri (Form) dan Kanan (Emulator) sebelahan
    <div className="flex h-[calc(100vh-4rem)] w-full items-start">
      {/* BAGIAN KIRI (FORM) - Scrollable sendiri */}
      <div
        className="flex-1 overflow-y-auto h-full p-6"
        onPointerDownCapture={(e) => {
          if (!selectedComponent) return;
          const target = e.target as HTMLElement | null;
          if (!target) return;
          const insideSelectable = target.closest(
            '[data-config-selectable="true"]',
          );
          if (!insideSelectable) {
            setSelectedComponent(null);
            setSidebarTab("emulator");
          }
        }}
      >
        <div className="mx-auto max-w-4xl h-full flex flex-col">
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
                {/* ===== MODEL CONFIGURATION (CLICK TO EDIT IN INSPECTOR) ===== */}
                <section
                  data-config-selectable="true"
                  onClick={handleSelectModelConfig}
                  className={`rounded-xl border overflow-hidden transition-all cursor-pointer ${
                    selectedModelConfig
                      ? "border-blue-600 bg-blue-900/10"
                      : "border-zinc-800 bg-card hover:border-zinc-700 hover:bg-zinc-900/20"
                  }`}
                >
                  <div className="border-b p-6 pb-4 border-zinc-800 bg-muted/40">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <KeyRound className="w-4 h-4" />
                      Model Configuration
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click to edit your model and API key in Inspector.
                    </p>
                  </div>

                  <div className="p-6">
                    {isConfigured ? (
                      <div className="space-y-4">
                        <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700 space-y-3">
                          <div className="flex items-center gap-3">
                            <div>●</div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Active Model
                              </p>
                              <p className="text-sm font-medium text-zinc-100">
                                {selectedModel}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
                            <div>●</div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Provider
                              </p>
                              <p className="text-sm font-medium text-zinc-100">
                                {modelProvider}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Check className="h-4 w-4 text-zinc-400" />
                          Configuration complete
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center">
                          <KeyRound className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-sm text-muted-foreground max-w-sm text-center">
                          No API key configured yet.
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Click to configure in Inspector.
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* System Instructions - Read-only Preview Card */}
                <section
                  data-config-selectable="true"
                  onClick={handleSelectSystemInstructions}
                  className={`rounded-xl border cursor-pointer transition-all ${
                    selectedPrompt
                      ? "border-blue-600 bg-blue-900/10"
                      : "border-zinc-800 bg-card hover:border-zinc-700 hover:bg-zinc-900/20"
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

                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-muted-foreground space-y-2">
                    {kbDocsLoading ? (
                      <p className="text-xs text-muted-foreground">
                        Loading knowledge base insights...
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span>KB completeness</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${kbScoreClass}`}
                          >
                            {kbCompleteness.score}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {kbInstructions}
                        </p>
                        {kbCompleteness.warnings.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-red-400">Warnings</p>
                            <ul className="list-disc pl-4 space-y-1">
                              {kbCompleteness.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {kbCompleteness.suggestions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-yellow-400">
                              Suggestions
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                              {kbCompleteness.suggestions.map((suggestion) => (
                                <li key={suggestion}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* Escalation Settings - Structured Lead Capture */}
                <section
                  data-config-selectable="true"
                  onClick={handleSelectEscalationSettings}
                  className={`rounded-xl border cursor-pointer transition-all ${
                    selectedEscalation
                      ? "border-blue-600 bg-blue-900/10"
                      : "border-zinc-800 bg-card hover:border-zinc-700 hover:bg-zinc-900/20"
                  } p-6 shadow-sm space-y-3 min-h-[220px] flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h2 className="text-base font-semibold">
                        Escalation & Lead Capture
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Structured WhatsApp + Email CTA links injected into bot
                        responses.
                      </p>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full border ${
                        escalationEnabled
                          ? "border-green-600/40 text-green-400 bg-green-900/20"
                          : "border-zinc-700 text-zinc-400 bg-zinc-900/40"
                      }`}
                    >
                      {escalationEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="flex-1 min-h-[120px] overflow-hidden rounded-md bg-zinc-900/40 border border-zinc-800 p-3 text-xs leading-relaxed text-zinc-300 space-y-2">
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        WhatsApp
                      </div>
                      <div className="font-mono break-all">
                        {escalationWhatsapp || "Not set"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">
                        Email
                      </div>
                      <div className="font-mono break-all">
                        {escalationEmail || "Not set"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Knowledge Base Section */}
                <KnowledgeBaseSection
                  onDocumentSelect={handleDocumentSelect}
                  selectedDocumentId={selectedDocumentId}
                  isSelected={selectedKbSection}
                  onSelectSection={handleSelectKnowledgeBaseSection}
                />

                <KBAnalytics botId={botProfile?._id} />
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
          selectedComponent={selectedComponent}
          systemPrompt={systemPrompt}
          onSystemPromptChange={setSystemPrompt}
          escalationConfig={{
            enabled: escalationEnabled,
            whatsapp: escalationWhatsapp,
            email: escalationEmail,
          }}
          onEscalationConfigChange={(next) => {
            setEscalationEnabled(next.enabled);
            setEscalationWhatsapp(next.whatsapp);
            setEscalationEmail(next.email);
          }}
          modelId={selectedModel}
          apiKey={apiKey}
          onModelConfigChange={({ modelId, modelProvider, apiKey }) => {
            if (Object.prototype.hasOwnProperty.call(MODEL_CONFIG, modelId)) {
              setSelectedModel(modelId as ModelId);
            }
            setModelProviderState(modelProvider);
            setApiKey(apiKey);
          }}
          onModelConfigDeleted={() => {
            setApiKey("");
            setModelProviderState("");
            setSelectedModel("gemini-2.5-pro");
          }}
        />
      </div>
    </div>
  );
}
