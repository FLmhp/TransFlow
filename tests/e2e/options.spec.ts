/**
 * Visual regression + smoke test for the TransFlow options page.
 * See `popup.spec.ts` for a description of the overall approach.
 */
import { test, expect, launchWithExtension, openOptions } from "./fixtures.js";

test.describe("Options", () => {
  test("renders the settings form and matches the visual snapshot", async () => {
    const { context, extensionId } = await launchWithExtension();
    try {
      const page = await openOptions(context, extensionId);

      await expect(page.getByText("TransFlow", { exact: true })).toBeVisible();

      await expect(page.locator("body")).toHaveScreenshot("options.png");
    } finally {
      await context.close();
    }
  });
});
