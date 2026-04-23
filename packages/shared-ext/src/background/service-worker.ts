/**
 * Background service-worker handler shared by every WebExtension target.
 *
 * Each target app provides its bundler entry (e.g. `service_worker.ts`)
 * that calls `startServiceWorker()` once at startup. This file owns:
 *   - the translator registry + cache
 *   - settings persistence in `chrome.storage.sync`
 *   - context-menu registration
 *   - message routing between popup / options / content scripts
 */
import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type Message,
  type Settings,
  type TranslateResponse,
} from "@transflow/core";
import { TranslationCache, TranslatorRegistry } from "@transflow/translator";
import { googleTranslator } from "@transflow/google-translator";
import { openaiTranslator } from "@transflow/openai-translator";

/**
 * Minimal structural typing of the chrome API surface the background
 * needs — avoids depending on `@types/chrome` in this shared package while
 * still being assignable from the real `typeof chrome` in consumer apps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

interface BackgroundChrome {
  runtime: {
    onInstalled: { addListener: AnyFn };
    onStartup: { addListener: AnyFn };
    onMessage: { addListener: AnyFn };
  };
  storage: {
    sync: {
      get: (keys: null) => Promise<Partial<Settings>>;
      set: (items: object) => Promise<void>;
    };
  };
  tabs: {
    sendMessage: AnyFn;
  };
  contextMenus: {
    removeAll: AnyFn;
    create: AnyFn;
    onClicked: { addListener: AnyFn };
  };
}

export interface ServiceWorkerOptions {
  /** The global `chrome` namespace (same on Firefox/Safari MV3). */
  chrome: BackgroundChrome;
  /** Optional label injected into context-menu titles. */
  menuLabel?: string;
}

export function startServiceWorker(options: ServiceWorkerOptions): void {
  const { chrome } = options;
  const label = options.menuLabel ?? "TransFlow";

  const translationCache = new TranslationCache({
    maxEntries: DEFAULT_SETTINGS.cacheMaxEntries,
    ttlMs: DEFAULT_SETTINGS.cacheTtlMinutes * 60_000,
  });
  const translators = new TranslatorRegistry(
    [googleTranslator, openaiTranslator],
    translationCache,
  );
  const translate = (request: Parameters<typeof translators.translate>[0]) => {
    translationCache.configure({
      maxEntries: request.settings.cacheMaxEntries,
      ttlMs: Math.max(1, request.settings.cacheTtlMinutes) * 60_000,
    });
    return translators.translate(request);
  };

  function installContextMenus(): void {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "translateSelection",
        title: `使用 ${label} 翻译所选内容`,
        contexts: ["selection"],
      });
      chrome.contextMenus.create({
        id: "toggleTranslation",
        title: "切换整页翻译",
        contexts: ["page"],
      });
    });
  }

  chrome.runtime.onInstalled.addListener(async () => {
    const current = await chrome.storage.sync.get(null);
    await chrome.storage.sync.set(mergeSettings(current));
    installContextMenus();
  });

  chrome.runtime.onStartup.addListener(installContextMenus);

  chrome.contextMenus.onClicked.addListener(
    async (
      info: { menuItemId: string; selectionText?: string },
      tab: { id?: number } | undefined,
    ) => {
      if (!tab?.id) return;
      if (info.menuItemId === "translateSelection" && info.selectionText) {
        const settings = mergeSettings(await chrome.storage.sync.get(null));
        try {
          const translated = await translate({
            text: info.selectionText,
            sourceLang: settings.sourceLang,
            targetLang: settings.targetLang,
            settings,
          });
          await chrome.tabs.sendMessage(tab.id, { type: "SHOW_TOOLTIP", text: translated });
        } catch (err) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "SHOW_ERROR",
            text: err instanceof Error ? err.message : String(err),
          });
        }
      } else if (info.menuItemId === "toggleTranslation") {
        await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_TRANSLATION" });
      }
    },
  );

  type SendResponse = (response: unknown) => void;

  chrome.runtime.onMessage.addListener(
    (message: Message, _sender: unknown, sendResponse: SendResponse) => {
      switch (message.type) {
        case "TRANSLATE":
          void handleTranslate(message, sendResponse);
          return true;

        case "GET_SETTINGS":
          void chrome.storage.sync.get(null).then((data) => sendResponse(mergeSettings(data)));
          return true;

        case "SAVE_SETTINGS":
          void chrome.storage.sync.set(message.settings).then(() => sendResponse({ ok: true }));
          return true;

        default:
          return false;
      }
    },
  );

  async function handleTranslate(
    message: Extract<Message, { type: "TRANSLATE" }>,
    sendResponse: SendResponse,
  ): Promise<void> {
    try {
      const settings = mergeSettings(await chrome.storage.sync.get(null));
      const translated = await translate({
        text: message.text,
        sourceLang: message.sourceLang ?? settings.sourceLang,
        targetLang: message.targetLang ?? settings.targetLang,
        settings,
      });
      const response: TranslateResponse = { ok: true, translated };
      sendResponse(response);
    } catch (err) {
      const response: TranslateResponse = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      sendResponse(response);
    }
  }

  void DEFAULT_SETTINGS;
}
