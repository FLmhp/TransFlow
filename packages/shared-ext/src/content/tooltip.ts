/**
 * Floating tooltip used to show the result of "Translate selection" and
 * background-side errors. Fully encapsulated behind open/close functions.
 */
import $ from "jquery";

// Lucide icon SVGs (viewBox 0 0 24 24, stroke-based, no fill)
const SVG_ATTRS =
  'xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"';

/** Lucide Globe */
const ICON_GLOBE = `<svg ${SVG_ATTRS}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20"/><path d="M2 12h20"/></svg>`;

/** Lucide TriangleAlert */
const ICON_ALERT = `<svg ${SVG_ATTRS}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

let $tooltip: JQuery | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function showTooltip(text: string, isError = false): void {
  hideTooltip();

  const $el = $("<div/>", { class: "transflow-tooltip" });
  const $label = $("<span/>", { class: "transflow-tooltip-label" });
  $label.html((isError ? ICON_ALERT : ICON_GLOBE) + (isError ? "TransFlow 错误" : "TransFlow"));
  $label.appendTo($el);
  $el.append(document.createTextNode(text));

  const selection = window.getSelection();
  let top = 100;
  let left = 100;
  if (selection && selection.rangeCount > 0) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    top = rect.bottom + 8;
    left = rect.left;
  }
  $el.css({
    top: `${top}px`,
    left: `${Math.min(left, window.innerWidth - 380)}px`,
  });

  $("body").append($el);
  $tooltip = $el;
  timer = setTimeout(hideTooltip, 5000);
}

export function hideTooltip(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if ($tooltip) {
    $tooltip.remove();
    $tooltip = null;
  }
}

export function bindTooltipDismissal(): void {
  $(document).on("click.transflow-tooltip", () => hideTooltip());
}
