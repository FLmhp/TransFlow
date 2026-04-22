import { TranslationError, type Translator } from './types.js';

interface DeepLResponse {
  translations: Array<{ text: string; detected_source_language?: string }>;
}

export const deeplTranslator: Translator = {
  id: 'deepl',
  async translate({ text, sourceLang, targetLang, settings }) {
    const apiKey = settings.deeplApiKey;
    if (!apiKey) throw new TranslationError('deepl', 'DeepL API key is not configured.');

    const endpoint = settings.deeplIsPro
      ? 'https://api.deepl.com/v2/translate'
      : 'https://api-free.deepl.com/v2/translate';

    const body = new URLSearchParams({
      auth_key: apiKey,
      text,
      target_lang: targetLang.toUpperCase(),
    });
    if (sourceLang && sourceLang !== 'auto') {
      body.append('source_lang', sourceLang.toUpperCase());
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new TranslationError('deepl', `Request failed (${response.status}): ${err}`, response.status);
    }

    const data = (await response.json()) as DeepLResponse;
    return data.translations?.[0]?.text ?? '';
  },
};
