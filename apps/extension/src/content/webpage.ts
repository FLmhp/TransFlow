/**
 * Bilingual webpage translation.
 *
 * Collects visible block-level prose elements, asks the background for
 * translations, and inserts a sibling `<span class="transflow-translation">`
 * node either below or above each original.
 */
import $ from "jquery";
import type { Settings } from "@transflow/core";
import { requestTranslation } from "./messaging.js";

const ATTR_TRANSLATED = "data-transflow-translated";
const CLASS_TRANSLATION = "transflow-translation";

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

  async function translateOne(el: HTMLElement): Promise<void> {
    if (!active) return;
    if (el.hasAttribute(ATTR_TRANSLATED)) return;
    const original = (el.innerText ?? "").trim();
    if (original.length < 4) return;

    el.setAttribute(ATTR_TRANSLATED, "1");
    const translated = await requestTranslation(original);
    if (!translated || !active) return;

    const $span = $("<span/>", { class: CLASS_TRANSLATION }).text(translated);
    if (settings.translationPosition === "above") {
      $(el).before($span);
    } else {
      $(el).after($span);
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
    },
  };
}
