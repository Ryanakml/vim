"use client";

import { useMemo, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Edit2, Search, Trash2 } from "lucide-react";
import type { Doc, Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  calculateDocStats,
  extractTitleFromContent,
  formatKBPreview,
} from "@/lib/kb-utils";

interface KBDocumentListProps {
  documents: Doc<"documents">[];
  selectedId?: string | null;
  onSelect?: (doc: Doc<"documents">) => void;
  onDelete?: (id: Id<"documents">) => Promise<void>;
  onEdit?: (doc: Doc<"documents">) => void;
}

export function KBDocumentList({
  documents,
  selectedId,
  onSelect,
  onDelete,
  onEdit,
}: KBDocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) => {
      const title = extractTitleFromContent(doc.text).toLowerCase();
      return title.includes(query) || doc.text.toLowerCase().includes(query);
    });
  }, [documents, searchQuery]);

  const handleDelete = async (id: Id<"documents">) => {
    if (!onDelete) return;
    setDeletingId(String(id));
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-8"
        />
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                No documents found
              </p>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {filteredDocs.map((doc) => {
            const stats = calculateDocStats(doc.text);
            const isSelected = selectedId
              ? String(doc._id) === selectedId
              : false;
            const sourceType = doc.source_type ?? "inline";
            const sourceMetadata = doc.source_metadata;
            const pageCount = sourceMetadata?.total_pages;
            const chunkTotal = sourceMetadata?.chunk_total;
            const chunkIndex = sourceMetadata?.chunk_index;
            const resolvedChunkTotal =
              typeof chunkTotal === "number"
                ? chunkTotal
                : sourceType === "inline"
                  ? 1
                  : undefined;
            const resolvedChunkIndex =
              typeof chunkIndex === "number"
                ? chunkIndex
                : typeof resolvedChunkTotal === "number"
                  ? 0
                  : undefined;
            const sourceLabel =
              sourceType === "pdf"
                ? "PDF"
                : sourceType === "website"
                  ? "Website"
                  : sourceType === "notion"
                    ? "Notion"
                    : "Inline";
            const sourceBadgeClass =
              sourceType === "pdf"
                ? "border-red-500/30 text-red-300 bg-red-500/10"
                : sourceType === "website"
                  ? "border-blue-500/30 text-blue-300 bg-blue-500/10"
                  : sourceType === "notion"
                    ? "border-zinc-600 text-zinc-300 bg-zinc-800/40"
                    : "border-pink-500/30 text-pink-300 bg-pink-500/10";

            return (
              <Card
                key={String(doc._id)}
                className={`cursor-pointer transition-all ${
                  isSelected ? "border-blue-600 bg-blue-900/10" : ""
                }`}
                onClick={() => onSelect?.(doc)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-sm line-clamp-1">
                        {extractTitleFromContent(doc.text)}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2 mt-1">
                        {formatKBPreview(doc.text, 120)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit?.(doc);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(doc._id);
                        }}
                        disabled={deletingId === String(doc._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${sourceBadgeClass}`}
                    >
                      {sourceLabel}
                    </Badge>
                    {typeof pageCount === "number" && (
                      <Badge variant="outline" className="text-[11px]">
                        {pageCount} pages
                      </Badge>
                    )}
                    {typeof resolvedChunkTotal === "number" && (
                      <Badge variant="outline" className="text-[11px]">
                        {typeof resolvedChunkIndex === "number"
                          ? `Chunk ${resolvedChunkIndex + 1}/${resolvedChunkTotal}`
                          : `${resolvedChunkTotal} chunks`}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[11px]">
                      {stats.wordCount} words
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {new Date(doc._creationTime).toLocaleDateString()}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {stats.estimatedReadTimeSeconds}s read
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
