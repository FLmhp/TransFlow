import { describe, it, expect, beforeEach } from "vitest";
import { installPlatform, getRuntime, getUi, hasRuntime, hasUi } from "../src/platform/registry.js";
import type { RuntimeBridge, UiBridge } from "../src/platform/types.js";

// Each test installs a fresh stub — the registry holds module-level state so
// we rely on the install* calls to overwrite both runtime and ui.
function stubRuntime(): RuntimeBridge {
  return {
    getSettings: async () => ({}) as never,
    saveSettings: async () => {},
    requestTranslation: async () => null,
    onSettingsUpdated: () => () => {},
    onToggleTranslation: () => () => {},
    onShowTooltip: () => () => {},
  };
}

function stubUi(): UiBridge {
  return {
    getSettings: async () => ({}) as never,
    saveSettings: async () => {},
    broadcastSettingsToActiveTab: async () => {},
    broadcastSettingsToAllTabs: async () => {},
  };
}

describe("platform registry", () => {
  beforeEach(() => {
    // Reset by installing fresh stubs; `hasRuntime`/`hasUi` should report true after.
    installPlatform({ runtime: stubRuntime(), ui: stubUi() });
  });

  it("returns the installed runtime and ui bridges", () => {
    expect(hasRuntime()).toBe(true);
    expect(hasUi()).toBe(true);
    expect(typeof getRuntime().requestTranslation).toBe("function");
    expect(typeof getUi().saveSettings).toBe("function");
  });

  it("installPlatform only overwrites the keys it is given", () => {
    const ui = stubUi();
    installPlatform({ ui });
    expect(getUi()).toBe(ui);
    // Runtime set in beforeEach should still be the active one.
    expect(hasRuntime()).toBe(true);
  });
});
