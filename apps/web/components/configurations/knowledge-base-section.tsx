"use client";

import { useRef, useState, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@workspace/backend/convex/_generated/api";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Markdown } from "@/components/markdown";
import {
  FileText,
  Globe,
  Type,
  UploadCloud,
  Plus,
  ArrowLeft,
  LucideIcon,
} from "lucide-react";
import { useBotProfile, useKnowledgeDocuments } from "@/lib/convex-client";
import type { Doc } from "@workspace/backend/convex/_generated/dataModel";

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
    label: "Document",
    title: "Upload Documents",
    description: "Upload PDF, DOCX, TXT files",
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
  const [documents, setDocuments] = useState<
    {
      id: string;
      title: string;
      text: string;
      source: SourceId;
      fullDoc?: Doc<"documents">;
    }[]
  >([]);
  const [inlineTitle, setInlineTitle] = useState("");
  const [inlineContent, setInlineContent] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const botProfile = useBotProfile();
  const knowledgeDocuments = useKnowledgeDocuments(botProfile?._id);
  const addKnowledge = useAction(api.knowledge.addKnowledge);

  // Load existing documents from database
  useEffect(() => {
    if (knowledgeDocuments && botProfile) {
      const botId = botProfile._id;
      const loadedDocs = knowledgeDocuments.map((doc: any) => {
        const text = doc.text || "";
        const docObj: Doc<"documents"> = {
          _id: doc.id,
          _creationTime: doc.createdAt,
          botId: botId,
          text: text,
          embedding: [],
        };
        return {
          id: String(doc.id),
          title: text.split("\n")[0].replace(/^# /, "") || "Document",
          text: text,
          source: "inline" as SourceId,
          fullDoc: docObj,
        };
      });
      setDocuments(loadedDocs);
    }
  }, [knowledgeDocuments, botProfile]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) setTimeout(() => setCurrentView("selection"), 300);
  };

  const resetErrors = () => setErrorMessage(null);

  const handleFilesPicked = (files: FileList | null) => {
    if (!files) return;
    setUploadFiles(Array.from(files));
    resetErrors();
  };

  const readTextFile = async (file: File) => {
    const isText =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md");
    if (!isText) {
      throw new Error(
        `Unsupported file type for ${file.name}. Please upload .txt or .md files for now.`,
      );
    }

    return await file.text();
  };

  const handleAddInline = async () => {
    if (!botProfile?._id) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    const content = inlineContent.trim();
    if (!content) {
      setErrorMessage("Please enter content for the snippet.");
      return;
    }

    resetErrors();
    setIsSubmitting(true);
    try {
      const payloadText = inlineTitle.trim()
        ? `# ${inlineTitle.trim()}\n\n${content}`
        : content;
      const result = await addKnowledge({
        botId: botProfile._id,
        text: payloadText,
      });

      setDocuments((prev) => [
        ...prev,
        {
          id: String(result.id),
          title: inlineTitle.trim() || "Inline Snippet",
          text: payloadText,
          source: "inline",
          fullDoc: {
            _id: result.id,
            botId: botProfile._id,
            text: payloadText,
            embedding: [],
            _creationTime: Date.now(),
          } as Doc<"documents">,
        },
      ]);

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

  const handleAddWebsite = async () => {
    if (!botProfile?._id) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    const url = websiteUrl.trim();
    if (!url) {
      setErrorMessage("Please enter a valid website URL.");
      return;
    }

    resetErrors();
    setIsSubmitting(true);
    try {
      const payloadText = `Website source: ${url}`;
      const result = await addKnowledge({
        botId: botProfile._id,
        text: payloadText,
      });

      setDocuments((prev) => [
        ...prev,
        {
          id: String(result.id),
          title: url,
          text: payloadText,
          source: "website",
          fullDoc: {
            _id: result.id,
            botId: botProfile._id,
            text: payloadText,
            embedding: [],
            _creationTime: Date.now(),
          } as Doc<"documents">,
        },
      ]);

      setWebsiteUrl("");
      setOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add website",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!botProfile?._id) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    if (uploadFiles.length === 0) {
      setErrorMessage("Please select at least one text file to upload.");
      return;
    }

    resetErrors();
    setIsSubmitting(true);
    try {
      for (const file of uploadFiles) {
        const text = await readTextFile(file);
        const payloadText = `# ${file.name}\n\n${text}`.trim();
        const result = await addKnowledge({
          botId: botProfile._id,
          text: payloadText,
        });

        setDocuments((prev) => [
          ...prev,
          {
            id: String(result.id),
            title: file.name,
            text: payloadText,
            source: "document",
            fullDoc: {
              _id: result.id,
              botId: botProfile._id,
              text: payloadText,
              embedding: [],
              _creationTime: Date.now(),
            } as Doc<"documents">,
          },
        ]);
      }

      setUploadFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload documents",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSource = SOURCE_OPTIONS.find((s) => s.id === currentView);

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
        {documents.length > 0 && (
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
        {documents.length === 0 ? (
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
          <div className="space-y-3">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDocumentSelect && doc.fullDoc) {
                    onDocumentSelect(doc.fullDoc);
                  }
                }}
                className={`w-full text-left rounded-md border p-4 text-sm text-muted-foreground transition-colors cursor-pointer ${
                  selectedDocumentId && selectedDocumentId === doc.id
                    ? "border-blue-600 bg-blue-900/10"
                    : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700"
                }`}
              >
                <div className="font-medium text-foreground mb-1">
                  {doc.title}
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  <Markdown content={doc.text} className="text-xs" />
                </div>
              </button>
            ))}
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
              <div className="flex flex-col h-full justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,text/plain,text/markdown"
                  multiple
                  onChange={(event) => handleFilesPicked(event.target.files)}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600 transition-colors cursor-pointer p-12"
                >
                  <div className="bg-zinc-800 p-4 rounded-full mb-4">
                    <UploadCloud className="h-8 w-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-medium text-zinc-200">
                    Click to upload or drag and drop
                  </h3>
                  <p className="text-sm text-zinc-500 mt-2">
                    TXT, MD (Max 10MB)
                  </p>
                  {uploadFiles.length > 0 && (
                    <div className="mt-4 text-xs text-zinc-400">
                      {uploadFiles.map((file) => file.name).join(", ")}
                    </div>
                  )}
                </div>
                {errorMessage && (
                  <p className="text-sm text-red-400 mt-4">{errorMessage}</p>
                )}
                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    Cancel
                  </Button>
                  {/* Button Standar (Primary) */}
                  <Button
                    onClick={handleUploadDocuments}
                    disabled={isSubmitting || !botProfile?._id}
                  >
                    {isSubmitting ? "Uploading..." : "Upload Documents"}
                  </Button>
                </div>
              </div>
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
                    onChange={(event) => setInlineContent(event.target.value)}
                  />
                </div>
                {errorMessage && (
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
                    disabled={isSubmitting || !botProfile?._id}
                  >
                    {isSubmitting ? "Saving..." : "Add Snippet"}
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 4: WEBSITE */}
            {currentView === "website" && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col md:flex-row gap-8 items-stretch h-full">
                  <div className="flex-1 space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-zinc-300">
                        Website Link
                      </label>
                      <p className="text-xs text-zinc-500">
                        We will crawl this URL to find answers.
                      </p>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <Input
                          placeholder="https://example.com/docs"
                          className="pl-9 bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100 placeholder:text-zinc-600"
                          value={websiteUrl}
                          onChange={(event) =>
                            setWebsiteUrl(event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {/* Visual Skeleton (Sama kayak sebelumnya) */}
                  <div className="hidden md:flex w-[300px] bg-zinc-900 border border-zinc-800 rounded-xl items-center justify-center p-6">
                    <div className="w-full aspect-[4/3] bg-zinc-800/50 rounded-lg p-3 space-y-3 border border-zinc-700/50">
                      <div className="flex gap-2 items-center border-b border-zinc-700/50 pb-2">
                        <div className="h-2 w-2 rounded-full bg-red-500/50"></div>
                        <div className="h-2 w-2 rounded-full bg-yellow-500/50"></div>
                        <div className="h-2 w-2 rounded-full bg-green-500/50"></div>
                      </div>
                      <div className="flex gap-3 h-full">
                        <div className="w-1/3 h-24 bg-zinc-700/30 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-3/4 bg-zinc-700/50 rounded"></div>
                          <div className="h-2 w-1/2 bg-zinc-700/50 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {errorMessage && (
                  <p className="text-sm text-red-400 mt-4">{errorMessage}</p>
                )}
                <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-zinc-800">
                  <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    Cancel
                  </Button>
                  {/* Button Standar (Primary) */}
                  <Button
                    onClick={handleAddWebsite}
                    disabled={isSubmitting || !botProfile?._id}
                  >
                    {isSubmitting ? "Saving..." : "Discover Pages"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
