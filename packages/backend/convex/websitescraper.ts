import * as cheerio from "cheerio";

export interface WebsiteParseResult {
  text: string;
  metadata: {
    url: string;
    domain: string;
    title?: string;
    description?: string;
    content_size: number;
    is_dynamic_content: boolean;
  };
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; Chatify-Bot/1.0)";

export interface PageMetadata {
  url: string;
  title?: string;
  description?: string;
  estimated_size?: number;
}

export interface CrawlResult {
  pages: PageMetadata[];
  total_found: number;
  discovery_method: "sitemap" | "crawl";
  error?: string;
}

export async function scrapeWebsite(
  url: string,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<WebsiteParseResult> {
  try {
    const urlObj = new URL(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Selective cleaning: keep generic containers (div/span/etc) because they
    // frequently hold important pricing/spec data.
    $("script, style, noscript").remove();
    $("svg, canvas").remove();
    // Remove only clearly ad-like containers (avoid generic selectors).
    removeLikelyAdContainers($, $.root());

    const title = $("title").text() || $("h1").first().text() || "";
    const description =
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    let content = "";
    const mainContent = $(
      "main, article, [role='main'], .content, .main-content",
    ).first();

    const contentRoot = (
      mainContent.length > 0 ? mainContent : $("body")
    ).first();

    // DOM-to-text preprocessing (must happen BEFORE calling `.text()`)
    preprocessDomForTextExtraction($, contentRoot);

    content = contentRoot.text();

    content = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n\n");

    const formattedContent = `# Website: ${title || urlObj.hostname}\n\n**URL:** ${url}\n\n---\n\n${content}`;

    return {
      text: formattedContent,
      metadata: {
        url,
        domain: urlObj.hostname,
        title: title || undefined,
        description: description || undefined,
        content_size: content.length,
        is_dynamic_content: false,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to scrape website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function preprocessDomForTextExtraction(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<any>,
): void {
  // 1) Preserve input/textarea values
  root.find("input").each((_, el) => {
    const $el = $(el);
    const rawVal = $el.attr("value") ?? "";
    const val = normalizeInlineValue(rawVal);
    if (!val) return;
    $el.replaceWith(formatInputReplacement(val));
  });

  root.find("textarea").each((_, el) => {
    const $el = $(el);
    const rawVal = $el.text();
    const val = normalizeInlineValue(rawVal);
    if (!val) return;
    $el.replaceWith(formatInputReplacement(val));
  });

  // 2) Preserve image alt text
  root.find("img[alt]").each((_, el) => {
    const $el = $(el);
    const alt = normalizeInlineValue($el.attr("alt") ?? "");
    if (!alt || !isMeaningfulAlt(alt)) return;
    $el.replaceWith(` [Image: ${alt}] `);
  });

  // 3) Improve spacing
  // Convert hard breaks to newlines
  root.find("br").replaceWith("\n");

  // Add newlines around block-ish elements so adjacent text doesn't smash
  root.find("div, p, li, tr").each((_, el) => {
    const $el = $(el);
    // before/after avoid disturbing nested structure; cleanup later collapses repeats.
    $el.before("\n");
    $el.after("\n");
  });

  // Add spaces around common inline containers that often cause concatenation
  root.find("span, td, th, label").each((_, el) => {
    const $el = $(el);
    $el.before(" ");
    $el.after(" ");
  });

  // 4) Selective cleaning inside root as well
  root.find("script, style, noscript, svg, canvas").remove();
  removeLikelyAdContainers($, root);
}

function normalizeInlineValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikeData(value: string): boolean {
  // Heuristics: numbers, account-like strings, emails, long identifiers.
  if (/[0-9]{4,}/.test(value)) return true;
  if (value.includes("@")) return true;
  if (value.length >= 12 && /[A-Za-z0-9]/.test(value)) return true;
  // Currency/price patterns
  if (/(rp\s?\d)|(\d[\d.,\s]{2,}\d)/i.test(value)) return true;
  return false;
}

function formatInputReplacement(value: string): string {
  // If it seems like real data (account number, price, etc), keep just the value.
  if (looksLikeData(value)) return ` ${value} `;
  return ` [Input: ${value}] `;
}

function isMeaningfulAlt(alt: string): boolean {
  if (alt.length < 3) return false;
  if (/^(image|photo|picture|logo|icon)$/i.test(alt)) return false;
  return true;
}

function removeLikelyAdContainers(
  $: cheerio.CheerioAPI,
  scope: cheerio.Cheerio<any>,
): void {
  scope.find("*[class], *[id]").each((_, el) => {
    const $el = $(el);
    const classAttr = ($el.attr("class") ?? "").toLowerCase();
    const idAttr = ($el.attr("id") ?? "").toLowerCase();

    // Tokenize to reduce false positives (e.g. "header")
    const tokens = `${classAttr} ${idAttr}`
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const isAd = tokens.some((t) => {
      // common ad tokens
      if (t === "ad" || t === "ads" || t === "advert" || t === "advertisement")
        return true;
      if (t.startsWith("ad-") || t.endsWith("-ad")) return true;
      if (t.startsWith("ads-") || t.endsWith("-ads")) return true;
      if (t.includes("adslot") || t.includes("adsense")) return true;
      if (t.includes("banner") && t.includes("ad")) return true;
      return false;
    });

    if (isAd) {
      $el.remove();
    }
  });
}

export function validateWebsiteUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const urlObj = new URL(url);

    if (!isAllowedProtocol(urlObj.protocol)) {
      return {
        valid: false,
        error: "URL must use HTTP or HTTPS protocol",
      };
    }

    if (isPrivateHostname(urlObj.hostname)) {
      return {
        valid: false,
        error: "Cannot scrape local or internal network URLs",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

export async function checkRobotsTxt(input: string): Promise<boolean> {
  try {
    const urlObj = input.startsWith("http")
      ? new URL(input)
      : new URL(`https://${input}`);

    const robotsUrl = new URL("/robots.txt", urlObj.origin);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(robotsUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return true;
    }

    const robotsContent = await response.text();
    const lines = robotsContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let inWildcardAgent = false;

    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        const agent = line.split(":")[1]?.trim() || "";
        inWildcardAgent = agent === "*";
        continue;
      }

      if (inWildcardAgent && line.toLowerCase().startsWith("disallow:")) {
        const rule = line.split(":")[1]?.trim() || "";
        if (rule === "/") {
          return false;
        }
      }
    }

    return true;
  } catch {
    return true;
  }
}

function isAllowedProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  if (lower === "localhost") {
    return true;
  }

  if (
    lower.startsWith("127.") ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.")
  ) {
    return true;
  }

  if (lower.startsWith("172.")) {
    const parts = lower.split(".");
    const second = Number(parts[1]);
    if (!Number.isNaN(second) && second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

/**
 * Fetch and parse sitemap.xml to discover pages
 */
async function fetchSitemap(baseUrl: string): Promise<PageMetadata[]> {
  try {
    const urlObj = new URL("/sitemap.xml", baseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(urlObj.toString(), {
      method: "GET",
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const urls: PageMetadata[] = [];
    $("loc").each((_, elem) => {
      const url = $(elem).text();
      if (url && isValidPageUrl(url, baseUrl)) {
        urls.push({ url });
      }
    });

    return urls;
  } catch {
    return [];
  }
}

/**
 * Extract page metadata (title, description) from a URL
 */
async function extractPageMetadata(url: string): Promise<PageMetadata> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { url };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("title").text() || $("h1").first().text() || "";
    const descMeta1 = $("meta[name='description']").attr("content");
    const descMeta2 = $("meta[property='og:description']").attr("content");
    const description: string = (descMeta1 ?? "") || (descMeta2 ?? "") || "";

    return {
      url,
      title: title || undefined,
      description: description || undefined,
      estimated_size: html.length,
    };
  } catch {
    return { url };
  }
}

/**
 * Check if URL is valid for crawling (same domain, not external)
 */
function isValidPageUrl(urlString: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(urlString);
    const baseObj = new URL(baseUrl);

    // Must be same domain
    if (urlObj.hostname !== baseObj.hostname) {
      return false;
    }

    // Skip anchors, query params (except necessary ones), media files
    const pathname = urlObj.pathname.toLowerCase();
    if (
      pathname.endsWith(".pdf") ||
      pathname.endsWith(".zip") ||
      pathname.endsWith(".exe") ||
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".png") ||
      pathname.endsWith(".gif")
    ) {
      return false;
    }

    // Skip obvious non-page URLs
    if (
      pathname.includes("/cdn-cgi/") ||
      pathname.includes("/static/") ||
      pathname.includes("/assets/")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Crawl website using BFS to discover all pages
 * Hybrid approach: Uses sitemap URLs as seeds but also crawls from homepage
 * to discover pages not listed in sitemap (e.g., static pages in navbar/footer)
 * Returns list of discovered pages with metadata
 */
export async function crawlWebsitePages(
  startUrl: string,
  maxPages: number = 100,
  maxDepth: number = 3,
): Promise<CrawlResult> {
  try {
    const baseUrl = new URL(startUrl).origin;
    const visited = new Set<string>();
    const seen = new Set<string>();
    const discoveredPages: Map<string, PageMetadata> = new Map();
    const queue: Array<{ url: string; depth: number }> = [];
    let discoveryMethod: "sitemap" | "crawl" = "crawl";

    const enqueue = (url: string, depth: number) => {
      if (seen.has(url)) return;
      seen.add(url);
      queue.push({ url, depth });
    };

    // Always crawl starting from homepage to discover internal links
    enqueue(startUrl, 0);

    // Step 1: Fetch sitemap and seed discovered pages, but do NOT return early
    const sitemapPages = await fetchSitemap(baseUrl);
    if (sitemapPages.length > 0) {
      discoveryMethod = "sitemap";

      for (const page of sitemapPages) {
        if (!discoveredPages.has(page.url)) {
          discoveredPages.set(page.url, { url: page.url });
        }
        enqueue(page.url, 0);
      }
    }

    // Step 2: BFS crawling - discover pages from sitemap AND from homepage/internal links
    while (queue.length > 0 && discoveredPages.size < maxPages) {
      const { url, depth } = queue.shift()!;

      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      visited.add(url);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": DEFAULT_USER_AGENT },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract page metadata
        const title =
          $("title").text() ||
          $("h1").first().text() ||
          url.split("/").pop() ||
          "";
        const descMeta1 = $("meta[name='description']").attr("content");
        const descMeta2 = $("meta[property='og:description']").attr("content");
        const description: string =
          (descMeta1 ?? "") || (descMeta2 ?? "") || "";

        discoveredPages.set(url, {
          url,
          title: title || undefined,
          description: description || undefined,
          estimated_size: html.length,
        });

        // Extract and queue new links (discover pages missed by sitemap)
        $("a[href]").each((_, elem) => {
          if (discoveredPages.size >= maxPages) return;

          const hrefRaw = $(elem).attr("href");
          const href: string = typeof hrefRaw === "string" ? hrefRaw : "";
          if (!href) return;

          try {
            const linkUrl = new URL(href, url).toString().split("#")[0]; // Remove anchors

            if (
              linkUrl &&
              isValidPageUrl(linkUrl, baseUrl) &&
              queue.length < maxPages * 2
            ) {
              if (!discoveredPages.has(linkUrl)) {
                discoveredPages.set(linkUrl, { url: linkUrl });
              }
              enqueue(linkUrl, depth + 1);
            }
          } catch {
            // Invalid URL, skip
          }
        });
      } catch {
        // Fetch failed, continue with next URL
      }
    }

    return {
      pages: Array.from(discoveredPages.values()),
      total_found: discoveredPages.size,
      discovery_method: discoveryMethod,
    };
  } catch (error) {
    return {
      pages: [],
      total_found: 0,
      discovery_method: "crawl",
      error: error instanceof Error ? error.message : "Failed to crawl website",
    };
  }
}
