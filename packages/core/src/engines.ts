/**
 * Translation engine identifiers.
 * Kept in one place so every module (UI / background / tests) references
 * the same canonical set.
 */
export const TRANSLATION_ENGINES = ["google", "openai"] as const;

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
    id: "openai",
    label: "OpenAI",
    icon: "🤖",
    requiresApiKey: true,
    description: "LLM-based translation via the OpenAI (or compatible) Chat Completions API.",
  },
];
