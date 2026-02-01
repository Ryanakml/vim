"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, Trash2, Save } from "lucide-react";
import {
  useUpdateDocument,
  useDeleteDocument,
  useKnowledgeDocuments,
  useBotProfile,
} from "@/lib/convex-client";
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel";

interface DocumentInspectorProps {
  documentId: string;
}

export function DocumentInspector({ documentId }: DocumentInspectorProps) {
  // Fetch all documents and find the one we need
  const botProfile = useBotProfile();
  const allDocuments = useKnowledgeDocuments(botProfile?._id);

  // State for editing
  const [originalText, setOriginalText] = useState<string>("");
  const [currentText, setCurrentText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Backend mutations
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  // Find the document in the list and load it
  useEffect(() => {
    if (allDocuments && botProfile) {
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
  }, [allDocuments, documentId, botProfile]);

  // Check if there are unsaved changes
  const hasChanges = originalText !== currentText && currentText.trim() !== "";
  const isSaveDisabled = !hasChanges || isSaving || isDeleting;

  const handleSave = async () => {
    if (!hasChanges) return;

    const docId = documentId as Id<"documents">;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateDocument({
        documentId: docId,
        text: currentText,
      });

      // Update original text after successful save
      setOriginalText(currentText);
      setSuccessMessage("Document updated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update document",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
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
      // Clear selection after deletion
      setTimeout(() => {
        // Reset the selected document state
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

  // Show loading state while fetching documents
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
        <h3 className="text-sm font-semibold">Document Inspector</h3>
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
            {hasChanges && (
              <span className="ml-2 inline-block text-yellow-500">
                • Unsaved changes
              </span>
            )}
          </label>
          <Textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            className="flex-1 font-mono text-xs bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-600 focus-visible:border-blue-600 resize-none overflow-y-auto"
            placeholder="Document content..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-zinc-800 flex-shrink-0">
          <Button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={`flex-1 text-xs ${
              isSaveDisabled
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
            onClick={handleDelete}
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
          {hasChanges
            ? "Changes detected. Click Save to update the document and regenerate embeddings."
            : "No unsaved changes. Edit the content above to make changes."}
        </p>
      </div>
    </div>
  );
}
