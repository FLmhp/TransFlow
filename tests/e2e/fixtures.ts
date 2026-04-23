import path from "node:path";
import url from "node:url";
import { test, chromium, type BrowserContext, type Page, expect } from "@playwright/test";

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

// Re-export `test` / `expect` so spec files have a single import surface.
export { test, expect };
