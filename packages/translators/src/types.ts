import type { Settings, TranslationEngine } from '@transflow/core';

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  settings: Settings;
}

/**
 * A translator is a pure strategy object: given a request, produce translated
 * text. Adding a new engine = implementing this interface and registering it.
 */
export interface Translator {
  readonly id: TranslationEngine;
  translate(request: TranslationRequest): Promise<string>;
}

export class TranslationError extends Error {
  readonly engine: TranslationEngine;
  readonly status?: number;

  constructor(engine: TranslationEngine, message: string, status?: number) {
    super(`[${engine}] ${message}`);
    this.name = 'TranslationError';
    this.engine = engine;
    this.status = status;
  }
}
