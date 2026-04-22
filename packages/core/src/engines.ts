/**
 * Translation engine identifiers.
 * Kept in one place so every module (UI / background / tests) references
 * the same canonical set.
 */
export const TRANSLATION_ENGINES = ["google", "deepl", "openai", "gemini"] as const;

export type TranslationEngine = (typeof TRANSLATION_ENGINES)[number];

export interface EngineDescriptor {
  readonly id: TranslationEngine;
  readonly label: string;
  readonly icon: string;
  readonly requiresApiKey: boolean;
  readonly description: string;
}

export const ENGINE_DESCRIPTORS: readonly EngineDescriptor[] = [
  {
    id: "google",
    label: "Google",
    icon: "🔍",
    requiresApiKey: false,
    description: "Free Google Translate web API. No key needed. Rate limits may apply.",
  },
  {
    id: "deepl",
    label: "DeepL",
    icon: "📘",
    requiresApiKey: true,
    description: "High-quality machine translation. Free tier available.",
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: "🤖",
    requiresApiKey: true,
    description: "LLM-based translation via GPT family models.",
  },
  {
    id: "gemini",
    label: "Gemini",
    icon: "✨",
    requiresApiKey: true,
    description: "LLM-based translation via Google Gemini.",
  },
];
