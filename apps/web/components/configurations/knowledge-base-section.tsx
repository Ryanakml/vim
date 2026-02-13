"use client";

import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  FileText,
  Globe,
  Type,
  Plus,
  ArrowLeft,
  LucideIcon,
} from "lucide-react";
import {
  useAddKnowledgeWithMetadata,
  useBotProfile,
  useDeleteDocument,
  useKnowledgeDocuments,
} from "@/lib/convex-client";
import type { Doc } from "@workspace/backend/convex/_generated/dataModel";
import { KB_LIMITS, calculateDocStats, validateKBEntry } from "@/lib/kb-utils";
import { KBDocumentList } from "@/components/configurations/kb-document-list";
import { PdfUploadHandler } from "@/components/configurations/pdf-upload-handler";
import { WebsiteScraperHandler } from "@/components/configurations/website-scraper-handler";

// --- 1. CONFIGURATION (PUSAT KONTROL TAMPILAN) ---

type SourceId = "document" | "inline" | "website" | "notion";

interface SourceOption {
  id: SourceId;
  label: string; // Teks Badge
  title: string; // Judul Modal
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
  style: {
    iconColor: string;
    iconBg: string;
    // New: Kontrol Background Card pas Hover
    cardHoverBg: string;
    cardHoverBorder: string;
    // New: Styling khusus untuk Badge Label
    badgeBg: string;
    badgeColor: string;
  };
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: "document",
    label: "PDF",
    title: "Upload PDFs",
    description: "Upload PDF files",
    icon: FileText,
    style: {
      iconColor: "text-red-500",
      iconBg: "bg-red-500/10",
      cardHoverBg: "hover:bg-red-500/5", // Background card jadi merah tipis pas hover
      cardHoverBorder: "hover:border-red-500/20",
      badgeBg: "bg-red-500/10",
      badgeColor: "text-red-500",
    },
  },
  {
    id: "inline",
    label: "Inline Text",
    title: "Add Inline Text",
    description: "Create snippets directly",
    icon: Type,
    style: {
      iconColor: "text-pink-500",
      iconBg: "bg-pink-500/10",
      cardHoverBg: "hover:bg-pink-500/5",
      cardHoverBorder: "hover:border-pink-500/20",
      badgeBg: "bg-pink-500/10",
      badgeColor: "text-pink-500",
    },
  },
  {
    id: "website",
    label: "Website",
    title: "Sync Website",
    description: "Sync content from a URL",
    icon: Globe,
    style: {
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      cardHoverBg: "hover:bg-blue-500/5",
      cardHoverBorder: "hover:border-blue-500/20",
      badgeBg: "bg-blue-500/10",
      badgeColor: "text-blue-500",
    },
  },
  {
    id: "notion",
    label: "Notion",
    title: "Sync Notion",
    description: "Coming Soon",
    icon: FileText,
    disabled: true,
    style: {
      iconColor: "text-zinc-500",
      iconBg: "bg-zinc-500/10",
      cardHoverBg: "",
      cardHoverBorder: "",
      badgeBg: "bg-zinc-500/10",
      badgeColor: "text-zinc-500",
    },
  },
];

export function KnowledgeBaseSection({
  onDocumentSelect,
  selectedDocumentId,
  isSelected,
  onSelectSection,
}: {
  onDocumentSelect?: (doc: Doc<"documents">) => void;
  selectedDocumentId?: string | null;
  isSelected?: boolean;
  onSelectSection?: () => void;
} = {}) {
  const [open, setOpen] = useState(false);
  const [currentView, setCurrentView] = useState<SourceId | "selection">(
    "selection",
  );
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineContent, setInlineContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const botProfile = useBotProfile();
  const knowledgeDocuments = useKnowledgeDocuments(botProfile?._id);
  const addKnowledgeWithMetadata = useAddKnowledgeWithMetadata();
  const deleteDocument = useDeleteDocument();

  const kbDocuments = useMemo<Doc<"documents">[]>(() => {
    if (!knowledgeDocuments || !botProfile) return [];

    return knowledgeDocuments.map(
      (doc: any) =>
        ({
          _id: doc.id,
          _creationTime: doc.createdAt ?? Date.now(),
          botId: botProfile._id,
          text: doc.text || "",
          embedding: [],
          user_id: botProfile.user_id,
          source_type: doc.source_type,
          source_metadata: doc.source_metadata,
        }) as Doc<"documents">,
    );
  }, [knowledgeDocuments, botProfile]);

  const kbStats = useMemo(() => {
    if (kbDocuments.length === 0) {
      return { totalDocs: 0, totalWords: 0, avgWords: 0 };
    }

    const totalWords = kbDocuments.reduce(
      (sum: number, doc: Doc<"documents">) => {
        return sum + calculateDocStats(doc.text).wordCount;
      },
      0,
    );

    return {
      totalDocs: kbDocuments.length,
      totalWords,
      avgWords: Math.round(totalWords / kbDocuments.length),
    };
  }, [kbDocuments]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setTimeout(() => setCurrentView("selection"), 300);
      setErrorMessage(null);
    }
  };

  const resetErrors = () => {
    setErrorMessage(null);
  };

  const handleAddInline = async () => {
    if (!botProfile?._id) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    if (!inlineValidation.valid || inlineLimitReached) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await addKnowledgeWithMetadata({
        botId: botProfile._id,
        text: inlinePayloadText,
        source_type: "inline",
      });

      setInlineTitle("");
      setInlineContent("");
      setOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add snippet",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSource = SOURCE_OPTIONS.find((s) => s.id === currentView);
  const hasDocuments = kbDocuments.length > 0;
  const inlinePayloadText = inlineTitle.trim()
    ? `# ${inlineTitle.trim()}\n\n${inlineContent.trim()}`
    : inlineContent.trim();
  const inlineValidation = useMemo(
    () => validateKBEntry(inlinePayloadText, inlineTitle.trim(), kbDocuments),
    [inlinePayloadText, inlineTitle, kbDocuments],
  );
  const inlineLimitReached =
    kbDocuments.length >= KB_LIMITS.MAX_DOCUMENTS_PER_BOT;
  const inlineErrorText = [
    ...inlineValidation.errors,
    ...(inlineLimitReached ? ["Knowledge base document limit reached."] : []),
  ].join(" ");
  const inlineWarningText = inlineValidation.warnings.join(" ");
  const inlineCharCount = inlineContent.length;
  const inlineCharRatio = inlineCharCount / KB_LIMITS.MAX_TEXT_LENGTH;
  const inlineCountClass =
    inlineCharRatio > 1
      ? "text-red-400"
      : inlineCharRatio > 0.8
        ? "text-yellow-400"
        : "text-muted-foreground";

  const handleDeleteDocument = async (documentId: Doc<"documents">["_id"]) => {
    resetErrors();
    try {
      await deleteDocument({ documentId });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete document",
      );
    }
  };

  return (
    <section
      data-config-selectable="true"
      onClick={() => onSelectSection?.()}
      className={`rounded-xl border bg-card shadow-sm overflow-hidden transition-all ${
        isSelected
          ? "border-blue-600 bg-blue-900/10"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b bg-muted/40 p-6 pb-4">
        <div>
          <h2 className="text-base font-semibold">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your agents knowledge sources.
          </p>
        </div>
        {hasDocuments && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Source
          </Button>
        )}
      </div>

      {/* Content List */}
      <div className="p-6">
        {!hasDocuments ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center bg-muted/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              No knowledge sources yet
            </h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Add documents, text snippets, or websites to train your agent.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Knowledge Source
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs text-muted-foreground">Total documents</p>
                <p className="text-lg font-semibold text-zinc-100">
                  {kbStats.totalDocs}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs text-muted-foreground">Total words</p>
                <p className="text-lg font-semibold text-zinc-100">
                  {kbStats.totalWords}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs text-muted-foreground">Average words</p>
                <p className="text-lg font-semibold text-zinc-100">
                  {kbStats.avgWords}
                </p>
              </div>
            </div>

            <KBDocumentList
              documents={kbDocuments}
              selectedId={selectedDocumentId}
              onSelect={onDocumentSelect}
              onEdit={onDocumentSelect}
              onDelete={handleDeleteDocument}
            />
          </div>
        )}
      </div>

      {/* --- MODAL --- */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0 bg-[#18181b] border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#18181b]">
            <div className="flex items-center gap-3">
              {currentView !== "selection" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 h-8 w-8 hover:bg-zinc-800 text-zinc-400"
                  onClick={() => setCurrentView("selection")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle className="text-lg font-medium text-zinc-100">
                {currentView === "selection"
                  ? "Add Knowledge Source"
                  : activeSource?.title}
              </DialogTitle>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-8 min-h-[400px] bg-[#18181b]">
            {/* VIEW 1: SELECTION */}
            {currentView === "selection" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-zinc-200 mb-4">
                    Import Content
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SOURCE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() =>
                          !option.disabled && setCurrentView(option.id)
                        }
                        disabled={option.disabled}
                        className={`
                               group flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition-all
                               ${
                                 option.disabled
                                   ? "opacity-50 cursor-not-allowed border-dashed"
                                   : `hover:bg-zinc-800 ${option.style.cardHoverBg} ${option.style.cardHoverBorder}`
                               }
                             `}
                      >
                        {/* Icon Container */}
                        <div
                          className={`
                                rounded-lg p-3 shrink-0 transition-colors
                                ${option.style.iconColor} 
                                ${option.style.iconBg}
                              `}
                        >
                          <option.icon className="h-6 w-6" />
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col gap-1">
                          {/* Label Badge */}
                          <div className="flex">
                            <span
                              className={`
                                       text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded
                                       ${option.style.badgeBg} ${option.style.badgeColor}
                                    `}
                            >
                              {option.label}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 leading-snug">
                            {option.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: DOCUMENT UPLOAD */}
            {currentView === "document" && (
              <PdfUploadHandler
                botId={botProfile?._id}
                onCancel={() => setOpen(false)}
                onComplete={() => setOpen(false)}
              />
            )}

            {/* VIEW 3: INLINE TEXT */}
            {currentView === "inline" && (
              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Title
                  </label>
                  <Input
                    placeholder="e.g. Return Policy 2024"
                    className="bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100 placeholder:text-zinc-600"
                    value={inlineTitle}
                    onChange={(event) => setInlineTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Content
                  </label>
                  <Textarea
                    placeholder="Enter your text content here..."
                    className="max-h-[400px] min-h-[200px] bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100 font-mono text-sm leading-relaxed placeholder:text-zinc-600 resize-none p-4 overflow-y-auto"
                    value={inlineContent}
                    onChange={(event) => {
                      setInlineContent(event.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Limit {KB_LIMITS.MAX_TEXT_LENGTH} characters
                    </span>
                    <span className={inlineCountClass}>
                      {inlineCharCount} / {KB_LIMITS.MAX_TEXT_LENGTH}
                    </span>
                  </div>
                </div>
                {inlineErrorText && (
                  <p className="text-sm text-red-400">{inlineErrorText}</p>
                )}
                {!inlineErrorText && inlineWarningText && (
                  <p className="text-sm text-yellow-400">{inlineWarningText}</p>
                )}
                {errorMessage && !inlineErrorText && (
                  <p className="text-sm text-red-400">{errorMessage}</p>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    Cancel
                  </Button>
                  {/* Button Standar (Primary) */}
                  <Button
                    onClick={handleAddInline}
                    disabled={
                      isSubmitting ||
                      !botProfile?._id ||
                      !inlineValidation.valid ||
                      inlineLimitReached
                    }
                  >
                    {isSubmitting ? "Saving..." : "Add Snippet"}
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 4: WEBSITE */}
            {currentView === "website" && (
              <WebsiteScraperHandler
                botId={botProfile?._id}
                onCancel={() => setOpen(false)}
                onComplete={() => setOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
