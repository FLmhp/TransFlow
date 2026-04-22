import { Show, For, type Component } from "solid-js";
import {
  ENGINE_DESCRIPTORS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type TranslationEngine,
} from "@transflow/core";
import { loaded, settings, updateSettings } from "../shared/settings-store.js";

export const App: Component = () => {
  const toggleEnabled = (event: Event & { currentTarget: HTMLInputElement }) =>
    updateSettings({ enabled: event.currentTarget.checked });

  const setEngine = (engine: TranslationEngine) => updateSettings({ engine });

  const swapLangs = () => {
    const { sourceLang, targetLang } = settings();
    if (sourceLang === "auto") return;
    updateSettings({ sourceLang: targetLang, targetLang: sourceLang });
  };

  return (
    <Show when={loaded()} fallback={<div class="popup-loading">Loading…</div>}>
      <div class="popup-container">
        <header class="popup-header">
          <div class="logo">
            <span class="logo-icon">🌐</span>
            <span class="logo-text">TransFlow</span>
          </div>
          <label class="toggle-switch" title="Enable/Disable translation">
            <input type="checkbox" checked={settings().enabled} onChange={toggleEnabled} />
            <span class="slider" />
          </label>
        </header>

        <div class={`status-bar ${settings().enabled ? "active" : ""}`}>
          <span>{settings().enabled ? "✓ Translation active" : "Translation disabled"}</span>
        </div>

        <section class="section">
          <div class="row">
            <div class="field">
              <label>From</label>
              <select
                value={settings().sourceLang}
                onChange={(e) => updateSettings({ sourceLang: e.currentTarget.value })}
              >
                <For each={SOURCE_LANGUAGES}>
                  {(lang) => <option value={lang.code}>{lang.label}</option>}
                </For>
              </select>
            </div>
            <span class="swap-arrow" title="Swap languages" onClick={swapLangs}>
              ⇄
            </span>
            <div class="field">
              <label>To</label>
              <select
                value={settings().targetLang}
                onChange={(e) => updateSettings({ targetLang: e.currentTarget.value })}
              >
                <For each={TARGET_LANGUAGES}>
                  {(lang) => <option value={lang.code}>{lang.label}</option>}
                </For>
              </select>
            </div>
          </div>
        </section>

        <section class="section">
          <label class="section-label">Translation Engine</label>
          <div class="engine-grid">
            <For each={ENGINE_DESCRIPTORS}>
              {(engine) => (
                <label
                  class={`engine-option ${settings().engine === engine.id ? "selected" : ""}`}
                  onClick={() => setEngine(engine.id)}
                >
                  <input type="radio" name="engine" checked={settings().engine === engine.id} />
                  <span class="engine-icon">{engine.icon}</span>
                  <span>{engine.label}</span>
                </label>
              )}
            </For>
          </div>
        </section>

        <section class="section">
          <label class="section-label">Features</label>
          <div class="feature-list">
            <label class="feature-item">
              <input
                type="checkbox"
                checked={settings().pdfEnabled}
                onChange={(e) => updateSettings({ pdfEnabled: e.currentTarget.checked })}
              />
              <span>📄 PDF translation</span>
            </label>
            <label class="feature-item">
              <input
                type="checkbox"
                checked={settings().subtitleEnabled}
                onChange={(e) => updateSettings({ subtitleEnabled: e.currentTarget.checked })}
              />
              <span>🎬 Video subtitle translation</span>
            </label>
          </div>
        </section>

        <div class="popup-actions">
          <button class="btn-secondary" onClick={() => chrome.runtime.openOptionsPage()}>
            ⚙ Settings
          </button>
          <button
            class="btn-primary"
            onClick={async () => {
              await updateSettings({ enabled: true });
              window.close();
            }}
          >
            Translate Page
          </button>
        </div>
      </div>
    </Show>
  );
};
