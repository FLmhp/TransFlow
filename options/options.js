/**
 * TransFlow options page script.
 */

const DEFAULT_SETTINGS = {
  enabled: false,
  engine: 'google',
  sourceLang: 'auto',
  targetLang: 'zh-CN',
  deeplApiKey: '',
  deeplIsPro: false,
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
  showOriginal: true,
  translationPosition: 'below',
  pdfEnabled: true,
  subtitleEnabled: true,
  translationColor: '#1a73e8',
  translationFontSize: 92,
};

const $ = (id) => document.getElementById(id);
let _settings = {};

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  _settings = await loadSettings();
  renderSettings(_settings);
  attachNavigation();
  attachEventListeners();
});

// ─── Navigation ───────────────────────────────────────────────────────────────

function attachNavigation() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
      document.querySelectorAll('.settings-section').forEach((s) => s.classList.remove('active'));
      link.classList.add('active');
      $(`${section}`)?.classList.add('active');
    });
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSettings(s) {
  $('sourceLang').value = s.sourceLang || 'auto';
  $('targetLang').value = s.targetLang || 'zh-CN';
  $('pdfEnabled').checked = s.pdfEnabled !== false;
  $('subtitleEnabled').checked = s.subtitleEnabled !== false;
  $('showOriginal').checked = s.showOriginal !== false;
  $('translationPosition').value = s.translationPosition || 'below';
  $('engine').value = s.engine || 'google';
  $('deeplApiKey').value = s.deeplApiKey || '';
  $('deeplIsPro').checked = !!s.deeplIsPro;
  $('openaiApiKey').value = s.openaiApiKey || '';
  $('openaiModel').value = s.openaiModel || 'gpt-4o-mini';
  $('geminiApiKey').value = s.geminiApiKey || '';
  $('geminiModel').value = s.geminiModel || 'gemini-1.5-flash';
  $('translationColor').value = s.translationColor || '#1a73e8';
  $('translationFontSize').value = s.translationFontSize || 92;
  $('translationFontSizeLabel').textContent = `${s.translationFontSize || 92}%`;

  updateEngineCards(s.engine || 'google');
  updatePreview(s);
}

function updateEngineCards(engine) {
  ['google', 'deepl', 'openai', 'gemini'].forEach((e) => {
    $(`card-${e}`)?.classList.toggle('hidden', e !== engine);
  });
}

function updatePreview(s) {
  const preview = $('previewTranslation');
  if (!preview) return;
  preview.style.color = s.translationColor || '#1a73e8';
  preview.style.borderLeftColor = s.translationColor || '#1a73e8';
  preview.style.fontSize = `${s.translationFontSize || 92}%`;
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function attachEventListeners() {
  // Engine selector — show/hide relevant card
  $('engine').addEventListener('change', (e) => {
    _settings.engine = e.target.value;
    updateEngineCards(e.target.value);
  });

  // Font size range label
  $('translationFontSize').addEventListener('input', (e) => {
    $('translationFontSizeLabel').textContent = `${e.target.value}%`;
    _settings.translationFontSize = Number(e.target.value);
    updatePreview(_settings);
  });

  // Color picker preview
  $('translationColor').addEventListener('input', (e) => {
    _settings.translationColor = e.target.value;
    updatePreview(_settings);
  });

  // Save button
  $('saveBtn').addEventListener('click', async () => {
    collectFormValues();
    await saveSettings(_settings);
    showBanner();
    notifyAllTabs(_settings);
  });

  // Reset button
  $('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset all settings to defaults?')) return;
    _settings = { ...DEFAULT_SETTINGS };
    await saveSettings(_settings);
    renderSettings(_settings);
    showBanner();
  });
}

function collectFormValues() {
  _settings.sourceLang = $('sourceLang').value;
  _settings.targetLang = $('targetLang').value;
  _settings.pdfEnabled = $('pdfEnabled').checked;
  _settings.subtitleEnabled = $('subtitleEnabled').checked;
  _settings.showOriginal = $('showOriginal').checked;
  _settings.translationPosition = $('translationPosition').value;
  _settings.engine = $('engine').value;
  _settings.deeplApiKey = $('deeplApiKey').value.trim();
  _settings.deeplIsPro = $('deeplIsPro').checked;
  _settings.openaiApiKey = $('openaiApiKey').value.trim();
  _settings.openaiModel = $('openaiModel').value;
  _settings.geminiApiKey = $('geminiApiKey').value.trim();
  _settings.geminiModel = $('geminiModel').value;
  _settings.translationColor = $('translationColor').value;
  _settings.translationFontSize = Number($('translationFontSize').value);
}

// ─── Banner ───────────────────────────────────────────────────────────────────

let _bannerTimer = null;
function showBanner() {
  const banner = $('save-banner');
  banner.classList.remove('hidden');
  if (_bannerTimer) clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(() => banner.classList.add('hidden'), 2500);
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => resolve({ ...DEFAULT_SETTINGS, ...data }));
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}

// ─── Notify tabs ──────────────────────────────────────────────────────────────

function notifyAllTabs(settings) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings,
      }).catch(() => { /* tab may not have content script */ });
    });
  });
}
