import type { Settings } from "./settings.js";

/**
 * Structured message protocol between the content script, popup, options
 * page and the background service worker. Exhaustively typed so every
 * sender / receiver agrees on the shape.
 */

export type MessageType =
  | "TRANSLATE"
  | "GET_SETTINGS"
  | "SAVE_SETTINGS"
  | "SETTINGS_UPDATED"
  | "TOGGLE_TRANSLATION"
  | "SHOW_TOOLTIP"
  | "SHOW_ERROR"
  | "FETCH_PDF";

export interface TranslateMessage {
  type: "TRANSLATE";
  text: string;
  sourceLang?: string;
  targetLang?: string;
}

export interface GetSettingsMessage {
  type: "GET_SETTINGS";
}

export interface SaveSettingsMessage {
  type: "SAVE_SETTINGS";
  settings: Partial<Settings>;
}

export interface SettingsUpdatedMessage {
  type: "SETTINGS_UPDATED";
  settings: Settings;
}

export interface ToggleTranslationMessage {
  type: "TOGGLE_TRANSLATION";
}

export interface ShowTooltipMessage {
  type: "SHOW_TOOLTIP";
  text: string;
}

export interface ShowErrorMessage {
  type: "SHOW_ERROR";
  text: string;
}

/**
 * Request the background service worker to fetch a PDF on behalf of the
 * bundled PDF viewer. The viewer runs on a `chrome-extension://` origin,
 * so cross-origin PDFs would otherwise fail CORS. The service worker has
 * `<all_urls>` host permission and can perform the fetch directly.
 */
export interface FetchPdfMessage {
  type: "FETCH_PDF";
  url: string;
}

export type Message =
  | TranslateMessage
  | GetSettingsMessage
  | SaveSettingsMessage
  | SettingsUpdatedMessage
  | ToggleTranslationMessage
  | ShowTooltipMessage
  | ShowErrorMessage
  | FetchPdfMessage;

export interface TranslateResponseOk {
  ok: true;
  translated: string;
}

export interface TranslateResponseErr {
  ok: false;
  error: string;
}

export type TranslateResponse = TranslateResponseOk | TranslateResponseErr;

export interface FetchPdfResponseOk {
  ok: true;
  /**
   * Raw PDF bytes, base64-encoded.
   *
   * Chrome's `chrome.runtime.sendMessage` serializes payloads as JSON
   * (not the structured clone algorithm), so a `Uint8Array` would
   * round-trip as a plain object like `{"0":37,"1":80,…}` and
   * `new Uint8Array(obj)` on the receiving side would silently produce
   * a zero-length array — pdf.js then reports
   * "The PDF file is empty, i.e. its size is zero bytes.".
   *
   * A base64 string is JSON-safe and adds only ~33% overhead.
   */
  bytesBase64: string;
  /** Resolved final URL after any redirects. */
  url: string;
}

export interface FetchPdfResponseErr {
  ok: false;
  error: string;
}

export type FetchPdfResponse = FetchPdfResponseOk | FetchPdfResponseErr;
