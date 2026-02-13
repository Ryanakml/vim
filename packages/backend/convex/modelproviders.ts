export const MODEL_PROVIDER_KEYS = [
  "OpenAI",
  "Groq",
  "Google AI",
  "Anthropic",
] as const;

export type ModelProviderKey = (typeof MODEL_PROVIDER_KEYS)[number];

/**
 * Normalize provider strings coming from older data or UI labels.
 * Returns null if the provider is not supported.
 */
export function normalizeModelProvider(
  provider: unknown,
): ModelProviderKey | null {
  if (typeof provider !== "string") return null;

  const trimmed = provider.trim();
  if (!trimmed) return null;

  // Preserve canonical keys
  if ((MODEL_PROVIDER_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as ModelProviderKey;
  }

  // Back-compat / alias handling
  const lower = trimmed.toLowerCase();
  if (lower === "google" || lower === "googleai" || lower === "google ai") {
    return "Google AI";
  }
  if (lower === "openai") return "OpenAI";
  if (lower === "groq") return "Groq";
  if (lower === "anthropic") return "Anthropic";

  return null;
}
