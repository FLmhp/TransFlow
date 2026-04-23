/**
 * End-to-end + visual regression smoke test for the TransFlow popup UI.
 *
 * The built Chromium extension at `apps/chrome-ext/dist` is loaded into a
 * persistent Chromium context. The test then:
 *   1. Verifies the popup renders its core controls.
 *   2. Captures a visual snapshot of the popup body so any unintended
 *      visual regression (layout, colour, typography) is flagged.
 *
 * Run `pnpm build` first so the extension artifacts exist on disk.
 */
import { test, expect, launchWithExtension, openPopup } from "./fixtures.js";

test.describe("Popup", () => {
  test("renders the core controls and matches the visual snapshot", async () => {
    const { context, extensionId } = await launchWithExtension();
    try {
      const page = await openPopup(context, extensionId);

      // Wait until settings have loaded and the main popup markup is shown.
      await expect(page.getByText("TransFlow")).toBeVisible();
      // The popup shows a status banner once the Solid store finishes loading.
      await expect(page.getByText(/翻译(已|已停)/)).toBeVisible();

      // Visual regression: snapshot the body contents. Tolerances are
      // configured in playwright.config.ts to tolerate font-hinting drift.
      await expect(page.locator("body")).toHaveScreenshot("popup.png");
    } finally {
      await context.close();
    }
  });
});
