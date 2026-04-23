/**
 * `@transflow/shared-ext` — cross-target shared code for every TransFlow
 * build (Chromium, Firefox, Safari, Userscript).
 *
 * A target app is a thin wrapper that:
 *   1. Installs its {@link RuntimeBridge} / {@link UiBridge} via
 *      `installPlatform({ runtime, ui })`.
 *   2. Calls `startContent()` in its content-script bundle,
 *      `startPopup()` / `startOptions()` in its UI bundles,
 *      and (WebExtension targets only) `startServiceWorker({ chrome })`
 *      in its background bundle.
 */
export * from "./platform/index.js";
export { startServiceWorker } from "./background/service-worker.js";
export {
  startContent,
  toggleTranslation,
  currentSettings,
  applySettingsExternal,
} from "./content/index.js";
export { startPopup } from "./popup/index.jsx";
export { startOptions } from "./options/index.jsx";
export { injectGlobalStyles } from "./content/styles.js";
export { showTooltip, hideTooltip, bindTooltipDismissal } from "./content/tooltip.js";
