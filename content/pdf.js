/**
 * PDF translation module.
 * Detects when the current page is a PDF (embedded or direct) and
 * injects bilingual translations into the PDF viewer's text layer.
 *
 * Works with:
 *  - Chrome's built-in PDF viewer (chrome-extension://...)
 *  - PDF.js viewer (pdfjs-dist)
 *  - Direct PDF URLs served as application/pdf
 */

const ATTR_TRANSLATED = 'data-transflow-pdf-translated';
const CLASS_PDF_TRANSLATION = 'transflow-pdf-translation';

let _pdfEnabled = false;
let _observer = null;

/**
 * Returns true if the current page appears to be a PDF viewer.
 */
export function isPdfPage() {
  // Direct PDF embed
  if (document.contentType === 'application/pdf') return true;
  // PDF.js viewer
  if (document.querySelector('.pdfViewer, #viewer')) return true;
  return false;
}

/**
 * Start translating text layers in the PDF viewer.
 */
export function startPdfTranslation() {
  _pdfEnabled = true;
  translateExistingTextSpans();
  observePdfMutations();
}

/**
 * Stop PDF translation and remove inserted elements.
 */
export function stopPdfTranslation() {
  _pdfEnabled = false;
  if (_observer) { _observer.disconnect(); _observer = null; }
  document.querySelectorAll(`.${CLASS_PDF_TRANSLATION}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_TRANSLATED}]`).forEach((el) =>
    el.removeAttribute(ATTR_TRANSLATED)
  );
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * PDF.js renders each text token as a <span> inside .textLayer divs.
 * We collect spans by line-group (their parent div) and translate them.
 */
async function translateExistingTextSpans() {
  const textLayers = document.querySelectorAll('.textLayer');
  for (const layer of textLayers) {
    await translateTextLayer(layer);
  }
}

async function translateTextLayer(layer) {
  // Group spans by their vertical position to reconstruct lines
  const spans = [...layer.querySelectorAll('span')].filter(
    (s) => s.textContent.trim() && !s.hasAttribute(ATTR_TRANSLATED)
  );
  if (!spans.length) return;

  // Build line groups by rounding top coordinate
  const lines = new Map();
  for (const span of spans) {
    const top = Math.round(parseFloat(span.style.top || 0) / 5) * 5;
    if (!lines.has(top)) lines.set(top, []);
    lines.get(top).push(span);
  }

  for (const [, lineSpans] of [...lines.entries()].sort((a, b) => a[0] - b[0])) {
    const lineText = lineSpans.map((s) => s.textContent).join(' ').trim();
    if (!lineText || lineText.length < 3) continue;

    lineSpans.forEach((s) => s.setAttribute(ATTR_TRANSLATED, '1'));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text: lineText,
      });
      if (!response.ok) continue;

      // Insert translation after the last span in the line
      const lastSpan = lineSpans[lineSpans.length - 1];
      const translationEl = document.createElement('span');
      translationEl.className = CLASS_PDF_TRANSLATION;
      translationEl.textContent = response.translated;
      lastSpan.insertAdjacentElement('afterend', translationEl);
    } catch (err) {
      console.warn('[TransFlow PDF]', err);
    }
  }
}

// ─── Mutation observer for dynamically rendered PDF pages ────────────────────

function observePdfMutations() {
  if (_observer) return;
  _observer = new MutationObserver((mutations) => {
    if (!_pdfEnabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const layers = node.classList?.contains('textLayer')
          ? [node]
          : [...(node.querySelectorAll?.('.textLayer') || [])];
        layers.forEach((layer) => translateTextLayer(layer));
      }
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}
