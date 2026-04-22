/**
 * TransFlow background service worker (Manifest V3).
 *
 * Responsibilities:
 *  - Own the single source of truth for settings (via `chrome.storage.sync`).
 *  - Dispatch translation requests to the registered translator engines.
 *  - Register context-menus and route their actions to the content script.
 *  - Route messages between popup/options and active tabs.
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

// Single shared registry. To add a new engine: implement the abstract
// `Translator` class in its own package and register it here.
const translationCache = new TranslationCache({
  maxEntries: DEFAULT_SETTINGS.cacheMaxEntries,
  ttlMs: DEFAULT_SETTINGS.cacheTtlMinutes * 60_000,
});
const translators = new TranslatorRegistry(
  [googleTranslator, openaiTranslator],
  translationCache,
);
const translate = (request: Parameters<typeof translators.translate>[0]) => {
  // Apply the user's current cache sizing/TTL before each request so edits
  // in the options page take effect immediately (shrinking `maxEntries`
  // evicts oldest entries synchronously).
  translationCache.configure({
    maxEntries: request.settings.cacheMaxEntries,
    ttlMs: Math.max(1, request.settings.cacheTtlMinutes) * 60_000,
  });
  return translators.translate(request);
};

// ─── Install / startup ────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const current = (await chrome.storage.sync.get(null)) as Partial<Settings>;
  await chrome.storage.sync.set(mergeSettings(current));
  installContextMenus();
});

chrome.runtime.onStartup.addListener(installContextMenus);

// ─── Context menus ────────────────────────────────────────────────────────────

function installContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "translateSelection",
      title: "Translate selection with TransFlow",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "toggleTranslation",
      title: "Toggle page translation",
      contexts: ["page"],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
});

// ─── Message bus ──────────────────────────────────────────────────────────────

type SendResponse = (response: unknown) => void;

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse: SendResponse) => {
  switch (message.type) {
    case "TRANSLATE":
      void handleTranslate(message, sendResponse);
      return true; // async

    case "GET_SETTINGS":
      void chrome.storage.sync.get(null).then((data) => sendResponse(mergeSettings(data)));
      return true;

    case "SAVE_SETTINGS":
      void chrome.storage.sync.set(message.settings).then(() => sendResponse({ ok: true }));
      return true;

    default:
      return false;
  }
});

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

// Export the DEFAULT_SETTINGS reference so tree-shakers don't complain
// about unused imports (and so the constant is always included for
// `chrome.runtime.onInstalled` — handled above).
void DEFAULT_SETTINGS;
