#!/usr/bin/env node
/**
 * Post-build packaging:
 *  1. Copy static assets (manifest.json, HTML, CSS, icons) into dist/.
 *  2. Zip the dist/ directory into dist/transflow-safari.zip — the folder
 *     then needs to be converted into a Safari App Extension Xcode project
 *     via `xcrun safari-web-extension-converter apps/safari-ext/dist`.
 *     See `apps/safari-ext/README.md` for signing & distribution details.
 */
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");
const PUBLIC_DIR = join(ROOT, "public");
const SRC = join(ROOT, "src");
const REPO_ROOT = resolve(ROOT, "..", "..");
const SHARED_EXT = join(REPO_ROOT, "packages", "shared-ext");
const PDFJS_DIST = join(SHARED_EXT, "node_modules", "pdfjs-dist");

/** Static files copied verbatim into dist/. */
const STATIC_COPIES: { from: string; to: string }[] = [
  { from: join(ROOT, "manifest.json"), to: join(DIST, "manifest.json") },
  { from: join(SRC, "popup", "index.html"), to: join(DIST, "popup", "index.html") },
  { from: join(SRC, "options", "index.html"), to: join(DIST, "options", "index.html") },
  {
    from: join(SHARED_EXT, "src", "pdf-viewer", "viewer.html"),
    to: join(DIST, "pdf-viewer", "viewer.html"),
  },
  {
    from: join(SHARED_EXT, "src", "pdf-viewer", "viewer.css"),
    to: join(DIST, "pdf-viewer", "viewer.css"),
  },
  {
    from: join(PDFJS_DIST, "build", "pdf.worker.mjs"),
    to: join(DIST, "pdf-viewer", "pdf.worker.mjs"),
  },
];

async function copyStatic(): Promise<void> {
  await mkdir(DIST, { recursive: true });
  await Promise.all(
    STATIC_COPIES.map(async ({ from, to }) => {
      if (!existsSync(from)) {
        throw new Error(`Missing static file: ${from}`);
      }
      await mkdir(dirname(to), { recursive: true });
      await cp(from, to);
    }),
  );
  if (existsSync(PUBLIC_DIR)) {
    await cp(PUBLIC_DIR, DIST, { recursive: true });
  }
}

async function zipExtension(): Promise<void> {
  const zipPath = join(DIST, "transflow-safari.zip");
  if (existsSync(zipPath)) await rm(zipPath);

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolvePromise());
    output.on("error", rejectPromise);
    archive.on("error", rejectPromise);
    archive.pipe(output);

    // Skip the zip itself and sourcemaps
    archive.glob("**/*", {
      cwd: DIST,
      ignore: ["transflow-safari.zip", "**/*.map"],
      dot: false,
    });
    void archive.finalize();
  });

  const { size } = await stat(zipPath);
  const kb = (size / 1024).toFixed(1);
  console.log(`✓ Packaged extension → dist/transflow-safari.zip (${kb} KB)`);
}

async function sanityCheck(): Promise<void> {
  const expected = [
    join(DIST, "manifest.json"),
    join(DIST, "background", "service_worker.js"),
    join(DIST, "content", "index.js"),
    join(DIST, "popup", "index.html"),
    join(DIST, "popup", "index.js"),
    join(DIST, "options", "index.html"),
    join(DIST, "options", "index.js"),
    join(DIST, "pdf-viewer", "viewer.html"),
    join(DIST, "pdf-viewer", "viewer.css"),
    join(DIST, "pdf-viewer", "viewer.js"),
    join(DIST, "pdf-viewer", "pdf.worker.mjs"),
    join(DIST, "assets", "icons", "icon128.png"),
  ];
  const missing: string[] = [];
  for (const path of expected) {
    if (!existsSync(path)) missing.push(path);
  }
  if (missing.length) {
    console.error("Missing expected build outputs:");
    for (const p of missing) console.error("  -", p);
    process.exit(1);
  }
}

async function listDist(dir: string, prefix = ""): Promise<void> {
  const entries = (await readdir(dir, { withFileTypes: true })).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    if (entry.isDirectory()) {
      console.log(`${prefix}${entry.name}/`);
      // Recurse sequentially so the tree is printed in stable, human-readable
      // order rather than interleaved by concurrent reads.
      // oxlint-disable-next-line no-await-in-loop
      await listDist(join(dir, entry.name), `${prefix}  `);
    } else {
      console.log(`${prefix}${entry.name}`);
    }
  }
}

(async () => {
  await copyStatic();
  await sanityCheck();
  console.log("dist/ tree:");
  await listDist(DIST);
  await zipExtension();
})().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
