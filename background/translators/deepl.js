/**
 * DeepL API adapter
 * Requires a DeepL API key (free or pro).
 * Free tier endpoint: https://api-free.deepl.com/v2/translate
 * Pro tier endpoint:  https://api.deepl.com/v2/translate
 */
export async function translateWithDeepL(text, sourceLang, targetLang, apiKey, isPro = false) {
  if (!apiKey) throw new Error('DeepL API key is not configured.');

  const endpoint = isPro
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
    const err = await response.text();
    throw new Error(`DeepL request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.translations[0].text;
}
