export interface DocumentChunk {
  text: string;
  chunk_index: number;
  chunk_total: number;
  original_size: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 5000;
const DEFAULT_OVERLAP_SIZE = 200;

export function chunkDocument(
  text: string,
  maxChunkSize: number = DEFAULT_MAX_CHUNK_SIZE,
  overlapSize: number = DEFAULT_OVERLAP_SIZE,
): DocumentChunk[] {
  const trimmed = text.trim();

  if (trimmed.length <= maxChunkSize) {
    return [
      {
        text: trimmed,
        chunk_index: 0,
        chunk_total: 1,
        original_size: trimmed.length,
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let currentIndex = 0;

  while (currentIndex < trimmed.length) {
    let chunkEnd = Math.min(currentIndex + maxChunkSize, trimmed.length);

    const lastDoubleNewline = trimmed.lastIndexOf("\n\n", chunkEnd);
    if (
      lastDoubleNewline > currentIndex &&
      lastDoubleNewline > chunkEnd - maxChunkSize / 2
    ) {
      chunkEnd = lastDoubleNewline;
    } else {
      const lastNewline = trimmed.lastIndexOf("\n", chunkEnd);
      if (
        lastNewline > currentIndex &&
        lastNewline > chunkEnd - maxChunkSize / 2
      ) {
        chunkEnd = lastNewline;
      }
    }

    let chunkText = trimmed.substring(currentIndex, chunkEnd).trim();

    if (chunks.length > 0) {
      const previousText = chunks[chunks.length - 1].text;
      const context = previousText.substring(
        Math.max(0, previousText.length - overlapSize),
      );
      chunkText = `${context}\n\n${chunkText}`;
    }

    chunks.push({
      text: chunkText,
      chunk_index: chunks.length,
      chunk_total: 0,
      original_size: trimmed.length,
    });

    currentIndex = chunkEnd;
  }

  chunks.forEach((chunk) => {
    chunk.chunk_total = chunks.length;
  });

  return chunks;
}

export function calculateOptimalChunkSize(
  text: string,
  minSize: number = 2000,
  maxSize: number = 5000,
): number {
  const headingCount = (text.match(/^#+\s/gm) || []).length;
  const hasStructure = headingCount > 5;

  const lines = text.split("\n");
  const avgLineLength =
    lines.reduce((sum, line) => sum + line.trim().length, 0) /
    Math.max(lines.length, 1);
  const isDense = avgLineLength > 80;

  if (hasStructure && !isDense) {
    return minSize;
  }

  if (isDense) {
    return maxSize;
  }

  return Math.round((minSize + maxSize) / 2);
}
