import type { TranslationEngine } from "@transflow/core";
import { Translator, TranslationError, type TranslationRequest } from "@transflow/translator";

/** Default OpenAI API base URL. Overridable via `settings.openaiBaseUrl`. */
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/**
 * Strip a trailing slash from a URL so we can safely append paths.
 */
function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * Read and parse a response body as JSON without triggering unsafe `any`
 * assertions on `Response.json()`. Returns `null` when the body is missing
 * or cannot be parsed as JSON.
 */
async function readResponseJson(response: Response): Promise<unknown> {
  try {
    const raw: unknown = await response.json();
    return raw;
  } catch {
    return null;
  }
}

function isOpenAIResponse(value: unknown): value is OpenAIResponse {
  return typeof value === "object" && value !== null;
}

/**
 * LLM-based translation via the OpenAI Chat Completions API.
 *
 * Configuration is sourced from {@link Settings}:
 *   - `openaiApiKey`   — required (the `OPENAI_API_KEY` value)
 *   - `openaiBaseUrl`  — optional; defaults to {@link DEFAULT_OPENAI_BASE_URL}.
 *                        Set this to use an OpenAI-compatible endpoint
 *                        (the `OPENAI_BASE_URL` value).
 *   - `openaiModel`    — optional; defaults to `gpt-4o-mini`.
 */
export class OpenAITranslator extends Translator {
  readonly id: TranslationEngine = "openai";

  async translate({ text, sourceLang, targetLang, settings }: TranslationRequest): Promise<string> {
    const apiKey = settings.openaiApiKey;
    if (!apiKey) throw new TranslationError("openai", "OpenAI API key is not configured.");

    const baseUrl = trimTrailingSlash(settings.openaiBaseUrl?.trim() || DEFAULT_OPENAI_BASE_URL);
    const model = settings.openaiModel || "gpt-4o-mini";

    const systemPrompt =
      `You are a professional translator. Translate the following text` +
      ` from ${sourceLang === "auto" ? "the detected language" : sourceLang}` +
      ` to ${targetLang}. Output ONLY the translated text without any explanation or extra content.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
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
      const raw = await readResponseJson(response);
      const err: OpenAIResponse = isOpenAIResponse(raw) ? raw : {};
      throw new TranslationError(
        "openai",
        `Request failed (${response.status}): ${err?.error?.message ?? response.statusText}`,
        response.status,
      );
    }

    const raw = await readResponseJson(response);
    const data: OpenAIResponse = isOpenAIResponse(raw) ? raw : {};
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

/** Shared singleton for convenience. */
export const openaiTranslator = new OpenAITranslator();
