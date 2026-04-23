import { describe, it, expect, vi } from "vitest";
import { mergeSettings } from "@transflow/core";
import { Translator, TranslationError, type TranslationRequest } from "../src/translator.js";
import { TranslationCache } from "../src/cache.js";
import { TranslatorRegistry } from "../src/registry.js";

class FakeGoogle extends Translator {
  readonly id = "google" as const;
  translate = vi.fn(async (req: TranslationRequest) => `g:${req.text}:${req.targetLang}`);
}

class FakeOpenAI extends Translator {
  readonly id = "openai" as const;
  translate = vi.fn(async (req: TranslationRequest) => `o:${req.text}:${req.targetLang}`);
}

function requestFor(text: string, overrides: Partial<ReturnType<typeof mergeSettings>> = {}) {
  return {
    text,
    sourceLang: "en",
    targetLang: "zh-CN",
    settings: mergeSettings({ engine: "google", ...overrides }),
  };
}

describe("Translator.run", () => {
  it("short-circuits on empty or whitespace input", async () => {
    const t = new FakeGoogle();
    expect(await t.run(requestFor(""))).toBe("");
    expect(await t.run(requestFor("   "))).toBe("");
    expect(t.translate).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace before dispatching", async () => {
    const t = new FakeGoogle();
    await t.run(requestFor("  hi  "));
    expect(t.translate).toHaveBeenCalledWith(expect.objectContaining({ text: "hi" }));
  });
});

describe("TranslatorRegistry", () => {
  it("dispatches to the engine named in settings", async () => {
    const g = new FakeGoogle();
    const o = new FakeOpenAI();
    const r = new TranslatorRegistry([g, o]);
    const out = await r.translate(requestFor("hello", { engine: "openai" }));
    expect(out).toBe("o:hello:zh-CN");
    expect(g.translate).not.toHaveBeenCalled();
    expect(o.translate).toHaveBeenCalledTimes(1);
  });

  it("throws TranslationError when engine is unregistered", async () => {
    const r = new TranslatorRegistry([new FakeGoogle()]);
    await expect(r.translate(requestFor("hello", { engine: "openai" }))).rejects.toBeInstanceOf(
      TranslationError,
    );
  });

  it("caches results when cache is provided and cacheEnabled is true", async () => {
    const g = new FakeGoogle();
    const cache = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    const r = new TranslatorRegistry([g], cache);
    const req = requestFor("hi", { cacheEnabled: true });

    expect(await r.translate(req)).toBe("g:hi:zh-CN");
    expect(await r.translate(req)).toBe("g:hi:zh-CN");
    expect(g.translate).toHaveBeenCalledTimes(1);
  });

  it("does not cache when settings.cacheEnabled is false", async () => {
    const g = new FakeGoogle();
    const cache = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    const r = new TranslatorRegistry([g], cache);
    const req = requestFor("hi", { cacheEnabled: false });

    await r.translate(req);
    await r.translate(req);
    expect(g.translate).toHaveBeenCalledTimes(2);
  });

  it("normalises whitespace before cache lookup", async () => {
    const g = new FakeGoogle();
    const cache = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    const r = new TranslatorRegistry([g], cache);
    await r.translate(requestFor("  hi  ", { cacheEnabled: true }));
    await r.translate(requestFor("hi", { cacheEnabled: true }));
    expect(g.translate).toHaveBeenCalledTimes(1);
  });

  it("returns empty string on empty input without invoking engine", async () => {
    const g = new FakeGoogle();
    const r = new TranslatorRegistry([g]);
    expect(await r.translate(requestFor(""))).toBe("");
    expect(g.translate).not.toHaveBeenCalled();
  });
});

describe("TranslationError", () => {
  it("prefixes the engine id in the message and exposes status", () => {
    const err = new TranslationError("google", "boom", 502);
    expect(err.message).toBe("[google] boom");
    expect(err.engine).toBe("google");
    expect(err.status).toBe(502);
    expect(err).toBeInstanceOf(Error);
  });
});
