"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { BotEmulator } from "./bot-emulator";
import { DynamicInspector } from "./dynamic-inspector";

type EscalationConfig = {
  enabled: boolean;
  whatsapp: string;
  email: string;
};

interface BotSidebarProps {
  activeTab: "emulator" | "inspector";
  onTabChange: (tab: "emulator" | "inspector") => void;
  selectedComponent: string | null;
  systemPrompt?: string;
  onSystemPromptChange?: (prompt: string) => void;
  escalationConfig?: EscalationConfig;
  onEscalationConfigChange?: (next: EscalationConfig) => void;
  modelId?: string;
  hasApiKey?: boolean;
  onModelConfigChange?: (next: {
    modelId: string;
    modelProvider: string;
    hasApiKey: boolean;
  }) => void;
  onModelConfigDeleted?: () => void;
}

export function BotSidebar({
  activeTab,
  onTabChange,
  selectedComponent,
  onSystemPromptChange,
  systemPrompt,
  escalationConfig,
  onEscalationConfigChange,
  modelId,
  hasApiKey,
  onModelConfigChange,
  onModelConfigDeleted,
}: BotSidebarProps) {
  // Determine the inspector mode based on what's selected
  let inspectorMode:
    | "knowledge-base"
    | "knowledge-base-list"
    | "prompt"
    | "model"
    | "escalation"
    | "empty" = "empty";

  const selectedDocumentId = selectedComponent?.startsWith("kb_")
    ? selectedComponent.slice(3)
    : null;

  if (selectedComponent === "prompt") {
    inspectorMode = "prompt";
  } else if (selectedComponent === "model") {
    inspectorMode = "model";
  } else if (selectedComponent === "escalation") {
    inspectorMode = "escalation";
  } else if (selectedComponent === "kb") {
    inspectorMode = "knowledge-base-list";
  } else if (selectedDocumentId) {
    inspectorMode = "knowledge-base";
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          onTabChange(value as "emulator" | "inspector")
        }
        className="flex flex-col h-full w-full"
      >
        <div className="border-b border-zinc-800 p-4">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-zinc-800 p-1 rounded-lg">
            <TabsTrigger
              value="inspector"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-sm"
            >
              Inspector
            </TabsTrigger>
            <TabsTrigger
              value="emulator"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-sm"
            >
              Emulator
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Inspector Tab Content */}
        <TabsContent
          value="inspector"
          className="flex-1 mt-0 h-full overflow-hidden"
        >
          <DynamicInspector
            mode={inspectorMode}
            documentId={selectedDocumentId || undefined}
            systemPrompt={systemPrompt || ""}
            onSystemPromptChange={onSystemPromptChange}
            escalationConfig={escalationConfig}
            onEscalationConfigChange={onEscalationConfigChange}
            modelId={modelId}
            hasApiKey={hasApiKey}
            onModelConfigChange={onModelConfigChange}
            onModelConfigDeleted={onModelConfigDeleted}
          />
        </TabsContent>

        {/* Emulator Tab Content */}
        <TabsContent
          value="emulator"
          className="flex-1 mt-0 w-full h-full overflow-hidden"
        >
          <BotEmulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
