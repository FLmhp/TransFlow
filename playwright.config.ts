import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for end-to-end and visual regression tests.
 *
 * The suite loads the built Chromium extension from
 * `apps/chrome-ext/dist` via `launchPersistentContext({ args: [--load-extension=...] })`.
 * Run `pnpm --filter @transflow/chrome-ext build` first (or `pnpm build`).
 *
 * Visual snapshots are stored alongside the spec under
 * `tests/e2e/__screenshots__/` and compared on every run; use
 * `pnpm test:e2e:update` to refresh them after an intentional UI change.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  snapshotDir: "./tests/e2e/__screenshots__",
  expect: {
    // A small threshold keeps the visual regression robust to font
    // hinting differences across machines without masking real changes.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
