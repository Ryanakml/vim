import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRobotsTxt,
  scrapeWebsite,
  validateWebsiteUrl,
} from "../convex/websitescraper";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("validateWebsiteUrl", () => {
  it("rejects unsupported protocols", () => {
    const result = validateWebsiteUrl("ftp://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URL must use HTTP or HTTPS protocol");
  });

  it("rejects local or private hostnames", () => {
    const result = validateWebsiteUrl("http://localhost:8080");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Cannot scrape local or internal network URLs");
  });

  it("accepts valid public URLs", () => {
    const result = validateWebsiteUrl("https://example.com/path");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("scrapeWebsite", () => {
  it("extracts structured content and metadata", async () => {
    const html = `\n      <html>\n        <head>\n          <title>Example Title</title>\n          <meta name=\"description\" content=\"A short description\" />\n        </head>\n        <body>\n          <script>console.log('remove me');</script>\n          <main>\n            <h1>Hello</h1>\n            <p>World</p>\n          </main>\n        </body>\n      </html>\n    `;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": "text/html" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeWebsite("https://example.com/page");

    expect(result.metadata.url).toBe("https://example.com/page");
    expect(result.metadata.domain).toBe("example.com");
    expect(result.metadata.title).toBe("Example Title");
    expect(result.metadata.description).toBe("A short description");
    expect(result.metadata.content_size).toBeGreaterThan(0);
    expect(result.metadata.is_dynamic_content).toBe(false);
    expect(result.text).toContain("# Website: Example Title");
    expect(result.text).toContain("**URL:** https://example.com/page");
    expect(result.text).toContain("Hello");
    expect(result.text).toContain("World");
  });
});

describe("checkRobotsTxt", () => {
  it("denies scraping when disallowing all paths", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("User-agent: *\nDisallow: /", { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const allowed = await checkRobotsTxt("https://example.com");
    expect(allowed).toBe(false);
  });

  it("allows scraping when disallow does not block all paths", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("User-agent: *\nDisallow: /private", { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const allowed = await checkRobotsTxt("example.com");
    expect(allowed).toBe(true);
  });

  it("allows scraping when robots.txt is missing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("", { status: 404, statusText: "Not Found" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const allowed = await checkRobotsTxt("https://example.com");
    expect(allowed).toBe(true);
  });
});
