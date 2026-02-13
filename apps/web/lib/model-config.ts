import type { ModelProviderKey } from "@workspace/backend/convex/modelproviders";

export type ModelId =
  | "gemini-2.5-flash"
  | "gpt-4o"
  | "claude-3-5-sonnet-latest"
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "openai/gpt-oss-120b"
  | "openai/gpt-oss-20b";

export const MODEL_CONFIG: Record<
  ModelId,
  {
    provider: ModelProviderKey;
    placeholder: string;
    link: string;
    label: string;
  }
> = {
  "gemini-2.5-flash": {
    provider: "Google AI",
    placeholder: "AIzaSy........................",
    link: "https://aistudio.google.com/app/api-keys",
    label: "Gemini 2.5 Flash",
  },
  "gpt-4o": {
    provider: "OpenAI",
    placeholder: "sk-........................",
    link: "https://platform.openai.com/api-keys",
    label: "GPT-4o",
  },
  "claude-3-5-sonnet-latest": {
    provider: "Anthropic",
    placeholder: "sk-ant-....................",
    link: "https://console.anthropic.com/settings/keys",
    label: "Claude 3.5 Sonnet",
  },
  "llama-3.3-70b-versatile": {
    provider: "Groq",
    placeholder: "gsk_........................",
    link: "https://console.groq.com/keys",
    label: "Llama 3.3 70B (Groq)",
  },
  "llama-3.1-8b-instant": {
    provider: "Groq",
    placeholder: "gsk_........................",
    link: "https://console.groq.com/keys",
    label: "Llama 3.1 8B Instant (Groq)",
  },
  "openai/gpt-oss-120b": {
    provider: "Groq",
    placeholder: "gsk_........................",
    link: "https://console.groq.com/keys",
    label: "GPT OSS 120B (Groq)",
  },
  "openai/gpt-oss-20b": {
    provider: "Groq",
    placeholder: "gsk_........................",
    link: "https://console.groq.com/keys",
    label: "GPT OSS 20B (Groq)",
  },
};

export const MODEL_OPTIONS: Array<{ value: ModelId; label: string }> = (
  Object.keys(MODEL_CONFIG) as ModelId[]
).map((value) => ({ value, label: MODEL_CONFIG[value].label }));
