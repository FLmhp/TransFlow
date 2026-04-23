#!/usr/bin/env node
/**
 * Post-build packaging for the userscript target.
 *
 * tsdown emits `dist/transflow.user.js` (IIFE). We prepend the standard
 * userscript metadata block so the file can be installed directly in
 * Tampermonkey / Violentmonkey / Greasemonkey.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");
const OUT = join(DIST, "transflow.user.js");

const META = `// ==UserScript==
// @name         TransFlow - 沉浸式翻译
// @namespace    https://github.com/FLmhp/TransFlow
// @version      1.0.0
// @description  沉浸式双语翻译（网页 / PDF / 视频字幕）— Tampermonkey 版本
// @author       TransFlow
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

`;

async function main(): Promise<void> {
  if (!existsSync(OUT)) {
    console.error(`Missing bundle: ${OUT}`);
    process.exit(1);
  }
  const body = await readFile(OUT, "utf8");
  if (body.startsWith("// ==UserScript==")) {
    // Already has a metadata block (idempotent rebuild).
    console.log("✓ Userscript already has metadata block");
    return;
  }
  await writeFile(OUT, META + body);
  console.log(`✓ Userscript → dist/transflow.user.js (${(body.length / 1024).toFixed(1)} KB)`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
