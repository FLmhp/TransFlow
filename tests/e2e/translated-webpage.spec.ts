/**
 * Visual regression + smoke test for the bilingual webpage translation
 * flow. See `popup.spec.ts` for a description of the overall approach.
 *
 * This test drives the content script end-to-end:
 *   1. Stubs the Google Translate network endpoint so translations are
 *      deterministic and offline. The stub returns real Chinese strings
 *      so the rendered snapshot exercises the actual CJK rendering path
 *      users see in production (rather than English-only placeholders).
 *   2. Enables translation in `chrome.storage.sync` via the service
 *      worker (equivalent to toggling the popup switch) before loading
 *      the page. Each variant additionally writes the display-mode
 *      settings under test (`showOriginal`, `translationTheme`) so the
 *      content script renders that exact mode from the first paint.
 *   3. Opens a served sample article; the content script injects the
 *      bilingual translation nodes as children of each block.
 *   4. Captures a visual snapshot of the body so any regression in the
 *      translation layout, theme, or typography is flagged.
 *
 * The variants below cover:
 *   - the default bilingual layout (`normal` theme, original visible);
 *   - translation-only mode (`showOriginal: false`), which hides the
 *     original text via the data-attribute CSS rule;
 *   - bilingual mode under each non-default theme: `underline`,
 *     `dashed`, `highlight`, and the blur-until-hover `mask`.
 */
import type { BrowserContext, Page } from "@playwright/test";
import type { Settings } from "../../packages/core/src/settings.js";
import {
  test,
  expect,
  launchWithExtension,
  stubGoogleTranslate,
  enableTranslation,
  openTestWebpage,
} from "./fixtures.js";

/**
 * Deterministic English → Chinese translation map keyed by the exact
 * source strings present in `SAMPLE_HTML`. Using a fixed dictionary
 * (rather than the network) keeps the snapshot stable while still
 * rendering real Chinese characters under the bilingual layout.
 */
const TRANSLATIONS: Record<string, string> = {
  "The quick brown fox": "敏捷的棕色狐狸",
  "The quick brown fox jumps over the lazy dog by the riverbank every morning.":
    "敏捷的棕色狐狸每天早晨在河岸边跃过那只懒狗。",
  "Why visual regression matters": "为什么视觉回归测试很重要",
  "Visual regression tests guard the bilingual layout against accidental drift in spacing, typography, and theme rendering.":
    "视觉回归测试可以防止双语布局在间距、排版和主题渲染上发生意外漂移。",
  "Translations render as sentinel children of each block.":
    "译文以哨兵子节点的形式渲染在每个块中。",
  "Themes adjust borders, underlines, or highlights.": "主题会调整边框、下划线或高亮样式。",
  "Layout must stay stable across engine changes.": "布局必须在切换翻译引擎时保持稳定。",
};

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>TransFlow sample article</title>
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        /* Pin a CJK-capable family first so the rendered Chinese
           translation is byte-stable across machines that have
           Noto Sans CJK installed (CI installs fonts-noto-cjk; see
           .github/workflows/build.yml). */
        font-family: "Noto Sans CJK SC", "Noto Sans CJK", "Noto Sans",
                     Arial, Helvetica, sans-serif;
        color: #222;
        background: #fff;
        max-width: 640px;
        margin: 0 auto;
        padding: 24px 16px;
        line-height: 1.5;
      }
      h1 { font-size: 26px; margin: 0 0 16px; }
      h2 { font-size: 20px; margin: 20px 0 10px; }
      p  { font-size: 16px; margin: 0 0 12px; }
      ul { padding-left: 20px; margin: 0 0 12px; }
      li { margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <h1>The quick brown fox</h1>
    <p>The quick brown fox jumps over the lazy dog by the riverbank every morning.</p>
    <h2>Why visual regression matters</h2>
    <p>Visual regression tests guard the bilingual layout against accidental drift in spacing, typography, and theme rendering.</p>
    <ul>
      <li>Translations render as sentinel children of each block.</li>
      <li>Themes adjust borders, underlines, or highlights.</li>
      <li>Layout must stay stable across engine changes.</li>
    </ul>
  </body>
</html>`;

/**
 * Boots a fresh extension context, applies the requested settings
 * overrides, opens the sample article and waits until every translation
 * node has resolved out of the loading-placeholder state. Returns the
 * context (so the caller can close it) and the loaded page (so the
 * caller can take a screenshot).
 */
async function setupTranslatedPage(
  overrides: Partial<Settings>,
): Promise<{ context: BrowserContext; page: Page }> {
  const { context } = await launchWithExtension();
  await stubGoogleTranslate(context, TRANSLATIONS);
  await enableTranslation(context, overrides);

  const page = await openTestWebpage(context, SAMPLE_HTML);

  // Wait until the content script has finished injecting the translation
  // nodes for every translatable block and all of them have transitioned
  // out of the loading placeholder state.
  await expect
    .poll(async () => page.locator(".transflow-translation").count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(5);
  await expect(page.locator(".transflow-translation.transflow-translation-loading")).toHaveCount(0);

  return { context, page };
}

test.describe("Translated webpage", () => {
  test("renders bilingual translations and matches the visual snapshot", async () => {
    const { context, page } = await setupTranslatedPage({});
    try {
      await expect(page.locator("body")).toHaveScreenshot("translated-webpage.png");
    } finally {
      await context.close();
    }
  });

  test("renders translation-only mode when showOriginal is disabled", async () => {
    // With `showOriginal: false` the content script replaces each
    // translated block's inner content with the translation node — the
    // original children are detached and stashed (to be restored on
    // stop), and the block is tagged with `data-transflow-replaced`.
    // Only the Chinese translation should be visible.
    const { context, page } = await setupTranslatedPage({ showOriginal: false });
    try {
      // Every translated block must carry the replaced marker, and
      // no translation should be left in the loading state.
      await expect
        .poll(async () => page.locator("[data-transflow-replaced]").count(), {
          timeout: 10_000,
        })
        .toBeGreaterThanOrEqual(5);

      await expect(page.locator("body")).toHaveScreenshot(
        "translated-webpage-translation-only.png",
      );
    } finally {
      await context.close();
    }
  });

  // Bilingual mode (showOriginal: true) under each non-default theme.
  // The `normal` theme is already covered by the baseline test above, so
  // we exercise the remaining four themes here. Each one applies a
  // different visual treatment (underline, dashed underline, highlight
  // background, or blur-mask) and must be snapshot-tested independently
  // to detect drift in any individual theme.
  const BILINGUAL_THEMES: Settings["translationTheme"][] = [
    "underline",
    "dashed",
    "highlight",
    "mask",
  ];

  for (const theme of BILINGUAL_THEMES) {
    test(`renders bilingual translations with the "${theme}" theme`, async () => {
      const { context, page } = await setupTranslatedPage({
        showOriginal: true,
        translationTheme: theme,
      });
      try {
        // Sanity check that the chosen theme class actually landed on
        // each translation node — guards against a regression where a
        // settings key is renamed and silently falls back to `normal`.
        await expect
          .poll(async () => page.locator(`.transflow-theme-${theme}`).count(), { timeout: 10_000 })
          .toBeGreaterThanOrEqual(5);

        await expect(page.locator("body")).toHaveScreenshot(
          `translated-webpage-theme-${theme}.png`,
        );
      } finally {
        await context.close();
      }
    });
  }
});
