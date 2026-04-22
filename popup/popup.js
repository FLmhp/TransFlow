/**
 * TransFlow popup script.
 * Loads settings, renders UI state, and saves changes.
 */

const $ = (id) => document.getElementById(id);

let _settings = {};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await getSettings();
  _settings = settings;
  renderSettings(settings);
  attachEventListeners();
});

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSettings(s) {
  $('toggleEnabled').checked = !!s.enabled;
  $('sourceLang').value = s.sourceLang || 'auto';
  $('targetLang').value = s.targetLang || 'zh-CN';
  $('pdfEnabled').checked = s.pdfEnabled !== false;
  $('subtitleEnabled').checked = s.subtitleEnabled !== false;

  // Engine radio
  const engineRadio = document.querySelector(`input[name="engine"][value="${s.engine || 'google'}"]`);
  if (engineRadio) engineRadio.checked = true;
  updateEngineHighlight(s.engine || 'google');

  updateStatus(s.enabled);
}

function updateStatus(enabled) {
  const bar = document.querySelector('.status-bar');
  const text = $('statusText');
  if (enabled) {
    bar.className = 'status-bar active';
    text.textContent = '✓ Translation active';
  } else {
    bar.className = 'status-bar';
    text.textContent = 'Translation disabled';
  }
}

function updateEngineHighlight(engine) {
  document.querySelectorAll('.engine-option').forEach((opt) => {
    opt.classList.toggle('selected', opt.dataset.engine === engine);
  });
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function attachEventListeners() {
  // Main toggle
  $('toggleEnabled').addEventListener('change', async (e) => {
    _settings.enabled = e.target.checked;
    await saveAndPropagate({ enabled: _settings.enabled });
    updateStatus(_settings.enabled);
  });

  // Language swapper
  $('swapLangs').addEventListener('click', async () => {
    const src = $('sourceLang').value;
    const tgt = $('targetLang').value;
    if (src === 'auto') return;
    $('sourceLang').value = tgt;
    $('targetLang').value = src;
    _settings.sourceLang = tgt;
    _settings.targetLang = src;
    await saveAndPropagate({ sourceLang: tgt, targetLang: src });
  });

  // Source / target language
  $('sourceLang').addEventListener('change', async (e) => {
    _settings.sourceLang = e.target.value;
    await saveAndPropagate({ sourceLang: e.target.value });
  });
  $('targetLang').addEventListener('change', async (e) => {
    _settings.targetLang = e.target.value;
    await saveAndPropagate({ targetLang: e.target.value });
  });

  // Engine radios
  document.querySelectorAll('input[name="engine"]').forEach((radio) => {
    radio.addEventListener('change', async (e) => {
      _settings.engine = e.target.value;
      updateEngineHighlight(e.target.value);
      await saveAndPropagate({ engine: e.target.value });
    });
  });

  // Feature checkboxes
  $('pdfEnabled').addEventListener('change', async (e) => {
    _settings.pdfEnabled = e.target.checked;
    await saveAndPropagate({ pdfEnabled: e.target.checked });
  });
  $('subtitleEnabled').addEventListener('change', async (e) => {
    _settings.subtitleEnabled = e.target.checked;
    await saveAndPropagate({ subtitleEnabled: e.target.checked });
  });

  // Translate Now button
  $('translateNow').addEventListener('click', async () => {
    _settings.enabled = true;
    $('toggleEnabled').checked = true;
    updateStatus(true);
    await saveAndPropagate({ enabled: true });
    window.close();
  });

  // Open options
  $('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      resolve(res || {});
    });
  });
}

/**
 * Save a partial settings object and notify all tabs.
 */
async function saveAndPropagate(partial) {
  const merged = { ..._settings, ...partial };
  _settings = merged;
  await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: merged }, resolve);
  });
  // Notify active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SETTINGS_UPDATED',
      settings: merged,
    }).catch(() => { /* tab may not have content script */ });
  }
}
