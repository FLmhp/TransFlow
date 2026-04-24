/**
 * TransFlow bundled PDF viewer.
 *
 * Renders an arbitrary PDF URL inside a `chrome-extension://` origin,
 * using pdf.js for layout and then delegating to the shared
 * `startContent()` pipeline so that the existing PDF translation
 * module (`content/pdf.ts`) picks up each page's `.textLayer` spans.
 *
 * The target URL is read from the `?file=<url>` query parameter. Bytes
 * are fetched via the background service worker (`FETCH_PDF` message)
 * so cross-origin PDFs (like the CVPR paper referenced in the issue)
 * work without CORS gymnastics.
 */
import { extractFileParam, type FetchPdfResponse, type Message } from "@transflow/core";
import {
  getDocument,
  GlobalWorkerOptions,
  TextLayer,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from "pdfjs-dist";
import { startContent } from "../content/index.js";
import { injectGlobalStyles } from "../content/styles.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

interface ViewerChromeLike {
  runtime: {
    sendMessage: AnyFn;
    getURL?: (path: string) => string;
    lastError?: { message?: string };
  };
}

export interface PdfViewerOptions {
  /** `chrome` / `browser` global. Used to ask background for PDF bytes. */
  chrome: ViewerChromeLike;
  /**
   * URL of the pdf.js worker module, resolved relative to the viewer
   * page. Each target copies `pdf.worker.mjs` next to `viewer.html`,
   * so the default of `"./pdf.worker.mjs"` works in all cases.
   */
  workerSrc?: string;
  /** Optional DPI scale. Default 1.5 for crisp rendering at 1x. */
  scale?: number;
}

const DEFAULT_WORKER_SRC = "./pdf.worker.mjs";
const DEFAULT_SCALE = 1.5;

function sendFetchPdf(
  chrome: ViewerChromeLike,
  url: string,
): Promise<FetchPdfResponse | undefined> {
  return new Promise((resolve, reject) => {
    const message: Message = { type: "FETCH_PDF", url };
    chrome.runtime.sendMessage(message, (response: FetchPdfResponse | undefined) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? "chrome.runtime.sendMessage failed"));
        return;
      }
      resolve(response);
    });
  });
}

async function loadPdfBytes(chrome: ViewerChromeLike, url: string): Promise<Uint8Array> {
  const response = await sendFetchPdf(chrome, url);
  if (!response) {
    throw new Error("No response from background service worker");
  }
  if (!response.ok) {
    throw new Error(response.error);
  }
  return response.bytes;
}

function setStatus(text: string): void {
  const el = document.querySelector<HTMLElement>("#tf-pdf-status");
  if (el) el.textContent = text;
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  container: HTMLElement,
  scale: number,
): Promise<void> {
  const page: PDFPageProxy = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const pageDiv = document.createElement("div");
  pageDiv.className = "tf-pdf-page";
  pageDiv.style.width = `${Math.floor(viewport.width)}px`;
  pageDiv.style.height = `${Math.floor(viewport.height)}px`;
  pageDiv.setAttribute("data-page-number", String(pageNumber));

  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  pageDiv.appendChild(canvas);

  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "textLayer";
  pageDiv.appendChild(textLayerDiv);

  container.appendChild(pageDiv);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.scale(ratio, ratio);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  // Build the text layer. pdf.js's `TextLayer` helper creates span
  // elements with absolute positioning — exactly what our content-script
  // PDF translator already understands.
  const textContentSource = page.streamTextContent({
    includeMarkedContent: true,
    disableNormalization: true,
  });
  const textLayer = new TextLayer({
    textContentSource,
    container: textLayerDiv,
    viewport,
  });
  await textLayer.render();
}

/**
 * Boot the viewer. Reads `?file=<url>` from its own location, fetches
 * the PDF via the background, then renders every page. Once pages are
 * in the DOM, `startContent()` is invoked so the normal translation
 * pipeline kicks in (controlled by the user's settings).
 */
export async function startPdfViewer(options: PdfViewerOptions): Promise<void> {
  const { chrome } = options;
  const scale = options.scale ?? DEFAULT_SCALE;
  GlobalWorkerOptions.workerSrc = options.workerSrc ?? DEFAULT_WORKER_SRC;

  // Inject baseline global styles so the `.transflow-pdf-translation`
  // rule is registered before pdf.ts starts adding translated spans.
  injectGlobalStyles("#1a73e8", 92);

  const fileParam = extractFileParam(location.href);
  if (!fileParam) {
    setStatus("Missing ?file=<url> parameter");
    return;
  }

  // Only http(s) URLs are accepted. Without this guard, a crafted
  // `?file=javascript:...` parameter would end up on an `<a href>` and,
  // worse, could be handed to the background fetch proxy or `getDocument`.
  let safeUrl: URL;
  try {
    safeUrl = new URL(fileParam);
  } catch {
    setStatus("Invalid PDF URL");
    return;
  }
  if (safeUrl.protocol !== "http:" && safeUrl.protocol !== "https:") {
    setStatus(`Unsupported scheme: ${safeUrl.protocol}`);
    return;
  }
  const validatedUrl = safeUrl.toString();

  const downloadLink = document.querySelector<HTMLAnchorElement>("#tf-pdf-download");
  if (downloadLink) downloadLink.href = validatedUrl;
  document.title = `${decodeFileParamForTitle(validatedUrl)} — TransFlow`;

  const container = document.querySelector<HTMLElement>("#viewer");
  if (!container) {
    setStatus("Viewer container missing");
    return;
  }

  setStatus("Fetching PDF…");
  let bytes: Uint8Array;
  try {
    bytes = await loadPdfBytes(chrome, validatedUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(`Failed to fetch PDF: ${message}`);
    return;
  }

  setStatus("Rendering…");
  let pdf: PDFDocumentProxy;
  try {
    // Copy into a detached buffer because pdf.js takes ownership of the
    // typed array (transfers it to the worker) and would otherwise
    // neuter the one held by the messaging layer.
    pdf = await getDocument({ data: new Uint8Array(bytes) }).promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(`Failed to load PDF: ${message}`);
    return;
  }

  // Render pages sequentially so translation kicks in on the first page
  // as soon as possible (MutationObserver-driven).
  for (let i = 1; i <= pdf.numPages; i++) {
    // oxlint-disable-next-line no-await-in-loop
    await renderPage(pdf, i, container, scale).catch((err: unknown) => {
      console.error("[TransFlow] Failed to render page", i, err);
    });
    setStatus(`Loaded ${i}/${pdf.numPages}`);
  }
  setStatus(`${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}`);

  // Hand off to the shared content pipeline. The existing
  // `isPdfPage()` check matches because we expose a `.pdfViewer`
  // container and a `#viewer` element.
  startContent();
}

function decodeFileParamForTitle(fileParam: string): string {
  try {
    const parsed = new URL(fileParam);
    const last = parsed.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(last ?? fileParam);
  } catch {
    return fileParam;
  }
}
