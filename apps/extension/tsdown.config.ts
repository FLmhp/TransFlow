import { defineConfig } from "tsdown";
import { babel } from "@rollup/plugin-babel";

const common = {
  platform: "browser" as const,
  target: "esnext" as const,
  dts: false,
  sourcemap: false,
  treeshake: true,
  // Chrome extensions load scripts from the packaged dist folder — bare
  // specifiers like "solid-js" or "@transflow/core" cannot be resolved at
  // runtime, so every dependency (including workspace packages) must be
  // inlined into the output bundle.
  deps: { alwaysBundle: [/.*/] as (string | RegExp)[] },
};

/**
 * Solid.js needs its custom JSX transform (babel-preset-solid, which emits
 * fine-grained reactive DOM expressions). We run it via @rollup/plugin-babel
 * on `.tsx` / `.jsx` sources. tsconfig sets `jsx: 'preserve'` so JSX arrives
 * at Babel untouched by oxc's TS transformer.
 */
const solidBabel = () =>
  babel({
    babelHelpers: "bundled",
    extensions: [".tsx", ".jsx"],
    presets: [
      ["babel-preset-solid", { generate: "dom", hydratable: false }],
      ["@babel/preset-typescript", { allowDeclareFields: true, onlyRemoveTypeImports: true }],
    ],
    exclude: "node_modules/**",
  });

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
  // All dependencies (including jQuery) are bundled inline.
  {
    ...common,
    entry: { index: "src/content/index.ts" },
    outDir: "dist/content",
    format: ["iife"],
    outputOptions: { entryFileNames: "[name].js" },
  },

  // Popup UI — Solid.js + TSX, ESM
  {
    ...common,
    entry: { index: "src/popup/index.tsx" },
    outDir: "dist/popup",
    format: ["esm"],
    plugins: [solidBabel()],
  },

  // Options UI — Solid.js + TSX, ESM
  {
    ...common,
    entry: { index: "src/options/index.tsx" },
    outDir: "dist/options",
    format: ["esm"],
    plugins: [solidBabel()],
  },
]);
