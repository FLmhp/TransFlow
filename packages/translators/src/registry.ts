import type { TranslationEngine } from "@transflow/core";
import { TranslationError, type Translator, type TranslationRequest } from "./types.js";
import { googleTranslator } from "./google.js";
import { deeplTranslator } from "./deepl.js";
import { openaiTranslator } from "./openai.js";
import { geminiTranslator } from "./gemini.js";

const REGISTRY: Readonly<Record<TranslationEngine, Translator>> = Object.freeze({
  google: googleTranslator,
  deepl: deeplTranslator,
  openai: openaiTranslator,
  gemini: geminiTranslator,
});

/**
 * Dispatch a translation request to the configured engine. Pure function —
 * no side effects beyond calling the translator's fetch.
 */
export async function translate(request: TranslationRequest): Promise<string> {
  const text = request.text?.trim() ?? "";
  if (!text) return "";

  const engine = request.settings.engine;
  const translator = REGISTRY[engine];
  if (!translator) {
    throw new TranslationError(engine, `Unknown translation engine: ${engine}`);
  }
  return translator.translate({ ...request, text });
}

export function getTranslator(engine: TranslationEngine): Translator {
  return REGISTRY[engine];
}
