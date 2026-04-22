import { createSignal, Show, For, type Component } from 'solid-js';
import {
  DEFAULT_SETTINGS,
  ENGINE_DESCRIPTORS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type Settings,
  type TranslationEngine,
} from '@transflow/core';
import {
  broadcastSettingsToAllTabs,
  loaded,
  settings,
  updateSettings,
} from '../shared/settings-store.js';

type Section = 'general' | 'engines' | 'appearance' | 'about';

const OPENAI_MODELS: readonly { value: string; label: string }[] = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (recommended, fast & cheap)' },
  { value: 'gpt-4o', label: 'gpt-4o (best quality)' },
  { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
  { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo (fastest)' },
];

const GEMINI_MODELS: readonly { value: string; label: string }[] = [
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (fast)' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro (best quality)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
];

export const App: Component = () => {
  const [active, setActive] = createSignal<Section>('general');
  const [bannerVisible, setBannerVisible] = createSignal(false);
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;

  const showBanner = () => {
    setBannerVisible(true);
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => setBannerVisible(false), 2500);
  };

  const update = async (partial: Partial<Settings>): Promise<void> => {
    await updateSettings(partial);
  };

  const onSave = async () => {
    await broadcastSettingsToAllTabs();
    showBanner();
  };

  const onReset = async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    await updateSettings({ ...DEFAULT_SETTINGS });
    showBanner();
  };

  return (
    <Show when={loaded()} fallback={<div class="loading">Loading…</div>}>
      <div class="page">
        <nav class="sidebar">
          <div class="sidebar-logo">
            <span>🌐</span>
            <span>TransFlow</span>
          </div>
          <ul class="sidebar-nav">
            <For each={[
              { id: 'general', label: '⚙ General' },
              { id: 'engines', label: '🔧 Engines' },
              { id: 'appearance', label: '🎨 Appearance' },
              { id: 'about', label: 'ℹ About' },
            ] as const}>
              {(item) => (
                <li>
                  <a
                    href={`#${item.id}`}
                    class={`nav-link ${active() === item.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActive(item.id);
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </nav>

        <main class="content">
          <Show when={bannerVisible()}>
            <div class="save-banner">✓ Settings saved</div>
          </Show>

          <Show when={active() === 'general'}>
            <section class="settings-section">
              <h2>General Settings</h2>

              <div class="card">
                <h3>Languages</h3>
                <div class="form-row">
                  <label>Source language</label>
                  <select
                    value={settings().sourceLang}
                    onChange={(e) => void update({ sourceLang: e.currentTarget.value })}
                  >
                    <For each={SOURCE_LANGUAGES}>
                      {(lang) => <option value={lang.code}>{lang.label}</option>}
                    </For>
                  </select>
                </div>
                <div class="form-row">
                  <label>Target language</label>
                  <select
                    value={settings().targetLang}
                    onChange={(e) => void update({ targetLang: e.currentTarget.value })}
                  >
                    <For each={TARGET_LANGUAGES}>
                      {(lang) => <option value={lang.code}>{lang.label}</option>}
                    </For>
                  </select>
                </div>
              </div>

              <div class="card">
                <h3>Features</h3>
                <div class="form-row toggle-row">
                  <span>Enable PDF translation</span>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings().pdfEnabled}
                      onChange={(e) => void update({ pdfEnabled: e.currentTarget.checked })}
                    />
                    <span class="slider" />
                  </label>
                </div>
                <div class="form-row toggle-row">
                  <span>Enable video subtitle translation</span>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings().subtitleEnabled}
                      onChange={(e) => void update({ subtitleEnabled: e.currentTarget.checked })}
                    />
                    <span class="slider" />
                  </label>
                </div>
                <div class="form-row toggle-row">
                  <span>Show original text alongside translation</span>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings().showOriginal}
                      onChange={(e) => void update({ showOriginal: e.currentTarget.checked })}
                    />
                    <span class="slider" />
                  </label>
                </div>
                <div class="form-row">
                  <label>Translation position</label>
                  <select
                    value={settings().translationPosition}
                    onChange={(e) =>
                      void update({ translationPosition: e.currentTarget.value as 'below' | 'above' })
                    }
                  >
                    <option value="below">Below original</option>
                    <option value="above">Above original</option>
                  </select>
                </div>
              </div>
            </section>
          </Show>

          <Show when={active() === 'engines'}>
            <section class="settings-section">
              <h2>Translation Engines</h2>
              <div class="card">
                <h3>Active Engine</h3>
                <div class="form-row">
                  <label>Select engine</label>
                  <select
                    value={settings().engine}
                    onChange={(e) =>
                      void update({ engine: e.currentTarget.value as TranslationEngine })
                    }
                  >
                    <For each={ENGINE_DESCRIPTORS}>
                      {(engine) => <option value={engine.id}>{engine.label} — {engine.description}</option>}
                    </For>
                  </select>
                </div>
              </div>

              <Show when={settings().engine === 'google'}>
                <div class="card">
                  <h3>🔍 Google Translate</h3>
                  <p class="hint">Free Google Translate web API. No API key needed. Rate limits may apply.</p>
                </div>
              </Show>

              <Show when={settings().engine === 'deepl'}>
                <div class="card">
                  <h3>📘 DeepL</h3>
                  <div class="form-row">
                    <label>DeepL API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your DeepL API key"
                      value={settings().deeplApiKey}
                      onInput={(e) => void update({ deeplApiKey: e.currentTarget.value })}
                    />
                  </div>
                  <div class="form-row toggle-row">
                    <span>Use DeepL Pro endpoint</span>
                    <label class="toggle-switch">
                      <input
                        type="checkbox"
                        checked={settings().deeplIsPro}
                        onChange={(e) => void update({ deeplIsPro: e.currentTarget.checked })}
                      />
                      <span class="slider" />
                    </label>
                  </div>
                  <p class="hint">
                    Get a free API key at{' '}
                    <a href="https://www.deepl.com/pro-api" target="_blank" rel="noreferrer">
                      deepl.com/pro-api
                    </a>
                  </p>
                </div>
              </Show>

              <Show when={settings().engine === 'openai'}>
                <div class="card">
                  <h3>🤖 OpenAI GPT</h3>
                  <div class="form-row">
                    <label>OpenAI API Key</label>
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={settings().openaiApiKey}
                      onInput={(e) => void update({ openaiApiKey: e.currentTarget.value })}
                    />
                  </div>
                  <div class="form-row">
                    <label>Model</label>
                    <select
                      value={settings().openaiModel}
                      onChange={(e) => void update({ openaiModel: e.currentTarget.value })}
                    >
                      <For each={OPENAI_MODELS}>
                        {(m) => <option value={m.value}>{m.label}</option>}
                      </For>
                    </select>
                  </div>
                  <p class="hint">
                    Get an API key at{' '}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                      platform.openai.com
                    </a>
                  </p>
                </div>
              </Show>

              <Show when={settings().engine === 'gemini'}>
                <div class="card">
                  <h3>✨ Google Gemini</h3>
                  <div class="form-row">
                    <label>Gemini API Key</label>
                    <input
                      type="password"
                      placeholder="Enter your Gemini API key"
                      value={settings().geminiApiKey}
                      onInput={(e) => void update({ geminiApiKey: e.currentTarget.value })}
                    />
                  </div>
                  <div class="form-row">
                    <label>Model</label>
                    <select
                      value={settings().geminiModel}
                      onChange={(e) => void update({ geminiModel: e.currentTarget.value })}
                    >
                      <For each={GEMINI_MODELS}>
                        {(m) => <option value={m.value}>{m.label}</option>}
                      </For>
                    </select>
                  </div>
                  <p class="hint">
                    Get an API key at{' '}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                      Google AI Studio
                    </a>
                  </p>
                </div>
              </Show>
            </section>
          </Show>

          <Show when={active() === 'appearance'}>
            <section class="settings-section">
              <h2>Appearance</h2>
              <div class="card">
                <h3>Translation Style</h3>
                <div class="form-row">
                  <label>Translation text color</label>
                  <input
                    type="color"
                    value={settings().translationColor}
                    onInput={(e) => void update({ translationColor: e.currentTarget.value })}
                  />
                </div>
                <div class="form-row">
                  <label>Font size relative to page (%)</label>
                  <input
                    type="range"
                    min="70"
                    max="120"
                    step="5"
                    value={settings().translationFontSize}
                    onInput={(e) =>
                      void update({ translationFontSize: Number(e.currentTarget.value) })
                    }
                  />
                  <span class="range-label">{settings().translationFontSize}%</span>
                </div>
              </div>
              <div class="card">
                <h3>Preview</h3>
                <p class="preview-original">The quick brown fox jumps over the lazy dog.</p>
                <p
                  class="preview-translation"
                  style={{
                    color: settings().translationColor,
                    'border-left-color': settings().translationColor,
                    'font-size': `${settings().translationFontSize}%`,
                  }}
                >
                  快速的棕色狐狸跳过了懒狗。
                </p>
              </div>
            </section>
          </Show>

          <Show when={active() === 'about'}>
            <section class="settings-section">
              <h2>About TransFlow</h2>
              <div class="card">
                <h3>TransFlow v1.0.0</h3>
                <p>An immersive bilingual translation Chrome extension supporting:</p>
                <ul class="feature-list">
                  <li>🌐 Real-time bilingual webpage translation</li>
                  <li>📄 PDF document translation (PDF.js text layer)</li>
                  <li>🎬 Video subtitle translation (YouTube, Netflix, and more)</li>
                  <li>🤖 Machine translation: Google Translate, DeepL</li>
                  <li>✨ LLM translation: OpenAI GPT, Google Gemini</li>
                  <li>🖱 Right-click context menu to translate selected text</li>
                </ul>
              </div>
            </section>
          </Show>

          <div class="save-row">
            <button class="btn-primary" onClick={onSave}>Save &amp; Apply</button>
            <button class="btn-secondary" onClick={onReset}>Reset to Defaults</button>
          </div>
        </main>
      </div>
    </Show>
  );
};
