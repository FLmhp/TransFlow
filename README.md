<div align="center">

# 🌊 TransFlow

**Immersive, truly open-source bilingual translation — for every browser, every page, every subtitle.**

[English](./README.md) · [简体中文](./README.zh-CN.md)

[![CI](https://github.com/FLmhp/TransFlow/actions/workflows/build.yml/badge.svg)](https://github.com/FLmhp/TransFlow/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A59-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A524-5fa04e?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solid.js](https://img.shields.io/badge/Solid.js-UI-2c4f7c?logo=solid&logoColor=white)](https://www.solidjs.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg)](https://github.com/FLmhp/TransFlow/pulls)

**Chromium · Firefox · Safari · Tampermonkey**

</div>

---

## 🚀 Why TransFlow?

TransFlow is a lightweight, **genuinely open-source** alternative to proprietary bilingual translators (e.g. Immersive Translate). We believe the core translation experience should be free, transparent, and under your control.

|                              | 🌊 **TransFlow** | 🔒 Other "open-source" translators |
| ---------------------------- | :--------------: | :--------------------------------: |
| Truly open-source code       |        ✅        |         ⚠️ partial / stub          |
| Core features behind paywall |        ❌        |           💸 Pro / Plus            |
| Your own API keys, your cost |        ✅        |          🪙 token top-ups          |
| Monthly / yearly membership  |        ❌        |          💳 subscription           |
| No telemetry, no accounts    |        ✅        |        📡 account required         |
| Minimal, focused scope       |        ✅        |       🧱 feature-bloated UI        |
| Run as a userscript          |        ✅        |                 ❌                 |

> **Our promise:** every feature in TransFlow is available to every user. No "Pro" tier, no gated models, no account sign-up. Bring your own API key (or use free Google Translate) and that's it.

---

## ✨ Features

- 🌐 **Bilingual webpage translation** — paragraphs translated inline in real time; SPAs fully supported via `MutationObserver`.
- 📄 **PDF translation** — any `.pdf` URL is opened in a bundled PDF.js viewer and translated inline; enable "Auto-redirect .pdf links" in Options to make the redirect automatic. The Tampermonkey build can only translate PDFs rendered by a PDF.js viewer in the page (e.g. Firefox's built-in viewer), since userscripts cannot host an extension page — use a WebExtension build for direct-URL PDF translation.
- 🎬 **Video subtitle translation** — YouTube, Netflix, Disney+, Prime Video, Bilibili, and generic HTML5 players.
- 🖱 **Selection tooltip** — select any text on a page and get an instant translation popup.
- 🔍 **Google Translate** — free, no API key needed (public web endpoint).
- 🤖 **OpenAI / compatible LLMs** — bring your own key; works with any OpenAI-compatible Chat Completions endpoint.
- ⚙️ **Full options page** — per-engine API keys, custom base URL, language pairs, appearance.
- 🧩 **One code base, four targets** — Chromium MV3, Firefox MV3, Safari Web Extension, and Tampermonkey userscript.

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

TransFlow is a **pnpm + turborepo monorepo** with shared packages and per-browser target apps:

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

### 🔌 Platform abstraction

`@transflow/shared-ext` owns all translation logic, UI and DOM operations. Each target app is a thin wrapper that installs a pair of bridges — `RuntimeBridge` for the content layer and `UiBridge` for popup/options — and then calls the shared entry points (`startContent`, `startPopup`, `startOptions`, `startServiceWorker`).

For the three WebExtension targets (Chromium / Firefox / Safari) the bridge is implemented on top of the `chrome.*` MV3 API via `createWebExtRuntimeBridge` / `createWebExtUiBridge`. The Tampermonkey target provides a completely in-process bridge backed by `GM_getValue` / `GM_setValue` and calls the translator engines directly (no service worker).

The content script uses **jQuery 4** for DOM traversal and manipulation; the popup and options pages are full Solid.js applications. Translation engines live in their own packages (`@transflow/google-translator`, `@transflow/openai-translator`) and extend the abstract `Translator` class from `@transflow/translator`, so adding a new engine is a matter of implementing one class and registering it with the `TranslatorRegistry`.

---

## 📦 Installation

### From a release / CI build (recommended)

CI produces four artifacts — grab the one for your target from the
[Actions tab](../../actions) or a GitHub Release:

| Target                    | Artifact                            |
| ------------------------- | ----------------------------------- |
| Chromium / Chrome / Edge  | `transflow-chrome` (`.zip`)         |
| Firefox                   | `transflow-firefox` (`.zip`)        |
| Safari                    | `transflow-safari` (`.zip`)         |
| Tampermonkey / Userscript | `transflow-userscript` (`.user.js`) |

- **Chrome / Edge / Firefox:** unzip, then load via `chrome://extensions` / `about:debugging` → "Load unpacked".
- **Safari:** run `xcrun safari-web-extension-converter` on the unzipped folder to produce an Xcode project (see `apps/safari-ext/README.md`).
- **Tampermonkey:** open the `.user.js` file in your browser and the userscript manager will prompt you to install it.

### 🔨 Building locally

```sh
# Requires Node.js ≥ 24 and pnpm ≥ 9
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

### 🛠 Development scripts

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

### Translation engines

| Engine             | API key?    | Speed     | Quality   |
| ------------------ | ----------- | --------- | --------- |
| Google Translate   | ❌ Free     | ⚡ Fast   | Good      |
| OpenAI GPT-4o-mini | ✅ Required | ⚡ Fast   | Excellent |
| OpenAI GPT-4o      | ✅ Required | 🐢 Slower | Best      |

The OpenAI engine is compatible with any OpenAI-style Chat Completions endpoint — set a custom **Base URL** (`OPENAI_BASE_URL`) in the Options page to point at a compatible provider; the default is `https://api.openai.com/v1`.

#### Getting API keys

- **OpenAI:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🏛 Architecture

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
│  │Content (jQuery)│ ◄──────► │  ┌────────────────────┐  │  │
│  │ webpage / PDF  │           │  │  @transflow/       │  │  │
│  │ subtitle / tip │           │  │   translator +     │  │  │
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

Each target app is a thin shim: it installs its platform bridges and calls the shared entry points (`startContent`, `startPopup`, `startOptions`, `startServiceWorker`). All translation logic, DOM operations and Solid components live in `@transflow/shared-ext`, so a fix or feature is shipped to every target in one place.

All API calls happen in the background context (WebExtension targets) or directly in-process (userscript target) to avoid CORS issues where possible.

---

## 🔒 Privacy

- API keys are stored locally in `chrome.storage.sync` (synced across your browser profile via the browser vendor's encrypted sync).
- **No data is sent to TransFlow servers** — all translation requests go directly to the engine you configure.
- **No telemetry, no analytics, no accounts.**
- The Google Translate adapter uses the public web API and may be subject to Google's usage policies.

---

## 🤝 Contributing

Contributions are very welcome! Please open an issue first for significant changes so we can discuss the design.

1. Fork the repo and create a branch from `main`.
2. `pnpm install`, make your change, run `pnpm lint && pnpm test`.
3. Open a pull request.

---

## 📄 License

[MIT](https://opensource.org/licenses/MIT) © TransFlow contributors
