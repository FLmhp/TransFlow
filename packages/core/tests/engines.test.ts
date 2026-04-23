import { describe, it, expect } from "vitest";
import { ENGINE_DESCRIPTORS, TRANSLATION_ENGINES } from "../src/engines.js";

describe("engines", () => {
  it("exposes a descriptor for every engine id", () => {
    const ids = ENGINE_DESCRIPTORS.map((d) => d.id).toSorted();
    expect(ids).toEqual([...TRANSLATION_ENGINES].toSorted());
  });

  it("marks OpenAI as requiring an API key and Google as not", () => {
    const byId = new Map(ENGINE_DESCRIPTORS.map((d) => [d.id, d]));
    expect(byId.get("google")?.requiresApiKey).toBe(false);
    expect(byId.get("openai")?.requiresApiKey).toBe(true);
  });

  it("provides a non-empty label and icon for every engine", () => {
    for (const d of ENGINE_DESCRIPTORS) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.icon.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});
