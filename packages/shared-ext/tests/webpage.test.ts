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

  it("preserves hyperlinks inline within the translated sentence", async () => {
    installPlatform({
      runtime: makeBridge({
        Visit: "访问",
        example: "示例",
        "for more information.": "了解更多信息。",
      }),
    });

    document.body.innerHTML = `
      <p>Visit <a href="https://example.com/docs">example</a> for more information.</p>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    const translation = document.querySelector(".transflow-translation");
    expect(translation).not.toBeNull();
    // All three segments are translated and rendered in order.
    expect(translation!.textContent).toContain("访问");
    expect(translation!.textContent).toContain("示例");
    expect(translation!.textContent).toContain("了解更多信息。");

    // The hyperlink is kept inline as a real <a>, with the translated
    // anchor text and the original href preserved.
    const link = translation!.querySelector<HTMLAnchorElement>(".transflow-translation-link");
    expect(link).not.toBeNull();
    expect(link!.href).toBe("https://example.com/docs");
    expect(link!.target).toBe("_blank");
    expect(link!.rel).toContain("noopener");
    expect(link!.textContent).toBe("示例");

    // Block paragraphs render as block, not inline.
    expect(translation!.classList.contains("transflow-translation-inline")).toBe(false);

    mod.stop();
  });

  it("renders link-only elements (e.g. nav items) with the inline variant", async () => {
    installPlatform({
      runtime: makeBridge({
        "Free Break Into Cyber Guide": "免费网络入侵指南",
      }),
    });

    document.body.innerHTML = `
      <ul>
        <li><a href="https://example.com/guide">Free Break Into Cyber Guide</a></li>
      </ul>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    const translation = document.querySelector("li .transflow-translation");
    expect(translation).not.toBeNull();
    // Element whose visible text is entirely a single anchor is rendered
    // inline next to the original link instead of on a new block line.
    expect(translation!.classList.contains("transflow-translation-inline")).toBe(true);

    const link = translation!.querySelector<HTMLAnchorElement>(".transflow-translation-link");
    expect(link).not.toBeNull();
    expect(link!.href).toBe("https://example.com/guide");
    expect(link!.textContent).toBe("免费网络入侵指南");

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
    // Unsafe-scheme anchors are folded back into the surrounding text,
    // so the translation never contains an anchor pointing at the
    // `javascript:` URL.
    expect(translation!.querySelector(".transflow-translation-link")).toBeNull();
    expect(translation!.querySelector("a")).toBeNull();

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

  it("replaces the block's content with the translation in translation-only mode", async () => {
    installPlatform({
      runtime: makeBridge({
        "Hello world, this is a sample paragraph.": "你好世界，这是一段示例段落。",
      }),
    });

    document.body.innerHTML = `<p id="p">Hello world, this is a sample paragraph.</p>`;

    const translationOnly: Settings = { ...settings, showOriginal: false };
    const mod = createWebpageModule(translationOnly);
    await mod.start();

    const p = document.getElementById("p")!;
    // The original children (text node) have been detached from the DOM,
    // leaving only the translation node as the element's content. The
    // block is tagged with the replaced marker instead of a CSS-hide one.
    expect(p.getAttribute("data-transflow-replaced")).toBe("1");
    expect(p.getAttribute("data-transflow-hide-original")).toBeNull();
    expect(p.childNodes.length).toBe(1);
    const only = p.firstElementChild!;
    expect(only.classList.contains("transflow-translation")).toBe(true);
    // Effective textContent is just the translation — the original text
    // is no longer part of the block's rendered content.
    expect(p.textContent).toBe("你好世界，这是一段示例段落。");

    // Stop must restore the original DOM shape: the stashed original
    // children come back and the replaced marker is cleared.
    mod.stop();
    expect(p.getAttribute("data-transflow-replaced")).toBeNull();
    expect(p.querySelector(".transflow-translation")).toBeNull();
    expect(p.textContent).toBe("Hello world, this is a sample paragraph.");
  });

  it("skips non-linguistic blocks so numeric link-only cells do not render twice", async () => {
    installPlatform({
      runtime: makeBridge({}),
    });

    // A forum "views" column in the wild: a `<td>` that contains only
    // an anchor whose visible text is a number. The translation engine
    // has no meaningful output for a pure number, so previously the
    // cell would render the number twice (original link + translation).
    document.body.innerHTML = `
      <table>
        <tr><td id="views"><a href="https://example.com/thread/1">233097</a></td></tr>
        <tr><td id="punct">— · …</td></tr>
      </table>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    // Neither cell should have acquired a translation child: their
    // text content carries no letters.
    expect(document.querySelector("#views .transflow-translation")).toBeNull();
    expect(document.querySelector("#punct .transflow-translation")).toBeNull();
    // The original anchor text must still be present exactly once.
    const cell = document.getElementById("views")!;
    expect(cell.textContent?.match(/233097/g)?.length).toBe(1);

    mod.stop();
  });

  it("translates standalone anchors (e.g. header navigation links)", async () => {
    installPlatform({
      runtime: makeBridge({
        "Log In": "登录",
        Register: "注册",
        "Forgotten Password": "忘记密码",
      }),
    });

    // HBH-style header nav: bare `<a>` elements in a header, not
    // wrapped in `<li>` or any other block tag. These were previously
    // missed by the target-tag filter.
    document.body.innerHTML = `
      <header>
        <a id="login" href="/login">Log In</a>
        <a id="register" href="/register">Register</a>
        <a id="forgot" href="/forgot">Forgotten Password</a>
      </header>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    expect(document.querySelector("#login .transflow-translation")?.textContent).toContain("登录");
    expect(document.querySelector("#register .transflow-translation")?.textContent).toContain(
      "注册",
    );
    expect(document.querySelector("#forgot .transflow-translation")?.textContent).toContain(
      "忘记密码",
    );
    // Standalone anchor translations render inline so the nav layout
    // isn't broken onto new lines.
    const loginTranslation = document.querySelector<HTMLElement>("#login .transflow-translation")!;
    expect(loginTranslation.classList.contains("transflow-translation-inline")).toBe(true);

    mod.stop();
  });

  it("does not double-translate anchors nested inside a block target", async () => {
    installPlatform({
      runtime: makeBridge({
        "Visit example for more information.": "请访问示例以获取更多信息。",
        example: "示例",
      }),
    });

    // The paragraph (block target) should own the translation; the
    // nested anchor must not pick up its own separate translation node
    // even though `<a>` is now in TARGET_TAGS.
    document.body.innerHTML = `
      <p id="p">Visit <a id="a" href="https://example.com/">example</a> for more information.</p>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    // Exactly one translation child, and it lives under the paragraph.
    expect(document.querySelectorAll(".transflow-translation").length).toBe(1);
    expect(document.querySelector("#p > .transflow-translation")).not.toBeNull();
    expect(document.querySelector("#a > .transflow-translation")).toBeNull();

    mod.stop();
  });

  it("skips elements whose parent is a flex/grid layout container", async () => {
    installPlatform({
      runtime: makeBridge({
        Home: "首页",
        About: "关于",
        Contact: "联系",
      }),
    });

    // Modern nav bars lay out their anchors with flexbox. Injecting
    // translation text into the anchors (or adjacent <li> items) grows
    // the items and causes the row to squeeze / misalign. The module
    // therefore leaves flex/grid children alone.
    document.body.innerHTML = `
      <nav id="flex" style="display: flex">
        <a id="flex-a" href="/home">Home</a>
        <a id="flex-b" href="/about">About</a>
      </nav>
      <div id="grid" style="display: grid">
        <a id="grid-a" href="/contact">Contact</a>
      </div>
      <header id="block">
        <a id="block-a" href="/home">Home</a>
      </header>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    // Anchors inside the flex/grid containers are left untranslated
    // so the layout row is not disturbed.
    expect(document.querySelector("#flex-a .transflow-translation")).toBeNull();
    expect(document.querySelector("#flex-b .transflow-translation")).toBeNull();
    expect(document.querySelector("#grid-a .transflow-translation")).toBeNull();
    // Anchors in a plain block-layout container (e.g. a header with
    // default display) are still translated.
    expect(document.querySelector("#block-a .transflow-translation")?.textContent).toContain(
      "首页",
    );

    mod.stop();
  });

  it("skips elements hidden by display:none, visibility:hidden or the hidden attribute", async () => {
    installPlatform({
      runtime: makeBridge({
        "Something went wrong, please reload.": "出了点问题，请重新加载。",
        "Loading fork status.": "正在加载分叉状态。",
        "No lists to show here.": "这里没有可显示的列表。",
        "Visible summary text.": "可见的摘要文本。",
      }),
    });

    // Mirrors the pattern from GitHub's Fork/Star/Watch popovers: a
    // visible control with several pre-rendered alternative-state
    // messages kept in the DOM via display:none / visibility:hidden /
    // the `hidden` attribute. We must not translate any of the hidden
    // copies — their translation would otherwise leak onto the page
    // when the host swaps which state is visible.
    document.body.innerHTML = `
      <div>
        <p id="display-none" style="display: none">Something went wrong, please reload.</p>
        <p id="visibility-hidden" style="visibility: hidden">Loading fork status.</p>
        <p id="hidden-attr" hidden>No lists to show here.</p>
        <p id="visible">Visible summary text.</p>
      </div>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    // None of the three hidden copies pick up a translation child.
    expect(document.querySelector("#display-none .transflow-translation")).toBeNull();
    expect(document.querySelector("#visibility-hidden .transflow-translation")).toBeNull();
    expect(document.querySelector("#hidden-attr .transflow-translation")).toBeNull();

    // The visible sibling is still translated normally.
    expect(document.querySelector("#visible .transflow-translation")?.textContent).toContain(
      "可见的摘要文本。",
    );

    mod.stop();
  });

  it("skips elements nested inside a display:none ancestor", async () => {
    installPlatform({
      runtime: makeBridge({
        "Hidden popover body.": "隐藏的弹出窗口内容。",
      }),
    });

    // Parent is display:none — the inner <p> itself has no inline style
    // but its effective visibility is hidden. findCandidates must still
    // skip it so GitHub-style popovers (where the whole container is
    // hidden until opened) don't emit stray translations.
    document.body.innerHTML = `
      <div style="display: none">
        <p id="nested">Hidden popover body.</p>
      </div>
    `;

    const mod = createWebpageModule(settings);
    await mod.start();

    expect(document.querySelector("#nested .transflow-translation")).toBeNull();

    mod.stop();
  });
});
