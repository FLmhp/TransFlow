# TransFlow — Immersive Translation Extension

> Immersive bilingual translation for **Chromium, Firefox, Safari, and Tampermonkey/Userscript**. Supports machine translation (Google Translate, DeepL) **and** LLM translation (OpenAI GPT, Google Gemini). Real-time bilingual webpage, PDF document, and video subtitle translation.

---

## ✨ Features

| Feature                  | Description                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 🌐 **Bilingual Webpage** | Paragraphs are translated and inserted inline below (or above) the original text in real-time. SPAs are fully supported via MutationObserver. |
| 📄 **PDF Translation**   | Works with PDF.js text layers — translates each line of text and shows the translation directly inside the viewer.                            |
| 🎬 **Video Subtitles**   | Detects subtitles on YouTube, Netflix, Disney+, Prime Video, Bilibili, and generic players. Adds a translated line below each subtitle.       |
| 🔍 **Google Translate**  | Free, no API key required. Uses the public Google Translate web API.                                                                          |
| 📘 **DeepL**             | High-quality machine translation. Free or Pro API key required.                                                                               |
| 🤖 **OpenAI GPT**        | LLM-powered translation using GPT-4o-mini, GPT-4o, etc. API key required.                                                                     |
| ✨ **Google Gemini**     | LLM-powered translation using Gemini 1.5 Flash/Pro. API key required.                                                                         |
| 🖱 **Context Menu**      | Right-click any selected text → "Translate selection with TransFlow".                                                                         |
| ⚙ **Full Settings Page** | Per-engine API keys, language pairs, appearance customisation.                                                                                |

---

## 🏗 Tech stack

| Layer                   | Tooling                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| Package manager         | [pnpm](https://pnpm.io/) (workspaces)                                            |
| Monorepo runner         | [turborepo](https://turborepo.com/)                                              |
| Language                | TypeScript (ESNext)                                                              |
| Bundler                 | [tsdown](https://tsdown.dev/) (powered by Rolldown)                              |
| Linter / Formatter      | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [oxfmt](https://oxc.rs/) |
| Popup / Options UI      | [Solid.js](https://www.solidjs.com/)                                             |
| Content-script DOM ops  | [jQuery 4](https://jquery.com/)                                                  |
| CI                      | GitHub Actions — produces an installable `.zip` artifact                         |
| Unit tests              | [Vitest 4.1](https://vitest.dev/) (per-package `projects`, jsdom for DOM code)   |
| E2E / Visual regression | [Playwright](https://playwright.dev/) (headless Chromium, extension loaded)      |

---

## 📁 Project structure

This repository is a **pnpm + turborepo monorepo** with shared packages and
per-browser target apps:

```
TransFlow/
├── package.json               # root, pnpm workspaces + turbo
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .oxlintrc.json / .oxfmtrc.json
├── .github/workflows/build.yml  # CI: lint + build all 4 targets
│
├── packages/
│   ├── core/                  # @transflow/core — shared types, settings,
│   │   └── src/*.ts           #   message schemas, language + engine descriptors
│   ├── translator/            # @transflow/translator — abstract Translator
│   │   └── src/               #   class, TranslationError, TranslatorRegistry
│   ├── google-translator/     # @transflow/google-translator — Google engine
│   │   └── src/
│   ├── openai-translator/     # @transflow/openai-translator — OpenAI engine
│   │   └── src/
│   └── shared-ext/            # @transflow/shared-ext — cross-target shared
│       └── src/               #   code: platform bridge abstraction, content
│           ├── platform/      #   modules (webpage/pdf/subtitle/tooltip),
│           ├── content/       #   popup & options Solid UI, settings store,
│           ├── popup/         #   background service-worker handler
│           ├── options/
│           ├── shared/
│           └── background/
│
└── apps/                      # Thin per-target wrappers that install a
    │                          # Platform bridge and delegate to shared-ext.
    ├── chrome-ext/            # @transflow/chrome-ext — Chromium MV3
    ├── firefox-ext/           # @transflow/firefox-ext — Firefox MV3
    ├── safari-ext/            # @transflow/safari-ext — Safari Web Extension MV3
    └── script-ext/            # @transflow/script-ext — Tampermonkey userscript
```

### Platform abstraction

`@transflow/shared-ext` owns all translation logic, UI and DOM operations.
Each target app is a thin wrapper that installs a pair of bridges —
`RuntimeBridge` for the content layer and `UiBridge` for popup/options —
and then calls the shared entry points (`startContent`, `startPopup`,
`startOptions`, `startServiceWorker`).

For the three WebExtension targets (Chromium/Firefox/Safari) the bridge is
implemented on top of the `chrome.*` MV3 API via `createWebExtRuntimeBridge`
/ `createWebExtUiBridge`. The Tampermonkey target provides a completely
in-process bridge backed by `GM_getValue` / `GM_setValue` and calls the
translator engines directly (no service worker).

The content script uses **jQuery 4** for DOM traversal and manipulation; the popup and options pages are full Solid.js applications. Translation engines live in their own packages (`@transflow/google-translator`, `@transflow/openai-translator`) and extend the abstract `Translator` class from `@transflow/translator`, so adding a new engine is a matter of implementing one class and registering it with the `TranslatorRegistry`.

---

## 🚀 Installation

### From a release / CI build (recommended)

CI produces four artifacts — grab the one for your target from the
[Actions tab](../../actions) or a GitHub Release:

| Target                    | Artifact                            |
| ------------------------- | ----------------------------------- |
| Chromium / Chrome / Edge  | `transflow-chrome` (`.zip`)         |
| Firefox                   | `transflow-firefox` (`.zip`)        |
| Safari                    | `transflow-safari` (`.zip`)         |
| Tampermonkey / Userscript | `transflow-userscript` (`.user.js`) |

For Chrome / Edge / Firefox: unzip, then load via
`chrome://extensions` / `about:debugging` → "Load unpacked".
For Safari: run `xcrun safari-web-extension-converter` on the unzipped
folder to produce an Xcode project (see `apps/safari-ext/README.md`).
For Tampermonkey: open the `.user.js` file in your browser and the
userscript manager will prompt you to install it.

### Building locally

```sh
# Requires Node.js ≥ 20 and pnpm ≥ 9
pnpm install
pnpm build            # builds all four targets via turborepo
# → apps/chrome-ext/dist/transflow-chrome.zip
# → apps/firefox-ext/dist/transflow-firefox.zip
# → apps/safari-ext/dist/transflow-safari.zip
# → apps/script-ext/dist/transflow.user.js
```

To build a single target:

```sh
pnpm --filter @transflow/chrome-ext  build
pnpm --filter @transflow/firefox-ext build
pnpm --filter @transflow/safari-ext  build
pnpm --filter @transflow/script-ext  build
```

### Development scripts

| Command                | Description                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm build`           | Build all packages + the extension, produce the zip.                                                |
| `pnpm dev`             | Run tsdown in watch mode across all packages.                                                       |
| `pnpm lint`            | Run oxlint (type-aware) + `tsc --noEmit` across the workspace.                                      |
| `pnpm format`          | Run oxfmt to format every source file.                                                              |
| `pnpm format:check`    | Verify formatting without writing.                                                                  |
| `pnpm test`            | Run the [Vitest](https://vitest.dev) unit-test suite across every package.                          |
| `pnpm test:watch`      | Re-run Vitest on file changes.                                                                      |
| `pnpm test:coverage`   | Generate a v8 coverage report under `coverage/`.                                                    |
| `pnpm test:e2e`        | Run the [Playwright](https://playwright.dev) end-to-end + visual-regression suite (requires build). |
| `pnpm test:e2e:update` | Refresh Playwright visual snapshots after an intentional UI change.                                 |
| `pnpm clean`           | Remove `dist/` and `node_modules/`.                                                                 |

---

## 🔧 Configuration

Click the TransFlow toolbar icon to open the popup, or go to the Settings page (⚙ button in popup).

### Translation Engines

| Engine             | API Key?    | Speed     | Quality   |
| ------------------ | ----------- | --------- | --------- |
| Google Translate   | ❌ Free     | ⚡ Fast   | Good      |
| OpenAI GPT-4o-mini | ✅ Required | ⚡ Fast   | Excellent |
| OpenAI GPT-4o      | ✅ Required | 🐢 Slower | Best      |

The OpenAI engine is compatible with any OpenAI-style Chat Completions
endpoint — set a custom **Base URL** (`OPENAI_BASE_URL`) in the Options page
to point at a compatible provider; the default is `https://api.openai.com/v1`.

#### Getting API keys

- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Host browser / page                     │
│                                                             │
│  ┌──────────────┐   bridges   ┌──────────────────────────┐  │
│  │   Popup UI   │ ──────────► │                          │  │
│  │  (Solid.js)  │             │   @transflow/shared-ext  │  │
│  └──────────────┘             │                          │  │
│  ┌──────────────┐             │  ┌────────────────────┐  │  │
│  │  Options UI  │ ──────────► │  │ platform bridges   │  │  │
│  │  (Solid.js)  │             │  │  RuntimeBridge     │  │  │
│  └──────────────┘             │  │  UiBridge          │  │  │
│  ┌──────────────┐             │  └────────────────────┘  │  │
│  │ Content (jQuery)│ ◄──────► │  ┌────────────────────┐  │  │
│  │  webpage/PDF   │           │  │  @transflow/       │  │  │
│  │  subtitle/tip  │           │  │   translator +     │  │  │
│  └──────────────┘             │  │   engine packages  │  │  │
│                               │  │  (Google, OpenAI)  │  │  │
│                               │  └────────────────────┘  │  │
│                               └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

      Chromium / Firefox / Safari          Tampermonkey
      ──────────────────────────           ─────────────
      createWebExtRuntimeBridge(chrome)   in-process RuntimeBridge
      createWebExtUiBridge(chrome)        GM_setValue / GM_getValue
      MV3 background service worker       (no service worker)
```

Each target app is a thin shim: it installs its platform bridges and calls
the shared entry points (`startContent`, `startPopup`, `startOptions`,
`startServiceWorker`). All translation logic, DOM operations and Solid
components live in `@transflow/shared-ext`, so a fix or feature is shipped
to every target in one place.

All API calls happen in the background context (WebExtension targets) or
directly in-process (userscript target) to avoid CORS issues where possible.

---

## 🔒 Privacy

- API keys are stored locally in `chrome.storage.sync` (synced across your Chrome profile via Google account encryption).
- No data is sent to TransFlow servers — all translation requests go directly to the engine you configure.
- The Google Translate adapter uses the public web API and may be subject to Google's usage policies.

---

## 📄 License

MIT
