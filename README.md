# TransFlow — Immersive Translation Extension

> A Chrome extension for immersive bilingual translation. Supports machine translation (Google Translate, DeepL) **and** LLM translation (OpenAI GPT, Google Gemini). Real-time bilingual webpage, PDF document, and video subtitle translation.

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

| Layer                  | Tooling                                                                          |
| ---------------------- | -------------------------------------------------------------------------------- |
| Package manager        | [pnpm](https://pnpm.io/) (workspaces)                                            |
| Monorepo runner        | [turborepo](https://turborepo.com/)                                              |
| Language               | TypeScript (ESNext)                                                              |
| Bundler                | [tsdown](https://tsdown.dev/) (powered by Rolldown)                              |
| Linter / Formatter     | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [oxfmt](https://oxc.rs/) |
| Popup / Options UI     | [Solid.js](https://www.solidjs.com/)                                             |
| Content-script DOM ops | [jQuery 4](https://jquery.com/)                                                  |
| CI                     | GitHub Actions — produces an installable `.zip` artifact                         |

---

## 📁 Project structure

This repository is a **pnpm + turborepo monorepo**:

```
TransFlow/
├── package.json               # root, pnpm workspaces + turbo
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .oxlintrc.json / .oxfmtrc.json
├── .github/workflows/build.yml  # CI: lint + build + zip artifact
│
├── packages/
│   ├── core/                  # @transflow/core — shared types, settings,
│   │   └── src/*.ts           #   message schemas, language + engine descriptors
│   ├── translator/            # @transflow/translator — abstract Translator
│   │   └── src/               #   class, TranslationError, TranslatorRegistry
│   ├── google-translator/     # @transflow/google-translator — Google engine
│   │   └── src/
│   └── openai-translator/     # @transflow/openai-translator — OpenAI engine
│       └── src/               #   (OPENAI_BASE_URL + OPENAI_API_KEY config)
│
└── apps/
    └── extension/             # @transflow/extension — the Chrome extension
        ├── manifest.json
        ├── tsdown.config.ts
        ├── scripts/package.mjs  # copies static assets + produces zip
        ├── public/assets/icons/
        └── src/
            ├── background/service_worker.ts
            ├── content/
            │   ├── index.ts      # entry + state orchestration
            │   ├── messaging.ts  # typed sendMessage wrapper
            │   ├── styles.ts     # injected CSS
            │   ├── tooltip.ts    # selection-translate tooltip
            │   ├── webpage.ts    # bilingual page translation
            │   ├── pdf.ts        # PDF.js text-layer translation
            │   └── subtitle.ts   # video subtitle translation
            ├── popup/            # Solid.js + TSX
            │   ├── index.html / index.tsx / App.tsx / styles.css
            ├── options/          # Solid.js + TSX
            │   └── index.html / index.tsx / App.tsx / styles.css
            └── shared/
                └── settings-store.ts  # Solid signal store for settings
```

The content script uses **jQuery 4** for DOM traversal and manipulation; the popup and options pages are full Solid.js applications. Translation engines are wired together in the service worker: each engine lives in its own package and extends the abstract `Translator` class from `@transflow/translator`, so adding a new engine is a matter of implementing one class and registering it with the `TranslatorRegistry`.

---

## 🚀 Installation

### From a release / CI build (recommended)

1. Grab the latest `transflow-extension.zip` from the
   [Actions tab](../../actions) (artifact name: **transflow-extension**) or a GitHub Release.
2. Unzip it somewhere.
3. Open Chrome → `chrome://extensions/`.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the unzipped folder.

### Building locally

```sh
# Requires Node.js ≥ 20 and pnpm ≥ 9
pnpm install
pnpm build            # turbo runs build in all workspace packages
# → apps/extension/dist/                    ← load this folder as unpacked
# → apps/extension/dist/transflow-extension.zip  ← shippable zip
```

### Development scripts

| Command             | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| `pnpm build`        | Build all packages + the extension, produce the zip.           |
| `pnpm dev`          | Run tsdown in watch mode across all packages.                  |
| `pnpm lint`         | Run oxlint (type-aware) + `tsc --noEmit` across the workspace. |
| `pnpm format`       | Run oxfmt to format every source file.                         |
| `pnpm format:check` | Verify formatting without writing.                             |
| `pnpm clean`        | Remove `dist/` and `node_modules/`.                            |

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
│                        Chrome Browser                       │
│                                                             │
│  ┌──────────────┐     messages      ┌──────────────────────┐│
│  │   Popup UI   │ ◄────────────────► │  Service Worker     ││
│  │  (Solid.js)  │                   │      (ESM MV3)       ││
│  └──────────────┘                   │                      ││
│  ┌──────────────┐                   │  @transflow/         ││
│  │  Options UI  │ ◄────────────────► │   translator +       ││
│  │  (Solid.js)  │                   │   engine packages    ││
│  └──────────────┘                   │  ┌────────────────┐  ││
│                                     │  │ Google         │  ││
│                                     │  │ OpenAI         │  ││
│  ┌──────────────┐     messages      │  └────────────────┘  ││
│  │ Content (IIFE)│◄───────────────► │                      ││
│  │  + jQuery 4  │                   └──────────────────────┘│
│  │              │                                            │
│  │ ┌──────────┐ │                                            │
│  │ │ Webpage  │ │                                            │
│  │ │  PDF     │ │                                            │
│  │ │ Subtitle │ │                                            │
│  │ │ Tooltip  │ │                                            │
│  │ └──────────┘ │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

The content script sends `TRANSLATE` messages to the service worker, which dispatches them through the `TranslatorRegistry` from `@transflow/translator` (populated with the engine packages) and returns the translated text. All API calls happen in the service worker (background context) to avoid CORS issues.

---

## 🔒 Privacy

- API keys are stored locally in `chrome.storage.sync` (synced across your Chrome profile via Google account encryption).
- No data is sent to TransFlow servers — all translation requests go directly to the engine you configure.
- The Google Translate adapter uses the public web API and may be subject to Google's usage policies.

---

## 📄 License

MIT
