/**
 * Translation engine registry.
 * Dispatches translation requests to the appropriate backend.
 */
import { translateWithGoogle } from './google.js';
import { translateWithDeepL } from './deepl.js';
import { translateWithOpenAI } from './openai.js';
import { translateWithGemini } from './gemini.js';

/**
 * Translate text using the configured engine.
 * @param {string} text
 * @param {string} sourceLang  BCP-47 code or 'auto'
 * @param {string} targetLang  BCP-47 code
 * @param {object} settings    User settings from chrome.storage
 * @returns {Promise<string>}
 */
export async function translate(text, sourceLang, targetLang, settings = {}) {
  if (!text || !text.trim()) return '';

  const engine = settings.engine || 'google';

  switch (engine) {
    case 'google':
      return translateWithGoogle(text, sourceLang, targetLang);

    case 'deepl':
      return translateWithDeepL(
        text,
        sourceLang,
        targetLang,
        settings.deeplApiKey,
        settings.deeplIsPro
      );

    case 'openai':
      return translateWithOpenAI(
        text,
        sourceLang,
        targetLang,
        settings.openaiApiKey,
        settings.openaiModel
      );

    case 'gemini':
      return translateWithGemini(
        text,
        sourceLang,
        targetLang,
        settings.geminiApiKey,
        settings.geminiModel
      );

    default:
      throw new Error(`Unknown translation engine: ${engine}`);
  }
}
