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
 *      the page.
 *   3. Opens a served sample article; the content script injects the
 *      bilingual translation nodes as children of each block.
 *   4. Captures a visual snapshot of the body so any regression in the
 *      translation layout, theme, or typography is flagged.
 */
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
  "Translations render as sentinel children of each block.": "译文以哨兵子节点的形式渲染在每个块中。",
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

test.describe("Translated webpage", () => {
  test("renders bilingual translations and matches the visual snapshot", async () => {
    const { context } = await launchWithExtension();
    try {
      await stubGoogleTranslate(context, TRANSLATIONS);
      await enableTranslation(context);

      const page = await openTestWebpage(context, SAMPLE_HTML);

      // Wait until the content script has finished injecting the
      // translation nodes for every translatable block and all of them
      // have transitioned out of the loading placeholder state.
      await expect
        .poll(async () => page.locator(".transflow-translation").count(), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(5);
      await expect(page.locator(".transflow-translation.transflow-translation-loading")).toHaveCount(
        0,
      );

      await expect(page.locator("body")).toHaveScreenshot("translated-webpage.png");
    } finally {
      await context.close();
    }
  });
});

