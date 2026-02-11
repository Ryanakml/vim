export interface PDFParseResult {
  text: string;
  metadata: {
    filename: string;
    total_pages: number;
    extracted_pages: Array<{
      page_num: number;
      text: string;
      word_count: number;
    }>;
  };
}

export interface PDFValidationInput {
  filename?: string;
  sizeBytes?: number;
  contentType?: string;
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024;
let structuredClonePatched = false;

type StructuredCloneFn = (
  value: unknown,
  options?: { transfer?: unknown[] },
) => unknown;

function ensureStructuredCloneCompatibility() {
  if (structuredClonePatched) return;
  structuredClonePatched = true;

  const globalAny = globalThis as typeof globalThis & {
    structuredClone?: StructuredCloneFn;
  };

  const original = globalAny.structuredClone;
  if (typeof original !== "function") {
    globalAny.structuredClone = (value: unknown) =>
      JSON.parse(JSON.stringify(value));
    return;
  }

  try {
    const buffer = new ArrayBuffer(1);
    original(buffer, { transfer: [buffer] });
  } catch {
    globalAny.structuredClone = (value: unknown) => original(value);
  }
}

export async function parsePDFBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
): Promise<PDFParseResult> {
  try {
    ensureStructuredCloneCompatibility();
    const byteArray =
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const pageTexts: string[] = [];

    const pdfParseModule = await import("pdf-parse");

    // ⬇️ ini kuncinya
    const pdfParse = (pdfParseModule as any).default ?? (pdfParseModule as any);

    // @ts-ignore - pdf-parse types can be finicky with ESM
    const data = await pdfParse(Buffer.from(byteArray), {
      pagerender: async (pageData: { getTextContent: () => Promise<any> }) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ");

        pageTexts.push(pageText);
        return pageText;
      },
    });

    const extractedPages = pageTexts
      .map((pageText, index) => {
        const trimmed = pageText.trim();
        if (!trimmed) {
          return null;
        }

        return {
          page_num: index + 1,
          text: trimmed,
          word_count: trimmed.split(/\s+/).length,
        };
      })
      .filter((page) => page !== null);

    let fullText = `# PDF: ${filename}`;
    for (const page of extractedPages) {
      fullText += `\n\n## Page ${page.page_num}\n\n${page.text}`;
    }

    const totalPages = data.numpages ?? pageTexts.length;

    return {
      text: fullText.trim(),
      metadata: {
        filename,
        total_pages: totalPages,
        extracted_pages: extractedPages,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to parse PDF "${filename}": ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

export function validatePDFMeta({
  filename,
  sizeBytes,
  contentType,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
}: PDFValidationInput): { valid: boolean; error?: string } {
  if (typeof sizeBytes === "number" && sizeBytes > maxSizeBytes) {
    return {
      valid: false,
      error: `PDF file too large (${formatFileSize(sizeBytes)}). Maximum allowed: ${formatFileSize(maxSizeBytes)}`,
    };
  }

  if (contentType && !contentType.includes("pdf")) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a PDF file.",
    };
  }

  if (filename && !filename.toLowerCase().endsWith(".pdf")) {
    return {
      valid: false,
      error: "Invalid file extension. Please upload a PDF file.",
    };
  }

  return { valid: true };
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
