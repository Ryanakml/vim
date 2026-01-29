"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronRight, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { useDashboardStats } from "@/lib/convex-client";

// --- 1. MOCK DATA ---

// A. Activity Data (Messages) - Default Main Chart
const ACTIVITY_DATA = [
  { time: "12 AM", messages: 2 },
  { time: "4 AM", messages: 0 },
  { time: "8 AM", messages: 5 },
  { time: "12 PM", messages: 35 },
  { time: "4 PM", messages: 20 },
  { time: "8 PM", messages: 45 },
  { time: "11 PM", messages: 10 },
];

// B. Performance Data (LLM Calls & Spend) - Swapped Main Chart
const PERFORMANCE_DATA = [
  { time: "12 AM", calls: 1, spend: 0.02 },
  { time: "4 AM", calls: 0, spend: 0.0 },
  { time: "8 AM", calls: 8, spend: 0.15 },
  { time: "12 PM", calls: 40, spend: 0.85 },
  { time: "4 PM", calls: 25, spend: 0.55 },
  { time: "8 PM", calls: 60, spend: 1.2 },
  { time: "11 PM", calls: 15, spend: 0.35 },
];

// C. Summary Stats
const KPI_STATS = {
  messages: { value: 117, trend: "+12% from yesterday" },
  users: { value: 42, trend: "+5% from yesterday" },
  activeConvs: { value: 8, trend: "Same as yesterday" },
};

const PERFORMANCE_METRICS = {
  aiSpend: 3.12,
  totalSpendLimit: 50.0,
  llmCalls: 149,
  llmErrors: 0,
};

const RECENT_CONVERSATIONS = [
  {
    id: "c1",
    userName: "Anonymous User",
    avatarColor: "bg-pink-600",
    lastMessage: "Pricing Inquiry...",
    timestamp: "9:27 PM",
  },
  {
    id: "c2",
    userName: "Anonymous User",
    avatarColor: "bg-purple-600",
    lastMessage: "Support Ticket #402",
    timestamp: "4:14 PM",
  },
  {
    id: "c3",
    userName: "Anonymous User",
    avatarColor: "bg-blue-600",
    lastMessage: "Integration Help",
    timestamp: "9:20 AM",
  },
  {
    id: "c4",
    userName: "Anonymous User",
    avatarColor: "bg-green-600",
    lastMessage: "Bug Report",
    timestamp: "8:35 AM",
  },
];

export default function OverviewPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  // STATE UTAMA: 'overview' vs 'performance'
  const [viewMode, setViewMode] = useState<"overview" | "performance">(
    "overview",
  );

  // Fetch real dashboard statistics
  const dashboardStats = useDashboardStats();

  // Loading state
  if (dashboardStats === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b] text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Use real data or fallback to empty
  const totalUsers = dashboardStats?.totalUsers ?? 0;
  const totalConversations = dashboardStats?.totalConversations ?? 0;
  const activeConversations = dashboardStats?.activeConversations ?? 0;
  const latestConversations = dashboardStats?.latestConversations ?? [];

  return (
    <div className="flex h-full w-full flex-col bg-[#09090b] text-zinc-100 p-8 space-y-8 overflow-y-auto transition-colors duration-500">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>

        {/* Time Range */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                timeRange === range
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {range === "24h"
                ? "Last 24 hours"
                : range === "7d"
                  ? "Last 7 days"
                  : "Last 30 days"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- LEFT COLUMN (BIG CHART) --- */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. KPI CARDS (Real Data) */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              title="Conversations"
              value={totalConversations}
              subtext={`${activeConversations} active`}
            />
            <KpiCard title="Users" value={totalUsers} subtext="Total users" />
            <KpiCard
              title="Active Conversations"
              value={activeConversations}
              subtext={`${((activeConversations / totalConversations) * 100 || 0).toFixed(0)}% of total`}
            />
          </div>

          {/* 2. DYNAMIC MAIN CHART */}
          <Card className="bg-[#09090b] border-zinc-800 text-zinc-100 shadow-sm min-h-[400px] transition-all duration-500">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {viewMode === "overview"
                  ? "Activity (Messages)"
                  : "Performance (LLM Usage)"}
              </CardTitle>
              {/* Indikator Mode */}
              <div
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-mono border",
                  viewMode === "overview"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/20",
                )}
              >
                {viewMode === "overview" ? "MESSAGES" : "TOKENS / CALLS"}
              </div>
            </CardHeader>
            <CardContent className="pl-0 pb-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      viewMode === "overview" ? ACTIVITY_DATA : PERFORMANCE_DATA
                    }
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {/* Gradient Blue (Activity) */}
                      <linearGradient
                        id="colorMessages"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      {/* Gradient Purple (Performance) */}
                      <linearGradient
                        id="colorCalls"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#a855f7"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#a855f7"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#27272a"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="time"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        borderColor: "#27272a",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={viewMode === "overview" ? "messages" : "calls"}
                      stroke={viewMode === "overview" ? "#3b82f6" : "#a855f7"}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={
                        viewMode === "overview"
                          ? "url(#colorMessages)"
                          : "url(#colorCalls)"
                      }
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN (Sidebar) --- */}
        <div className="flex flex-col gap-8">
          {/* 1. RECENT CONVERSATIONS (Real Data) */}
          <Card className="bg-[#09090b] border-zinc-800 text-zinc-100 shadow-sm flex-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800/50">
              <CardTitle className="text-sm font-medium text-zinc-200">
                Recent Conversations
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-zinc-500 cursor-pointer hover:text-white" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-800/50">
                {latestConversations.length > 0 ? (
                  latestConversations.map((conv) => (
                    <div
                      key={conv._id}
                      className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                      onClick={() =>
                        router.push("/dashboard/monitor/conversations")
                      }
                    >
                      <Avatar className="h-9 w-9 border border-zinc-800">
                        <AvatarFallback className="text-white text-xs font-semibold bg-blue-600">
                          {conv.user?.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm font-medium text-zinc-200 truncate">
                            {conv.user?.name || "Anonymous User"}
                          </span>
                          <span className="text-[10px] text-zinc-500 ml-2 shrink-0">
                            {conv.last_message_at
                              ? new Date(
                                  conv.last_message_at,
                                ).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">
                          {conv.topic || "No topic"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500">
                    <p className="text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-zinc-800/50">
                <Button
                  variant="ghost"
                  className="w-full text-xs text-zinc-500 hover:text-zinc-300 h-8"
                  onClick={() =>
                    router.push("/dashboard/monitor/conversations")
                  }
                >
                  View all conversations
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. SWITCHABLE CARD (Performance <-> Overview) */}
          <Card
            className={cn(
              "bg-[#09090b] border-zinc-800 text-zinc-100 shadow-sm cursor-pointer transition-all duration-300 hover:border-zinc-700 group",
              viewMode === "overview"
                ? "hover:shadow-blue-900/10"
                : "hover:shadow-purple-900/10",
            )}
            onClick={() =>
              setViewMode(viewMode === "overview" ? "performance" : "overview")
            }
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                {viewMode === "overview" ? "Performance" : "Overview"}
                {/* Icon Swap Visual Hint */}
                <ArrowRightLeft className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-zinc-500 transition-transform duration-300",
                  viewMode === "performance" ? "rotate-180" : "",
                )}
              />
            </CardHeader>

            <CardContent className="space-y-6 pt-4">
              {/* KONTEN JIKA MODE 'OVERVIEW' (Card Menampilkan Performance) */}
              {viewMode === "overview" ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">AI Spend</span>
                      <span className="text-zinc-200 font-mono">
                        ${PERFORMANCE_METRICS.aiSpend.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: "6%" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">LLM Calls</span>
                      <span className="text-zinc-200 font-mono">
                        {PERFORMANCE_METRICS.llmCalls}
                      </span>
                    </div>
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={PERFORMANCE_DATA}>
                          <Area
                            type="monotone"
                            dataKey="calls"
                            stroke="#52525b"
                            strokeWidth={1.5}
                            fill="none"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : (
                /* KONTEN JIKA MODE 'PERFORMANCE' (Card Menampilkan Activity/Overview) */
                /* Ini yang "menggantikan posisi performance di bawah kanan" */
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">Total Messages</span>
                      <span className="text-zinc-200 font-mono">
                        {KPI_STATS.messages.value}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: "75%" }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">User Activity</span>
                      <span className="text-zinc-200 font-mono">High</span>
                    </div>
                    <div className="h-10 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={ACTIVITY_DATA}>
                          <Area
                            type="monotone"
                            dataKey="messages"
                            stroke="#52525b"
                            strokeWidth={1.5}
                            fill="none"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Helper Component for KPI Cards (Sama kaya sebelumnya)
function KpiCard({
  title,
  value,
  subtext,
}: {
  title: string;
  value: number;
  subtext: string;
}) {
  const fakeSparkData = Array.from({ length: 10 }, () => ({
    val: Math.random() * value,
  }));
  return (
    <Card className="bg-[#09090b] border-zinc-800 text-zinc-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-[10px] text-zinc-500 mt-1">{subtext}</p>
          </div>
          <div className="h-8 w-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fakeSparkData}>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#52525b"
                  strokeWidth={1.5}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
