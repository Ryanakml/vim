"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SmartEditor } from "@/components/smart-editor";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  useUpdateDocument,
  useDeleteDocument,
  useKnowledgeDocuments,
  useBotProfile,
  useUpdateBotConfig,
  useUpdateEscalationConfig,
} from "@/lib/convex-client";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { MODEL_CONFIG, MODEL_OPTIONS, type ModelId } from "@/lib/model-config";

type InspectorMode =
  | "knowledge-base"
  | "prompt"
  | "model"
  | "knowledge-base-list"
  | "escalation"
  | "empty";

type EscalationConfig = {
  enabled: boolean;
  whatsapp: string;
  email: string;
};

interface DynamicInspectorProps {
  mode: InspectorMode;
  documentId?: string;
  systemPrompt?: string;
  onSystemPromptChange?: (prompt: string) => void;
  defaultPrompt?: string;
  escalationConfig?: EscalationConfig;
  onEscalationConfigChange?: (next: EscalationConfig) => void;
  modelId?: string;
  apiKey?: string;
  onModelConfigChange?: (next: {
    modelId: string;
    modelProvider: string;
    apiKey: string;
  }) => void;
  onModelConfigDeleted?: () => void;
}

const DEFAULT_PROMPT = `### Role and Persona
You are "Hangar Helper," the helpful and polite customer support agent for **The Clothes Hangar**, a small, stylish clothing boutique. Your goal is to assist customers with their inquiries regarding products, store hours, policies, and general questions.

### Tone and Style
* **Polite and Warm:** Always use a friendly, boutique-style tone (e.g., "Happy to help with that!" or "That's a great question!").
* **Concise:** Keep answers clear and to the point so customers get the info they need quickly.
* **Professional:** Maintain a respectful demeanor at all times.

### Operational Guidelines
1.  **Source of Truth:** You must answer user questions **ONLY** using information provided in your Knowledge Base.
2.  **No Hallucinations:** Do **not** make up inventory, prices, policies, or events that are not explicitly stated in your Knowledge Base. If a specific item or policy is not mentioned, assume you do not know the answer.
3.  **Escalation Protocol:** If you cannot find the answer in the Knowledge Base, or if the user asks a complex question requiring human judgment, you must politely apologize and direct them to human support using the escalation links provided by the system.

### Example Conversations

**Example 1: Greeting**
*User:* Hi there!
*You:* Hello! Welcome to The Clothes Hangar. How can I help you find the perfect outfit today?

**Example 2: Successful Answer (Information found in Knowledge Base)**
*User:* What is your return policy?
*You:* We accept returns within 14 days of purchase, provided the items are unworn and the original tags are still attached. Sale items are final sale.

**Example 3: Unsuccessful Answer (Information NOT in Knowledge Base)**
*User:* Do you have the blue velvet jacket in a size Extra Small?
*You:* I apologize, but I don't have access to real-time stock levels for that specific item right now. Please contact our support team using the provided support links so they can assist you further.

**Example 4: Unsuccessful Answer (Unknown Policy)**
*User:* Do you offer international shipping to Brazil?
*You:* I'm sorry, I don't have the information regarding shipping to that specific destination. Please reach out to our support team using the provided support links so they can assist you further!

**Example 5: Store Hours**
*User:* Are you open on Sundays?
*You:* (Assuming KB says Closed Sunday) We are closed on Sundays to rest and recharge! We are open Monday through Saturday from 10:00 AM to 7:00 PM.`;

export function DynamicInspector({
  mode,
  documentId,
  systemPrompt = "",
  onSystemPromptChange,
  defaultPrompt = DEFAULT_PROMPT,
  escalationConfig,
  onEscalationConfigChange,
  modelId,
  apiKey,
  onModelConfigChange,
  onModelConfigDeleted,
}: DynamicInspectorProps) {
  // ===== KNOWLEDGE BASE STATE =====
  const [originalText, setOriginalText] = useState<string>("");
  const [currentText, setCurrentText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ===== PROMPT STATE =====
  const [originalPrompt, setOriginalPrompt] = useState(systemPrompt);
  const [currentPrompt, setCurrentPrompt] = useState(systemPrompt);
  const [isPromptSaving, setIsPromptSaving] = useState(false);

  // ===== ESCALATION STATE =====
  const [originalEscalation, setOriginalEscalation] =
    useState<EscalationConfig>({
      enabled: false,
      whatsapp: "",
      email: "",
    });
  const [escalationEnabled, setEscalationEnabled] = useState(false);
  const [escalationWhatsapp, setEscalationWhatsapp] = useState("");
  const [escalationEmail, setEscalationEmail] = useState("");
  const [isEscalationSaving, setIsEscalationSaving] = useState(false);

  // ===== MODEL CONFIG STATE =====
  const [tempModelId, setTempModelId] = useState<ModelId>("gemini-2.5-flash");
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isModelSaving, setIsModelSaving] = useState(false);
  const [isModelDeleting, setIsModelDeleting] = useState(false);

  // ===== BACKEND HOOKS =====
  const botProfile = useBotProfile();
  const allDocuments = useKnowledgeDocuments(botProfile?._id);
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const updateBotConfig = useUpdateBotConfig();
  const updateEscalationConfig = useUpdateEscalationConfig();

  // ===== LOAD KNOWLEDGE BASE DOCUMENT =====
  useEffect(() => {
    if (mode === "knowledge-base" && allDocuments && botProfile && documentId) {
      const doc = allDocuments.find((d) => String(d.id) === documentId);
      if (doc) {
        setOriginalText(doc.text);
        setCurrentText(doc.text);
        setError(null);
        setSuccessMessage(null);
      } else {
        setError("Document not found");
      }
    }
  }, [allDocuments, documentId, botProfile, mode]);

  // ===== SYNC PROMPT CHANGES FROM PARENT =====
  useEffect(() => {
    if (mode === "prompt") {
      setOriginalPrompt(systemPrompt);
      setCurrentPrompt(systemPrompt);
    }
  }, [systemPrompt, mode]);

  // ===== SYNC ESCALATION CONFIG CHANGES FROM PARENT =====
  useEffect(() => {
    if (mode !== "escalation") return;

    const nextConfig: EscalationConfig = {
      enabled: escalationConfig?.enabled ?? false,
      whatsapp: escalationConfig?.whatsapp ?? "",
      email: escalationConfig?.email ?? "",
    };

    setOriginalEscalation(nextConfig);
    setEscalationEnabled(nextConfig.enabled);
    setEscalationWhatsapp(nextConfig.whatsapp);
    setEscalationEmail(nextConfig.email);
    setError(null);
    setSuccessMessage(null);
  }, [mode, escalationConfig]);

  // ===== SYNC MODEL CONFIG CHANGES FROM PARENT =====
  useEffect(() => {
    if (mode !== "model") return;

    const incomingModelId =
      typeof modelId === "string" &&
      Object.prototype.hasOwnProperty.call(MODEL_CONFIG, modelId)
        ? (modelId as ModelId)
        : ("gemini-2.5-flash" as ModelId);

    setTempModelId(incomingModelId);
    setTempApiKey(apiKey || "");
    setShowApiKey(false);
    setError(null);
    setSuccessMessage(null);
  }, [mode, modelId, apiKey]);

  // ===== KNOWLEDGE BASE: SAVE HANDLER =====
  const handleSaveKnowledgeBase = async () => {
    if (originalText === currentText) return;

    const docId = documentId as Id<"documents">;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateDocument({
        documentId: docId,
        text: currentText,
      });

      setOriginalText(currentText);
      setSuccessMessage("Document updated successfully");

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update document",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ===== KNOWLEDGE BASE: DELETE HANDLER =====
  const handleDeleteKnowledgeBase = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this document? This cannot be undone.",
      )
    ) {
      return;
    }

    const docId = documentId as Id<"documents">;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteDocument({
        documentId: docId,
      });

      setSuccessMessage("Document deleted successfully");
      setTimeout(() => {
        setOriginalText("");
        setCurrentText("");
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== PROMPT: SAVE HANDLER =====
  const handleSavePrompt = async () => {
    if (originalPrompt === currentPrompt) return;

    setIsPromptSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateBotConfig({
        system_prompt: currentPrompt,
      });

      setOriginalPrompt(currentPrompt);
      onSystemPromptChange?.(currentPrompt);
      setSuccessMessage("System instructions updated successfully");

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update system instructions",
      );
    } finally {
      setIsPromptSaving(false);
    }
  };

  // ===== PROMPT: USE DEFAULT HANDLER =====
  const handleUseDefaultPrompt = () => {
    setCurrentPrompt(defaultPrompt);
  };

  // ===== ESCALATION: SAVE HANDLER =====
  const handleSaveEscalation = async () => {
    const nextConfig: EscalationConfig = {
      enabled: escalationEnabled,
      whatsapp: escalationWhatsapp,
      email: escalationEmail,
    };

    if (
      originalEscalation.enabled === nextConfig.enabled &&
      originalEscalation.whatsapp === nextConfig.whatsapp &&
      originalEscalation.email === nextConfig.email
    ) {
      return;
    }

    setIsEscalationSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateEscalationConfig({
        enabled: nextConfig.enabled,
        whatsapp: nextConfig.whatsapp,
        email: nextConfig.email,
      });

      setOriginalEscalation(nextConfig);
      onEscalationConfigChange?.(nextConfig);
      setSuccessMessage("Escalation settings updated successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update escalation settings",
      );
    } finally {
      setIsEscalationSaving(false);
    }
  };

  // ===== MODEL: SAVE HANDLER =====
  const handleSaveModelConfig = async () => {
    setError(null);
    setSuccessMessage(null);

    const meta = MODEL_CONFIG[tempModelId];
    if (!meta) {
      setError("Invalid model selected");
      return;
    }
    if (!tempApiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsModelSaving(true);
    try {
      await updateBotConfig({
        model_id: tempModelId,
        model_provider: meta.provider,
        api_key: tempApiKey,
      });

      onModelConfigChange?.({
        modelId: tempModelId,
        modelProvider: meta.provider,
        apiKey: tempApiKey,
      });

      setSuccessMessage("Model configuration saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save model configuration",
      );
    } finally {
      setIsModelSaving(false);
    }
  };

  // ===== MODEL: DELETE HANDLER =====
  const handleDeleteModelConfig = async () => {
    if (
      !window.confirm(
        "Delete model configuration? This will remove your API key and model settings.",
      )
    ) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsModelDeleting(true);
    try {
      await updateBotConfig({
        model_provider: null,
        model_id: null,
        api_key: null,
      });

      onModelConfigDeleted?.();
      setTempModelId("gemini-2.5-flash");
      setTempApiKey("");
      setShowApiKey(false);

      setSuccessMessage("Model configuration deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete model configuration",
      );
    } finally {
      setIsModelDeleting(false);
    }
  };

  // ===== HELPER: DETERMINE IF CHANGES EXIST =====
  const hasKBChanges =
    mode === "knowledge-base" &&
    originalText !== currentText &&
    currentText.trim() !== "";
  const hasPromptChanges =
    mode === "prompt" && originalPrompt !== currentPrompt;
  const hasEscalationChanges =
    mode === "escalation" &&
    (originalEscalation.enabled !== escalationEnabled ||
      originalEscalation.whatsapp !== escalationWhatsapp ||
      originalEscalation.email !== escalationEmail);

  // ===== ESCALATION MODE =====
  if (mode === "escalation") {
    const normalizedWhatsapp = escalationWhatsapp.replace(/\D/g, "");
    const emailTrimmed = escalationEmail.trim();
    const whatsappLink = normalizedWhatsapp
      ? `https://wa.me/${normalizedWhatsapp}`
      : "https://wa.me/<digits>";
    const emailLink = emailTrimmed
      ? `mailto:${emailTrimmed}`
      : "mailto:you@domain.com";

    return (
      <div className="flex h-full w-full flex-col border-l bg-muted/10">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Escalation & Lead Capture</h3>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-900/20 border border-red-700 p-3 text-xs text-red-400">
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-4 rounded-lg bg-green-900/20 border border-green-700 p-3 text-xs text-green-400">
            <p>{successMessage}</p>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Enable Escalation</p>
                <p className="text-[11px] text-muted-foreground">
                  Injects structured WhatsApp + Email CTA when support is
                  needed.
                </p>
              </div>
              <Switch
                checked={escalationEnabled}
                onCheckedChange={setEscalationEnabled}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                WhatsApp Number
              </label>
              <Input
                value={escalationWhatsapp}
                onChange={(e) => setEscalationWhatsapp(e.target.value)}
                placeholder="+6281234567890"
                disabled={!escalationEnabled}
                className="font-mono text-xs bg-zinc-900/50 border-zinc-800"
              />
              <p className="text-[11px] text-muted-foreground">
                We will normalize to digits for the wa.me link.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Support Email
              </label>
              <Input
                value={escalationEmail}
                onChange={(e) => setEscalationEmail(e.target.value)}
                placeholder="support@company.com"
                disabled={!escalationEnabled}
                className="font-mono text-xs bg-zinc-900/50 border-zinc-800"
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Injected Markdown Preview
            </p>
            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-xs text-zinc-200 leading-relaxed space-y-1">
              <div>### Contact Support</div>
              <div>[Chat WhatsApp]({whatsappLink})</div>
              <div>[Email Us]({emailLink})</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              These links are injected into the system prompt automatically.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-800 flex-shrink-0">
            <Button
              onClick={handleSaveEscalation}
              disabled={!hasEscalationChanges || isEscalationSaving}
              className={`flex-1 text-xs ${
                !hasEscalationChanges || isEscalationSaving
                  ? "bg-zinc-800 text-muted-foreground cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isEscalationSaving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3 w-3" />
                  Save
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground flex-shrink-0">
            {hasEscalationChanges
              ? "Changes detected. Click Save to update escalation settings."
              : "No unsaved changes. Update the fields above to make changes."}
          </p>
        </div>
      </div>
    );
  }

  // ===== MODEL MODE =====
  if (mode === "model") {
    const meta = MODEL_CONFIG[tempModelId];
    const providerLabel = meta?.provider || "Provider";

    return (
      <div className="flex h-full w-full flex-col border-l bg-muted/10">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Bot Model Configuration</h3>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-900/20 border border-red-700 p-3 text-xs text-red-400">
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-4 rounded-lg bg-green-900/20 border border-green-700 p-3 text-xs text-green-400">
            <p>{successMessage}</p>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Select Model
            </label>
            <Select
              value={tempModelId}
              onValueChange={(value) => {
                setTempModelId(value as ModelId);
                setTempApiKey("");
                setShowApiKey(false);
              }}
            >
              <SelectTrigger className="w-full bg-zinc-900/50 border-zinc-800 text-zinc-100">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" />
                {providerLabel} API Key
              </label>
              {meta?.link && (
                <a
                  href={meta.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 uppercase tracking-wider underline underline-offset-4 hover:text-blue-300"
                >
                  get api key
                </a>
              )}
            </div>

            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={meta?.placeholder || "Enter your API key"}
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="pr-10 font-mono text-xs bg-zinc-900/50 border-zinc-800"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-zinc-800/50"
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              API keys are stored in plaintext on the backend for immediate
              model access.
            </p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-800 flex-shrink-0">
            <Button
              onClick={handleSaveModelConfig}
              disabled={isModelSaving || !tempApiKey.trim()}
              className={`flex-1 text-xs ${
                isModelSaving || !tempApiKey.trim()
                  ? "bg-zinc-800 text-muted-foreground cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isModelSaving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3 w-3" />
                  Save
                </>
              )}
            </Button>

            <Button
              onClick={handleDeleteModelConfig}
              disabled={isModelDeleting || isModelSaving}
              variant="destructive"
              size="sm"
              className="text-xs"
            >
              {isModelDeleting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-3 w-3" />
              )}
              Delete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== KNOWLEDGE BASE LIST MODE =====
  if (mode === "knowledge-base-list") {
    return (
      <div className="flex h-full w-full flex-col border-l bg-muted/10">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Knowledge Base</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Select a knowledge source on the left to edit.
          </p>
        </div>
      </div>
    );
  }

  // ===== KNOWLEDGE BASE MODE =====
  if (mode === "knowledge-base") {
    if (!allDocuments) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      );
    }

    return (
      <div className="flex h-full w-full flex-col border-l bg-muted/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">Knowledge Base Editor</h3>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-900/20 border border-red-700 p-3 text-xs text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-4 mt-4 rounded-lg bg-green-900/20 border border-green-700 p-3 text-xs text-green-400">
            <p>{successMessage}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          {/* Text Editor */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <label className="text-xs font-medium text-muted-foreground">
              Document Content
              {hasKBChanges && (
                <span className="ml-2 inline-block text-yellow-500">
                  • Unsaved changes
                </span>
              )}
            </label>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SmartEditor
                value={currentText}
                onChange={(value) => setCurrentText(value)}
                placeholder="Document content... (Click to edit)"
                minRows={15}
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800 flex-shrink-0">
            <Button
              onClick={handleSaveKnowledgeBase}
              disabled={!hasKBChanges || isSaving || isDeleting}
              className={`flex-1 text-xs ${
                !hasKBChanges || isSaving || isDeleting
                  ? "bg-zinc-800 text-muted-foreground cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3 w-3" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              onClick={handleDeleteKnowledgeBase}
              disabled={isDeleting || isSaving}
              variant="destructive"
              size="sm"
              className="text-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </>
              )}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-[11px] text-muted-foreground flex-shrink-0">
            {hasKBChanges
              ? "Changes detected. Click Save to update the document and regenerate embeddings."
              : "No unsaved changes. Edit the content above to make changes."}
          </p>
        </div>
      </div>
    );
  }

  // ===== PROMPT MODE =====
  if (mode === "prompt") {
    return (
      <div className="flex h-full w-full flex-col border-l bg-muted/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-semibold">System Instructions Editor</h3>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-900/20 border border-red-700 p-3 text-xs text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-4 mt-4 rounded-lg bg-green-900/20 border border-green-700 p-3 text-xs text-green-400">
            <p>{successMessage}</p>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          {/* Text Editor */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <label className="text-xs font-medium text-muted-foreground">
              System Instructions
              {hasPromptChanges && (
                <span className="ml-2 inline-block text-yellow-500">
                  • Unsaved changes
                </span>
              )}
            </label>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <SmartEditor
                value={currentPrompt}
                onChange={(value) => setCurrentPrompt(value)}
                placeholder="Define system instructions... (Click to edit)"
                minRows={15}
                className="min-h-[400px]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800 flex-shrink-0 flex-wrap">
            <Button
              onClick={handleSavePrompt}
              disabled={!hasPromptChanges || isPromptSaving}
              className={`flex-1 text-xs min-w-[100px] ${
                !hasPromptChanges || isPromptSaving
                  ? "bg-zinc-800 text-muted-foreground cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isPromptSaving ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-3 w-3" />
                  Save
                </>
              )}
            </Button>

            <Button
              onClick={handleUseDefaultPrompt}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Use Default
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-[11px] text-muted-foreground flex-shrink-0">
            {hasPromptChanges
              ? "Changes detected. Click Save to update system instructions."
              : "No unsaved changes. Edit the instructions above to make changes."}
          </p>
        </div>
      </div>
    );
  }

  // ===== EMPTY MODE =====
  return (
    <div className="flex h-full w-full flex-col border-l bg-muted/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-sm font-semibold">Inspector</h3>
      </div>

      {/* Empty State */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Select an item to inspect and edit.
        </p>
      </div>
    </div>
  );
}
