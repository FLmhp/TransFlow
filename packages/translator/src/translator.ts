import type { Settings, TranslationEngine } from "@transflow/core";

/**
 * A single translation job description. Carries everything a concrete
 * translator needs to perform its request — text, language pair and the
 * full user settings (engines read their own credentials from here).
 */
export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  settings: Settings;
}

/**
 * Abstract base class for translation engines.
 *
 * Each concrete translator:
 *   - declares its engine `id` (matching {@link TranslationEngine}); and
 *   - implements {@link Translator.translate} to return the translated text.
 *
 * Keeping this as an abstract class (rather than a plain interface) lets
 * us share cross-cutting behaviour here — e.g. short-circuiting empty
 * input via {@link Translator.run} — without each engine having to
 * re-implement it.
 */
export abstract class Translator {
  abstract readonly id: TranslationEngine;

  /**
   * Perform the actual translation. Implementations should throw
   * {@link TranslationError} on any failure.
   */
  abstract translate(request: TranslationRequest): Promise<string>;

  /**
   * Public entry point used by the dispatcher. Trims input and
   * short-circuits on empty text so concrete engines never have to.
   */
  async run(request: TranslationRequest): Promise<string> {
    const text = request.text?.trim() ?? "";
    if (!text) return "";
    return this.translate({ ...request, text });
  }
}

/**
 * Error type raised by any translator implementation. Carries the engine
 * id and optional HTTP status for upstream logging / UX.
 */
export class TranslationError extends Error {
  readonly engine: TranslationEngine;
  readonly status?: number;

  constructor(engine: TranslationEngine, message: string, status?: number) {
    super(`[${engine}] ${message}`);
    this.name = "TranslationError";
    this.engine = engine;
    this.status = status;
  }
}
