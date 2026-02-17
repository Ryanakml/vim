"use client";

import { useMemo, useState } from "react";
import { Globe, Loader2, CheckCircle2, Check } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import {
  useCrawlWebsiteMeta,
  useScrapeMultipleWebsitesAndAddKnowledge,
} from "@/lib/convex-client";

interface PageMetadata {
  url: string;
  title?: string;
  description?: string;
  estimated_size?: number;
}

function isLikelyContentPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const search = parsed.search.toLowerCase();

    // Return false for homepage
    if (pathname === "/" || pathname === "") {
      return false;
    }

    // Junk/list pages
    const junkFragments = [
      "/tag/",
      "/category/",
      "/search/",
      "/label/",
      "/archive/",
      "/page/",
    ];
    if (junkFragments.some((frag) => pathname.includes(frag))) {
      return false;
    }

    // Junk query params (sorting/filtering/list views)
    if (
      parsed.searchParams.has("sort") ||
      parsed.searchParams.has("filter") ||
      search.includes("sort=") ||
      search.includes("filter=")
    ) {
      return false;
    }

    // Strong content signals
    const contentFragments = ["/product/", "/item/", "/blog/", "/article/"];
    if (contentFragments.some((frag) => pathname.includes(frag))) {
      return true;
    }

    // Year patterns often indicate posts/articles
    if (/(\/2023\/|\/2024\/|\/2025\/)/.test(pathname)) {
      return true;
    }

    // Path depth heuristic: domain.com/blog/my-post (depth 2)
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 1) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-zinc-800">
      <div
        className="h-2 rounded-full bg-blue-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

type Step = "input" | "discovery" | "selection" | "processing" | "complete";

export function WebsiteScraperHandler({
  botId,
  onCancel,
  onComplete,
}: {
  botId?: Id<"botProfiles">;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const crawlWebsiteMeta = useCrawlWebsiteMeta();
  const scrapeMultipleWebsitesAndAddKnowledge =
    useScrapeMultipleWebsitesAndAddKnowledge();

  const [step, setStep] = useState<Step>("input");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(3);
  const [discoveredPages, setDiscoveredPages] = useState<PageMetadata[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingErrors, setProcessingErrors] = useState<
    Array<{ url: string; error: string }>
  >([]);

  const urlError = useMemo(() => {
    if (!websiteUrl.trim()) return null;
    try {
      const parsed = new URL(websiteUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "URL must start with http:// or https://";
      }
      return null;
    } catch {
      return "Please enter a valid URL.";
    }
  }, [websiteUrl]);

  const handleDiscoverPages = async () => {
    if (!botId) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    const url = websiteUrl.trim();
    if (!url) {
      setErrorMessage("Please enter a valid website URL.");
      return;
    }

    if (urlError) {
      setErrorMessage(urlError);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setProgress(10);
    setStep("discovery");

    try {
      setProgress(30);
      const result = await crawlWebsiteMeta({
        url,
        maxPages,
        maxDepth,
      });
      setProgress(70);

      if (result.pages.length === 0) {
        throw new Error(
          "No pages found in website or discovery failed. Check if the URL is correct.",
        );
      }

      setDiscoveredPages(result.pages);
      const allUrls = result.pages.map((p) => p.url);
      const smartUrls = allUrls.filter((pageUrl) =>
        isLikelyContentPage(pageUrl),
      );
      const initialSelection = smartUrls.length > 0 ? smartUrls : allUrls;
      setSelectedUrls(new Set(initialSelection));
      setProgress(100);
      setStep("selection");
    } catch (error) {
      setProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to discover pages",
      );
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePage = (url: string, selected: boolean) => {
    const newSelected = new Set(selectedUrls);
    if (selected) {
      newSelected.add(url);
    } else {
      newSelected.delete(url);
    }
    setSelectedUrls(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedUrls(new Set(discoveredPages.map((p) => p.url)));
  };

  const handleDeselectAll = () => {
    setSelectedUrls(new Set());
  };

  const handleConfirmAndAdd = async () => {
    if (!botId) {
      setErrorMessage("Bot profile is not ready yet. Please try again.");
      return;
    }

    if (selectedUrls.size === 0) {
      setErrorMessage("Please select at least one page to add.");
      return;
    }

    setErrorMessage(null);
    setProcessingErrors([]);
    setIsLoading(true);
    setProgress(10);
    setStep("processing");

    try {
      setProgress(40);
      const result = await scrapeMultipleWebsitesAndAddKnowledge({
        botId,
        urls: Array.from(selectedUrls),
      });

      setProgress(80);

      if (!result.success && result.errors.length > 0) {
        setProcessingErrors(result.errors);
      }

      setProgress(100);
      setStep("complete");
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (error) {
      setProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to process pages",
      );
      setStep("selection");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("input");
    setWebsiteUrl("");
    setMaxPages(100);
    setMaxDepth(3);
    setDiscoveredPages([]);
    setSelectedUrls(new Set());
    setErrorMessage(null);
    setProcessingErrors([]);
    setProgress(0);
  };

  // ==================== RENDER STEP: INPUT ====================
  if (step === "input") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row gap-8 items-stretch h-full">
          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">
                Website Domain
              </label>
              <p className="text-xs text-zinc-500">
                Enter your website URL. We&apos;ll discover all pages and let
                you choose which ones to add to the knowledge base.
              </p>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="https://example.com"
                  className="pl-9 bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100 placeholder:text-zinc-600"
                  value={websiteUrl}
                  onChange={(event) => {
                    setWebsiteUrl(event.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !isLoading &&
                      websiteUrl.trim() &&
                      !urlError
                    ) {
                      handleDiscoverPages();
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
              {urlError && (
                <p className="text-xs text-yellow-400">{urlError}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-300">
                Crawl Limits (Optional)
              </label>
              <p className="text-xs text-zinc-500">
                Customize how many pages and how deep to crawl. Higher values =
                slower but more complete results.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-2">
                    Max Pages
                  </label>
                  <Input
                    type="number"
                    min="10"
                    max="1000"
                    value={maxPages}
                    onChange={(e) =>
                      setMaxPages(
                        Math.min(
                          1000,
                          Math.max(10, parseInt(e.target.value) || 100),
                        ),
                      )
                    }
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100"
                  />
                  <p className="text-xs text-zinc-600 mt-1">10 - 1000 pages</p>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-2">
                    Max Depth
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={maxDepth}
                    onChange={(e) =>
                      setMaxDepth(
                        Math.min(
                          10,
                          Math.max(1, parseInt(e.target.value) || 3),
                        ),
                      )
                    }
                    disabled={isLoading}
                    className="bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100"
                  />
                  <p className="text-xs text-zinc-600 mt-1">1 - 10 levels</p>
                </div>
              </div>
            </div>
          </div>
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
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={() => {
              setWebsiteUrl("");
              setErrorMessage(null);
              onCancel?.();
            }}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDiscoverPages}
            disabled={
              isLoading || !botId || !websiteUrl.trim() || Boolean(urlError)
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Discovering...
              </>
            ) : (
              "Discover Pages"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ==================== RENDER STEP: DISCOVERY/SELECTION ====================
  if (step === "selection") {
    return (
      <div className="flex flex-col h-full">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">
              Found {discoveredPages.length} Pages
            </h3>
            <p className="text-sm text-zinc-500">
              Select which pages to add to your knowledge base
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              Deselect All
            </Button>
            <div className="ml-auto text-sm text-zinc-500">
              {selectedUrls.size} of {discoveredPages.length} selected
            </div>
          </div>

          <ScrollArea className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-4 h-[400px]">
            <div className="space-y-2">
              {discoveredPages.map((page) => (
                <div
                  key={page.url}
                  className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() =>
                    handleTogglePage(page.url, !selectedUrls.has(page.url))
                  }
                >
                  <div className="mt-1 flex-shrink-0">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedUrls.has(page.url)
                          ? "bg-blue-600 border-blue-600"
                          : "border-zinc-600 hover:border-zinc-500"
                      }`}
                    >
                      {selectedUrls.has(page.url) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 line-clamp-2">
                      {page.title || "Untitled Page"}
                    </p>
                    <p className="text-xs text-zinc-500 line-clamp-1 mt-1">
                      {page.url}
                    </p>
                    {page.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {page.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={() => {
              resetForm();
            }}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-100"
          >
            Back
          </Button>
          <Button
            onClick={handleConfirmAndAdd}
            disabled={isLoading || selectedUrls.size === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Confirm & Add ${selectedUrls.size} Page${
                selectedUrls.size === 1 ? "" : "s"
              }`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ==================== RENDER STEP: PROCESSING ====================
  if (step === "processing") {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-100">
            Scraping and Processing Pages
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            Extracting content and generating embeddings...
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <ProgressBar value={progress} />
          <p className="text-xs text-zinc-500 text-center">
            {Math.round(progress)}% complete
          </p>
        </div>

        {processingErrors.length > 0 && (
          <div className="w-full max-w-md p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs font-medium text-yellow-400 mb-2">
              Some pages failed to process:
            </p>
            <div className="space-y-1">
              {processingErrors.slice(0, 3).map((err) => (
                <p key={err.url} className="text-xs text-yellow-300">
                  • {new URL(err.url).pathname || err.url}: {err.error}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER STEP: COMPLETE ====================
  if (step === "complete") {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-100">
            Pages Added Successfully!
          </h3>
          <p className="text-sm text-zinc-500 mt-1">
            {selectedUrls.size} page{selectedUrls.size === 1 ? "" : "s"} have
            been added to your knowledge base.
          </p>
        </div>

        {processingErrors.length > 0 && (
          <div className="w-full max-w-md p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs font-medium text-yellow-400 mb-2">
              {processingErrors.length} page
              {processingErrors.length === 1 ? "" : "s"} failed:
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {processingErrors.map((err) => (
                <p
                  key={err.url}
                  className="text-xs text-yellow-300 line-clamp-1"
                >
                  • {new URL(err.url).pathname}: {err.error}
                </p>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-500">Redirecting...</p>
      </div>
    );
  }
}
