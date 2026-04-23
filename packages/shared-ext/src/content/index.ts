/**
 * Platform-agnostic content-script orchestrator.
 *
 * Entry point called from each target's content-script shim (WebExtension
 * targets) or directly from the userscript. Applies settings updates,
 * wires up the tooltip and drives the webpage / PDF / subtitle modules.
 */
import $ from "jquery";
import type { Settings } from "@transflow/core";
import { getRuntime } from "../platform/registry.js";
import { injectGlobalStyles } from "./styles.js";
import { bindTooltipDismissal, showTooltip } from "./tooltip.js";
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
    } else if (
      prev &&
      (prev.translationPosition !== next.translationPosition ||
        prev.translationTheme !== next.translationTheme ||
        prev.showOriginal !== next.showOriginal)
    ) {
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

/** Start the content-script pipeline. Idempotent at jQuery.ready level. */
export function startContent(): void {
  const bridge = getRuntime();

  bridge.onSettingsUpdated((next) => {
    void applySettings(next);
  });
  bridge.onToggleTranslation(() => {
    if (!runtime.settings) return;
    const nextEnabled = !runtime.settings.enabled;
    const merged: Settings = { ...runtime.settings, enabled: nextEnabled };
    void bridge.saveSettings({ enabled: nextEnabled });
    void applySettings(merged);
  });
  bridge.onShowTooltip((text, isError) => {
    showTooltip(text, isError);
  });

  $(async () => {
    bindTooltipDismissal();
    const settings = await bridge.getSettings();
    await applySettings(settings);
  });
}

/** Imperative toggle used by the userscript target's menu command. */
export function toggleTranslation(): void {
  if (!runtime.settings) return;
  const nextEnabled = !runtime.settings.enabled;
  const merged: Settings = { ...runtime.settings, enabled: nextEnabled };
  void getRuntime().saveSettings({ enabled: nextEnabled });
  void applySettings(merged);
}

/** Expose current settings for the userscript settings panel. */
export function currentSettings(): Settings | null {
  return runtime.settings;
}

/** Expose imperative `applySettings` for targets that bypass messaging. */
export function applySettingsExternal(next: Settings): Promise<void> {
  return applySettings(next);
}
