/**
 * Platform abstraction — the common surface every TransFlow target (Chromium,
 * Firefox, Safari, Tampermonkey/Userscript) must implement.
 *
 * The content, popup and options layers import modules from
 * `@transflow/shared-ext` without ever touching `chrome.*`, `browser.*` or
 * `GM_*` directly; everything that touches a browser-specific global goes
 * through this interface.
 */
import type { Settings, TranslateResponse } from "@transflow/core";

/** Listener disposer — call to unsubscribe. */
export type Unsubscribe = () => void;

/** Subset of the runtime messaging API the content layer needs. */
export interface RuntimeBridge {
  getSettings(): Promise<Settings>;
  saveSettings(partial: Partial<Settings>): Promise<void>;
  /**
   * Ask the backend (service worker / userscript-bundle) for a translation.
   * Returns `null` on any failure so callers can swallow errors per-chunk.
   */
  requestTranslation(
    text: string,
    sourceLang?: string,
    targetLang?: string,
  ): Promise<string | null>;

  onSettingsUpdated(cb: (settings: Settings) => void): Unsubscribe;
  onToggleTranslation(cb: () => void): Unsubscribe;
  onShowTooltip(cb: (text: string, isError: boolean) => void): Unsubscribe;
}

/** UI-layer (popup/options) bridge. Exposes settings sync and broadcast. */
export interface UiBridge {
  getSettings(): Promise<Settings>;
  saveSettings(next: Settings): Promise<void>;
  /**
   * Push a settings update to the currently active tab. No-op when the
   * platform cannot enumerate tabs (e.g. the userscript target).
   */
  broadcastSettingsToActiveTab(next: Settings): Promise<void>;
  /**
   * Push a settings update to every open tab. No-op on platforms without
   * tab enumeration.
   */
  broadcastSettingsToAllTabs(next: Settings): Promise<void>;
  /**
   * Open a dedicated settings/options UI. Content-script callers use this
   * from the popup's "Settings" button.
   */
  openOptionsPage?(): void;
  /**
   * Open the bundled PDF viewer on the given PDF URL in a new tab. Only
   * available on WebExtension targets; no-op on the userscript target
   * (which lacks any way to open a viewer page).
   */
  openPdfViewer?(pdfUrl: string): void;
}

/**
 * Full translation request the background handler receives — mirrors the
 * arguments to `TranslatorRegistry.translate`.
 */
export interface TranslateArgs {
  text: string;
  sourceLang: string;
  targetLang: string;
}

/** Translation engine dispatcher — background-side. */
export type Translate = (args: TranslateArgs & { settings: Settings }) => Promise<string>;

/** Result shape returned by background handler. */
export type { TranslateResponse };
