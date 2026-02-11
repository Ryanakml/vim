import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pdfParseMock = vi.hoisted(() => vi.fn());

vi.mock("pdf-parse", () => ({
  default: pdfParseMock,
}));

const { parsePDFBuffer } = await import("../convex/pdfparser");
const { chunkDocument } = await import("../convex/documentchunker");
const { scrapeWebsite } = await import("../convex/websitescraper");

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PDF integration", () => {
  beforeEach(() => {
    pdfParseMock.mockReset();
  });

  it("handles multi-page PDFs and chunks large content", async () => {
    const largeText = "lorem ".repeat(2200);

    pdfParseMock.mockImplementation(async (_buffer: Buffer, options: any) => {
      await options.pagerender({
        getTextContent: async () => ({
          items: [{ str: "First page" }],
        }),
      });
      await options.pagerender({
        getTextContent: async () => ({
          items: [{ str: largeText }],
        }),
      });
      await options.pagerender({
        getTextContent: async () => ({
          items: [{ str: "Last page" }],
        }),
      });

      return { numpages: 3 };
    });

    const result = await parsePDFBuffer(new Uint8Array([1, 2, 3]), "large.pdf");

    expect(result.metadata.total_pages).toBe(3);
    expect(result.metadata.extracted_pages).toHaveLength(3);

    const chunks = chunkDocument(result.text, 2000, 100);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.chunk_index).toBe(index);
      expect(chunk.chunk_total).toBe(chunks.length);
      expect(chunk.original_size).toBe(result.text.trim().length);
    });
  });
});

describe("Website integration", () => {
  it("falls back to body content and hostname when main content is missing", async () => {
    const html = `
      <html>
        <head></head>
        <body>
          <nav>Navigation</nav>
          <div>Primary body content</div>
          <footer>Footer links</footer>
        </body>
      </html>
    `;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeWebsite("https://example.com/docs");

    expect(result.metadata.title).toBeUndefined();
    expect(result.text).toContain("# Website: example.com");
    expect(result.text).toContain("Primary body content");
    expect(result.text).not.toContain("Navigation");
    expect(result.text).not.toContain("Footer links");
  });

  it("uses h1 as title and strips script content", async () => {
    const html = `
      <html>
        <head></head>
        <body>
          <script>Injected content</script>
          <main>
            <h1>Guide Title</h1>
            <p>Helpful content</p>
          </main>
        </body>
      </html>
    `;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeWebsite("https://example.com/guide");

    expect(result.metadata.title).toBe("Guide Title");
    expect(result.text).toContain("# Website: Guide Title");
    expect(result.text).toContain("Helpful content");
    expect(result.text).not.toContain("Injected content");
  });
});
