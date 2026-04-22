/**
 * Floating tooltip used to show the result of "Translate selection" and
 * background-side errors. Fully encapsulated behind open/close functions.
 */
import $ from "jquery";

let $tooltip: JQuery | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function showTooltip(text: string, isError = false): void {
  hideTooltip();

  const $el = $("<div/>", { class: "transflow-tooltip" });
  $("<span/>", { class: "transflow-tooltip-label" })
    .text(isError ? "⚠ TransFlow Error" : "🌐 TransFlow")
    .appendTo($el);
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
