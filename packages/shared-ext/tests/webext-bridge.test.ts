import { describe, it, expect, vi, afterEach } from "vitest";
import { mergeSettings } from "@transflow/core";
import { createWebExtRuntimeBridge, createWebExtUiBridge } from "../src/platform/webext.js";

type Listener = (msg: unknown) => void;

function makeChromeStub(handleMessage: (msg: unknown) => unknown) {
  const listeners: Listener[] = [];
  const tabSendMessage = vi.fn(async () => {});
  const tabQuery = vi.fn(async (q: Record<string, unknown>) => {
    if (q.active) return [{ id: 1 }];
    return [{ id: 1 }, { id: 2 }, { id: undefined }];
  });
  return {
    chrome: {
      runtime: {
        sendMessage: (msg: unknown, cb: (response: unknown) => void) => {
          queueMicrotask(() => cb(handleMessage(msg)));
        },
        onMessage: {
          addListener: (fn: Listener) => listeners.push(fn),
          removeListener: (fn: Listener) => {
            const idx = listeners.indexOf(fn);
            if (idx >= 0) listeners.splice(idx, 1);
          },
        },
        lastError: undefined as { message?: string } | undefined,
        openOptionsPage: vi.fn(),
      },
      tabs: {
        query: tabQuery,
        sendMessage: tabSendMessage,
      },
    },
    dispatch(msg: unknown) {
      for (const l of listeners.slice()) l(msg);
    },
    listenerCount: () => listeners.length,
    tabSendMessage,
    tabQuery,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createWebExtRuntimeBridge", () => {
  it("forwards TRANSLATE requests and unwraps successful responses", async () => {
    const stub = makeChromeStub(() => ({ ok: true, translated: "你好" }));
    const bridge = createWebExtRuntimeBridge(stub.chrome);
    expect(await bridge.requestTranslation("hi", "en", "zh-CN")).toBe("你好");
  });

  it("returns null on error responses", async () => {
    const stub = makeChromeStub(() => ({ ok: false, error: "boom" }));
    const bridge = createWebExtRuntimeBridge(stub.chrome);
    expect(await bridge.requestTranslation("hi")).toBe(null);
  });

  it("returns null when chrome.runtime.lastError is set", async () => {
    const stub = makeChromeStub(() => undefined);
    stub.chrome.runtime.lastError = { message: "receiver gone" };
    const bridge = createWebExtRuntimeBridge(stub.chrome);
    expect(await bridge.requestTranslation("hi")).toBe(null);
  });

  it("onSettingsUpdated filters out unrelated messages and unsubscribes cleanly", () => {
    const stub = makeChromeStub(() => undefined);
    const bridge = createWebExtRuntimeBridge(stub.chrome);
    const cb = vi.fn();
    const unsubscribe = bridge.onSettingsUpdated(cb);
    stub.dispatch({ type: "TOGGLE_TRANSLATION" });
    stub.dispatch({ type: "SETTINGS_UPDATED", settings: mergeSettings(null) });
    stub.dispatch(null);
    stub.dispatch({ no: "type" });
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(stub.listenerCount()).toBe(0);
  });

  it("onShowTooltip distinguishes SHOW_TOOLTIP (info) from SHOW_ERROR", () => {
    const stub = makeChromeStub(() => undefined);
    const bridge = createWebExtRuntimeBridge(stub.chrome);
    const cb = vi.fn();
    bridge.onShowTooltip(cb);
    stub.dispatch({ type: "SHOW_TOOLTIP", text: "ok" });
    stub.dispatch({ type: "SHOW_ERROR", text: "bad" });
    expect(cb).toHaveBeenNthCalledWith(1, "ok", false);
    expect(cb).toHaveBeenNthCalledWith(2, "bad", true);
  });
});

describe("createWebExtUiBridge", () => {
  it("getSettings falls back to defaults when the backend throws", async () => {
    const stub = makeChromeStub(() => {
      throw new Error("nope");
    });
    // Rewire sendMessage to invoke cb with undefined & set lastError.
    stub.chrome.runtime.sendMessage = (_msg, cb) => {
      stub.chrome.runtime.lastError = { message: "disconnected" };
      queueMicrotask(() => {
        cb(undefined);
        stub.chrome.runtime.lastError = undefined;
      });
    };
    const bridge = createWebExtUiBridge(stub.chrome);
    const settings = await bridge.getSettings();
    expect(settings).toEqual(mergeSettings(null));
  });

  it("broadcastSettingsToActiveTab queries the active tab only", async () => {
    const stub = makeChromeStub(() => undefined);
    const bridge = createWebExtUiBridge(stub.chrome);
    await bridge.broadcastSettingsToActiveTab(mergeSettings(null));
    expect(stub.tabQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
    expect(stub.tabSendMessage).toHaveBeenCalledTimes(1);
  });

  it("broadcastSettingsToAllTabs dispatches to every tab that has an id", async () => {
    const stub = makeChromeStub(() => undefined);
    const bridge = createWebExtUiBridge(stub.chrome);
    await bridge.broadcastSettingsToAllTabs(mergeSettings(null));
    expect(stub.tabSendMessage).toHaveBeenCalledTimes(2);
  });

  it("openOptionsPage proxies to chrome.runtime.openOptionsPage", () => {
    const stub = makeChromeStub(() => undefined);
    const bridge = createWebExtUiBridge(stub.chrome);
    bridge.openOptionsPage?.();
    expect(stub.chrome.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});
