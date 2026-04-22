/**
 * TransFlow content script entry point.
 *
 * Responsibilities:
 *  1. Listen for messages from the popup / background
 *  2. Inject global styles
 *  3. Coordinate webpage / PDF / subtitle translation modules
 */

// ─── Inline minimal copies of the modules (content scripts can't use ES modules
//     with dynamic import in MV3 without bundling, so we inline them here). ───

// NOTE: In a production setup these would be bundled via Webpack/Rollup.
// For this zero-build implementation we import via the web_accessible_resources
// mechanism — but since classic content scripts don't support top-level import,
// we include all logic inline in this single file.

// ─────────────────────────────────────────────────────────────────────────────
// Settings cache
// ─────────────────────────────────────────────────────────────────────────────
let _settings = {};

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      _settings = res || {};
      resolve(_settings);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Global styles
// ─────────────────────────────────────────────────────────────────────────────

function injectGlobalStyles() {
  if (document.getElementById('transflow-global-style')) return;
  const style = document.createElement('style');
  style.id = 'transflow-global-style';
  style.textContent = `
    .transflow-translation {
      display: block;
      color: #1a73e8;
      font-size: 0.92em;
      line-height: 1.5;
      margin: 4px 0 8px 0;
      padding: 2px 0;
      border-left: 3px solid #1a73e8;
      padding-left: 8px;
      font-family: inherit;
    }
    .transflow-pdf-translation {
      display: block;
      color: #1a73e8;
      font-size: 0.85em;
      margin-top: 2px;
      background: rgba(26,115,232,0.08);
      border-radius: 2px;
      padding: 1px 4px;
    }
    .transflow-subtitle-translation {
      display: block;
      font-size: 0.85em;
      color: #ffe066;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      line-height: 1.3;
      margin-top: 2px;
    }
    .transflow-tooltip {
      position: fixed;
      z-index: 2147483647;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      max-width: 360px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      color: #222;
      line-height: 1.5;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .transflow-tooltip .transflow-tooltip-label {
      font-size: 11px;
      color: #888;
      margin-bottom: 4px;
      display: block;
    }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip for context-menu selection translation
// ─────────────────────────────────────────────────────────────────────────────

let _tooltipEl = null;
let _tooltipTimer = null;

function showTooltip(text, isError = false) {
  removeTooltip();
  const el = document.createElement('div');
  el.className = 'transflow-tooltip';
  const label = document.createElement('span');
  label.className = 'transflow-tooltip-label';
  label.textContent = isError ? '⚠ TransFlow Error' : '🌐 TransFlow';
  el.appendChild(label);
  el.appendChild(document.createTextNode(text));

  // Position near the selection
  const sel = window.getSelection();
  let top = 100, left = 100;
  if (sel && sel.rangeCount) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    top = rect.bottom + 8;
    left = rect.left;
  }
  el.style.top = `${top}px`;
  el.style.left = `${Math.min(left, window.innerWidth - 380)}px`;

  document.body.appendChild(el);
  _tooltipEl = el;
  _tooltipTimer = setTimeout(removeTooltip, 5000);
}

function removeTooltip() {
  if (_tooltipTimer) { clearTimeout(_tooltipTimer); _tooltipTimer = null; }
  if (_tooltipEl) { _tooltipEl.remove(); _tooltipEl = null; }
}

document.addEventListener('click', removeTooltip);

// ─────────────────────────────────────────────────────────────────────────────
// Webpage translation
// ─────────────────────────────────────────────────────────────────────────────

const ATTR_TRANSLATED = 'data-transflow-translated';
const CLASS_TRANSLATION = 'transflow-translation';
const TARGET_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'TD', 'TH', 'BLOCKQUOTE', 'FIGCAPTION',
]);
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK',
  'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
  'SVG', 'CANVAS', 'MATH',
]);

let _webpageActive = false;
let _webpageObserver = null;

async function startWebpageTranslation() {
  _webpageActive = true;
  const elements = collectElements(document.body);
  const CHUNK = 5;
  for (let i = 0; i < elements.length; i += CHUNK) {
    if (!_webpageActive) break;
    await Promise.all(elements.slice(i, i + CHUNK).map(translateElement));
  }
  observeWebpageMutations();
}

function stopWebpageTranslation() {
  _webpageActive = false;
  if (_webpageObserver) { _webpageObserver.disconnect(); _webpageObserver = null; }
  document.querySelectorAll(`.${CLASS_TRANSLATION}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_TRANSLATED}]`).forEach((el) => {
    el.removeAttribute(ATTR_TRANSLATED);
  });
}

function collectElements(root) {
  const results = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (SKIP_TAGS.has(node.tagName)) continue;
    if (node.hasAttribute(ATTR_TRANSLATED)) continue;
    if (!TARGET_TAGS.has(node.tagName)) continue;
    const text = node.innerText?.trim();
    if (text && text.length > 3) results.push(node);
  }
  return results;
}

async function translateElement(el) {
  if (el.hasAttribute(ATTR_TRANSLATED)) return;
  const originalText = el.innerText?.trim();
  if (!originalText || originalText.length < 4) return;
  el.setAttribute(ATTR_TRANSLATED, '1');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: originalText });
    if (!response || !response.ok) return;
    const span = document.createElement('span');
    span.className = CLASS_TRANSLATION;
    span.textContent = response.translated;
    if (_settings.translationPosition === 'above') {
      el.insertAdjacentElement('beforebegin', span);
    } else {
      el.insertAdjacentElement('afterend', span);
    }
  } catch (_) { /* ignore */ }
}

function observeWebpageMutations() {
  if (_webpageObserver) return;
  _webpageObserver = new MutationObserver((mutations) => {
    if (!_webpageActive) return;
    const newEls = [];
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (TARGET_TAGS.has(node.tagName) && !node.hasAttribute(ATTR_TRANSLATED))
          newEls.push(node);
        node.querySelectorAll &&
          [...node.querySelectorAll([...TARGET_TAGS].map((t) => t.toLowerCase()).join(','))]
            .filter((c) => !c.hasAttribute(ATTR_TRANSLATED))
            .forEach((c) => newEls.push(c));
      }
    }
    if (newEls.length) Promise.all(newEls.map(translateElement));
  });
  _webpageObserver.observe(document.body, { childList: true, subtree: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF translation
// ─────────────────────────────────────────────────────────────────────────────

const ATTR_PDF_TRANSLATED = 'data-transflow-pdf-translated';
const CLASS_PDF_TRANSLATION = 'transflow-pdf-translation';
let _pdfActive = false;
let _pdfObserver = null;

function isPdfPage() {
  return document.contentType === 'application/pdf' ||
    !!document.querySelector('.pdfViewer, #viewer');
}

async function startPdfTranslation() {
  _pdfActive = true;
  for (const layer of document.querySelectorAll('.textLayer')) {
    await translateTextLayer(layer);
  }
  observePdfMutations();
}

function stopPdfTranslation() {
  _pdfActive = false;
  if (_pdfObserver) { _pdfObserver.disconnect(); _pdfObserver = null; }
  document.querySelectorAll(`.${CLASS_PDF_TRANSLATION}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_PDF_TRANSLATED}]`).forEach((el) =>
    el.removeAttribute(ATTR_PDF_TRANSLATED)
  );
}

async function translateTextLayer(layer) {
  const spans = [...layer.querySelectorAll('span')].filter(
    (s) => s.textContent.trim() && !s.hasAttribute(ATTR_PDF_TRANSLATED)
  );
  if (!spans.length) return;

  const lines = new Map();
  for (const span of spans) {
    const top = Math.round(parseFloat(span.style.top || 0) / 5) * 5;
    if (!lines.has(top)) lines.set(top, []);
    lines.get(top).push(span);
  }

  for (const [, lineSpans] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
    const lineText = lineSpans.map((s) => s.textContent).join(' ').trim();
    if (!lineText || lineText.length < 3) continue;
    lineSpans.forEach((s) => s.setAttribute(ATTR_PDF_TRANSLATED, '1'));

    try {
      const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text: lineText });
      if (!response || !response.ok) continue;
      const translationEl = document.createElement('span');
      translationEl.className = CLASS_PDF_TRANSLATION;
      translationEl.textContent = response.translated;
      lineSpans[lineSpans.length - 1].insertAdjacentElement('afterend', translationEl);
    } catch (_) { /* ignore */ }
  }
}

function observePdfMutations() {
  if (_pdfObserver) return;
  _pdfObserver = new MutationObserver((mutations) => {
    if (!_pdfActive) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const layers = node.classList?.contains('textLayer')
          ? [node]
          : [...(node.querySelectorAll?.('.textLayer') || [])];
        layers.forEach((l) => translateTextLayer(l));
      }
    }
  });
  _pdfObserver.observe(document.body, { childList: true, subtree: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Subtitle translation
// ─────────────────────────────────────────────────────────────────────────────

const ATTR_SUBTITLE = 'data-transflow-sub';
const CLASS_SUBTITLE = 'transflow-subtitle-translation';
const SUBTITLE_SELECTORS = [
  '.ytp-caption-segment',
  '.player-timedtext-text-container span',
  '.subtitles-container span',
  '.atvwebplayersdk-captions-text',
  '.bilibili-player-video-subtitle span',
  '.vtt-cue',
  '[class*="subtitle"] span',
  '[class*="caption"] span',
].join(', ');

const _subtitleCache = new Map();
let _subtitleActive = false;
let _subtitleObserver = null;

function startSubtitleTranslation() {
  _subtitleActive = true;
  observeSubtitles();
}

function stopSubtitleTranslation() {
  _subtitleActive = false;
  if (_subtitleObserver) { _subtitleObserver.disconnect(); _subtitleObserver = null; }
  document.querySelectorAll(`.${CLASS_SUBTITLE}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_SUBTITLE}]`).forEach((el) =>
    el.removeAttribute(ATTR_SUBTITLE)
  );
}

function observeSubtitles() {
  if (_subtitleObserver) return;
  _subtitleObserver = new MutationObserver((mutations) => {
    if (!_subtitleActive) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.(SUBTITLE_SELECTORS)) processSubtitleNode(node);
        node.querySelectorAll?.(SUBTITLE_SELECTORS).forEach(processSubtitleNode);
      }
    }
  });
  _subtitleObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

async function processSubtitleNode(el) {
  const text = el.textContent?.trim();
  if (!text || text.length < 2) return;
  const existing = el.querySelector(`.${CLASS_SUBTITLE}`);
  if (existing) {
    if (el.getAttribute(ATTR_SUBTITLE) === text) return;
    existing.remove();
  }
  el.setAttribute(ATTR_SUBTITLE, text);

  let translated = _subtitleCache.get(text);
  if (!translated) {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TRANSLATE', text });
      if (!response || !response.ok) return;
      translated = response.translated;
      if (_subtitleCache.size >= 500) _subtitleCache.delete(_subtitleCache.keys().next().value);
      _subtitleCache.set(text, translated);
    } catch (_) { return; }
  }

  const span = document.createElement('span');
  span.className = CLASS_SUBTITLE;
  span.textContent = translated;
  el.appendChild(span);
}

// ─────────────────────────────────────────────────────────────────────────────
// State management & message listener
// ─────────────────────────────────────────────────────────────────────────────

let _state = { webpage: false, pdf: false, subtitle: false };

async function applySettings(settings) {
  _settings = settings;

  const shouldWebpage = settings.enabled;
  const shouldPdf = settings.enabled && settings.pdfEnabled && isPdfPage();
  const shouldSubtitle = settings.enabled && settings.subtitleEnabled;

  // Webpage
  if (shouldWebpage && !_state.webpage) {
    _state.webpage = true;
    startWebpageTranslation();
  } else if (!shouldWebpage && _state.webpage) {
    _state.webpage = false;
    stopWebpageTranslation();
  }

  // PDF
  if (shouldPdf && !_state.pdf) {
    _state.pdf = true;
    startPdfTranslation();
  } else if (!shouldPdf && _state.pdf) {
    _state.pdf = false;
    stopPdfTranslation();
  }

  // Subtitles
  if (shouldSubtitle && !_state.subtitle) {
    _state.subtitle = true;
    startSubtitleTranslation();
  } else if (!shouldSubtitle && _state.subtitle) {
    _state.subtitle = false;
    stopSubtitleTranslation();
  }
}

// Listen for messages from popup / background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    applySettings(message.settings);
  } else if (message.type === 'TOGGLE_TRANSLATION') {
    const newEnabled = !_settings.enabled;
    _settings.enabled = newEnabled;
    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: { enabled: newEnabled },
    });
    applySettings(_settings);
  } else if (message.type === 'SHOW_TOOLTIP') {
    showTooltip(message.text);
  } else if (message.type === 'SHOW_ERROR') {
    showTooltip(message.text, true);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  injectGlobalStyles();
  const settings = await loadSettings();
  await applySettings(settings);
})();
