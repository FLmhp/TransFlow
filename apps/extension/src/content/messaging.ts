/**
 * Thin, typed wrapper around `chrome.runtime.sendMessage` so callers never
 * touch raw message payloads.
 */
import type { Message, Settings, TranslateResponse } from "@transflow/core";

export function sendMessage<TRes = unknown>(message: Message): Promise<TRes> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: TRes) => resolve(response));
  });
}

export async function requestTranslation(text: string): Promise<string | null> {
  try {
    const res = await sendMessage<TranslateResponse | undefined>({ type: "TRANSLATE", text });
    if (!res || !res.ok) return null;
    return res.translated;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<Settings> {
  return sendMessage<Settings>({ type: "GET_SETTINGS" });
}
