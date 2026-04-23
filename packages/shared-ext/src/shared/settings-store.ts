/**
 * Solid store backed by the active {@link UiBridge}. Consumed by both popup
 * and options UIs in every target.
 */
import { createSignal, batch } from "solid-js";
import { mergeSettings, type Settings } from "@transflow/core";
import { getUi } from "../platform/registry.js";

const [settings, setSettingsSignal] = createSignal<Settings>(mergeSettings(null));
const [loaded, setLoaded] = createSignal(false);

export async function initSettings(): Promise<void> {
  try {
    const fetched = await getUi().getSettings();
    batch(() => {
      setSettingsSignal(mergeSettings(fetched));
      setLoaded(true);
    });
  } catch (err) {
    console.error("[TransFlow] Failed to initialize settings:", err);
    batch(() => {
      setSettingsSignal(mergeSettings(null));
      setLoaded(true);
    });
  }
}

export { settings, loaded };

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  const next = { ...settings(), ...partial };
  setSettingsSignal(next);
  const ui = getUi();
  await ui.saveSettings(next);
  await ui.broadcastSettingsToActiveTab(next);
}

export async function broadcastSettingsToAllTabs(): Promise<void> {
  await getUi().broadcastSettingsToAllTabs(settings());
}

export function resetToDefaults(): void {
  setSettingsSignal(mergeSettings(null));
}
