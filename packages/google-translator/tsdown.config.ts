import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "esnext",
  platform: "neutral",
  dts: true,
  clean: true,
  sourcemap: true,
});
