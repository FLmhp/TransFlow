/**
 * Shared Solid store backed by `chrome.storage.sync` (via the background
 * service worker). Consumed by both popup and options UIs.
 */
import { createSignal, batch } from 'solid-js';
import { mergeSettings, type Message, type Settings } from '@transflow/core';

const [settings, setSettingsSignal] = createSignal<Settings>(mergeSettings(null));
const [loaded, setLoaded] = createSignal(false);

function send<T>(message: Message): Promise<T> {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, (res: T) => resolve(res)));
}

export async function initSettings(): Promise<void> {
  const fetched = await send<Settings>({ type: 'GET_SETTINGS' });
  batch(() => {
    setSettingsSignal(mergeSettings(fetched));
    setLoaded(true);
  });
}

export { settings, loaded };

export async function updateSettings(partial: Partial<Settings>): Promise<void> {
  const next = { ...settings(), ...partial };
  setSettingsSignal(next);
  await send({ type: 'SAVE_SETTINGS', settings: next });
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (tab?.id !== undefined) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings: next });
    } catch {
      /* no content script on this tab */
    }
  }
}

export async function broadcastSettingsToAllTabs(): Promise<void> {
  const next = settings();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return;
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings: next });
      } catch {
        /* tab has no content script */
      }
    }),
  );
}

export function resetToDefaults(): void {
  setSettingsSignal(mergeSettings(null));
}
