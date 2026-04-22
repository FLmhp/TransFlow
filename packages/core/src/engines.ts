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
    label: "谷歌翻译",
    icon: "🔍",
    requiresApiKey: false,
    description: "免费的谷歌翻译网页接口，无需密钥，可能存在速率限制。",
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: "🤖",
    requiresApiKey: true,
    description: "通过 OpenAI（或兼容服务）的 Chat Completions API 进行大模型翻译。",
  },
];
