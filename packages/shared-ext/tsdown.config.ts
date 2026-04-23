import { defineConfig } from "tsdown";
import { babel } from "@rollup/plugin-babel";

/**
 * Shared-ext ships pre-compiled JS. Solid's JSX transform is applied here
 * (so consumer apps don't need to know about .tsx in workspace packages),
 * while all third-party dependencies stay external — the consumer app
 * bundles them into its final build.
 */
export default defineConfig({
  entry: ["src/index.ts", "src/background.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "esnext",
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".tsx", ".jsx"],
      presets: [
        ["babel-preset-solid", { generate: "dom", hydratable: false }],
        ["@babel/preset-typescript", { allowDeclareFields: true, onlyRemoveTypeImports: true }],
      ],
      exclude: "node_modules/**",
    }),
  ],
});
