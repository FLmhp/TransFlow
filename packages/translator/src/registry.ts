import type { TranslationEngine } from "@transflow/core";
import { Translator, TranslationError, type TranslationRequest } from "./translator.js";
import { TranslationCache } from "./cache.js";

/**
 * Registry of translator implementations keyed by engine id.
 *
 * The abstract package intentionally does NOT know about any concrete
 * translator. Applications wire engines in at startup:
 *
 * ```ts
 * const registry = new TranslatorRegistry([
 *   new GoogleTranslator(),
 *   new OpenAITranslator(),
 * ]);
 * await registry.translate(request);
 * ```
 */
export class TranslatorRegistry {
  private readonly translators = new Map<TranslationEngine, Translator>();
  private readonly cache?: TranslationCache;

  constructor(translators: Iterable<Translator> = [], cache?: TranslationCache) {
    for (const t of translators) this.register(t);
    this.cache = cache;
  }

  register(translator: Translator): void {
    this.translators.set(translator.id, translator);
  }

  get(engine: TranslationEngine): Translator | undefined {
    return this.translators.get(engine);
  }

  /**
   * Dispatch a translation request to the engine named in
   * `request.settings.engine`. Throws {@link TranslationError} if no
   * translator is registered for that engine.
   *
   * When a {@link TranslationCache} was provided and the user has enabled
   * caching via `settings.cacheEnabled`, identical subsequent requests
   * (same engine, language pair and input text) are served from memory
   * until the TTL elapses or the entry is LRU-evicted.
   */
  async translate(request: TranslationRequest): Promise<string> {
    const engine = request.settings.engine;
    const translator = this.translators.get(engine);
    if (!translator) {
      throw new TranslationError(engine, `No translator registered for engine: ${engine}`);
    }

    // Normalise the cache key the same way `Translator.run` will before
    // dispatching, so look-ups match regardless of surrounding whitespace.
    const text = request.text?.trim() ?? "";
    if (!text) return "";

    const cacheEnabled = this.cache && request.settings.cacheEnabled;
    if (cacheEnabled && this.cache) {
      const hit = this.cache.get({
        engine,
        sourceLang: request.sourceLang,
        targetLang: request.targetLang,
        text,
      });
      if (hit !== undefined) return hit;
    }

    const translated = await translator.run({ ...request, text });

    if (cacheEnabled && this.cache && translated) {
      this.cache.set(
        {
          engine,
          sourceLang: request.sourceLang,
          targetLang: request.targetLang,
          text,
        },
        translated,
      );
    }

    return translated;
  }
}
