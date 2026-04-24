import { defineConfig } from "tsdown";

const common = {
  platform: "browser" as const,
  target: "esnext" as const,
  dts: false,
  sourcemap: false,
  treeshake: true,
  minify: true,
  // Firefox extensions load scripts from the packaged dist folder — bare
  // specifiers like "solid-js" or "@transflow/shared-ext" cannot be
  // resolved at runtime, so every dependency (including workspace
  // packages) must be inlined into the output bundle.
  deps: { alwaysBundle: [/.*/] },
};

/**
 * Firefox (MV3) build. Each entry is a thin shim that installs the
 * WebExtension runtime/UI bridges from `@transflow/shared-ext` and boots
 * the shared UI / content / background logic.
 */
export default defineConfig([
  // Background service worker — ESM (manifest specifies "type": "module")
  {
    ...common,
    entry: { service_worker: "src/background/service_worker.ts" },
    outDir: "dist/background",
    format: ["esm"],
    clean: true,
  },

  // Content script — IIFE (classic script, no ESM support)
  {
    ...common,
    entry: { index: "src/content/index.ts" },
    outDir: "dist/content",
    format: ["iife"],
    outputOptions: { entryFileNames: "[name].js" },
  },

  // Popup UI — ESM (mounts @transflow/shared-ext's pre-compiled Solid app)
  {
    ...common,
    entry: { index: "src/popup/index.ts" },
    outDir: "dist/popup",
    format: ["esm"],
  },

  // Options UI — ESM
  {
    ...common,
    entry: { index: "src/options/index.ts" },
    outDir: "dist/options",
    format: ["esm"],
  },

  // Bundled PDF.js viewer — ESM.
  {
    ...common,
    entry: { viewer: "src/pdf-viewer/index.ts" },
    outDir: "dist/pdf-viewer",
    format: ["esm"],
  },
]);
