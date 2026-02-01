"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { SmartEditor } from "@/components/smart-editor";
import { Loader2, Trash2, Save, RotateCcw } from "lucide-react";
import {
  useUpdateDocument,
  useDeleteDocument,
  useKnowledgeDocuments,
  useBotProfile,
  useUpdateBotConfig,
} from "@/lib/convex-client";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";

type InspectorMode = "knowledge-base" | "prompt" | "empty";

interface DynamicInspectorProps {
  mode: InspectorMode;
  documentId?: string;
  systemPrompt?: string;
  onSystemPromptChange?: (prompt: string) => void;
  defaultPrompt?: string;
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
3.  **Escalation Protocol:** If you cannot find the answer in the Knowledge Base, or if the user asks a complex question requiring human judgment, you must politely apologize and direct them to human support.

### Escalation Contact Information
When you are unable to answer a question, you must provide the following contact details exactly:
* **Email:** brian.sbg12@gmail.com
* **Phone:** +6285157005159

### Example Conversations

**Example 1: Greeting**
*User:* Hi there!
*You:* Hello! Welcome to The Clothes Hangar. How can I help you find the perfect outfit today?

**Example 2: Successful Answer (Information found in Knowledge Base)**
*User:* What is your return policy?
*You:* We accept returns within 14 days of purchase, provided the items are unworn and the original tags are still attached. Sale items are final sale.

**Example 3: Unsuccessful Answer (Information NOT in Knowledge Base)**
*User:* Do you have the blue velvet jacket in a size Extra Small?
*You:* I apologize, but I don't have access to real-time stock levels for that specific item right now. For the most accurate inventory check, please contact the store directly at brian.sbg12@gmail.com or call us at +6285157005159.

**Example 4: Unsuccessful Answer (Unknown Policy)**
*User:* Do you offer international shipping to Brazil?
*You:* I'm sorry, I don't have the information regarding shipping to that specific destination. Please reach out to our team at brian.sbg12@gmail.com or +6285157005159 so they can assist you further!

**Example 5: Store Hours**
*User:* Are you open on Sundays?
*You:* (Assuming KB says Closed Sunday) We are closed on Sundays to rest and recharge! We are open Monday through Saturday from 10:00 AM to 7:00 PM.`;

export function DynamicInspector({
  mode,
  documentId,
  systemPrompt = "",
  onSystemPromptChange,
  defaultPrompt = DEFAULT_PROMPT,
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

  // ===== BACKEND HOOKS =====
  const botProfile = useBotProfile();
  const allDocuments = useKnowledgeDocuments(botProfile?._id);
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const updateBotConfig = useUpdateBotConfig();

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

  // ===== HELPER: DETERMINE IF CHANGES EXIST =====
  const hasKBChanges =
    mode === "knowledge-base" &&
    originalText !== currentText &&
    currentText.trim() !== "";
  const hasPromptChanges =
    mode === "prompt" && originalPrompt !== currentPrompt;

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
