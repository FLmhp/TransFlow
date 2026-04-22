import { defineConfig } from 'tsdown';
import solid from 'unplugin-solid/rolldown';

const common = {
  platform: 'browser' as const,
  target: 'esnext' as const,
  dts: false,
  sourcemap: false,
  treeshake: true,
};

export default defineConfig([
  // Background service worker — ESM (manifest specifies "type": "module")
  {
    ...common,
    entry: { service_worker: 'src/background/service_worker.ts' },
    outDir: 'dist/background',
    format: ['esm'],
    clean: true,
  },

  // Content script — IIFE (classic script, no ESM support)
  // All dependencies (including jQuery) are bundled inline.
  {
    ...common,
    entry: { index: 'src/content/index.ts' },
    outDir: 'dist/content',
    format: ['iife'],
    noExternal: [/.*/],
  },

  // Popup UI — Solid.js + TSX, ESM
  {
    ...common,
    entry: { index: 'src/popup/index.tsx' },
    outDir: 'dist/popup',
    format: ['esm'],
    plugins: [solid()],
  },

  // Options UI — Solid.js + TSX, ESM
  {
    ...common,
    entry: { index: 'src/options/index.tsx' },
    outDir: 'dist/options',
    format: ['esm'],
    plugins: [solid()],
  },
]);
