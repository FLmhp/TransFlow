import { Show, For, type Component } from "solid-js";
import {
  Globe,
  ArrowLeftRight,
  Settings,
  Check,
  FileText,
  Captions,
  Search,
  Bot,
} from "lucide-solid";
import {
  ENGINE_DESCRIPTORS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type TranslationEngine,
} from "@transflow/core";
import { loaded, settings, updateSettings } from "../shared/settings-store.js";
import { getUi } from "../platform/registry.js";
import * as s from "./styles.js";

const ENGINE_ICONS: Record<TranslationEngine, () => ReturnType<typeof Search>> = {
  google: () => <Search size={18} />,
  openai: () => <Bot size={18} />,
};

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
    <Show when={loaded()} fallback={<div class={s.popupLoading}>加载中…</div>}>
      <div class={s.popupContainer}>
        <header class={s.popupHeader}>
          <div class={s.logo}>
            <span class={s.logoIcon}>
              <Globe size={20} />
            </span>
            <span class={s.logoText}>TransFlow</span>
          </div>
          <label class={s.toggleSwitch} title="启用/停用翻译">
            <input type="checkbox" checked={settings().enabled} onChange={toggleEnabled} />
            <span class={s.slider} />
          </label>
        </header>

        <div class={`${s.statusBar} ${settings().enabled ? "active" : ""}`}>
          <span class={s.statusContent}>
            <Show when={settings().enabled}>
              <Check size={12} />
            </Show>
            {settings().enabled ? "翻译已启用" : "翻译已停用"}
          </span>
        </div>

        <section class={s.section}>
          <div class={s.row}>
            <div class={s.field}>
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
            <span class={s.swapArrow} title="交换语言" onClick={swapLangs}>
              <ArrowLeftRight size={18} />
            </span>
            <div class={s.field}>
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

        <section class={s.section}>
          <label class={s.sectionLabel}>翻译引擎</label>
          <div class={s.engineGrid}>
            <For each={ENGINE_DESCRIPTORS}>
              {(engine) => (
                <label
                  class={`${s.engineOption} ${settings().engine === engine.id ? "selected" : ""}`}
                  onClick={() => setEngine(engine.id)}
                >
                  <input type="radio" name="engine" checked={settings().engine === engine.id} />
                  <span class={s.engineIcon}>{ENGINE_ICONS[engine.id]()}</span>
                  <span>{engine.label}</span>
                </label>
              )}
            </For>
          </div>
        </section>

        <section class={s.section}>
          <label class={s.sectionLabel}>功能</label>
          <div class={s.featureList}>
            <label class={s.featureItem}>
              <input
                type="checkbox"
                checked={settings().pdfEnabled}
                onChange={(e) => updateSettings({ pdfEnabled: e.currentTarget.checked })}
              />
              <FileText size={14} />
              <span>PDF 翻译</span>
            </label>
            <label class={s.featureItem}>
              <input
                type="checkbox"
                checked={settings().subtitleEnabled}
                onChange={(e) => updateSettings({ subtitleEnabled: e.currentTarget.checked })}
              />
              <Captions size={14} />
              <span>视频字幕翻译</span>
            </label>
          </div>
        </section>

        <div class={s.popupActions}>
          <button class={s.btnSecondary} onClick={() => getUi().openOptionsPage?.()}>
            <Settings size={14} />
            设置
          </button>
          <button
            class={s.btnPrimary}
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
