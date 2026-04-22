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
    void updateSettings({ sourceLang: targetLang, targetLang: sourceLang });
  };

  return (
    <Show when={loaded()} fallback={<div class="popup-loading">加载中…</div>}>
      <div class="popup-container">
        <header class="popup-header">
          <div class="logo">
            <span class="logo-icon">🌐</span>
            <span class="logo-text">TransFlow</span>
          </div>
          <label class="toggle-switch" title="启用/停用翻译">
            <input type="checkbox" checked={settings().enabled} onChange={toggleEnabled} />
            <span class="slider" />
          </label>
        </header>

        <div class={`status-bar ${settings().enabled ? "active" : ""}`}>
          <span>{settings().enabled ? "✓ 翻译已启用" : "翻译已停用"}</span>
        </div>

        <section class="section">
          <div class="row">
            <div class="field">
              <label>源语言</label>
              <select
                value={settings().sourceLang}
                onChange={(e) => updateSettings({ sourceLang: e.currentTarget.value })}
              >
                <For each={SOURCE_LANGUAGES}>
                  {(lang) => <option value={lang.code}>{lang.label}</option>}
                </For>
              </select>
            </div>
            <span class="swap-arrow" title="交换语言" onClick={swapLangs}>
              ⇄
            </span>
            <div class="field">
              <label>目标语言</label>
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
          <label class="section-label">翻译引擎</label>
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
          <label class="section-label">功能</label>
          <div class="feature-list">
            <label class="feature-item">
              <input
                type="checkbox"
                checked={settings().pdfEnabled}
                onChange={(e) => updateSettings({ pdfEnabled: e.currentTarget.checked })}
              />
              <span>📄 PDF 翻译</span>
            </label>
            <label class="feature-item">
              <input
                type="checkbox"
                checked={settings().subtitleEnabled}
                onChange={(e) => updateSettings({ subtitleEnabled: e.currentTarget.checked })}
              />
              <span>🎬 视频字幕翻译</span>
            </label>
          </div>
        </section>

        <div class="popup-actions">
          <button class="btn-secondary" onClick={() => chrome.runtime.openOptionsPage()}>
            ⚙ 设置
          </button>
          <button
            class="btn-primary"
            onClick={async () => {
              await updateSettings({ enabled: true });
              window.close();
            }}
          >
            翻译本页
          </button>
        </div>
      </div>
    </Show>
  );
};
