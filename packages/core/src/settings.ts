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

  // Engine credentials
  deeplApiKey: string;
  deeplIsPro: boolean;
  openaiApiKey: string;
  openaiModel: string;
  geminiApiKey: string;
  geminiModel: string;

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

  deeplApiKey: "",
  deeplIsPro: false,
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",

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
