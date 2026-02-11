import type { Doc } from "@workspace/backend/convex/_generated/dataModel";

export const KB_LIMITS = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 5000,
  MIN_TITLE_LENGTH: 1,
  MAX_TITLE_LENGTH: 200,
  MAX_DOCUMENTS_PER_BOT: 10,
} as const;

export interface KBValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateKBEntry(
  text: string,
  title?: string,
  existingDocs?: Doc<"documents">[],
): KBValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmedText = text.trim();
  if (!trimmedText) {
    errors.push("Content cannot be empty");
  }
  if (trimmedText.length < KB_LIMITS.MIN_TEXT_LENGTH) {
    errors.push(
      `Content must be at least ${KB_LIMITS.MIN_TEXT_LENGTH} characters`,
    );
  }
  if (trimmedText.length > KB_LIMITS.MAX_TEXT_LENGTH) {
    errors.push(
      `Content exceeds maximum length of ${KB_LIMITS.MAX_TEXT_LENGTH} characters`,
    );
  }

  if (title) {
    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle.length < KB_LIMITS.MIN_TITLE_LENGTH) {
      errors.push(
        `Title must be at least ${KB_LIMITS.MIN_TITLE_LENGTH} characters`,
      );
    }
    if (trimmedTitle.length > KB_LIMITS.MAX_TITLE_LENGTH) {
      errors.push(
        `Title exceeds maximum length of ${KB_LIMITS.MAX_TITLE_LENGTH} characters`,
      );
    }
  }

  if (existingDocs && existingDocs.length > 0) {
    const isDuplicate = existingDocs.some(
      (doc) => doc.text.toLowerCase().trim() === trimmedText.toLowerCase(),
    );
    if (isDuplicate) {
      warnings.push(
        "This content appears to already exist in your knowledge base",
      );
    }
  }

  if (trimmedText.length > 0 && trimmedText.length < 50) {
    warnings.push("Content is very short and may not provide much context");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function extractTitleFromContent(text: string): string {
  const lines = text.split("\n");
  const titleLine = lines
    .find((line) => line.trim().startsWith("#"))
    ?.replace(/^#+\s*/, "")
    .trim();

  if (titleLine) {
    return titleLine;
  }

  const firstLine = lines.find((line) => line.trim().length > 0);
  return firstLine?.trim().slice(0, 50) || "Untitled";
}

export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  lineCount: number;
  estimatedReadTimeSeconds: number;
}

export function calculateDocStats(text: string): DocumentStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = text.length;
  const paragraphs = trimmed ? text.split(/\n\n+/).length : 0;
  const lines = trimmed ? text.split("\n").length : 0;
  const readTimeSeconds = Math.ceil((words / 200) * 60);

  return {
    wordCount: words,
    characterCount: chars,
    paragraphCount: paragraphs,
    lineCount: lines,
    estimatedReadTimeSeconds: readTimeSeconds,
  };
}

export function formatKBPreview(text: string, maxLength: number = 150): string {
  const lines = text.split("\n");
  const titleLine = lines
    .find((line) => line.trim().startsWith("#"))
    ?.replace(/^#+\s*/, "");
  const contentStart = titleLine ? lines.slice(1).join(" ") : text;
  const trimmed = contentStart.replace(/\s+/g, " ").trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trim()}...`;
}
