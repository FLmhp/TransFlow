/**
 * TransFlow background service worker (Manifest V3)
 * Handles translation API calls, context menus, and settings.
 */
import { translate } from './translators/index.js';

// ─── Default settings ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  enabled: false,
  engine: 'google',       // 'google' | 'deepl' | 'openai' | 'gemini'
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  deeplApiKey: '',
  deeplIsPro: false,
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  showOriginal: true,     // show original text alongside translation
  translationPosition: 'below', // 'below' | 'above'
  pdfEnabled: true,
  subtitleEnabled: true,
};

// ─── Initialise storage on install ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  const merged = { ...DEFAULT_SETTINGS, ...current };
  await chrome.storage.sync.set(merged);
  setupContextMenus();
});

chrome.runtime.onStartup.addListener(setupContextMenus);

// ─── Context menus ───────────────────────────────────────────────────────────

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'translateSelection',
      title: 'Translate selection with TransFlow',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'toggleTranslation',
      title: 'Toggle page translation',
      contexts: ['page'],
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translateSelection' && info.selectionText) {
    const settings = await chrome.storage.sync.get(null);
    try {
      const result = await translate(
        info.selectionText,
        settings.sourceLang,
        settings.targetLang,
        settings
      );
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TOOLTIP',
        text: result,
      });
    } catch (err) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_ERROR',
        text: err.message,
      });
    }
  } else if (info.menuItemId === 'toggleTranslation') {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_TRANSLATION' });
  }
});

// ─── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRANSLATE') {
    handleTranslate(message, sendResponse);
    return true; // keep channel open for async response
  }
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get(null).then(sendResponse);
    return true;
  }
  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.sync.set(message.settings).then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handleTranslate(message, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(null);
    const translated = await translate(
      message.text,
      message.sourceLang || settings.sourceLang,
      message.targetLang || settings.targetLang,
      settings
    );
    sendResponse({ ok: true, translated });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
}
