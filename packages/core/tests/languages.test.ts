import { describe, it, expect } from "vitest";
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from "../src/languages.js";

describe("languages", () => {
  it("includes auto-detect as a source language only", () => {
    expect(SOURCE_LANGUAGES.some((l) => l.code === "auto")).toBe(true);
    expect(TARGET_LANGUAGES.some((l) => l.code === "auto")).toBe(false);
  });

  it("target languages are derived from source languages (minus auto)", () => {
    expect(TARGET_LANGUAGES.length).toBe(SOURCE_LANGUAGES.length - 1);
    for (const lang of TARGET_LANGUAGES) {
      expect(SOURCE_LANGUAGES.some((s) => s.code === lang.code)).toBe(true);
    }
  });

  it("language codes are unique", () => {
    const codes = SOURCE_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
