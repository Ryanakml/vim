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

    $(
      "script, style, nav, footer, aside, .ad, .advertisement, .sidebar",
    ).remove();

    const title = $("title").text() || $("h1").first().text() || "";
    const description =
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      "";

    let content = "";
    const mainContent = $(
      "main, article, [role='main'], .content, .main-content",
    ).first();

    if (mainContent.length > 0) {
      content = mainContent.text();
    } else {
      content = $("body").text();
    }

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
