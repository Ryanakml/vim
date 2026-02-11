import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfParseMock = vi.hoisted(() => vi.fn());

vi.mock("pdf-parse", () => ({
  default: pdfParseMock,
}));

const { parsePDFBuffer, validatePDFMeta } = await import("../convex/pdfparser");

describe("parsePDFBuffer", () => {
  beforeEach(() => {
    pdfParseMock.mockReset();
  });

  it("parses pages and returns metadata", async () => {
    pdfParseMock.mockImplementation(async (_buffer: Buffer, options: any) => {
      await options.pagerender({
        getTextContent: async () => ({
          items: [{ str: "Hello" }, { str: "world" }],
        }),
      });
      await options.pagerender({
        getTextContent: async () => ({
          items: [{ str: "Second" }, { str: "page" }],
        }),
      });

      return { numpages: 2 };
    });

    const result = await parsePDFBuffer(new Uint8Array([1, 2, 3]), "test.pdf");

    expect(result.metadata.filename).toBe("test.pdf");
    expect(result.metadata.total_pages).toBe(2);
    expect(result.metadata.extracted_pages).toHaveLength(2);
    expect(result.metadata.extracted_pages[0]?.word_count).toBe(2);
    expect(result.text).toContain("# PDF: test.pdf");
    expect(result.text).toContain("## Page 1");
    expect(result.text).toContain("Hello world");
  });

  it("wraps parser errors with filename", async () => {
    pdfParseMock.mockRejectedValue(new Error("Boom"));

    await expect(
      parsePDFBuffer(new Uint8Array([9, 9]), "broken.pdf"),
    ).rejects.toThrow('Failed to parse PDF "broken.pdf": Boom');
  });
});

describe("validatePDFMeta", () => {
  it("rejects oversized files", () => {
    const result = validatePDFMeta({
      sizeBytes: 60 * 1024 * 1024,
      maxSizeBytes: 50 * 1024 * 1024,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain("PDF file too large");
  });

  it("rejects non-pdf content types", () => {
    const result = validatePDFMeta({
      contentType: "text/plain",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid file type. Please upload a PDF file.");
  });

  it("rejects non-pdf file extensions", () => {
    const result = validatePDFMeta({
      filename: "notes.txt",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      "Invalid file extension. Please upload a PDF file.",
    );
  });

  it("accepts valid PDF metadata", () => {
    const result = validatePDFMeta({
      filename: "report.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
