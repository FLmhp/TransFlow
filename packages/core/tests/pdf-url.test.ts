import { describe, it, expect } from "vitest";
import { buildViewerUrl, extractFileParam, isPdfUrl, resolvePdfRedirect } from "../src/pdf-url.js";

describe("isPdfUrl", () => {
  it("matches http(s) URLs whose pathname ends in .pdf (case-insensitive)", () => {
    expect(isPdfUrl("https://example.com/a.pdf")).toBe(true);
    expect(isPdfUrl("http://example.com/a.PDF")).toBe(true);
    expect(isPdfUrl("https://example.com/path/to/file.pdf?x=1#page=2")).toBe(true);
    expect(
      isPdfUrl(
        "https://openaccess.thecvf.com/content/CVPR2025/papers/Tang_MV-DUSt3R_Single-Stage_Scene_Reconstruction_from_Sparse_Views_In_2_Seconds_CVPR_2025_paper.pdf",
      ),
    ).toBe(true);
  });

  it("rejects non-PDF URLs", () => {
    expect(isPdfUrl("https://example.com/")).toBe(false);
    expect(isPdfUrl("https://example.com/file.html")).toBe(false);
    expect(isPdfUrl("https://example.com/pdf")).toBe(false);
    expect(isPdfUrl("https://example.com/notpdf.pdff")).toBe(false);
  });

  it("rejects non-http(s) schemes (data, blob, file, extension)", () => {
    expect(isPdfUrl("file:///home/user/a.pdf")).toBe(false);
    expect(isPdfUrl("chrome-extension://abc/pdf-viewer/viewer.html")).toBe(false);
    expect(isPdfUrl("data:application/pdf;base64,AAAA")).toBe(false);
    expect(isPdfUrl("blob:https://example.com/uuid")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isPdfUrl("")).toBe(false);
    expect(isPdfUrl("not a url")).toBe(false);
  });
});

describe("buildViewerUrl / extractFileParam", () => {
  it("encodes the file URL so query strings in the PDF URL survive round-trip", () => {
    const pdf = "https://example.com/a.pdf?x=1&y=2#frag";
    const viewer = buildViewerUrl("chrome-extension://abc/pdf-viewer/", pdf);
    expect(viewer).toBe(
      `chrome-extension://abc/pdf-viewer/viewer.html?file=${encodeURIComponent(pdf)}`,
    );
    expect(extractFileParam(viewer)).toBe(pdf);
  });

  it("appends a trailing slash to the prefix when missing", () => {
    const viewer = buildViewerUrl("chrome-extension://abc/pdf-viewer", "https://a.test/x.pdf");
    expect(viewer.startsWith("chrome-extension://abc/pdf-viewer/viewer.html?file=")).toBe(true);
  });

  it("extractFileParam returns null without a file param", () => {
    expect(extractFileParam("chrome-extension://abc/pdf-viewer/viewer.html")).toBeNull();
    expect(extractFileParam("not a url")).toBeNull();
  });
});

describe("resolvePdfRedirect", () => {
  const prefix = "chrome-extension://abc/pdf-viewer/";
  const base = {
    pdfEnabled: true,
    pdfAutoRedirect: true,
    viewerUrlPrefix: prefix,
  };

  it("returns a viewer URL for a plain PDF navigation", () => {
    const target = resolvePdfRedirect({ ...base, url: "https://example.com/a.pdf" });
    expect(target).toBe(
      `chrome-extension://abc/pdf-viewer/viewer.html?file=${encodeURIComponent(
        "https://example.com/a.pdf",
      )}`,
    );
  });

  it("returns null when the PDF feature is disabled", () => {
    expect(
      resolvePdfRedirect({ ...base, pdfEnabled: false, url: "https://example.com/a.pdf" }),
    ).toBeNull();
  });

  it("returns null when auto-redirect is disabled (opt-in default)", () => {
    expect(
      resolvePdfRedirect({ ...base, pdfAutoRedirect: false, url: "https://example.com/a.pdf" }),
    ).toBeNull();
  });

  it("avoids redirect loops by skipping URLs already on the viewer", () => {
    expect(
      resolvePdfRedirect({
        ...base,
        url: `${prefix}viewer.html?file=https%3A%2F%2Fexample.com%2Fa.pdf`,
      }),
    ).toBeNull();
  });

  it("returns null for non-PDF URLs", () => {
    expect(resolvePdfRedirect({ ...base, url: "https://example.com/" })).toBeNull();
  });
});
