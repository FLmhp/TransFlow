/**
 * Video subtitle translation module.
 * Supports:
 *  - YouTube (div.ytp-caption-segment)
 *  - Netflix (span.player-timedtext-text-container)
 *  - HTML5 <track> / <cue> based subtitles
 *  - Generic subtitle overlays
 */

const CLASS_SUBTITLE_TRANSLATION = 'transflow-subtitle-translation';
const ATTR_SUBTITLE_TRANSLATED = 'data-transflow-sub';

let _subtitleEnabled = false;
let _observer = null;
// LRU-like cache for subtitle strings
const _cache = new Map();
const CACHE_MAX = 500;

/**
 * Start subtitle translation.
 */
export function startSubtitleTranslation() {
  _subtitleEnabled = true;
  observeSubtitleContainers();
  injectSubtitleStyles();
}

/**
 * Stop subtitle translation.
 */
export function stopSubtitleTranslation() {
  _subtitleEnabled = false;
  if (_observer) { _observer.disconnect(); _observer = null; }
  document.querySelectorAll(`.${CLASS_SUBTITLE_TRANSLATION}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_SUBTITLE_TRANSLATED}]`).forEach((el) =>
    el.removeAttribute(ATTR_SUBTITLE_TRANSLATED)
  );
}

// ─── Subtitle selectors per platform ─────────────────────────────────────────

const SUBTITLE_SELECTORS = [
  // YouTube
  '.ytp-caption-segment',
  // Netflix
  '.player-timedtext-text-container span',
  // Disney+
  '.subtitles-container span',
  // Prime Video
  '.atvwebplayersdk-captions-text',
  // Bilibili
  '.bilibili-player-video-subtitle span',
  // Generic
  '.vtt-cue',
  '[class*="subtitle"] span',
  '[class*="caption"] span',
];

const COMBINED_SELECTOR = SUBTITLE_SELECTORS.join(', ');

// ─── Core ─────────────────────────────────────────────────────────────────────

function observeSubtitleContainers() {
  if (_observer) return;
  _observer = new MutationObserver((mutations) => {
    if (!_subtitleEnabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        processNode(node);
      }
      // Also handle attribute/text changes on existing nodes
      if (mutation.type === 'characterData') {
        const el = mutation.target.parentElement;
        if (el && matchesSubtitle(el)) processNode(el);
      }
    }
  });
  _observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function matchesSubtitle(el) {
  return el.matches && el.matches(COMBINED_SELECTOR);
}

async function processNode(node) {
  // Check the node itself
  if (matchesSubtitle(node)) await translateSubtitleNode(node);
  // Check descendants
  if (node.querySelectorAll) {
    for (const el of node.querySelectorAll(COMBINED_SELECTOR)) {
      await translateSubtitleNode(el);
    }
  }
}

async function translateSubtitleNode(el) {
  const text = el.textContent?.trim();
  if (!text || text.length < 2) return;

  // Avoid duplicate work if already has our translation appended
  const existing = el.querySelector(`.${CLASS_SUBTITLE_TRANSLATION}`);
  if (existing) {
    if (el.getAttribute(ATTR_SUBTITLE_TRANSLATED) === text) return;
    existing.remove();
  }

  el.setAttribute(ATTR_SUBTITLE_TRANSLATED, text);

  // Check cache first
  let translated = _cache.get(text);
  if (!translated) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text,
      });
      if (!response.ok) return;
      translated = response.translated;
      cacheSet(text, translated);
    } catch (err) {
      console.warn('[TransFlow subtitle]', err);
      return;
    }
  }

  const translationEl = document.createElement('span');
  translationEl.className = CLASS_SUBTITLE_TRANSLATION;
  translationEl.textContent = translated;
  el.appendChild(translationEl);
}

function cacheSet(key, value) {
  if (_cache.size >= CACHE_MAX) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(key, value);
}

// ─── Inject subtitle styles ──────────────────────────────────────────────────

function injectSubtitleStyles() {
  if (document.getElementById('transflow-subtitle-style')) return;
  const style = document.createElement('style');
  style.id = 'transflow-subtitle-style';
  style.textContent = `
    .transflow-subtitle-translation {
      display: block;
      font-size: 0.85em;
      color: #ffe066;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      line-height: 1.3;
      margin-top: 2px;
    }
  `;
  document.head.appendChild(style);
}
