/**
 * OpenAI (GPT) adapter for LLM-based translation.
 * Supports gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.
 */
export async function translateWithOpenAI(text, sourceLang, targetLang, apiKey, model = 'gpt-4o-mini') {
  if (!apiKey) throw new Error('OpenAI API key is not configured.');

  const systemPrompt =
    `You are a professional translator. Translate the following text` +
    ` from ${sourceLang === 'auto' ? 'the detected language' : sourceLang}` +
    ` to ${targetLang}. Output ONLY the translated text without any explanation or extra content.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(`OpenAI request failed (${response.status}): ${err?.error?.message}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}
