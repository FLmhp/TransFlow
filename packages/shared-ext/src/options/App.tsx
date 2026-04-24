import { createSignal, Show, For, type Component, type JSX } from "solid-js";
import {
  Globe,
  Settings as SettingsIcon,
  Server,
  Database,
  Info,
  Search,
  Bot,
  Languages,
  Zap,
  Palette,
  FileText,
  Captions,
  MousePointer,
  Sparkles,
  Check,
} from "lucide-solid";
import {
  DEFAULT_SETTINGS,
  SOURCE_LANGUAGES,
  TARGET_LANGUAGES,
  type Settings,
} from "@transflow/core";
import {
  broadcastSettingsToAllTabs,
  loaded,
  settings,
  updateSettings,
} from "../shared/settings-store.js";
import * as s from "./styles.js";

type Section = "general" | "services" | "advanced" | "about";

const OPENAI_MODELS: readonly { value: string; label: string }[] = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini（推荐，快速且经济）" },
  { value: "gpt-4o", label: "gpt-4o（质量最佳）" },
  { value: "gpt-4-turbo", label: "gpt-4-turbo" },
  { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo（最快）" },
];

const NAV_ITEMS: readonly { id: Section; label: string; icon: () => JSX.Element }[] = [
  { id: "general", label: "常规", icon: () => <SettingsIcon size={16} /> },
  { id: "services", label: "翻译服务", icon: () => <Server size={16} /> },
  { id: "advanced", label: "高级设置", icon: () => <Database size={16} /> },
  { id: "about", label: "关于", icon: () => <Info size={16} /> },
];

export const App: Component = () => {
  const [active, setActive] = createSignal<Section>("general");
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
    if (!confirm("确定要将所有设置恢复为默认值吗？")) return;
    await updateSettings({ ...DEFAULT_SETTINGS });
    showBanner();
  };

  return (
    <Show when={loaded()} fallback={<div class={s.loading}>加载中…</div>}>
      <div class={s.page}>
        <nav class={s.sidebar}>
          <div class={s.sidebarLogo}>
            <Globe size={20} />
            <span>TransFlow</span>
          </div>
          <ul class={s.sidebarNav}>
            <For each={NAV_ITEMS}>
              {(item) => (
                <li>
                  <a
                    href={`#${item.id}`}
                    class={`${s.navLink} ${active() === item.id ? "active" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActive(item.id);
                    }}
                  >
                    <span class={s.navIcon}>{item.icon()}</span>
                    {item.label}
                  </a>
                </li>
              )}
            </For>
          </ul>
        </nav>

        <main class={s.content}>
          <Show when={bannerVisible()}>
            <div class={s.saveBanner}>
              <Check size={14} />
              设置已保存
            </div>
          </Show>

          {/* ── 常规 ────────────────────────────────────────── */}
          <Show when={active() === "general"}>
            <section>
              <h2>常规</h2>

              <div class={s.card}>
                <h3>
                  <Languages size={16} />
                  翻译语言
                </h3>
                <div class={s.formRow}>
                  <label>源语言</label>
                  <select
                    value={settings().sourceLang}
                    onChange={(e) => void update({ sourceLang: e.currentTarget.value })}
                  >
                    <For each={SOURCE_LANGUAGES}>
                      {(lang) => <option value={lang.code}>{lang.label}</option>}
                    </For>
                  </select>
                </div>
                <div class={s.formRow}>
                  <label>目标语言</label>
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

              <div class={s.card}>
                <h3>
                  <Zap size={16} />
                  翻译功能
                </h3>
                <div class={`${s.formRow} toggle-row`}>
                  <span>启用 PDF 翻译</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().pdfEnabled}
                      onChange={(e) => void update({ pdfEnabled: e.currentTarget.checked })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={`${s.formRow} toggle-row`}>
                  <span>自动用 TransFlow 查看器打开 .pdf 链接</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().pdfAutoRedirect}
                      disabled={!settings().pdfEnabled}
                      onChange={(e) => void update({ pdfAutoRedirect: e.currentTarget.checked })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={`${s.formRow} toggle-row`}>
                  <span>启用视频字幕翻译</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().subtitleEnabled}
                      onChange={(e) => void update({ subtitleEnabled: e.currentTarget.checked })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={`${s.formRow} toggle-row`}>
                  <span>同时显示原文与译文</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().showOriginal}
                      onChange={(e) => void update({ showOriginal: e.currentTarget.checked })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={s.formRow}>
                  <label>译文位置</label>
                  <select
                    value={settings().translationPosition}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      if (value === "above" || value === "below") {
                        void update({ translationPosition: value });
                      }
                    }}
                  >
                    <option value="below">原文下方</option>
                    <option value="above">原文上方</option>
                  </select>
                </div>
              </div>

              <div class={s.card}>
                <h3>
                  <Palette size={16} />
                  翻译外观
                </h3>
                <div class={s.formRow}>
                  <label>译文样式</label>
                  <select
                    value={settings().translationTheme}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      if (
                        value === "normal" ||
                        value === "underline" ||
                        value === "dashed" ||
                        value === "highlight" ||
                        value === "mask"
                      ) {
                        void update({ translationTheme: value });
                      }
                    }}
                  >
                    <option value="normal">常规（色条边框）</option>
                    <option value="underline">下划线</option>
                    <option value="dashed">虚线下划线</option>
                    <option value="highlight">高亮背景</option>
                    <option value="mask">模糊遮罩（悬停显示）</option>
                  </select>
                </div>
                <div class={s.formRow}>
                  <label>译文文字颜色</label>
                  <input
                    type="color"
                    value={settings().translationColor}
                    onInput={(e) => void update({ translationColor: e.currentTarget.value })}
                  />
                </div>
                <div class={s.formRow}>
                  <label>相对页面的字号（%）</label>
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
                  <span class={s.rangeLabel}>{settings().translationFontSize}%</span>
                </div>
              </div>

              <div class={s.card}>
                <h3>预览</h3>
                <Show when={settings().showOriginal}>
                  <p class={s.previewOriginal}>The quick brown fox jumps over the lazy dog.</p>
                </Show>
                <p
                  class={`${s.previewTranslation} preview-theme-${settings().translationTheme}`}
                  style={{
                    color: settings().translationColor,
                    "--transflow-color": settings().translationColor,
                    "font-size": `${settings().translationFontSize}%`,
                  }}
                >
                  快速的棕色狐狸跳过了懒狗。
                </p>
              </div>
            </section>
          </Show>

          {/* ── 翻译服务 ─────────────────────────────────────── */}
          <Show when={active() === "services"}>
            <section>
              <h2>翻译服务</h2>

              <div class={s.card}>
                <h3>
                  <Search size={16} />
                  Google 翻译
                </h3>
                <p class={s.hint}>免费的谷歌翻译网页接口，无需 API 密钥，可能存在速率限制。</p>
                <div class={`${s.formRow} toggle-row`}>
                  <span>使用 Google 翻译</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().engine === "google"}
                      onChange={() => void update({ engine: "google" })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
              </div>

              <div class={s.card}>
                <h3>
                  <Bot size={16} />
                  OpenAI
                </h3>
                <div class={`${s.formRow} toggle-row`}>
                  <span>使用 OpenAI 翻译</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().engine === "openai"}
                      onChange={() => void update({ engine: "openai" })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={s.formRow}>
                  <label>OpenAI API 密钥</label>
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={settings().openaiApiKey}
                    onInput={(e) => void update({ openaiApiKey: e.currentTarget.value })}
                  />
                </div>
                <div class={s.formRow}>
                  <label>Base URL</label>
                  <input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={settings().openaiBaseUrl}
                    onInput={(e) => void update({ openaiBaseUrl: e.currentTarget.value })}
                  />
                </div>
                <div class={s.formRow}>
                  <label>模型</label>
                  <select
                    value={settings().openaiModel}
                    onChange={(e) => void update({ openaiModel: e.currentTarget.value })}
                  >
                    <For each={OPENAI_MODELS}>
                      {(m) => <option value={m.value}>{m.label}</option>}
                    </For>
                  </select>
                </div>
                <p class={s.hint}>
                  可在{" "}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                    platform.openai.com
                  </a>{" "}
                  获取 API 密钥。如需使用 OpenAI 兼容的服务，可自定义 Base URL。
                </p>
              </div>
            </section>
          </Show>

          {/* ── 高级设置 ─────────────────────────────────────── */}
          <Show when={active() === "advanced"}>
            <section>
              <h2>高级设置</h2>

              <div class={s.card}>
                <h3>
                  <Database size={16} />
                  缓存设置
                </h3>
                <p class={s.hint}>
                  在内存中缓存相同的翻译结果，以减少接口调用并降低延迟。缓存仅在当前浏览器会话内有效。
                </p>
                <div class={`${s.formRow} toggle-row`}>
                  <span>启用翻译缓存</span>
                  <label class={s.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={settings().cacheEnabled}
                      onChange={(e) => void update({ cacheEnabled: e.currentTarget.checked })}
                    />
                    <span class={s.slider} />
                  </label>
                </div>
                <div class={s.formRow}>
                  <label>条目有效期（分钟）</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={settings().cacheTtlMinutes}
                    onInput={(e) => {
                      const value = Math.max(1, Math.floor(Number(e.currentTarget.value) || 0));
                      void update({ cacheTtlMinutes: value });
                    }}
                  />
                </div>
                <div class={s.formRow}>
                  <label>最大条目数（LRU）</label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={settings().cacheMaxEntries}
                    onInput={(e) => {
                      const value = Math.max(1, Math.floor(Number(e.currentTarget.value) || 0));
                      void update({ cacheMaxEntries: value });
                    }}
                  />
                </div>
              </div>
            </section>
          </Show>

          {/* ── 关于 ────────────────────────────────────────── */}
          <Show when={active() === "about"}>
            <section>
              <h2>关于 TransFlow</h2>
              <div class={s.card}>
                <h3>TransFlow v1.0.0</h3>
                <p>一款沉浸式双语翻译 Chrome 扩展，支持以下功能：</p>
                <ul class={s.featureList}>
                  <li>
                    <Globe size={14} />
                    实时双语网页翻译
                  </li>
                  <li>
                    <FileText size={14} />
                    PDF 文档翻译（PDF.js 文本层）
                  </li>
                  <li>
                    <Captions size={14} />
                    视频字幕翻译（YouTube、Netflix 等）
                  </li>
                  <li>
                    <Search size={14} />
                    机器翻译：谷歌翻译
                  </li>
                  <li>
                    <Sparkles size={14} />
                    大模型翻译：OpenAI GPT（及兼容服务）
                  </li>
                  <li>
                    <MousePointer size={14} />
                    右键菜单翻译所选文本
                  </li>
                </ul>
              </div>
            </section>
          </Show>

          <div class={s.saveRow}>
            <button class={s.btnPrimary} onClick={onSave}>
              保存并应用
            </button>
            <button class={s.btnSecondary} onClick={onReset}>
              恢复默认设置
            </button>
          </div>
        </main>
      </div>
    </Show>
  );
};
