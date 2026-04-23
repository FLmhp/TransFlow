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
  "td",
  "th",
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
    // re-enter the same element while the request is in flight.
    el.setAttribute(ATTR_TRANSLATED, "1");
    if (!settings.showOriginal) {
      el.setAttribute(ATTR_HIDE_ORIGINAL, "1");
    }

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
      el.removeAttribute(ATTR_HIDE_ORIGINAL);
      return;
    }

    placeholder.classList.remove(CLASS_PLACEHOLDER);
    placeholder.textContent = translated;
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
