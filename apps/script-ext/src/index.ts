/**
 * Tampermonkey / Userscript target for TransFlow.
 *
 * Runs as a single injected `.user.js` bundle inside the host page. Unlike
 * the WebExtension targets, there is no service worker, popup or options
 * page — we install an in-process runtime bridge that calls the translator
 * engines directly, persist settings through `GM_setValue` / `GM_getValue`,
 * and expose a handful of Tampermonkey menu commands as the user-facing UI.
 */
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from "@transflow/core";
import { TranslationCache, TranslatorRegistry } from "@transflow/translator";
import { googleTranslator } from "@transflow/google-translator";
import { openaiTranslator } from "@transflow/openai-translator";
import {
  installPlatform,
  startContent,
  toggleTranslation,
  applySettingsExternal,
  type RuntimeBridge,
  type UiBridge,
  type Unsubscribe,
} from "@transflow/shared-ext";

// ─── Greasemonkey / Tampermonkey API typing ──────────────────────────────

declare function GM_getValue<T>(name: string, defaultValue: T): T;
declare function GM_setValue(name: string, value: unknown): void;
declare function GM_registerMenuCommand(label: string, fn: () => void): number | void;

const STORAGE_KEY = "transflow:settings";

// ─── In-process translator ───────────────────────────────────────────────

const translationCache = new TranslationCache({
  maxEntries: DEFAULT_SETTINGS.cacheMaxEntries,
  ttlMs: DEFAULT_SETTINGS.cacheTtlMinutes * 60_000,
});
const translators = new TranslatorRegistry([googleTranslator, openaiTranslator], translationCache);

function loadSettings(): Settings {
  const raw = GM_getValue<Partial<Settings> | null>(STORAGE_KEY, null);
  return mergeSettings(raw);
}

function persistSettings(next: Settings): void {
  GM_setValue(STORAGE_KEY, next);
}

// ─── Bridge implementations ──────────────────────────────────────────────

type Listener<T> = (payload: T) => void;

const settingsListeners = new Set<Listener<Settings>>();
const toggleListeners = new Set<Listener<void>>();
const tooltipListeners = new Set<(text: string, isError: boolean) => void>();

function addListener<T>(set: Set<T>, fn: T): Unsubscribe {
  set.add(fn);
  return () => set.delete(fn);
}

function notifySettings(next: Settings): void {
  for (const cb of settingsListeners) cb(next);
}

const runtime: RuntimeBridge = {
  async getSettings() {
    return loadSettings();
  },
  async saveSettings(partial) {
    const next = { ...loadSettings(), ...partial };
    persistSettings(next);
    // Match the WebExtension behaviour where SETTINGS_UPDATED is broadcast
    // to listeners after a save.
    notifySettings(next);
  },
  async requestTranslation(text, sourceLang, targetLang) {
    const current = loadSettings();
    try {
      translationCache.configure({
        maxEntries: current.cacheMaxEntries,
        ttlMs: Math.max(1, current.cacheTtlMinutes) * 60_000,
      });
      const translated = await translators.translate({
        text,
        sourceLang: sourceLang ?? current.sourceLang,
        targetLang: targetLang ?? current.targetLang,
        settings: current,
      });
      return translated;
    } catch (err) {
      console.warn("[TransFlow] translation failed:", err);
      return null;
    }
  },
  onSettingsUpdated(cb) {
    return addListener(settingsListeners, cb);
  },
  onToggleTranslation(cb) {
    return addListener(toggleListeners, cb);
  },
  onShowTooltip(cb) {
    return addListener(tooltipListeners, cb);
  },
};

const ui: UiBridge = {
  async getSettings() {
    return loadSettings();
  },
  async saveSettings(next) {
    persistSettings(next);
    notifySettings(next);
  },
  async broadcastSettingsToActiveTab(next) {
    // In the userscript target there is exactly one execution context
    // (this page), so "broadcast" means "apply locally".
    await applySettingsExternal(next);
  },
  async broadcastSettingsToAllTabs(next) {
    await applySettingsExternal(next);
  },
  openOptionsPage() {
    openSettingsModal();
  },
};

installPlatform({ runtime, ui });

// ─── Minimal in-page settings modal ──────────────────────────────────────

const MODAL_ID = "transflow-userscript-settings";

function openSettingsModal(): void {
  if (document.getElementById(MODAL_ID)) return;

  const current = loadSettings();

  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.setAttribute(
    "style",
    [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,0.45)",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-family:system-ui,-apple-system,sans-serif",
      "font-size:14px",
      "color:#222",
    ].join(";"),
  );

  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    [
      "background:#fff",
      "border-radius:10px",
      "padding:20px 24px",
      "width:min(420px,92vw)",
      "max-height:82vh",
      "overflow:auto",
      "box-shadow:0 12px 48px rgba(0,0,0,0.3)",
    ].join(";"),
  );

  panel.innerHTML = `
    <h2 style="margin:0 0 12px;font-size:18px;display:flex;align-items:center;gap:8px">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20"/><path d="M2 12h20"/></svg>
      TransFlow 设置
    </h2>
    <label style="display:flex;align-items:center;gap:8px;margin:8px 0">
      <input type="checkbox" id="tf-enabled" /> 启用翻译
    </label>
    <label style="display:block;margin:10px 0 4px">引擎</label>
    <select id="tf-engine" style="width:100%;padding:6px">
      <option value="google">Google 谷歌翻译（免费）</option>
      <option value="openai">OpenAI GPT</option>
    </select>
    <label style="display:block;margin:10px 0 4px">目标语言</label>
    <input id="tf-target" type="text" style="width:100%;padding:6px;box-sizing:border-box" />
    <label style="display:block;margin:10px 0 4px">OpenAI API Key</label>
    <input id="tf-key" type="password" style="width:100%;padding:6px;box-sizing:border-box" placeholder="sk-..." />
    <label style="display:block;margin:10px 0 4px">OpenAI Base URL</label>
    <input id="tf-base" type="text" style="width:100%;padding:6px;box-sizing:border-box" />
    <label style="display:block;margin:10px 0 4px">OpenAI 模型</label>
    <input id="tf-model" type="text" style="width:100%;padding:6px;box-sizing:border-box" />
    <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:8px">
      <button id="tf-cancel" style="padding:6px 14px;border:1px solid #ccc;background:#fff;border-radius:6px;cursor:pointer">取消</button>
      <button id="tf-save" style="padding:6px 14px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer">保存</button>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function required<T extends HTMLElement>(selector: string, ctor: new () => T): T {
    const el = panel.querySelector(selector);
    if (!(el instanceof ctor)) {
      throw new Error(`[TransFlow] missing element ${selector}`);
    }
    return el;
  }
  const enabledEl = required("#tf-enabled", HTMLInputElement);
  const engineEl = required("#tf-engine", HTMLSelectElement);
  const targetEl = required("#tf-target", HTMLInputElement);
  const keyEl = required("#tf-key", HTMLInputElement);
  const baseEl = required("#tf-base", HTMLInputElement);
  const modelEl = required("#tf-model", HTMLInputElement);
  const cancelEl = required("#tf-cancel", HTMLButtonElement);
  const saveEl = required("#tf-save", HTMLButtonElement);

  enabledEl.checked = current.enabled;
  engineEl.value = current.engine;
  targetEl.value = current.targetLang;
  keyEl.value = current.openaiApiKey;
  baseEl.value = current.openaiBaseUrl;
  modelEl.value = current.openaiModel;

  const close = () => overlay.remove();
  cancelEl.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  saveEl.addEventListener("click", () => {
    const engine: Settings["engine"] = engineEl.value === "openai" ? "openai" : "google";
    const next: Settings = {
      ...current,
      enabled: enabledEl.checked,
      engine,
      targetLang: targetEl.value.trim() || current.targetLang,
      openaiApiKey: keyEl.value,
      openaiBaseUrl: baseEl.value.trim() || current.openaiBaseUrl,
      openaiModel: modelEl.value.trim() || current.openaiModel,
    };
    persistSettings(next);
    void applySettingsExternal(next);
    close();
  });
}

// ─── Tampermonkey menu commands ──────────────────────────────────────────

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand("TransFlow: 切换整页翻译", () => {
    toggleTranslation();
    for (const cb of toggleListeners) cb();
  });
  GM_registerMenuCommand("TransFlow: 打开设置", () => {
    openSettingsModal();
  });
}

// ─── Boot the shared content pipeline ────────────────────────────────────

startContent();
