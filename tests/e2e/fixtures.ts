import path from "node:path";
import url from "node:url";
import {
  test,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
  expect,
} from "@playwright/test";
import type { Settings } from "../../packages/core/src/settings.js";

/**
 * Shared helper that launches Chromium with the built chrome-ext loaded,
 * resolves the extension id and returns the persistent context.
 *
 * The caller is responsible for closing the context.
 */
export async function launchWithExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const extensionPath = path.resolve(__dirname, "../../apps/chrome-ext/dist");

  const context = await chromium.launchPersistentContext("", {
    // MV3 extensions require a full Chromium — the default
    // `chromium-headless-shell` build does not load extensions.
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });

  // Wait for the service worker to become available so we can read its id.
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;

  return { context, extensionId };
}

/** Opens the popup page for the loaded extension. */
export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await page.waitForLoadState("networkidle");
  return page;
}

/** Opens the options page for the loaded extension. */
export async function openOptions(context: BrowserContext, extensionId: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options/index.html`);
  await page.waitForLoadState("networkidle");
  return page;
}

/**
 * Installs a `context.route` handler that stubs the Google Translate free
 * endpoint used by `GoogleTranslator`, returning a deterministic fake
 * translation. This keeps the translated-webpage visual regression stable
 * and offline — without it, tests would hit the real network.
 *
 * Pass a `translations` map keyed by source text to return real Chinese
 * strings (so the snapshot exercises the actual CJK rendering path users
 * see in production). Any source text not present in the map falls back
 * to a deterministic `【译】<source>` placeholder so unexpected requests
 * never silently 404.
 *
 * The mock mirrors the shape `translate_a/single` returns:
 * `[[[translated, original, null, null, confidence]], ...]`.
 */
export async function stubGoogleTranslate(
  context: BrowserContext,
  translations: Record<string, string> = {},
): Promise<void> {
  await context.route(/translate\.googleapis\.com\/translate_a\/single/, async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q") ?? "";
    const translated = translations[q] ?? `【译】${q}`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([[[translated, q, null, null, 1]], null, "en"]),
    });
  });
}

/**
 * Enables full-page translation by writing to `chrome.storage.sync` from
 * inside the service worker. The background's `onInstalled` handler seeds
 * default settings asynchronously; we wait for that seed to land before
 * overriding `enabled`, otherwise a late merge-write can clobber our flag
 * back to `false` and the content script sees translation as disabled.
 *
 * Pass `overrides` to additionally set other settings keys (for example
 * `{ showOriginal: false }` to test translation-only mode, or
 * `{ translationTheme: "underline" }` to exercise a specific display
 * theme). The overrides are written in the same `chrome.storage.sync.set`
 * call as `enabled: true` so the content script observes a single
 * coherent settings update.
 */
export async function enableTranslation(
  context: BrowserContext,
  overrides: Partial<Settings> = {},
): Promise<void> {
  let [worker] = context.serviceWorkers();
  if (!worker) worker = (await context.waitForEvent("serviceworker")) as Worker;
  await worker.evaluate(async (extra: Partial<Settings>) => {
    // Wait until the background `onInstalled` handler has seeded defaults
    // into sync storage — detectable by the presence of a well-known key.
    // Poll up to ~5 s (100 × 50 ms) which is well above the real seed time
    // while keeping failed runs from hanging indefinitely.
    for (let i = 0; i < 100; i++) {
      // @ts-expect-error — `chrome` is injected by the extension runtime.
      const v = await chrome.storage.sync.get("engine");
      if (typeof v.engine === "string") break;
      await new Promise((r) => setTimeout(r, 50));
    }
    // @ts-expect-error — `chrome` is injected by the extension runtime.
    await chrome.storage.sync.set({ enabled: true, ...extra });
  }, overrides);
}

/**
 * Navigates to a deterministic in-memory HTML page that is intercepted via
 * `context.route`. Serving a made-up URL (rather than a real network page)
 * keeps the translated-webpage visual regression reproducible and fully
 * offline while still satisfying the `<all_urls>` content-script match.
 */
export async function openTestWebpage(
  context: BrowserContext,
  html: string,
  targetUrl = "https://transflow.test/sample",
): Promise<Page> {
  await context.route(targetUrl, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: html,
    });
  });
  const page = await context.newPage();
  await page.goto(targetUrl);
  await page.waitForLoadState("networkidle");
  return page;
}

// Re-export `test` / `expect` so spec files have a single import surface.
export { test, expect };
