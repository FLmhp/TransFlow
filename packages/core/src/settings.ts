import type { TranslationEngine } from "./engines.js";

/**
 * User-facing settings persisted in `chrome.storage.sync`.
 *
 * All modules that read/write settings import this type — never construct
 * ad-hoc "any" settings objects.
 */
export interface Settings {
  enabled: boolean;
  engine: TranslationEngine;
  sourceLang: string;
  targetLang: string;

  // OpenAI engine credentials / configuration.
  // `openaiBaseUrl` is the `OPENAI_BASE_URL` value — override to use an
  // OpenAI-compatible endpoint. `openaiApiKey` is the `OPENAI_API_KEY`.
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;

  // UX
  showOriginal: boolean;
  translationPosition: "below" | "above";
  pdfEnabled: boolean;
  subtitleEnabled: boolean;

  // Appearance
  translationColor: string;
  translationFontSize: number;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  engine: "google",
  sourceLang: "auto",
  targetLang: "zh-CN",

  openaiApiKey: "",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",

  showOriginal: true,
  translationPosition: "below",
  pdfEnabled: true,
  subtitleEnabled: true,

  translationColor: "#1a73e8",
  translationFontSize: 92,
};

export function mergeSettings(partial: Partial<Settings> | null | undefined): Settings {
  return partial ? { ...DEFAULT_SETTINGS, ...partial } : { ...DEFAULT_SETTINGS };
}
