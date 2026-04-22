import { TranslationError, type Translator } from './types.js';

interface GeminiResponse {
  candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
}

export const geminiTranslator: Translator = {
  id: 'gemini',
  async translate({ text, sourceLang, targetLang, settings }) {
    const apiKey = settings.geminiApiKey;
    if (!apiKey) throw new TranslationError('gemini', 'Gemini API key is not configured.');
    const model = settings.geminiModel || 'gemini-1.5-flash';

    const prompt =
      `Translate the following text from ${sourceLang === 'auto' ? 'the detected language' : sourceLang}` +
      ` to ${targetLang}. Output ONLY the translated text without any explanation or extra content.\n\n${text}`;

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}` +
      `:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      throw new TranslationError('gemini', `Request failed (${response.status}): ${err}`, response.status);
    }

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  },
};
