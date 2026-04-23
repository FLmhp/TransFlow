/**
 * Bilingual webpage translation.
 *
 * Collects visible block-level prose elements, asks the background for
 * translations, and renders the translation as a sentinel child of each
 * original element. Inserting the translation as a child (rather than as
 * a sibling) preserves the layout of headings, list items and table cells
 * that style their immediate children.
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
const CLASS_LINKS = "transflow-translation-links";
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

  function buildTranslationNode(text: string | null): HTMLSpanElement {
    const classes = [CLASS_TRANSLATION, themeClass];
    if (text === null) classes.push(CLASS_PLACEHOLDER);
    const node = document.createElement("span");
    node.className = classes.join(" ");
    node.dataset.transflowNode = "translation";
    node.textContent = text ?? "…";
    return node;
  }

  /**
   * Collect anchors from the original element so we can re-surface them
   * alongside the translation. This keeps links clickable in
   * translation-only mode (where the original is hidden) and provides a
   * visible affordance in bilingual mode that the translated sentence
   * carried hyperlinks. We only keep absolute http(s) hrefs and skip
   * anchors with no visible text or ones that point at the translation
   * node itself.
   */
  function collectLinks(el: HTMLElement): { href: string; text: string }[] {
    const seen = new Set<string>();
    const links: { href: string; text: string }[] = [];
    const anchors = el.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const a of Array.from(anchors)) {
      if (a.closest(`.${CLASS_TRANSLATION}`)) continue;
      const href = a.href;
      if (!href) continue;
      if (!/^https?:/i.test(href)) continue;
      const text = (a.textContent ?? "").trim();
      if (text.length === 0) continue;
      const key = `${href}\n${text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ href, text });
    }
    return links;
  }

  function buildLinksNode(links: { href: string; text: string }[]): HTMLSpanElement | null {
    if (links.length === 0) return null;
    const wrapper = document.createElement("span");
    wrapper.className = CLASS_LINKS;
    for (const { href, text } of links) {
      const a = document.createElement("a");
      a.className = CLASS_LINK;
      a.href = href;
      a.textContent = text;
      // Preserve typical link affordances. `rel=noopener` matches the
      // safe defaults we want when surfacing third-party links.
      a.rel = "noopener";
      a.target = "_blank";
      wrapper.appendChild(a);
    }
    return wrapper;
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

    const placeholder = buildTranslationNode(null);
    attach(el, placeholder);

    // `requestTranslation` swallows its own errors and returns `null`, so
    // a plain await is sufficient here.
    const translated = await requestTranslation(original);

    if (!active) {
      placeholder.remove();
      return;
    }

    if (!translated) {
      // Roll back so the element can be retried on the next batch and the
      // original stays readable.
      placeholder.remove();
      el.removeAttribute(ATTR_TRANSLATED);
      return;
    }

    placeholder.classList.remove(CLASS_PLACEHOLDER);
    placeholder.textContent = translated;

    // Re-surface the original block's hyperlinks next to the translated
    // text so they remain clickable — important in translation-only mode
    // where the original (and its links) is hidden by CSS.
    const linksNode = buildLinksNode(collectLinks(el));
    if (linksNode) {
      placeholder.appendChild(document.createTextNode(" "));
      placeholder.appendChild(linksNode);
    }

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
