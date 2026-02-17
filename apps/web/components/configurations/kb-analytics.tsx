"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useKBStats, useKnowledgeDocuments } from "@/lib/convex-client";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { extractTitleFromContent } from "@/lib/kb-utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Label,
} from "recharts";
import { ChevronRight, FileText, Globe, Type } from "lucide-react";

interface KBAnalyticsProps {
  botId?: Id<"botProfiles"> | "skip";
  days?: number;
  openDocumentEditor?: (docId: string) => void;
}

type KBStats = {
  totalDocuments: number;
  documentsUsedLastPeriod: number;
  totalRetrievals: number;
  hitRate: number;
  totalQueries: number;
  successfulRetrievalQueries: number;
  fallbackNoContextQueries: number;
  retrievalCoveragePercent: number;
  documentUsage?: {
    documentId: string;
    count: number;
    lastUsedAt: number;
  }[];
  topDocuments: {
    documentId: string;
    count: number;
    lastUsedAt: number;
  }[];
  unusedDocumentIds: string[];
  windowDays: number;
};

export function KBAnalytics({
  botId,
  days = 7,
  openDocumentEditor,
}: KBAnalyticsProps) {
  const stats = useKBStats(botId, days) as KBStats | undefined;
  const documents = useKnowledgeDocuments(botId);

  const docInfoMap = useMemo(() => {
    if (!documents) {
      return new Map<
        string,
        {
          title: string;
          sourceType?: string;
        }
      >();
    }

    return new Map(
      documents.map((doc: any) => [
        String(doc.id),
        {
          title: extractTitleFromContent(doc.text || "Untitled"),
          sourceType: doc.source_type,
        },
      ]),
    );
  }, [documents]);

  const retrievalCoveragePercent = Math.max(
    0,
    Math.min(100, stats?.retrievalCoveragePercent ?? 0),
  );
  const donutData = useMemo(
    () =>
      stats
        ? [
            {
              name: "Successful Retrievals",
              value: stats.successfulRetrievalQueries,
              fill: "var(--color-chart-2)",
            },
            {
              name: "Fallback/No Context",
              value: stats.fallbackNoContextQueries,
              fill: "var(--color-chart-3)",
            },
          ]
        : [],
    [stats],
  );

  const getSourceIcon = (sourceType?: string) => {
    if (sourceType === "website") return Globe;
    if (sourceType === "pdf") return FileText;
    return Type;
  };

  const documentRows = useMemo(() => {
    if (!stats) return [] as Array<{ documentId: string; count: number }>;

    // Prefer full usage list from backend.
    if (Array.isArray(stats.documentUsage) && stats.documentUsage.length > 0) {
      return stats.documentUsage.map((d) => ({
        documentId: d.documentId,
        count: d.count,
      }));
    }

    // Fallback for older backend: merge top docs + unused docs (count 0).
    const seen = new Set<string>();
    const combined: Array<{ documentId: string; count: number }> = [];
    for (const d of stats.topDocuments ?? []) {
      if (!d?.documentId) continue;
      const id = String(d.documentId);
      if (seen.has(id)) continue;
      seen.add(id);
      combined.push({ documentId: id, count: d.count ?? 0 });
    }
    for (const id of stats.unusedDocumentIds ?? []) {
      const docId = String(id);
      if (seen.has(docId)) continue;
      seen.add(docId);
      combined.push({ documentId: docId, count: 0 });
    }
    return combined;
  }, [stats]);

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-xl z-50">
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: payload[0].payload.fill }}
            />
            <span className="text-xs text-zinc-300">{payload[0].name}:</span>
            <span className="text-xs font-bold text-white">
              {payload[0].value}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Total docs</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.totalDocuments}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Total citations</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.totalRetrievals}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs text-muted-foreground">Queries</p>
            <p className="text-lg font-semibold text-zinc-100">
              {stats.totalQueries}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-2">
              Most used documents
            </p>
            {documentRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No document retrievals yet.
              </p>
            ) : (
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {documentRows.map((doc) => {
                  const info = docInfoMap.get(doc.documentId);
                  const title = info?.title || "Untitled document";
                  const Icon = getSourceIcon(info?.sourceType);

                  return (
                    <button
                      key={doc.documentId}
                      type="button"
                      onClick={() => openDocumentEditor?.(doc.documentId)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/50"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-zinc-300" />
                      <div className="min-w-0 flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate text-zinc-200">
                              {title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>
                            {title}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {doc.count}
                      </Badge>
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
            <p className="text-xs font-semibold text-zinc-200 mb-2">
              Retrieval coverage
            </p>

            {/* CONTAINER CHART: Dibuat Relative biar bisa tumpuk text di tengah */}
            <div className="relative h-[200px] w-full flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80} // Radius aman biar gak kepotong
                    paddingAngle={2}
                    stroke="var(--color-border)"
                    strokeWidth={1}
                    isAnimationActive={true}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  {/* Tooltip panggil component custom di atas */}
                  <RechartsTooltip content={<CustomTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>

              {/* TEXT TENGAH: Ini kuncinya. Div Absolute di atas chart. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-zinc-100">
                  {retrievalCoveragePercent}%
                </span>
              </div>
            </div>

            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--color-chart-2)" }}
                  />
                  Successful retrievals
                </span>
                <span className="tabular-nums">
                  {stats.successfulRetrievalQueries}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: "var(--color-chart-3)" }}
                  />
                  Fallback / no context
                </span>
                <span className="tabular-nums">
                  {stats.fallbackNoContextQueries}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
