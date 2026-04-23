/**
 * Module-level singleton holding the active {@link RuntimeBridge} /
 * {@link UiBridge}. Each target app installs its bridge at startup via
 * `installPlatform({ runtime, ui })`, then calls into the shared content /
 * popup / options entry points which read the bridge via `getRuntime()` /
 * `getUi()`.
 */
import type { RuntimeBridge, UiBridge } from "./types.js";

let runtime: RuntimeBridge | null = null;
let ui: UiBridge | null = null;

export interface PlatformInstall {
  runtime?: RuntimeBridge;
  ui?: UiBridge;
}

export function installPlatform(platform: PlatformInstall): void {
  if (platform.runtime) runtime = platform.runtime;
  if (platform.ui) ui = platform.ui;
}

export function getRuntime(): RuntimeBridge {
  if (!runtime) throw new Error("[TransFlow] Runtime bridge not installed");
  return runtime;
}

export function getUi(): UiBridge {
  if (!ui) throw new Error("[TransFlow] UI bridge not installed");
  return ui;
}

export function hasRuntime(): boolean {
  return runtime !== null;
}

export function hasUi(): boolean {
  return ui !== null;
}
