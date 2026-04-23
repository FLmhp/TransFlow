import { defineConfig } from "vitest/config";

/**
 * Workspace-wide Vitest configuration.
 *
 * Each package gets its own Vitest "project" so that:
 *   - The right test environment is used (node for pure logic, jsdom for
 *     DOM-touching code in `shared-ext`).
 *   - `--project <name>` can run a single package's suite.
 *
 * Tests import from `../src/*` directly rather than the package name so the
 * suite can run without a prior `pnpm build` — the built `dist/` is only
 * wired up in the package `exports` map.
 */
export default defineConfig({
  test: {
    // Coverage is reported across all projects combined.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: [
        "packages/*/src/**/*.d.ts",
        "packages/*/src/**/index.ts",
        "packages/shared-ext/src/**/*.tsx",
        "packages/shared-ext/src/**/styles.ts",
      ],
    },
    projects: [
      {
        test: {
          name: "core",
          include: ["packages/core/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "translator",
          include: ["packages/translator/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "google-translator",
          include: ["packages/google-translator/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "openai-translator",
          include: ["packages/openai-translator/tests/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "shared-ext",
          include: ["packages/shared-ext/tests/**/*.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
