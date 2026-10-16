import { PAGE_COPY } from './page-copy.js?v=founding-20261016';
import { GALLERY_EN } from './gallery-translations.js?v=founding-20261016';

const STORAGE_KEY = 'vovsmart-display-language';
let language = 'en';
try {
  const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
  if (saved === 'vi') language = 'vi';
} catch { /* English remains the default when storage is unavailable. */ }

export function getLanguage() { return language; }

export function t(message, parameters = {}) {
  let template = language === 'en' ? GALLERY_EN[message] ?? message : message;
  if (language === 'en' && parameters.count === 1) {
    template = template.replace('{count} photos', '{count} photo');
  }
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.hasOwn(parameters, key) ? String(parameters[key]) : match);
}

export function pageText(key) {
  return PAGE_COPY[key]?.[language] ?? PAGE_COPY[key]?.en ?? key;
}

function translatePage() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = pageText(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(node => {
    // HTML comes only from our versioned, locally authored translation dictionary.
    node.innerHTML = pageText(node.dataset.i18nHtml);
  });
  for (const attribute of ['aria-label', 'placeholder', 'alt', 'content']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(node => {
      node.setAttribute(attribute, pageText(node.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  document.querySelectorAll('[data-language]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  });
  const menu = document.getElementById('menu-toggle');
  if (menu) menu.setAttribute('aria-label', pageText(menu.getAttribute('aria-expanded') === 'true' ? 'nav.close' : 'nav.open'));
}

export function setLanguage(value) {
  if (!['en', 'vi'].includes(value)) return;
  language = value;
  try { globalThis.localStorage?.setItem(STORAGE_KEY, value); } catch { /* The switch still works without storage. */ }
  translatePage();
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
  }
}

export function initLanguage() {
  translatePage();
  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.language));
  });
}
