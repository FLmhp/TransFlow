/**
 * Bilingual webpage translation.
 *
 * Collects visible block-level prose elements, asks the background for
 * translations, and renders the translation as a sentinel child of each
 * original element. Inserting the translation as a child (rather than as
 * a sibling) preserves the layout of headings, list items and table cells
 * that style their immediate children.
 *
 * When the original block contains hyperlinks, the translation mirrors
 * the original structure: each safe anchor is cloned with its translated
 * text inlined, so hyperlinks stay embedded in the translated sentence
 * instead of being separated out below it.
 *
 * Display is controlled by three settings:
 *   - `translationPosition` — translation goes above or below the original
 *     text within the same block.
 *   - `showOriginal` — when `false`, the original text is visually hidden
 *     (translation-only mode) while the element stays in the DOM.
 *   - `translationTheme` — visual theme applied to the translation node
 *     (normal/underline/dashed/highlight/mask), modelled after the old
 *     immersive-translate display styles.
 */
import $ from "jquery";
import type { Settings } from "@transflow/core";
import { requestTranslation } from "./messaging.js";

const ATTR_TRANSLATED = "data-transflow-translated";
const ATTR_HIDE_ORIGINAL = "data-transflow-hide-original";
const CLASS_TRANSLATION = "transflow-translation";
const CLASS_PLACEHOLDER = "transflow-translation-loading";
const CLASS_INLINE = "transflow-translation-inline";
const CLASS_LINK = "transflow-translation-link";
const THEME_CLASS_PREFIX = "transflow-theme-";

const TARGET_TAGS = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "dt",
  "dd",
  "td",
  "th",
  "caption",
  "summary",
  "blockquote",
  "figcaption",
];
const SKIP_PARENTS =
  "script, style, noscript, code, pre, kbd, samp, var, button, input, select, textarea, svg, canvas, math";

const TARGET_SELECTOR = TARGET_TAGS.join(",");

/**
 * Decide whether a space should be inserted between two adjacent
 * rendered segments. This avoids awkward spacing around punctuation
 * ("世界 。" → "世界。") and around CJK characters, which don't use
 * inter-word whitespace. We still insert a space between Latin words
 * and between a CJK and a Latin boundary (a widely-used readability
 * convention).
 */
function needsSeparatorSpace(prev: string, next: string): boolean {
  if (prev.length === 0 || next.length === 0) return false;
  const lastChar = prev.charAt(prev.length - 1);
  const firstChar = next.charAt(0);
  if (/\s/.test(lastChar) || /\s/.test(firstChar)) return false;
  // No space before closing punctuation (ASCII + common CJK).
  if (/[.,;:!?)\]}。，、；：！？）】」』》]/.test(firstChar)) return false;
  // No space after opening punctuation.
  if (/[([{（【「『《]/.test(lastChar)) return false;
  return true;
}

export interface WebpageModule {
  start(): Promise<void>;
  stop(): void;
}

export function createWebpageModule(settings: Settings): WebpageModule {
  let active = false;
  let observer: MutationObserver | null = null;

  const themeClass = `${THEME_CLASS_PREFIX}${settings.translationTheme}`;

  function findCandidates(root: ParentNode): HTMLElement[] {
    return $(root)
      .find(TARGET_SELECTOR)
      .filter(function () {
        if (this.hasAttribute(ATTR_TRANSLATED)) return false;
        if ($(this).closest(SKIP_PARENTS).length > 0) return false;
        const text = (this.innerText ?? "").trim();
        return text.length > 3;
      })
      .toArray();
  }

  /**
   * Split the original block into ordered "segments" so each hyperlink
   * and each run of surrounding text can be translated independently and
   * then reassembled. This keeps links in their original positions within
   * the translated sentence — e.g. "Visit example for more info" becomes
   * "访问 <a>示例</a> 了解更多信息" rather than having the anchor dropped
   * into a trailing link list. Only absolute http(s) anchors with visible
   * text are preserved as links; everything else is folded into the
   * surrounding text so we never emit an anchor with a dangerous scheme.
   */
  interface TextSegment {
    kind: "text";
    text: string;
  }
  interface AnchorSegment {
    kind: "anchor";
    text: string;
    href: string;
  }
  type Segment = TextSegment | AnchorSegment;

  function extractSegments(el: HTMLElement): Segment[] {
    const segments: Segment[] = [];
    let buffer = "";
    const flush = (): void => {
      const trimmed = buffer.replace(/\s+/g, " ").trim();
      if (trimmed.length > 0) segments.push({ kind: "text", text: trimmed });
      buffer = "";
    };

    const visit = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer += node.textContent ?? "";
        return;
      }
      if (!(node instanceof Element)) return;
      const element = node;
      if (element instanceof HTMLAnchorElement) {
        const href = element.href;
        const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text.length > 0 && /^https?:/i.test(href)) {
          flush();
          segments.push({ kind: "anchor", text, href });
          return;
        }
      }
      for (const child of Array.from(element.childNodes)) visit(child);
    };

    for (const child of Array.from(el.childNodes)) visit(child);
    flush();
    return segments;
  }

  function buildTranslationNode(text: string | null, inline: boolean): HTMLSpanElement {
    const classes = [CLASS_TRANSLATION, themeClass];
    if (text === null) classes.push(CLASS_PLACEHOLDER);
    if (inline) classes.push(CLASS_INLINE);
    const node = document.createElement("span");
    node.className = classes.join(" ");
    node.dataset.transflowNode = "translation";
    node.textContent = text ?? "…";
    return node;
  }

  /**
   * Render structured translation segments into the translation node,
   * preserving anchors inline with translated text. Called after every
   * segment's translation resolves so hyperlinks stay in their original
   * position within the translated sentence.
   */
  function renderSegments(
    node: HTMLSpanElement,
    segments: Segment[],
    translations: (string | null)[],
  ): void {
    // Clear any placeholder content before re-rendering.
    while (node.firstChild) node.removeChild(node.firstChild);

    let previousText = "";
    segments.forEach((segment, index) => {
      const translated = translations[index];
      const text = translated && translated.length > 0 ? translated : segment.text;
      if (index > 0 && needsSeparatorSpace(previousText, text)) {
        node.appendChild(document.createTextNode(" "));
      }
      if (segment.kind === "anchor") {
        const a = document.createElement("a");
        a.className = CLASS_LINK;
        a.href = segment.href;
        a.textContent = text;
        a.rel = "noopener";
        a.target = "_blank";
        node.appendChild(a);
      } else {
        node.appendChild(document.createTextNode(text));
      }
      previousText = text;
    });
  }

  function attach(el: HTMLElement, node: HTMLSpanElement): void {
    if (settings.translationPosition === "above") {
      el.insertBefore(node, el.firstChild);
    } else {
      el.appendChild(node);
    }
  }

  async function translateOne(el: HTMLElement): Promise<void> {
    if (!active) return;
    if (el.hasAttribute(ATTR_TRANSLATED)) return;
    const original = (el.innerText ?? "").trim();
    if (original.length < 4) return;

    // Mark eagerly so concurrent batches and the mutation observer do not
    // re-enter the same element while the request is in flight. We
    // intentionally do *not* set ATTR_HIDE_ORIGINAL yet: in
    // translation-only mode we want the original text to remain visible
    // while the translation is pending, otherwise the user sees a blank
    // block (with only a "…" placeholder) the moment they disable
    // "show original", which reads as "original disappeared".
    el.setAttribute(ATTR_TRANSLATED, "1");

    // Break the block into text + anchor segments so each hyperlink's
    // inner text can be translated in place and the anchor is preserved
    // as a real <a> within the translation (rather than dropped into a
    // trailing link list).
    const segments = extractSegments(el);
    if (segments.length === 0) {
      // Fallback to a single text segment so elements that confused the
      // DOM walker (e.g. text hidden inside non-anchor elements) still
      // get translated.
      segments.push({ kind: "text", text: original });
    }

    // Render as inline when the element is effectively a single link
    // block (e.g. a nav `<li><a>Home</a></li>`): every non-anchor text
    // run outside anchors is empty. This matches the visual pattern of
    // navigation menus where the translation sits inline next to the
    // original link instead of dropping to a new line.
    const inline = segments.every((s) => s.kind === "anchor") && segments.length > 0;

    const placeholder = buildTranslationNode(null, inline);
    attach(el, placeholder);

    // Translate every segment in parallel. `requestTranslation` swallows
    // its own errors and returns `null`, so a segment failing simply
    // falls back to the original text in `renderSegments`.
    const translations = await Promise.all(
      segments.map((segment) => requestTranslation(segment.text)),
    );

    if (!active) {
      placeholder.remove();
      return;
    }

    // Treat the batch as failed only when *every* segment failed — a
    // partial failure still produces a useful bilingual rendering by
    // falling back to the original text for the missing segments.
    if (translations.every((t) => t === null)) {
      placeholder.remove();
      el.removeAttribute(ATTR_TRANSLATED);
      return;
    }

    placeholder.classList.remove(CLASS_PLACEHOLDER);
    renderSegments(placeholder, segments, translations);

    // Only now — once the translation is rendered — hide the original in
    // translation-only mode. This avoids a flash of blank content between
    // toggling the setting and the translation arriving.
    if (!settings.showOriginal) {
      el.setAttribute(ATTR_HIDE_ORIGINAL, "1");
    }
  }

  async function translateBatch(elements: HTMLElement[]): Promise<void> {
    const CHUNK = 5;
    for (let i = 0; i < elements.length; i += CHUNK) {
      if (!active) break;
      // Chunks are processed sequentially to throttle concurrent translation
      // requests; within a chunk they run in parallel via Promise.all.
      // oxlint-disable-next-line no-await-in-loop
      await Promise.all(elements.slice(i, i + CHUNK).map((el) => translateOne(el)));
    }
  }

  function observe(): void {
    observer = new MutationObserver((mutations) => {
      if (!active) return;
      const pending: HTMLElement[] = [];
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;
          // Ignore mutations caused by our own inserted translation nodes.
          if (node.matches?.(`.${CLASS_TRANSLATION}`)) continue;
          pending.push(...findCandidates(node));
        }
      }
      if (pending.length > 0) void translateBatch(pending);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    async start() {
      if (active) return;
      active = true;
      await translateBatch(findCandidates(document.body));
      observe();
    },
    stop() {
      active = false;
      observer?.disconnect();
      observer = null;
      $(`.${CLASS_TRANSLATION}`).remove();
      $(`[${ATTR_TRANSLATED}]`).removeAttr(ATTR_TRANSLATED);
      $(`[${ATTR_HIDE_ORIGINAL}]`).removeAttr(ATTR_HIDE_ORIGINAL);
    },
  };
}
