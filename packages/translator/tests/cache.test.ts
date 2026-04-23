import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TranslationCache } from "../src/cache.js";

const KEY = { engine: "google" as const, sourceLang: "en", targetLang: "zh-CN", text: "hello" };

describe("TranslationCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves entries before TTL expiry", () => {
    const c = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    c.set(KEY, "你好");
    expect(c.get(KEY)).toBe("你好");
    expect(c.size).toBe(1);
  });

  it("returns undefined for missing keys", () => {
    const c = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    expect(c.get(KEY)).toBeUndefined();
  });

  it("expires entries lazily on read once TTL elapses", () => {
    const c = new TranslationCache({ maxEntries: 10, ttlMs: 1000 });
    c.set(KEY, "你好");
    vi.advanceTimersByTime(1500);
    expect(c.get(KEY)).toBeUndefined();
    expect(c.size).toBe(0);
  });

  it("evicts least-recently-used entries when maxEntries is reached", () => {
    const c = new TranslationCache({ maxEntries: 2, ttlMs: 60_000 });
    c.set({ ...KEY, text: "a" }, "A");
    c.set({ ...KEY, text: "b" }, "B");
    // Reading `a` refreshes its LRU position, so `b` becomes the LRU.
    expect(c.get({ ...KEY, text: "a" })).toBe("A");
    c.set({ ...KEY, text: "c" }, "C");
    expect(c.get({ ...KEY, text: "b" })).toBeUndefined();
    expect(c.get({ ...KEY, text: "a" })).toBe("A");
    expect(c.get({ ...KEY, text: "c" })).toBe("C");
  });

  it("keys differ by engine and language pair", () => {
    const c = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    c.set({ engine: "google", sourceLang: "en", targetLang: "zh", text: "hi" }, "A");
    c.set({ engine: "openai", sourceLang: "en", targetLang: "zh", text: "hi" }, "B");
    c.set({ engine: "google", sourceLang: "en", targetLang: "ja", text: "hi" }, "C");
    expect(c.size).toBe(3);
  });

  it("configure() shrinks the cache by evicting LRU", () => {
    const c = new TranslationCache({ maxEntries: 5, ttlMs: 60_000 });
    for (const t of ["a", "b", "c", "d", "e"]) c.set({ ...KEY, text: t }, t);
    c.configure({ maxEntries: 2 });
    expect(c.size).toBe(2);
    expect(c.get({ ...KEY, text: "a" })).toBeUndefined();
    expect(c.get({ ...KEY, text: "d" })).toBe("d");
    expect(c.get({ ...KEY, text: "e" })).toBe("e");
  });

  it("configure() rejects invalid maxEntries by clamping to 1", () => {
    const c = new TranslationCache({ maxEntries: 5, ttlMs: 60_000 });
    c.set(KEY, "x");
    c.configure({ maxEntries: 0 });
    expect(c.size).toBe(1);
    c.set({ ...KEY, text: "y" }, "Y");
    expect(c.size).toBe(1);
  });

  it("clear() empties the cache", () => {
    const c = new TranslationCache({ maxEntries: 10, ttlMs: 60_000 });
    c.set(KEY, "x");
    c.clear();
    expect(c.size).toBe(0);
    expect(c.get(KEY)).toBeUndefined();
  });

  it("clamps non-integer / non-positive constructor options", () => {
    const c = new TranslationCache({ maxEntries: 0, ttlMs: 0 });
    c.set(KEY, "x");
    // ttl floored to 1ms — still readable immediately.
    expect(c.get(KEY)).toBe("x");
  });
});
