/**
 * Global CSS injected once per frame by the content script.
 * Kept in a TS template string so the content script bundle is self-contained
 * and does not need a `web_accessible_resources` CSS round-trip.
 */
import $ from "jquery";

const STYLE_ID = "transflow-global-style";

const CSS = /* css */ `
  .transflow-translation {
    display: block;
    color: var(--transflow-color, #1a73e8);
    font-size: var(--transflow-font-size, 0.92em);
    line-height: 1.5;
    margin: 4px 0 8px 0;
    font-family: inherit;
  }
  /* Translation-only mode: hide the original block's text/child content
     while keeping our translation child visible. Direct element children
     are hidden via display:none; direct text nodes are collapsed by
     zeroing the block's own font-size. The translation child restores its
     font size through the CSS variable below. */
  [data-transflow-hide-original] {
    font-size: 0 !important;
  }
  [data-transflow-hide-original] > *:not(.transflow-translation) {
    display: none !important;
  }
  [data-transflow-hide-original] > .transflow-translation {
    font-size: var(--transflow-font-size, 0.92em);
  }

  /* Loading placeholder — subtle pulsing ellipsis while awaiting response. */
  .transflow-translation.transflow-translation-loading {
    opacity: 0.55;
    font-style: italic;
  }

  /* Themes — inspired by the old immersive-translate display styles. */
  .transflow-translation.transflow-theme-normal {
    padding: 2px 0 2px 8px;
    border-left: 3px solid var(--transflow-color, #1a73e8);
  }
  .transflow-translation.transflow-theme-underline {
    text-decoration: underline;
    text-decoration-color: var(--transflow-color, #1a73e8);
    text-underline-offset: 3px;
    padding: 2px 0;
  }
  .transflow-translation.transflow-theme-dashed {
    text-decoration: underline dashed;
    text-decoration-color: var(--transflow-color, #1a73e8);
    text-underline-offset: 3px;
    padding: 2px 0;
  }
  .transflow-translation.transflow-theme-highlight {
    background: color-mix(in srgb, var(--transflow-color, #1a73e8) 18%, transparent);
    padding: 2px 6px;
    border-radius: 3px;
  }
  .transflow-translation.transflow-theme-mask {
    filter: blur(4px);
    transition: filter 0.2s ease;
    padding: 2px 0 2px 8px;
    border-left: 3px solid var(--transflow-color, #1a73e8);
  }
  .transflow-translation.transflow-theme-mask:hover {
    filter: blur(0);
  }

  .transflow-pdf-translation {
    display: block;
    color: var(--transflow-color, #1a73e8);
    font-size: 0.85em;
    margin-top: 2px;
    background: rgba(26, 115, 232, 0.08);
    border-radius: 2px;
    padding: 1px 4px;
  }
  .transflow-subtitle-translation {
    display: block;
    font-size: 0.85em;
    color: #ffe066;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
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
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.18);
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

export function injectGlobalStyles(color: string, fontSize: number): void {
  let $style = $(`#${STYLE_ID}`);
  if ($style.length === 0) {
    $style = $("<style/>", { id: STYLE_ID }).text(CSS);
    $("head").append($style);
  }
  document.documentElement.style.setProperty("--transflow-color", color);
  document.documentElement.style.setProperty("--transflow-font-size", `${fontSize}%`);
}
