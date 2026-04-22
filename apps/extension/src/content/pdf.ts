/**
 * PDF viewer translation (PDF.js text layer).
 */
import $ from 'jquery';
import { requestTranslation } from './messaging.js';

const ATTR_TRANSLATED = 'data-transflow-pdf-translated';
const CLASS_PDF_TRANSLATION = 'transflow-pdf-translation';

export function isPdfPage(): boolean {
  return document.contentType === 'application/pdf' || $('.pdfViewer, #viewer').length > 0;
}

export interface PdfModule {
  start(): Promise<void>;
  stop(): void;
}

export function createPdfModule(): PdfModule {
  let active = false;
  let observer: MutationObserver | null = null;

  async function translateLayer(layer: HTMLElement): Promise<void> {
    if (!active) return;
    const $spans = $(layer)
      .find('span')
      .filter(function () {
        return this.textContent !== null && this.textContent.trim().length > 0 && !this.hasAttribute(ATTR_TRANSLATED);
      });
    if ($spans.length === 0) return;

    // Group by vertical position to reconstruct lines
    const lines = new Map<number, HTMLSpanElement[]>();
    $spans.each(function () {
      const top = Math.round(parseFloat(this.style.top || '0') / 5) * 5;
      const arr = lines.get(top) ?? [];
      arr.push(this as HTMLSpanElement);
      lines.set(top, arr);
    });

    const sorted = [...lines.entries()].sort((a, b) => a[0] - b[0]);
    for (const [, spans] of sorted) {
      if (!active) break;
      const text = spans.map((s) => s.textContent ?? '').join(' ').trim();
      if (text.length < 3) continue;
      spans.forEach((s) => s.setAttribute(ATTR_TRANSLATED, '1'));

      const translated = await requestTranslation(text);
      if (!translated || !active) continue;

      const $el = $('<span/>', { class: CLASS_PDF_TRANSLATION }).text(translated);
      $(spans[spans.length - 1] as HTMLElement).after($el);
    }
  }

  function observe(): void {
    observer = new MutationObserver((mutations) => {
      if (!active) return;
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as HTMLElement;
          const layers = el.classList?.contains('textLayer')
            ? [el]
            : Array.from(el.querySelectorAll?.('.textLayer') ?? []);
          layers.forEach((layer) => void translateLayer(layer as HTMLElement));
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return {
    async start() {
      if (active) return;
      active = true;
      const layers = $('.textLayer').toArray() as HTMLElement[];
      for (const layer of layers) {
        await translateLayer(layer);
      }
      observe();
    },
    stop() {
      active = false;
      observer?.disconnect();
      observer = null;
      $(`.${CLASS_PDF_TRANSLATION}`).remove();
      $(`[${ATTR_TRANSLATED}]`).removeAttr(ATTR_TRANSLATED);
    },
  };
}
