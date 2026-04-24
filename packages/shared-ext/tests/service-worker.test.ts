import { describe, it, expect, vi, afterEach } from "vitest";
import { DEFAULT_SETTINGS } from "@transflow/core";
import { startServiceWorker } from "../src/background/service-worker.js";

function makeFetchResponse(
  body: BodyInit | null,
  init: ResponseInit & { url?: string } = {},
): Response {
  const { url, ...rest } = init;
  const response = new Response(body, rest);
  if (url !== undefined) {
    Object.defineProperty(response, "url", { value: url });
  }
  return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

function makeBackgroundChrome(settings: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const messageListeners: AnyFn[] = [];
  const webNavListeners: AnyFn[] = [];
  const installedListeners: AnyFn[] = [];
  const startupListeners: AnyFn[] = [];
  const tabUpdate = vi.fn(async () => {});
  const chrome = {
    runtime: {
      onInstalled: { addListener: (fn: AnyFn) => installedListeners.push(fn) },
      onStartup: { addListener: (fn: AnyFn) => startupListeners.push(fn) },
      onMessage: { addListener: (fn: AnyFn) => messageListeners.push(fn) },
      getURL: (path: string) => `chrome-extension://abc/${path}`,
    },
    storage: {
      sync: {
        get: vi.fn(async () => ({ ...DEFAULT_SETTINGS, ...settings })),
        set: vi.fn(async () => {}),
      },
    },
    tabs: {
      sendMessage: vi.fn(async () => {}),
      update: tabUpdate,
    },
    contextMenus: {
      removeAll: (cb: AnyFn) => cb?.(),
      create: vi.fn(),
      onClicked: { addListener: (_fn: AnyFn) => {} },
    },
    webNavigation: {
      onBeforeNavigate: { addListener: (fn: AnyFn) => webNavListeners.push(fn) },
    },
  };
  return {
    chrome,
    dispatchMessage: (msg: unknown) =>
      new Promise<unknown>((resolve) => {
        let replied = false;
        const sendResponse = (response: unknown) => {
          replied = true;
          resolve(response);
        };
        const keepAlive = messageListeners[0](msg, {}, sendResponse);
        if (!keepAlive && !replied) resolve(undefined);
      }),
    dispatchNavigation: (details: unknown) => webNavListeners[0]?.(details),
    tabUpdate,
    messageListeners,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startServiceWorker — FETCH_PDF", () => {
  it("returns bytes and final URL on a successful fetch", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeFetchResponse(bytes, {
        status: 200,
        statusText: "OK",
        url: "https://example.com/final.pdf",
      }),
    );
    const ctx = makeBackgroundChrome();
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    const response = await ctx.dispatchMessage({
      type: "FETCH_PDF",
      url: "https://example.com/a.pdf",
    });
    expect(response).toEqual({
      ok: true,
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      url: "https://example.com/final.pdf",
    });
  });

  it("returns an error response on HTTP failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      makeFetchResponse(null, {
        status: 404,
        statusText: "Not Found",
        url: "https://example.com/missing.pdf",
      }),
    );
    const ctx = makeBackgroundChrome();
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    const response = await ctx.dispatchMessage({
      type: "FETCH_PDF",
      url: "https://example.com/missing.pdf",
    });
    expect(response).toMatchObject({ ok: false, error: expect.stringMatching(/404/) });
  });

  it("returns an error response when fetch throws (e.g. network down)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const ctx = makeBackgroundChrome();
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    const response = await ctx.dispatchMessage({
      type: "FETCH_PDF",
      url: "https://example.com/a.pdf",
    });
    expect(response).toMatchObject({ ok: false, error: "Failed to fetch" });
  });

  it("rejects non-http(s) URLs (defense in depth)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ctx = makeBackgroundChrome();
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    const response = await ctx.dispatchMessage({
      type: "FETCH_PDF",
      url: "javascript:alert(1)",
    });
    expect(response).toMatchObject({
      ok: false,
      error: expect.stringMatching(/unsupported scheme/),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects an empty URL", async () => {
    const ctx = makeBackgroundChrome();
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    const response = await ctx.dispatchMessage({ type: "FETCH_PDF", url: "" });
    expect(response).toMatchObject({
      ok: false,
      error: expect.stringMatching(/empty url/),
    });
  });
});

describe("startServiceWorker — .pdf auto-redirect", () => {
  it("redirects top-frame .pdf navigations when pdfAutoRedirect is on", async () => {
    const ctx = makeBackgroundChrome({ pdfEnabled: true, pdfAutoRedirect: true });
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    await ctx.dispatchNavigation({
      url: "https://example.com/a.pdf",
      tabId: 42,
      frameId: 0,
    });
    expect(ctx.tabUpdate).toHaveBeenCalledTimes(1);
    const call = ctx.tabUpdate.mock.calls[0];
    expect(call[0]).toBe(42);
    expect(call[1].url).toContain("pdf-viewer/viewer.html?file=");
  });

  it("does not redirect when pdfAutoRedirect is off (default)", async () => {
    const ctx = makeBackgroundChrome({ pdfEnabled: true, pdfAutoRedirect: false });
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    await ctx.dispatchNavigation({
      url: "https://example.com/a.pdf",
      tabId: 42,
      frameId: 0,
    });
    expect(ctx.tabUpdate).not.toHaveBeenCalled();
  });

  it("ignores sub-frame navigations", async () => {
    const ctx = makeBackgroundChrome({ pdfEnabled: true, pdfAutoRedirect: true });
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    await ctx.dispatchNavigation({
      url: "https://example.com/a.pdf",
      tabId: 42,
      frameId: 1,
    });
    expect(ctx.tabUpdate).not.toHaveBeenCalled();
  });

  it("ignores non-PDF URLs", async () => {
    const ctx = makeBackgroundChrome({ pdfEnabled: true, pdfAutoRedirect: true });
    // eslint-disable-next-line typescript/no-unsafe-type-assertion
    startServiceWorker({ chrome: ctx.chrome as never });
    await ctx.dispatchNavigation({
      url: "https://example.com/page",
      tabId: 42,
      frameId: 0,
    });
    expect(ctx.tabUpdate).not.toHaveBeenCalled();
  });
});
