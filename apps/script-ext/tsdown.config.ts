import { defineConfig } from "tsdown";

/**
 * Tampermonkey / Userscript build.
 *
 * Everything (content modules, translator engines, shared-ext, jQuery,
 * Solid runtime) is inlined into a single IIFE so the output file can be
 * served as a standalone `.user.js` script.
 */
export default defineConfig({
  entry: { "transflow.user": "src/index.ts" },
  outDir: "dist",
  format: ["iife"],
  platform: "browser",
  target: "esnext",
  dts: false,
  sourcemap: false,
  treeshake: true,
  clean: true,
  deps: { alwaysBundle: [/.*/] },
  outputOptions: { entryFileNames: "[name].js" },
});
