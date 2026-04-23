import { describe, it, expect, vi, afterEach } from "vitest";
import { mergeSettings } from "@transflow/core";
import { TranslationError } from "@transflow/translator";
import { GoogleTranslator } from "../src/google-translator.js";

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

function getUrl(call: [unknown, ...unknown[]]): string {
  const value = call[0];
  if (typeof value === "string") return value;
  if (value instanceof URL) return value.href;
  return "";
}

const baseRequest = {
  text: "hello world",
  sourceLang: "en",
  targetLang: "zh-CN",
  settings: mergeSettings({ engine: "google" }),
};

describe("GoogleTranslator", () => {
  it("concatenates every translated chunk from the first array", async () => {
    const payload = [
      [
        ["你好", "hello", null, null, 10],
        ["，", null, null, null, 0],
        ["世界", "world", null, null, 10],
      ],
      null,
      "en",
    ];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(payload));
    const t = new GoogleTranslator();
    const out = await t.run(baseRequest);
    expect(out).toBe("你好，世界");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = getUrl(fetchSpy.mock.calls[0]!);
    expect(url).toContain("sl=en");
    expect(url).toContain("tl=zh-CN");
    expect(url).toContain("q=hello%20world");
  });

  it("encodes `auto` as the source language when requested", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse([[["hi", "hi", null, null, 10]]]));
    const t = new GoogleTranslator();
    await t.run({ ...baseRequest, sourceLang: "auto" });
    expect(getUrl(fetchSpy.mock.calls[0]!)).toContain("sl=auto");
  });

  it("throws TranslationError on non-2xx responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 503 }));
    await expect(new GoogleTranslator().run(baseRequest)).rejects.toMatchObject({
      name: "TranslationError",
      engine: "google",
      status: 503,
    });
  });

  it("throws TranslationError on an unexpected response shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ not: "an array" }));
    await expect(new GoogleTranslator().run(baseRequest)).rejects.toBeInstanceOf(TranslationError);
  });

  it("skips entries where the first element is not a string", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        [
          ["ok", "ok"],
          [null, "skip"],
          ["more", "more"],
        ],
      ]),
    );
    const out = await new GoogleTranslator().run(baseRequest);
    expect(out).toBe("okmore");
  });
});
