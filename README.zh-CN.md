<div align="center">

# 🌊 TransFlow

**沉浸式、真正开源的双语翻译 —— 面向每一个浏览器、每一张网页、每一条字幕。**

[English](./README.md) · [简体中文](./README.zh-CN.md)

[![CI](https://github.com/FLmhp/TransFlow/actions/workflows/build.yml/badge.svg)](https://github.com/FLmhp/TransFlow/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A59-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Node](https://img.shields.io/badge/Node-%E2%89%A524-5fa04e?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Solid.js](https://img.shields.io/badge/Solid.js-UI-2c4f7c?logo=solid&logoColor=white)](https://www.solidjs.com/)
[![欢迎 PR](https://img.shields.io/badge/PRs-welcome-ff69b4.svg)](https://github.com/FLmhp/TransFlow/pulls)

**Chromium · Firefox · Safari · Tampermonkey**

</div>

---

## 🚀 为什么选择 TransFlow？

TransFlow 是一个轻量、**真正开源**的双语翻译插件，是诸如 Immersive Translate 等闭源/半开源方案的替代品。我们相信：核心的翻译体验应当免费、透明，并且完全掌握在用户自己手里。

|                          | 🌊 **TransFlow** | 🔒 其他「开源」翻译插件 |
| ------------------------ | :--------------: | :---------------------: |
| 代码完全开源             |        ✅        |     ⚠️ 部分 / 仅外壳    |
| 核心功能是否收费         |    ❌ 全部免费    |       💸 Pro / 会员      |
| 使用自己的 API key       |        ✅        |       🪙 平台代币充值    |
| 是否需要订阅月 / 年费    |        ❌        |        💳 需订阅         |
| 无埋点、无账号           |    ✅ 零上报     |      📡 必须注册账号     |
| 功能聚焦、界面简洁       |        ✅        |    🧱 功能臃肿、广告位    |
| 支持以油猴脚本方式运行   |        ✅        |            ❌            |

> **我们的承诺：** TransFlow 的每一项功能对所有用户开放。没有「Pro 会员」、没有被锁死的模型、无需注册账号。自带一把 API key（或直接使用免费的 Google 翻译）即可使用。

---

## ✨ 功能特性

- 🌐 **网页双语翻译** —— 段落在原文下方实时插入译文；SPA 页面通过 `MutationObserver` 自动适配。
- 📄 **PDF 翻译** —— 兼容 PDF.js 的文字层，逐行翻译并直接显示在查看器内。
- 🎬 **视频字幕翻译** —— 支持 YouTube、Netflix、Disney+、Prime Video、Bilibili，以及通用 HTML5 播放器。
- 🖱 **划词翻译气泡** —— 选中任意文字即可弹出译文提示。
- 🔍 **Google 翻译** —— 免费、免密钥（直接调用公开网页接口）。
- 🤖 **OpenAI / 兼容大模型** —— 自带 API key；兼容任意 OpenAI 风格的 Chat Completions 接口。
- ⚙️ **完整的选项页** —— 按引擎配置 API key、自定义 Base URL、语言对、外观样式。
- 🧩 **一套代码，四端发布** —— Chromium MV3、Firefox MV3、Safari Web Extension，以及 Tampermonkey 油猴脚本。

---

## 🏗 技术栈

| 分层                    | 选型                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| 包管理                  | [pnpm](https://pnpm.io/) workspaces                                              |
| Monorepo 调度           | [turborepo](https://turborepo.com/)                                              |
| 语言                    | TypeScript (ESNext)                                                              |
| 打包工具                | [tsdown](https://tsdown.dev/)（基于 Rolldown）                                   |
| Lint / 格式化           | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) + [oxfmt](https://oxc.rs/) |
| Popup / Options UI      | [Solid.js](https://www.solidjs.com/)                                             |
| 内容脚本 DOM 操作       | [jQuery 4](https://jquery.com/)                                                  |
| CI                      | GitHub Actions，产出可直接安装的 `.zip`                                          |
| 单元测试                | [Vitest 4.1](https://vitest.dev/)（按包拆分 `projects`，DOM 相关使用 jsdom）     |
| 端到端 / 视觉回归测试   | [Playwright](https://playwright.dev/)（加载扩展的 headless Chromium）            |

---

## 📁 仓库结构

TransFlow 采用 **pnpm + turborepo** 的 monorepo 结构，共享包 + 按浏览器拆分的 target app：

```
TransFlow/
├── package.json               # 根目录，pnpm workspaces + turbo
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .oxlintrc.json / .oxfmtrc.json
├── .github/workflows/build.yml  # CI：lint + 构建 4 个发布目标
│
├── packages/
│   ├── core/                  # @transflow/core — 共享类型、设置、
│   │   └── src/*.ts           #   消息协议、语言与引擎描述
│   ├── translator/            # @transflow/translator — 抽象 Translator
│   │   └── src/               #   类、TranslationError、TranslatorRegistry
│   ├── google-translator/     # @transflow/google-translator — Google 引擎
│   │   └── src/
│   ├── openai-translator/     # @transflow/openai-translator — OpenAI 引擎
│   │   └── src/
│   └── shared-ext/            # @transflow/shared-ext — 跨端共享代码：
│       └── src/               #   platform bridge 抽象、内容脚本模块
│           ├── platform/      #   （webpage / pdf / subtitle / tooltip）、
│           ├── content/       #   popup & options 的 Solid UI、
│           ├── popup/         #   设置存储、后台 service worker
│           ├── options/
│           ├── shared/
│           └── background/
│
└── apps/                      # 每个发布目标都是很薄的壳，负责安装
    │                          # 平台 bridge 并调用 shared-ext 的入口。
    ├── chrome-ext/            # @transflow/chrome-ext — Chromium MV3
    ├── firefox-ext/           # @transflow/firefox-ext — Firefox MV3
    ├── safari-ext/            # @transflow/safari-ext — Safari Web Extension MV3
    └── script-ext/            # @transflow/script-ext — Tampermonkey 用户脚本
```

### 🔌 平台抽象

所有翻译逻辑、UI 与 DOM 操作都集中在 `@transflow/shared-ext`。各发布目标只需要安装一对 bridge —— `RuntimeBridge`（内容层）与 `UiBridge`（popup / options）—— 然后调用共享入口 `startContent`、`startPopup`、`startOptions`、`startServiceWorker` 即可。

三个 WebExtension 目标（Chromium / Firefox / Safari）通过 `createWebExtRuntimeBridge` / `createWebExtUiBridge` 在 `chrome.*` MV3 API 之上实现 bridge。Tampermonkey 目标则提供完全在进程内的 bridge，底层使用 `GM_getValue` / `GM_setValue`，并直接调用翻译引擎（不再需要 service worker）。

内容脚本使用 **jQuery 4** 负责 DOM 遍历与操作；popup 与 options 页面是完整的 Solid.js 应用。翻译引擎位于独立的 package 中（`@transflow/google-translator`、`@transflow/openai-translator`），统一继承 `@transflow/translator` 的抽象 `Translator` 类 —— 新增引擎只需实现一个类，再注册到 `TranslatorRegistry` 即可。

---

## 📦 安装

### 方式一：使用发布版 / CI 产物（推荐）

CI 会产出四份产物，可从仓库的 [Actions 页面](../../actions) 或 GitHub Release 中下载对应目标：

| 目标                      | 产物                                |
| ------------------------- | ----------------------------------- |
| Chromium / Chrome / Edge  | `transflow-chrome` (`.zip`)         |
| Firefox                   | `transflow-firefox` (`.zip`)        |
| Safari                    | `transflow-safari` (`.zip`)         |
| Tampermonkey / 用户脚本   | `transflow-userscript` (`.user.js`) |

- **Chrome / Edge / Firefox：** 解压后，在 `chrome://extensions` / `about:debugging` 中选择「加载已解压的扩展程序」。
- **Safari：** 对解压目录执行 `xcrun safari-web-extension-converter` 生成 Xcode 工程（详见 `apps/safari-ext/README.md`）。
- **Tampermonkey：** 在浏览器中打开 `.user.js` 文件，脚本管理器会提示安装。

### 🔨 本地构建

```sh
# 需要 Node.js ≥ 24 与 pnpm ≥ 9
pnpm install
pnpm build            # 通过 turborepo 构建四个发布目标
# → apps/chrome-ext/dist/transflow-chrome.zip
# → apps/firefox-ext/dist/transflow-firefox.zip
# → apps/safari-ext/dist/transflow-safari.zip
# → apps/script-ext/dist/transflow.user.js
```

单独构建某一个目标：

```sh
pnpm --filter @transflow/chrome-ext  build
pnpm --filter @transflow/firefox-ext build
pnpm --filter @transflow/safari-ext  build
pnpm --filter @transflow/script-ext  build
```

### 🛠 开发脚本

| 命令                   | 说明                                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| `pnpm build`           | 构建所有 package 与扩展并产出 zip。                                               |
| `pnpm dev`             | 所有 package 同时以 tsdown 监听模式运行。                                         |
| `pnpm lint`            | 运行 oxlint（类型感知）+ 全 workspace 的 `tsc --noEmit`。                         |
| `pnpm format`          | 用 oxfmt 格式化所有源码。                                                         |
| `pnpm format:check`    | 只检查，不写回文件。                                                              |
| `pnpm test`            | 运行所有 package 的 [Vitest](https://vitest.dev) 单元测试。                       |
| `pnpm test:watch`      | Vitest 监听模式。                                                                 |
| `pnpm test:coverage`   | 在 `coverage/` 生成 v8 覆盖率报告。                                               |
| `pnpm test:e2e`        | 运行 [Playwright](https://playwright.dev) 端到端 + 视觉回归测试（需先构建）。     |
| `pnpm test:e2e:update` | 有意更新 UI 后刷新 Playwright 视觉快照。                                          |
| `pnpm clean`           | 清除 `dist/` 与 `node_modules/`。                                                 |

---

## 🔧 配置

点击浏览器工具栏的 TransFlow 图标打开 popup，或点击 popup 内的 ⚙ 按钮进入设置页。

### 翻译引擎

| 引擎               | 是否需要 API key | 速度      | 质量      |
| ------------------ | ---------------- | --------- | --------- |
| Google 翻译        | ❌ 免费          | ⚡ 快     | 良好      |
| OpenAI GPT-4o-mini | ✅ 需要           | ⚡ 快     | 优秀      |
| OpenAI GPT-4o      | ✅ 需要           | 🐢 偏慢   | 最佳      |

OpenAI 引擎兼容任意 OpenAI 风格的 Chat Completions 接口 —— 在选项页中设置自定义 **Base URL**（`OPENAI_BASE_URL`）即可指向第三方兼容服务，默认值为 `https://api.openai.com/v1`。

#### 获取 API key

- **OpenAI：** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🏛 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     浏览器 / 网页宿主                        │
│                                                             │
│  ┌──────────────┐   bridges   ┌──────────────────────────┐  │
│  │   Popup UI   │ ──────────► │                          │  │
│  │  (Solid.js)  │             │   @transflow/shared-ext  │  │
│  └──────────────┘             │                          │  │
│  ┌──────────────┐             │  ┌────────────────────┐  │  │
│  │  Options UI  │ ──────────► │  │ 平台 bridge        │  │  │
│  │  (Solid.js)  │             │  │  RuntimeBridge     │  │  │
│  └──────────────┘             │  │  UiBridge          │  │  │
│  ┌──────────────┐             │  └────────────────────┘  │  │
│  │内容脚本 (jQuery)│◄──────► │  ┌────────────────────┐  │  │
│  │ 网页 / PDF /  │           │  │  @transflow/       │  │  │
│  │ 字幕 / 划词    │           │  │   translator +     │  │  │
│  └──────────────┘             │  │   各引擎包         │  │  │
│                               │  │  (Google, OpenAI)  │  │  │
│                               │  └────────────────────┘  │  │
│                               └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

      Chromium / Firefox / Safari          Tampermonkey
      ──────────────────────────           ─────────────
      createWebExtRuntimeBridge(chrome)   进程内 RuntimeBridge
      createWebExtUiBridge(chrome)        GM_setValue / GM_getValue
      MV3 background service worker       （无 service worker）
```

每个发布目标都是一层很薄的壳：安装平台 bridge，然后调用共享入口 `startContent`、`startPopup`、`startOptions`、`startServiceWorker` 即可。所有翻译逻辑、DOM 操作和 Solid 组件都集中在 `@transflow/shared-ext` 中，任何修复或新特性只需改一次就能发布到四端。

所有对外 API 调用都发生在后台上下文（WebExtension 目标）或进程内（用户脚本目标），以尽量避免 CORS 问题。

---

## 🔒 隐私

- API key 仅存储在本地的 `chrome.storage.sync`（由浏览器厂商使用加密的账号同步机制在你的设备之间同步）。
- **不会向 TransFlow 服务器发送任何数据** —— 所有翻译请求都直接发给你自己配置的引擎。
- **无埋点、无统计、无账号系统。**
- Google 翻译适配器使用的是公开的网页接口，可能受 Google 自身使用政策的限制。

---

## 🤝 贡献

非常欢迎贡献！大型改动请先开 issue 讨论设计再提交 PR。

1. Fork 仓库并从 `main` 开一个分支。
2. `pnpm install`，完成改动，运行 `pnpm lint && pnpm test`。
3. 提交 Pull Request。

---

## 📄 开源协议

[MIT](https://opensource.org/licenses/MIT) © TransFlow 贡献者
