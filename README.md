# TransFlow — Immersive Translation Extension

> A Chrome extension for immersive bilingual translation. Supports machine translation (Google Translate, DeepL) **and** LLM translation (OpenAI GPT, Google Gemini). Real-time bilingual webpage, PDF document, and video subtitle translation.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🌐 **Bilingual Webpage** | Paragraphs are translated and inserted inline below (or above) the original text in real-time. SPAs are fully supported via MutationObserver. |
| 📄 **PDF Translation** | Works with PDF.js text layers — translates each line of text and shows the translation directly inside the viewer. |
| 🎬 **Video Subtitles** | Detects subtitles on YouTube, Netflix, Disney+, Prime Video, Bilibili, and generic players. Adds a translated line below each subtitle. |
| 🔍 **Google Translate** | Free, no API key required. Uses the public Google Translate web API. |
| 📘 **DeepL** | High-quality machine translation. Free or Pro API key required. |
| 🤖 **OpenAI GPT** | LLM-powered translation using GPT-4o-mini, GPT-4o, etc. API key required. |
| ✨ **Google Gemini** | LLM-powered translation using Gemini 1.5 Flash/Pro. API key required. |
| 🖱 **Context Menu** | Right-click any selected text → "Translate selection with TransFlow". |
| ⚙ **Full Settings Page** | Per-engine API keys, language pairs, appearance customisation. |

---

## 🚀 Installation

### From source (developer mode)

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this repository folder.
5. The TransFlow icon will appear in your toolbar.

---

## 🔧 Configuration

Click the TransFlow toolbar icon to open the popup, or go to the Settings page (⚙ button in popup).

### Translation Engines

| Engine | API Key? | Speed | Quality |
|--------|----------|-------|---------|
| Google Translate | ❌ Free | ⚡ Fast | Good |
| DeepL | ✅ Required | ⚡ Fast | Excellent |
| OpenAI GPT-4o-mini | ✅ Required | ⚡ Fast | Excellent |
| OpenAI GPT-4o | ✅ Required | 🐢 Slower | Best |
| Gemini 1.5 Flash | ✅ Required | ⚡ Fast | Excellent |
| Gemini 1.5 Pro | ✅ Required | 🐢 Slower | Best |

#### Getting API keys

- **DeepL**: [deepl.com/pro-api](https://www.deepl.com/pro-api) — free tier available (500,000 chars/month)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — free tier available

---

## 📁 Project Structure

```
TransFlow/
├── manifest.json                  # Extension manifest (MV3)
├── background/
│   ├── service_worker.js          # Background service worker
│   └── translators/
│       ├── index.js               # Engine dispatcher
│       ├── google.js              # Google Translate adapter
│       ├── deepl.js               # DeepL adapter
│       ├── openai.js              # OpenAI GPT adapter
│       └── gemini.js              # Google Gemini adapter
├── content/
│   ├── index.js                   # Content script entry point
│   ├── webpage.js                 # Bilingual webpage translation
│   ├── pdf.js                     # PDF text layer translation
│   └── subtitle.js                # Video subtitle translation
├── popup/
│   ├── popup.html                 # Popup UI
│   ├── popup.js                   # Popup logic
│   └── popup.css                  # Popup styles
├── options/
│   ├── options.html               # Settings page
│   ├── options.js                 # Settings logic
│   └── options.css                # Settings styles
└── assets/
    └── icons/                     # Extension icons (16/32/48/128px)
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Chrome Browser                        │
│                                                             │
│  ┌──────────────┐     messages      ┌──────────────────────┐│
│  │   Popup UI   │ ◄────────────────► │  Service Worker      ││
│  │  (popup.js)  │                   │ (service_worker.js)  ││
│  └──────────────┘                   │                      ││
│                                     │  Translation Engines ││
│  ┌──────────────┐     messages      │  ┌────────────────┐  ││
│  │ Content Script│◄───────────────► │  │ Google/DeepL   │  ││
│  │ (index.js)   │                   │  │ OpenAI/Gemini  │  ││
│  │              │                   │  └────────────────┘  ││
│  │ ┌──────────┐ │                   └──────────────────────┘│
│  │ │ Webpage  │ │                                            │
│  │ │  PDF     │ │                                            │
│  │ │ Subtitle │ │                                            │
│  │ └──────────┘ │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

The content script sends `TRANSLATE` messages to the service worker, which dispatches them to the configured translation engine and returns the translated text. All API calls happen in the service worker (background context) to avoid CORS issues.

---

## 🔒 Privacy

- API keys are stored locally in `chrome.storage.sync` (synced across your Chrome profile via Google account encryption).
- No data is sent to TransFlow servers — all translation requests go directly to the engine you configure.
- The Google Translate adapter uses the public web API and may be subject to Google's usage policies.

---

## 📄 License

MIT
