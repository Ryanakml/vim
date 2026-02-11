import { vi } from "vitest";

type AiMockOptions = {
  text?: string;
  embeddingSize?: number;
  streamChunks?: string[];
};

export const aiMocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  embed: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: aiMocks.generateText,
  embed: aiMocks.embed,
  streamText: aiMocks.streamText,
}));

function createTextStream(chunks: string[]) {
  async function* stream() {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  return stream();
}

export function setupAiMocks(options: AiMockOptions = {}) {
  const text = options.text ?? "Test bot response";
  const embeddingSize = options.embeddingSize ?? 768;
  const streamChunks = options.streamChunks ?? ["Hello", " world"];

  aiMocks.generateText.mockResolvedValue({ text });
  aiMocks.embed.mockResolvedValue({
    embedding: Array.from({ length: embeddingSize }, () => 0.01),
  });
  aiMocks.streamText.mockResolvedValue({
    textStream: createTextStream(streamChunks),
  });

  return aiMocks;
}

export function resetAiMocks() {
  aiMocks.generateText.mockReset();
  aiMocks.embed.mockReset();
  aiMocks.streamText.mockReset();
}
