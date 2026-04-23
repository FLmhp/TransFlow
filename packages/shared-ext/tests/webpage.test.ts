// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "@transflow/core";
import { installPlatform } from "../src/platform/registry.js";
import type { RuntimeBridge } from "../src/platform/types.js";
import { createWebpageModule } from "../src/content/webpage.js";

/**
 * jsdom does not implement `HTMLElement.innerText` (it returns
 * `undefined`), but the webpage module relies on it to detect
 * candidate blocks. Polyfill it here as `textContent` so the module's
 * candidate filter sees real text in tests.
 */
beforeAll(() => {
  if (!("innerText" in HTMLElement.prototype)) {
    Object.defineProperty(HTMLElement.prototype, "innerText", {
      configurable: true,
      get(this: HTMLElement) {
        return this.textContent ?? "";
      },
      set(this: HTMLElement, value: string) {
        this.textContent = value;
      },
    });
  }
});

/**
 * Stub runtime bridge that resolves translations from a fixed dictionary.
 * Returning a marked-up Chinese string keeps assertions readable while
 * exercising the same code path the real engines hit.
 */
function makeBridge(dict: Record<string, string>): RuntimeBridge {
  return {
    getSettings: async () => DEFAULT_SETTINGS,
    saveSettings: async () => {},
    requestTranslation: async (text) => dict[text.trim()] ?? `[t]${text}`,
    onSettingsUpdated: () => () => {},
    onToggleTranslation: () => () => {},
    onShowTooltip: () => () => {},
  };
}

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  enabled: true,
  showOriginal: true,
};

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("webpage translation module", () => {
  it("translates the broadened set of block tags (dt/dd/caption/summary)", async () => {
    installPlatform({
      runtime: makeBridge({
        Term: "术语",
        Definition: "定义",
        Caption: "标题",
        "Click to expand": "点击展开",
      }),
    });

    document.body.innerHTML = `
      <dl>
        <dt>Term</dt>
        <dd>Definition</dd>
      </dl>
      <table><caption>Caption</caption><tr><td>x</td></tr></table>
      <details><summary>Click to expand</summary></details>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    // Each newly-supported tag should now carry a translation child.
    expect(document.querySelector("dt .transflow-translation")?.textContent).toContain("术语");
    expect(document.querySelector("dd .transflow-translation")?.textContent).toContain("定义");
    expect(document.querySelector("caption .transflow-translation")?.textContent).toContain("标题");
    expect(document.querySelector("summary .transflow-translation")?.textContent).toContain(
      "点击展开",
    );

    mod.stop();
  });

  it("preserves hyperlinks from the original block alongside the translation", async () => {
    installPlatform({
      runtime: makeBridge({
        "Visit example for more information.": "访问示例了解更多信息。",
      }),
    });

    document.body.innerHTML = `
      <p>Visit <a href="https://example.com/docs">example</a> for more information.</p>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    const translation = document.querySelector(".transflow-translation");
    expect(translation).not.toBeNull();
    // The translated text is rendered.
    expect(translation!.textContent).toContain("访问示例了解更多信息。");

    // The preserved-links wrapper is appended with a clickable anchor that
    // points at the original href and opens in a new tab.
    const link = translation!.querySelector<HTMLAnchorElement>(".transflow-translation-link");
    expect(link).not.toBeNull();
    expect(link!.href).toBe("https://example.com/docs");
    expect(link!.target).toBe("_blank");
    expect(link!.rel).toContain("noopener");
    expect(link!.textContent).toBe("example");

    mod.stop();
  });

  it("ignores anchors with non-http(s) schemes when preserving links", async () => {
    installPlatform({
      runtime: makeBridge({
        "Run javascript code here.": "在此运行 javascript 代码。",
      }),
    });

    document.body.innerHTML = `
      <p>Run <a href="javascript:alert(1)">javascript</a> code here.</p>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    const translation = document.querySelector(".transflow-translation");
    expect(translation).not.toBeNull();
    expect(translation!.querySelector(".transflow-translation-link")).toBeNull();

    mod.stop();
  });

  it("renders the loading placeholder until the translation resolves", async () => {
    let resolveOne: ((value: string) => void) | undefined;
    installPlatform({
      runtime: {
        getSettings: async () => DEFAULT_SETTINGS,
        saveSettings: async () => {},
        requestTranslation: () =>
          new Promise<string>((resolve) => {
            resolveOne = resolve;
          }),
        onSettingsUpdated: () => () => {},
        onToggleTranslation: () => () => {},
        onShowTooltip: () => () => {},
      },
    });

    document.body.innerHTML = `<p>Loading example sentence here.</p>`;

    const mod = createWebpageModule(settings);
    const startPromise = mod.start();

    // Allow microtasks to flush so the placeholder is attached.
    await Promise.resolve();
    await Promise.resolve();

    const placeholder = document.querySelector(
      ".transflow-translation.transflow-translation-loading",
    );
    expect(placeholder).not.toBeNull();
    // Accessible fallback text remains for screen readers; the spinner
    // itself is drawn by CSS via the ::before pseudo-element.
    expect(placeholder!.textContent).toBe("…");

    resolveOne?.("已加载示例句子。");
    await startPromise;

    const finalNode = document.querySelector(".transflow-translation");
    expect(finalNode).not.toBeNull();
    expect(finalNode!.classList.contains("transflow-translation-loading")).toBe(false);
    expect(finalNode!.textContent).toContain("已加载示例句子。");

    mod.stop();
  });
});
