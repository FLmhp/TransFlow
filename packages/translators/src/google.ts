import { TranslationError, type Translator } from './types.js';

export const googleTranslator: Translator = {
  id: 'google',
  async translate({ text, sourceLang, targetLang }) {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(targetLang)}` +
      `&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new TranslationError('google', `Request failed: ${response.status}`, response.status);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new TranslationError('google', 'Unexpected response shape');
    }
    return (data[0] as unknown[])
      .filter((item): item is [string, ...unknown[]] => Array.isArray(item) && typeof item[0] === 'string')
      .map((item) => item[0])
      .join('');
  },
};
