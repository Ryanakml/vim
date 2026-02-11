"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { useKBStats, useKnowledgeDocuments } from "@/lib/convex-client";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { extractTitleFromContent } from "@/lib/kb-utils";

interface KBAnalyticsProps {
  botId?: Id<"botProfiles"> | "skip";
  days?: number;
}

type KBStats = {
  totalDocuments: number;
  documentsUsedLastPeriod: number;
  totalRetrievals: number;
  hitRate: number;
  topDocuments: {
    documentId: string;
    count: number;
    lastUsedAt: number;
  }[];
  unusedDocumentIds: string[];
  windowDays: number;
};

export function KBAnalytics({ botId, days = 7 }: KBAnalyticsProps) {
  const stats = useKBStats(botId, days) as KBStats | undefined;
  const documents = useKnowledgeDocuments(botId);

  const docTitleMap = useMemo(() => {
    if (!documents) return new Map<string, string>();
    return new Map(
      documents.map((doc) => [
        String(doc.id),
        extractTitleFromContent(doc.text || "Untitled"),
      ]),
    );
  }, [documents]);

  if (!botId || botId === "skip") {
    return null;
  }

  if (!stats || !documents) {
    return (
      <Card className="border-zinc-800 bg-card">
        <CardHeader>
          <CardTitle className="text-base">Knowledge Base Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-card">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Knowledge Base Analytics</CardTitle>
          <Badge variant="outline" className="text-[11px]">
            Last {stats.windowDays} days
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Track how often your knowledge base appears in answers.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Total docs</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.totalDocuments}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Docs used</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.documentsUsedLastPeriod}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Hit rate</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.hitRate}%
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Retrievals</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.totalRetrievals}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-2">
              Most used documents
            </p>
            {stats.topDocuments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No document retrievals yet.
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-muted-foreground">
                {stats.topDocuments.map((doc) => (
                  <li key={doc.documentId} className="flex justify-between">
                    <span className="text-zinc-200">
                      {docTitleMap.get(doc.documentId) || "Untitled document"}
                    </span>
                    <span>{doc.count} uses</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-2">
              Never used documents
            </p>
            {stats.unusedDocumentIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                All documents were retrieved recently.
              </p>
            ) : (
              <ul className="space-y-2 text-xs text-muted-foreground">
                {stats.unusedDocumentIds.slice(0, 5).map((id) => (
                  <li key={id}>{docTitleMap.get(id) || "Untitled document"}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
