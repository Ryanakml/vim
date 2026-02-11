import { describe, expect, it } from "vitest";

import {
  calculateOptimalChunkSize,
  chunkDocument,
} from "../convex/documentchunker";

describe("chunkDocument", () => {
  it("returns a single chunk for short input", () => {
    const result = chunkDocument("  hello world  ", 100, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe("hello world");
    expect(result[0]?.chunk_index).toBe(0);
    expect(result[0]?.chunk_total).toBe(1);
    expect(result[0]?.original_size).toBe("hello world".length);
  });

  it("splits long input with overlap and updates totals", () => {
    const text = [
      "Intro line",
      "",
      "Paragraph one text.",
      "",
      "Paragraph two text.",
      "",
      "Paragraph three text.",
    ].join("\n");

    const chunks = chunkDocument(text, 40, 5);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, index) => {
      expect(chunk.chunk_index).toBe(index);
      expect(chunk.chunk_total).toBe(chunks.length);
      expect(chunk.original_size).toBe(text.trim().length);
      expect(chunk.text.length).toBeGreaterThan(0);
    });

    const overlap = chunks[0]?.text.slice(-5);
    expect(chunks[1]?.text.startsWith(`${overlap}\n\n`)).toBe(true);
  });
});

describe("calculateOptimalChunkSize", () => {
  it("prefers smaller chunks for structured content", () => {
    const text = [
      "# H1",
      "## H2",
      "### H3",
      "#### H4",
      "##### H5",
      "###### H6",
    ].join("\n");

    const size = calculateOptimalChunkSize(text, 2000, 5000);
    expect(size).toBe(2000);
  });

  it("prefers larger chunks for dense content", () => {
    const text = Array.from({ length: 6 })
      .map(() => "x".repeat(120))
      .join("\n");

    const size = calculateOptimalChunkSize(text, 2000, 5000);
    expect(size).toBe(5000);
  });

  it("defaults to midpoint for mixed content", () => {
    const text = ["# Heading", "Normal line", "Another line"].join("\n");

    const size = calculateOptimalChunkSize(text, 2000, 5000);
    expect(size).toBe(3500);
  });
});
