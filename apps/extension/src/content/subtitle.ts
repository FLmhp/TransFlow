/**
 * Video subtitle translation — YouTube, Netflix, Disney+, Prime, Bilibili,
 * plus a generic selector for <track>/vtt-cue containers.
 */
import $ from "jquery";
import { requestTranslation } from "./messaging.js";

const CLASS_SUBTITLE = "transflow-subtitle-translation";
const ATTR_SUBTITLE = "data-transflow-sub";

const SUBTITLE_SELECTORS = [
  ".ytp-caption-segment",
  ".player-timedtext-text-container span",
  ".subtitles-container span",
  ".atvwebplayersdk-captions-text",
  ".bilibili-player-video-subtitle span",
  ".vtt-cue",
  '[class*="subtitle"] span',
  '[class*="caption"] span',
].join(", ");

export interface SubtitleModule {
  start(): void;
  stop(): void;
}

const CACHE_MAX = 500;

export function createSubtitleModule(): SubtitleModule {
  let active = false;
  let observer: MutationObserver | null = null;
  const cache = new Map<string, string>();

  function cacheSet(key: string, value: string): void {
    if (cache.size >= CACHE_MAX) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }
    cache.set(key, value);
  }

  async function translateNode(el: HTMLElement): Promise<void> {
    if (!active) return;
    const text = (el.textContent ?? "").trim();
    if (text.length < 2) return;

    const $existing = $(el).find(`.${CLASS_SUBTITLE}`);
    if ($existing.length > 0) {
      if (el.getAttribute(ATTR_SUBTITLE) === text) return;
      $existing.remove();
    }
    el.setAttribute(ATTR_SUBTITLE, text);

    let translated = cache.get(text);
    if (!translated) {
      const result = await requestTranslation(text);
      if (!result) return;
      translated = result;
      cacheSet(text, translated);
    }
    if (!active) return;
    $(el).append($("<span/>", { class: CLASS_SUBTITLE }).text(translated));
  }

  function matchesSubtitle(el: Element): el is HTMLElement {
    return (
      typeof (el as HTMLElement).matches === "function" &&
      (el as HTMLElement).matches(SUBTITLE_SELECTORS)
    );
  }

  function processNode(node: Node): void {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (matchesSubtitle(el)) void translateNode(el);
    el.querySelectorAll?.(SUBTITLE_SELECTORS).forEach(
      (child) => void translateNode(child as HTMLElement),
    );
  }

  return {
    start() {
      if (active) return;
      active = true;
      observer = new MutationObserver((mutations) => {
        if (!active) return;
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) processNode(node);
          if (mutation.type === "characterData") {
            const parent = mutation.target.parentElement;
            if (parent && matchesSubtitle(parent)) void translateNode(parent);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    },
    stop() {
      active = false;
      observer?.disconnect();
      observer = null;
      cache.clear();
      $(`.${CLASS_SUBTITLE}`).remove();
      $(`[${ATTR_SUBTITLE}]`).removeAttr(ATTR_SUBTITLE);
    },
  };
}
