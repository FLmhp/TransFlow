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
    /* Inherit the host page's text color/weight/background so the
       translation visually matches the surrounding original text
       (style consistency). The theme accent — border-left, underline,
       highlight — still uses --transflow-color so the translation stays
       clearly distinguishable from the original. */
    color: inherit;
    font-weight: inherit;
    font-style: inherit;
    background: transparent;
    font-size: var(--transflow-font-size, 0.92em);
    line-height: 1.5;
    margin: 4px 0 8px 0;
    font-family: inherit;
  }
  /* In translation-only mode the original is hidden, so any anchors
     inside it are no longer reachable. We also surface preserved
     hyperlinks alongside the translation; style them like ordinary
     in-text links so they stay clickable and visible. */
  .transflow-translation a,
  .transflow-translation-link {
    color: var(--transflow-color, #1a73e8);
    text-decoration: underline;
  }
  .transflow-translation-links {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.4em;
    margin-left: 0.4em;
    font-size: 0.9em;
    vertical-align: baseline;
  }
  /* Translation-only mode: hide the original block's text/child content
     while keeping our translation child visible. Direct element children
     are hidden via display:none; direct text nodes are collapsed by
     zeroing the block's own font-size. The translation child restores its
     font size through an *absolute* (rem-based) CSS variable so that the
     percentage/em cascade from the zeroed parent does not collapse it to
     0 as well. */
  [data-transflow-hide-original] {
    font-size: 0 !important;
  }
  [data-transflow-hide-original] > *:not(.transflow-translation) {
    display: none !important;
  }
  [data-transflow-hide-original] > .transflow-translation {
    font-size: var(--transflow-font-size-abs, 0.92rem) !important;
  }

  /* Loading placeholder — animated three-dot indicator so users get a
     clear visual signal that translation is in progress and don't
     mistake the moment for "the original disappeared". The dots are
     drawn with pseudo-elements so the placeholder stays accessible
     (textContent is still "…" for screen readers) and works without
     external assets. */
  .transflow-translation.transflow-translation-loading {
    opacity: 0.75;
    color: var(--transflow-color, #1a73e8);
  }
  .transflow-translation.transflow-translation-loading::before {
    content: "";
    display: inline-block;
    width: 0.9em;
    height: 0.9em;
    margin-right: 0.4em;
    vertical-align: -0.15em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: transflow-spin 0.8s linear infinite;
  }
  @keyframes transflow-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .transflow-translation.transflow-translation-loading::before {
      animation-duration: 2.4s;
    }
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
  // Absolute (rem-based) companion of --transflow-font-size. Needed by
  // the translation-only mode rule, whose parent element carries
  // `font-size: 0 !important` — percentages/ems would cascade to 0 and
  // hide the translation along with the original.
  document.documentElement.style.setProperty("--transflow-font-size-abs", `${fontSize / 100}rem`);
}
