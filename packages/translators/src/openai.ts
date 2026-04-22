import { TranslationError, type Translator } from "./types.js";

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  error?: { message: string };
}

export const openaiTranslator: Translator = {
  id: "openai",
  async translate({ text, sourceLang, targetLang, settings }) {
    const apiKey = settings.openaiApiKey;
    if (!apiKey) throw new TranslationError("openai", "OpenAI API key is not configured.");
    const model = settings.openaiModel || "gpt-4o-mini";

    const systemPrompt =
      `You are a professional translator. Translate the following text` +
      ` from ${sourceLang === "auto" ? "the detected language" : sourceLang}` +
      ` to ${targetLang}. Output ONLY the translated text without any explanation or extra content.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({}))) as OpenAIResponse;
      throw new TranslationError(
        "openai",
        `Request failed (${response.status}): ${err?.error?.message ?? response.statusText}`,
        response.status,
      );
    }

    const data = (await response.json()) as OpenAIResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  },
};
