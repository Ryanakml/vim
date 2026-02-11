"use client";

import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { useScrapeWebsiteAndAddKnowledge } from "@/lib/convex-client";

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

export function WebsiteScraperHandler({
  botId,
  onCancel,
  onComplete,
}: {
  botId?: Id<"botProfiles">;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const scrapeWebsiteAndAddKnowledge = useScrapeWebsiteAndAddKnowledge();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

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

  const handleScrape = async () => {
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
    setIsSubmitting(true);
    setProgress(25);

    try {
      setProgress(60);
      await scrapeWebsiteAndAddKnowledge({
        botId,
        url,
      });
      setProgress(100);
      setWebsiteUrl("");
      onComplete?.();
    } catch (error) {
      setProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to scrape website",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row gap-8 items-stretch h-full">
        <div className="flex-1 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-300">
              Website Link
            </label>
            <p className="text-xs text-zinc-500">
              We will crawl this URL and add the most relevant content.
            </p>
            <div className="relative">
              <Globe className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="https://example.com/docs"
                className="pl-9 bg-zinc-900 border-zinc-700 focus:ring-zinc-600 text-zinc-100 placeholder:text-zinc-600"
                value={websiteUrl}
                onChange={(event) => {
                  setWebsiteUrl(event.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </div>
            {urlError && (
              <p className="text-xs text-yellow-400">{urlError}</p>
            )}
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

      {isSubmitting && (
        <div className="mt-6 space-y-2">
          <ProgressBar value={progress} />
          <p className="text-xs text-zinc-500">
            Scraping content and generating embeddings...
          </p>
        </div>
      )}

      {errorMessage && (
        <p className="text-sm text-red-400 mt-4">{errorMessage}</p>
      )}

      <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          onClick={() => {
            setWebsiteUrl("");
            setErrorMessage(null);
            onCancel?.();
          }}
          className="text-zinc-400 hover:text-zinc-100"
        >
          Cancel
        </Button>
        <Button
          onClick={handleScrape}
          disabled={
            isSubmitting || !botId || !websiteUrl.trim() || Boolean(urlError)
          }
        >
          {isSubmitting ? "Scraping..." : "Discover Pages"}
        </Button>
      </div>
    </div>
  );
}
