/**
 * Google Gemini adapter for LLM-based translation.
 * Uses the Gemini generateContent API.
 */
export async function translateWithGemini(text, sourceLang, targetLang, apiKey, model = 'gemini-1.5-flash') {
  if (!apiKey) throw new Error('Gemini API key is not configured.');

  const prompt =
    `Translate the following text from ${sourceLang === 'auto' ? 'the detected language' : sourceLang}` +
    ` to ${targetLang}. Output ONLY the translated text without any explanation or extra content.\n\n${text}`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
