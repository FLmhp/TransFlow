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
  // `showOriginal` toggles bilingual vs. translation-only display. When
  // `false`, the original block is hidden via CSS and only the translation
  // is rendered in its place.
  showOriginal: boolean;
  translationPosition: "below" | "above";
  // Visual theme applied to the inserted translation node. `normal` is the
  // classic colored block; the other themes are inspired by immersive
  // translate (underline under the translation, dashed underline, yellow
  // highlight, and a blur-until-hover "mask" style).
  translationTheme: "normal" | "underline" | "dashed" | "highlight" | "mask";
  pdfEnabled: boolean;
  subtitleEnabled: boolean;

  // Appearance
  translationColor: string;
  translationFontSize: number;

  // Translation result cache (service-worker memory, LRU + TTL).
  // `cacheEnabled` toggles caching entirely. `cacheTtlMinutes` is how long
  // an entry remains valid before being discarded on read. `cacheMaxEntries`
  // bounds total entries; the least-recently-used entry is evicted when the
  // limit is reached.
  cacheEnabled: boolean;
  cacheTtlMinutes: number;
  cacheMaxEntries: number;
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
  translationTheme: "normal",
  pdfEnabled: true,
  subtitleEnabled: true,

  translationColor: "#1a73e8",
  translationFontSize: 92,

  cacheEnabled: true,
  cacheTtlMinutes: 60,
  cacheMaxEntries: 500,
};

export function mergeSettings(partial: Partial<Settings> | null | undefined): Settings {
  return partial ? { ...DEFAULT_SETTINGS, ...partial } : { ...DEFAULT_SETTINGS };
}
