/**
 * Utilities for deciding whether a URL should be intercepted and opened
 * in TransFlow's bundled PDF.js viewer.
 *
 * Kept in `@transflow/core` (no browser globals, no side effects) so it
 * can be imported from the background service worker, the popup, options
 * pages, tests, and the viewer itself.
 */

/**
 * Extension-relative path of the bundled viewer page. Each WebExtension
 * target copies the `pdf-viewer/` directory into its `dist/`, so this
 * path is stable across targets.
 */
export const PDF_VIEWER_PATH = "pdf-viewer/viewer.html";

/**
 * Returns true when the given URL looks like a standalone PDF document
 * that the browser would hand to a native viewer.
 *
 * Matches URLs whose pathname (ignoring query/fragment) ends in ".pdf"
 * regardless of case. Does not match URLs already pointing at the
 * TransFlow viewer, or at any extension/blob/data origin.
 */
export function isPdfUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return /\.pdf$/i.test(parsed.pathname);
}

export interface RedirectDecisionInput {
  /** Top-frame navigation target. */
  url: string;
  /** Whether the PDF feature is enabled. */
  pdfEnabled: boolean;
  /** Whether the user has opted in to `.pdf` auto-redirect. */
  pdfAutoRedirect: boolean;
  /**
   * The viewer's own URL prefix (e.g. `chrome-extension://<id>/pdf-viewer/`).
   * Used to avoid redirect loops when the viewer navigates to itself.
   */
  viewerUrlPrefix: string;
}

/**
 * Pure decision function consumed by the background `webNavigation` hook
 * and by unit tests. Returns the redirect target, or `null` to leave the
 * navigation untouched.
 */
export function resolvePdfRedirect(input: RedirectDecisionInput): string | null {
  if (!input.pdfEnabled || !input.pdfAutoRedirect) return null;
  if (!input.url) return null;
  if (input.url.startsWith(input.viewerUrlPrefix)) return null;
  if (!isPdfUrl(input.url)) return null;
  return buildViewerUrl(input.viewerUrlPrefix, input.url);
}

/**
 * Build a viewer URL of the form `<prefix>viewer.html?file=<encoded>`.
 * `prefix` must end with a `/`; pass `chrome-extension://<id>/pdf-viewer/`.
 */
export function buildViewerUrl(prefix: string, pdfUrl: string): string {
  const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${base}viewer.html?file=${encodeURIComponent(pdfUrl)}`;
}

/**
 * Inverse of {@link buildViewerUrl} — used by the viewer itself to read
 * the target PDF URL from its own `location`. Returns `null` when no
 * `file` parameter is present or when it is obviously malformed.
 */
export function extractFileParam(viewerUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(viewerUrl);
  } catch {
    return null;
  }
  const file = parsed.searchParams.get("file");
  if (!file) return null;
  return file;
}
