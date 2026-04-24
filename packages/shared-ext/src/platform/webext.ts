/**
 * Default runtime/UI bridges for WebExtension targets (Chromium, Firefox,
 * Safari). All three browsers ship MV3 with the same `chrome.*` namespace
 * (Firefox additionally exposes a promise-based `browser.*` mirror; we stick
 * with the callback-style `chrome.*` API for a single code path).
 */
import {
  buildViewerUrl,
  mergeSettings,
  PDF_VIEWER_PATH,
  type Message,
  type Settings,
  type TranslateResponse,
} from "@transflow/core";
import type { RuntimeBridge, UiBridge, Unsubscribe } from "./types.js";

// Minimal structural typing so this module compiles without `@types/chrome`
// in environments that haven't installed it yet. The real `chrome` global
// provided at runtime is a superset of this shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

interface ChromeLike {
  runtime: {
    sendMessage: AnyFn;
    onMessage: { addListener: AnyFn; removeListener: AnyFn };
    lastError?: { message?: string };
    openOptionsPage?: () => void;
    getURL?: (path: string) => string;
  };
  tabs?: {
    query: AnyFn;
    sendMessage: AnyFn;
    create?: AnyFn;
  };
}

function send<T>(chrome: ChromeLike, message: Message): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? "chrome.runtime.sendMessage failed"));
        return;
      }
      // Safety: the chrome.runtime.sendMessage response is untyped; callers
      // specify the expected shape via the generic parameter.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion
      resolve(response as T);
    });
  });
}

function isMessage(raw: unknown): raw is Message {
  return !!raw && typeof raw === "object" && "type" in raw;
}

function subscribe(
  chrome: ChromeLike,
  filter: (message: Message) => boolean,
  handler: (message: Message) => void,
): Unsubscribe {
  const listener = (raw: unknown) => {
    if (!isMessage(raw)) return;
    if (filter(raw)) handler(raw);
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}

/** Runtime bridge for content scripts. */
export function createWebExtRuntimeBridge(chrome: ChromeLike): RuntimeBridge {
  return {
    async getSettings() {
      return await send<Settings>(chrome, { type: "GET_SETTINGS" });
    },
    async saveSettings(partial) {
      await send(chrome, { type: "SAVE_SETTINGS", settings: partial });
    },
    async requestTranslation(text, sourceLang, targetLang) {
      try {
        const res = await send<TranslateResponse | undefined>(chrome, {
          type: "TRANSLATE",
          text,
          sourceLang,
          targetLang,
        });
        if (!res || !res.ok) return null;
        return res.translated;
      } catch {
        return null;
      }
    },
    onSettingsUpdated(cb) {
      return subscribe(
        chrome,
        (m) => m.type === "SETTINGS_UPDATED",
        (m) => {
          if (m.type === "SETTINGS_UPDATED") cb(m.settings);
        },
      );
    },
    onToggleTranslation(cb) {
      return subscribe(
        chrome,
        (m) => m.type === "TOGGLE_TRANSLATION",
        () => cb(),
      );
    },
    onShowTooltip(cb) {
      return subscribe(
        chrome,
        (m) => m.type === "SHOW_TOOLTIP" || m.type === "SHOW_ERROR",
        (m) => {
          if (m.type === "SHOW_TOOLTIP") cb(m.text, false);
          else if (m.type === "SHOW_ERROR") cb(m.text, true);
        },
      );
    },
  };
}

/** UI bridge for popup/options pages. */
export function createWebExtUiBridge(chrome: ChromeLike): UiBridge {
  async function broadcastToTabs(next: Settings, only: "active" | "all"): Promise<void> {
    if (!chrome.tabs) return;
    const tabs: { id?: number }[] =
      only === "active"
        ? await chrome.tabs.query({ active: true, currentWindow: true })
        : await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab: { id?: number }) => {
        if (tab.id === undefined) return;
        try {
          await chrome.tabs!.sendMessage(tab.id, {
            type: "SETTINGS_UPDATED",
            settings: next,
          });
        } catch {
          /* no content script on this tab */
        }
      }),
    );
  }

  return {
    async getSettings() {
      try {
        const fetched = await send<Settings>(chrome, { type: "GET_SETTINGS" });
        return mergeSettings(fetched);
      } catch {
        return mergeSettings(null);
      }
    },
    async saveSettings(next) {
      await send(chrome, { type: "SAVE_SETTINGS", settings: next });
    },
    async broadcastSettingsToActiveTab(next) {
      await broadcastToTabs(next, "active");
    },
    async broadcastSettingsToAllTabs(next) {
      await broadcastToTabs(next, "all");
    },
    openOptionsPage() {
      chrome.runtime.openOptionsPage?.();
    },
    openPdfViewer(pdfUrl: string) {
      const base = chrome.runtime.getURL?.(PDF_VIEWER_PATH);
      if (!base) return;
      const prefix = base.replace(/viewer\.html$/, "");
      const target = buildViewerUrl(prefix, pdfUrl);
      chrome.tabs?.create?.({ url: target });
    },
  };
}

export type { ChromeLike };
