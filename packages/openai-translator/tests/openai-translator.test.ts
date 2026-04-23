import { describe, it, expect, vi, afterEach } from "vitest";
import { mergeSettings } from "@transflow/core";
import { TranslationError } from "@transflow/translator";
import { OpenAITranslator, DEFAULT_OPENAI_BASE_URL } from "../src/openai-translator.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

function getUrl(call: Parameters<typeof fetch>): string {
  const value = call[0];
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.href;
  return "";
}

interface ChatBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
}

function getRequestBody(call: Parameters<typeof fetch>): ChatBody {
  const body = call[1]?.body;
  if (typeof body !== "string") return {};
  return JSON.parse(body);
}

function getHeader(call: Parameters<typeof fetch>, name: string): string | undefined {
  const headers = call[1]?.headers;
  if (!headers) return undefined;
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (entry[0] === name) return entry[1];
    }
    return undefined;
  }
  return headers[name];
}

const baseRequest = {
  text: "hello",
  sourceLang: "en",
  targetLang: "zh-CN",
  settings: mergeSettings({
    engine: "openai",
    openaiApiKey: "sk-test",
    openaiBaseUrl: DEFAULT_OPENAI_BASE_URL,
    openaiModel: "gpt-4o-mini",
  }),
};

describe("OpenAITranslator", () => {
  it("throws when no API key is configured", async () => {
    const req = {
      ...baseRequest,
      settings: { ...baseRequest.settings, openaiApiKey: "" },
    };
    await expect(new OpenAITranslator().run(req)).rejects.toBeInstanceOf(TranslationError);
  });

  it("posts a chat-completions payload with auth header and expected shape", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "你好" } }],
      }),
    );
    const out = await new OpenAITranslator().run(baseRequest);
    expect(out).toBe("你好");
    const call = fetchSpy.mock.calls[0];
    expect(getUrl(call)).toBe(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`);
    expect(getHeader(call, "Authorization")).toBe("Bearer sk-test");
    const body = getRequestBody(call);
    expect(body.model).toBe("gpt-4o-mini");
    const messages = body.messages ?? [];
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("zh-CN");
    expect(messages[1]).toEqual({ role: "user", content: "hello" });
  });

  it("strips trailing slash from openaiBaseUrl", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: "x" } }] }));
    await new OpenAITranslator().run({
      ...baseRequest,
      settings: { ...baseRequest.settings, openaiBaseUrl: "https://example.com/v1/" },
    });
    expect(getUrl(fetchSpy.mock.calls[0])).toBe("https://example.com/v1/chat/completions");
  });

  it("uses the default base URL when openaiBaseUrl is blank", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: "x" } }] }));
    await new OpenAITranslator().run({
      ...baseRequest,
      settings: { ...baseRequest.settings, openaiBaseUrl: "   " },
    });
    expect(getUrl(fetchSpy.mock.calls[0])).toBe(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`);
  });

  it("surfaces the upstream error message on non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "quota exceeded" } }), {
        status: 429,
        headers: { "content-type": "application/json" },
        statusText: "Too Many Requests",
      }),
    );
    await expect(new OpenAITranslator().run(baseRequest)).rejects.toMatchObject({
      name: "TranslationError",
      engine: "openai",
      status: 429,
      message: expect.stringContaining("quota exceeded"),
    });
  });

  it("falls back to statusText when the error body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 500, statusText: "Server Error" }),
    );
    await expect(new OpenAITranslator().run(baseRequest)).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining("Server Error"),
    });
  });

  it("returns an empty string when the response contains no choices", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}));
    const out = await new OpenAITranslator().run(baseRequest);
    expect(out).toBe("");
  });

  it("trims surrounding whitespace from the returned content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "  你好  " } }] }),
    );
    const out = await new OpenAITranslator().run(baseRequest);
    expect(out).toBe("你好");
  });
});
