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
  resolvePdfRedirect,
  PDF_VIEWER_PATH,
  type FetchPdfResponse,
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
    getURL?: (path: string) => string;
  };
  storage: {
    sync: {
      get: (keys: null) => Promise<Partial<Settings>>;
      set: (items: object) => Promise<void>;
    };
  };
  tabs: {
    sendMessage: AnyFn;
    update?: AnyFn;
  };
  contextMenus: {
    removeAll: AnyFn;
    create: AnyFn;
    onClicked: { addListener: AnyFn };
  };
  webNavigation?: {
    onBeforeNavigate: { addListener: AnyFn; removeListener?: AnyFn };
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

  // ─── Auto-redirect direct .pdf navigations to the bundled viewer ──────
  //
  // We use `webNavigation.onBeforeNavigate` (top-frame only) rather than
  // `declarativeNetRequest` because the set of .pdf URLs isn't static and
  // we need to honour a runtime setting. The listener is installed
  // unconditionally; the decision function short-circuits when the
  // feature is disabled.
  const viewerUrlPrefix =
    chrome.runtime.getURL?.(PDF_VIEWER_PATH).replace(/viewer\.html$/, "") ?? "";
  if (chrome.webNavigation && viewerUrlPrefix) {
    chrome.webNavigation.onBeforeNavigate.addListener(
      async (details: { url?: string; tabId?: number; frameId?: number }) => {
        if (details.frameId !== 0 || !details.tabId || details.tabId < 0) return;
        if (!details.url) return;
        const settings = mergeSettings(await chrome.storage.sync.get(null));
        const target = resolvePdfRedirect({
          url: details.url,
          pdfEnabled: settings.pdfEnabled,
          pdfAutoRedirect: settings.pdfAutoRedirect,
          viewerUrlPrefix,
        });
        if (!target) return;
        try {
          await chrome.tabs.update?.(details.tabId, { url: target });
        } catch {
          /* tab may have been closed */
        }
      },
    );
  }

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

        case "FETCH_PDF":
          void handleFetchPdf(message.url, sendResponse);
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

  /**
   * Fetch a PDF on behalf of the bundled viewer. Runs in the background
   * context so `<all_urls>` host permission applies and CORS does not
   * block cross-origin PDFs. Returns the bytes as a structured-cloneable
   * `Uint8Array` so the viewer can hand them directly to pdf.js.
   */
  async function handleFetchPdf(url: string, sendResponse: SendResponse): Promise<void> {
    try {
      if (!url) throw new Error("FETCH_PDF: empty url");
      // Defense-in-depth: only allow http(s). The viewer already
      // validates, but the background must not trust its callers.
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new Error("FETCH_PDF: invalid url");
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`FETCH_PDF: unsupported scheme ${parsed.protocol}`);
      }
      const res = await fetch(parsed.toString(), { credentials: "omit", redirect: "follow" });
      if (!res.ok) throw new Error(`FETCH_PDF: HTTP ${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      const response: FetchPdfResponse = {
        ok: true,
        bytesBase64: bytesToBase64(new Uint8Array(buf)),
        url: res.url || url,
      };
      sendResponse(response);
    } catch (err) {
      const response: FetchPdfResponse = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      sendResponse(response);
    }
  }

  void DEFAULT_SETTINGS;
}

/**
 * Convert a byte array to a base64 string. `btoa` only accepts binary
 * strings, and `String.fromCharCode(...huge)` can overflow the call
 * stack, so we chunk the input.
 */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
