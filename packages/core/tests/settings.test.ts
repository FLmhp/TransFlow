import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/settings.js";

describe("mergeSettings", () => {
  it("returns a fresh copy of defaults when given null/undefined", () => {
    const a = mergeSettings(null);
    const b = mergeSettings(undefined);
    expect(a).toEqual(DEFAULT_SETTINGS);
    expect(b).toEqual(DEFAULT_SETTINGS);
    // Must not leak the default object reference — callers mutate.
    expect(a).not.toBe(DEFAULT_SETTINGS);
    expect(b).not.toBe(DEFAULT_SETTINGS);
  });

  it("overlays partial settings over defaults", () => {
    const merged = mergeSettings({ enabled: true, targetLang: "ja" });
    expect(merged.enabled).toBe(true);
    expect(merged.targetLang).toBe("ja");
    // Unspecified fields fall back to defaults.
    expect(merged.engine).toBe(DEFAULT_SETTINGS.engine);
    expect(merged.cacheEnabled).toBe(DEFAULT_SETTINGS.cacheEnabled);
  });

  it("does not mutate the provided partial", () => {
    const partial = { enabled: true } as const;
    mergeSettings(partial);
    expect(Object.keys(partial)).toEqual(["enabled"]);
  });

  it("defaults are self-consistent", () => {
    expect(DEFAULT_SETTINGS.engine).toMatch(/^(google|openai)$/);
    expect(DEFAULT_SETTINGS.sourceLang).toBe("auto");
    expect(DEFAULT_SETTINGS.cacheMaxEntries).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.cacheTtlMinutes).toBeGreaterThan(0);
  });
});
