/**
 * Content-layer translation request helper. Delegates to the platform
 * runtime bridge, which in a WebExtension routes to the background service
 * worker, and in a userscript calls the translator engines in-process.
 */
import { getRuntime } from "../platform/registry.js";

export async function requestTranslation(
  text: string,
  sourceLang?: string,
  targetLang?: string,
): Promise<string | null> {
  return getRuntime().requestTranslation(text, sourceLang, targetLang);
}
