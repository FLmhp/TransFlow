/**
 * Webpage bilingual translation module.
 * Walks the DOM to find visible text nodes, requests translation,
 * and inserts bilingual paragraph blocks.
 */

const ATTR_TRANSLATED = 'data-transflow-translated';
const ATTR_ORIGINAL   = 'data-transflow-original';
const CLASS_BLOCK     = 'transflow-block';
const CLASS_ORIGINAL  = 'transflow-original';
const CLASS_TRANSLATION = 'transflow-translation';

// Tags whose text we translate (block-level prose)
const TARGET_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'TD', 'TH', 'BLOCKQUOTE', 'FIGCAPTION',
  'ARTICLE', 'SECTION', 'ASIDE',
]);

// Tags to skip entirely
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK',
  'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
  'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
  'SVG', 'CANVAS', 'MATH',
]);

let _settings = {};
let _observer = null;
let _translating = false;

/**
 * Start bilingual translation for the current page.
 */
export async function startWebpageTranslation(settings) {
  _settings = settings;
  _translating = true;
  await translateVisibleElements();
  observeMutations();
}

/**
 * Remove all translation blocks and stop observing.
 */
export function stopWebpageTranslation() {
  _translating = false;
  if (_observer) { _observer.disconnect(); _observer = null; }
  document.querySelectorAll(`.${CLASS_BLOCK}`).forEach((el) => el.remove());
  document.querySelectorAll(`[${ATTR_TRANSLATED}]`).forEach((el) => {
    el.removeAttribute(ATTR_TRANSLATED);
    el.removeAttribute(ATTR_ORIGINAL);
  });
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function translateVisibleElements() {
  const elements = collectElements(document.body);
  // batch translate in chunks to avoid flooding the API
  const CHUNK = 5;
  for (let i = 0; i < elements.length; i += CHUNK) {
    if (!_translating) break;
    await Promise.all(elements.slice(i, i + CHUNK).map(translateElement));
  }
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
  el.setAttribute(ATTR_ORIGINAL, originalText);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      text: originalText,
    });

    if (!response.ok) {
      console.warn('[TransFlow] translation error:', response.error);
      return;
    }

    insertBilingualBlock(el, originalText, response.translated);
  } catch (err) {
    console.warn('[TransFlow] translateElement error:', err);
  }
}

function insertBilingualBlock(el, original, translated) {
  // Wrap in a flex-column block so original + translation sit together
  const wrapper = document.createElement('span');
  wrapper.className = CLASS_BLOCK;

  const translationSpan = document.createElement('span');
  translationSpan.className = CLASS_TRANSLATION;
  translationSpan.textContent = translated;

  if (_settings.translationPosition === 'above') {
    el.insertAdjacentElement('beforebegin', translationSpan);
  } else {
    el.insertAdjacentElement('afterend', translationSpan);
  }
}

// ─── Mutation observer ───────────────────────────────────────────────────────

function observeMutations() {
  if (_observer) return;
  _observer = new MutationObserver((mutations) => {
    if (!_translating) return;
    const newEls = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (TARGET_TAGS.has(node.tagName) && !node.hasAttribute(ATTR_TRANSLATED)) {
          newEls.push(node);
        }
        // also collect descendants
        node.querySelectorAll &&
          [...node.querySelectorAll(
            [...TARGET_TAGS].map((t) => t.toLowerCase()).join(',')
          )].forEach((child) => {
            if (!child.hasAttribute(ATTR_TRANSLATED)) newEls.push(child);
          });
      }
    }
    if (newEls.length) {
      Promise.all(newEls.map(translateElement));
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}
