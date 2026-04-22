/**
 * Content script entry point.
 *
 * Orchestrates the independent, decoupled modules (webpage / PDF /
 * subtitle / tooltip) based on the current settings and listens for
 * settings updates coming from the popup or background.
 */
import $ from "jquery";
import type { Message, Settings } from "@transflow/core";
import { injectGlobalStyles } from "./styles.js";
import { bindTooltipDismissal, showTooltip } from "./tooltip.js";
import { loadSettings, sendMessage } from "./messaging.js";
import { createWebpageModule, type WebpageModule } from "./webpage.js";
import { createPdfModule, isPdfPage, type PdfModule } from "./pdf.js";
import { createSubtitleModule, type SubtitleModule } from "./subtitle.js";

interface Runtime {
  settings: Settings | null;
  webpage: WebpageModule | null;
  pdf: PdfModule | null;
  subtitle: SubtitleModule | null;
}

const runtime: Runtime = {
  settings: null,
  webpage: null,
  pdf: null,
  subtitle: null,
};

async function applySettings(next: Settings): Promise<void> {
  const prev = runtime.settings;
  runtime.settings = next;

  injectGlobalStyles(next.translationColor, next.translationFontSize);

  // Webpage
  if (next.enabled) {
    if (!runtime.webpage) {
      runtime.webpage = createWebpageModule(next);
      await runtime.webpage.start();
    } else if (prev && prev.translationPosition !== next.translationPosition) {
      // Rebuild to honor new position
      runtime.webpage.stop();
      runtime.webpage = createWebpageModule(next);
      await runtime.webpage.start();
    }
  } else if (runtime.webpage) {
    runtime.webpage.stop();
    runtime.webpage = null;
  }

  // PDF
  const shouldPdf = next.enabled && next.pdfEnabled && isPdfPage();
  if (shouldPdf && !runtime.pdf) {
    runtime.pdf = createPdfModule();
    await runtime.pdf.start();
  } else if (!shouldPdf && runtime.pdf) {
    runtime.pdf.stop();
    runtime.pdf = null;
  }

  // Subtitles
  const shouldSubtitle = next.enabled && next.subtitleEnabled;
  if (shouldSubtitle && !runtime.subtitle) {
    runtime.subtitle = createSubtitleModule();
    runtime.subtitle.start();
  } else if (!shouldSubtitle && runtime.subtitle) {
    runtime.subtitle.stop();
    runtime.subtitle = null;
  }
}

chrome.runtime.onMessage.addListener((message: Message) => {
  switch (message.type) {
    case "SETTINGS_UPDATED":
      void applySettings(message.settings);
      break;
    case "TOGGLE_TRANSLATION": {
      if (!runtime.settings) return;
      const nextEnabled = !runtime.settings.enabled;
      const merged: Settings = { ...runtime.settings, enabled: nextEnabled };
      void sendMessage({ type: "SAVE_SETTINGS", settings: { enabled: nextEnabled } });
      void applySettings(merged);
      break;
    }
    case "SHOW_TOOLTIP":
      showTooltip(message.text);
      break;
    case "SHOW_ERROR":
      showTooltip(message.text, true);
      break;
    default:
      break;
  }
});

$(async () => {
  bindTooltipDismissal();
  const settings = await loadSettings();
  await applySettings(settings);
});
