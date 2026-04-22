import type { TranslationEngine } from "@transflow/core";
import { Translator, TranslationError, type TranslationRequest } from "./translator.js";

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

  constructor(translators: Iterable<Translator> = []) {
    for (const t of translators) this.register(t);
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
   */
  async translate(request: TranslationRequest): Promise<string> {
    const engine = request.settings.engine;
    const translator = this.translators.get(engine);
    if (!translator) {
      throw new TranslationError(engine, `No translator registered for engine: ${engine}`);
    }
    return translator.run(request);
  }
}
