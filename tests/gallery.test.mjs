import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('public gallery shows all media, supports both languages, and respects edited years', async () => {
  const root = new URL('../', import.meta.url);
  const html = await readFile(new URL('public/media/index.html', root), 'utf8');
  const catalog = JSON.parse(await readFile(new URL('data/catalog.json', root), 'utf8'));
  const dom = new JSDOM(html, { url: 'https://www.vovsmart.net/media/' });
  const { window } = dom;
  const before = new Map();
  for (const [key, value] of Object.entries({ window, document: window.document, localStorage: window.localStorage, CustomEvent: window.CustomEvent, Event: window.Event, AbortController: window.AbortController })) {
    before.set(key, globalThis[key]);
    globalThis[key] = value;
  }
  const previousFetch = globalThis.fetch;
  let loads = 0;
  globalThis.fetch = async url => {
    assert(new URL(url).pathname.endsWith('/media/api/catalog'));
    loads++;
    return { ok: true, json: async () => ({ entries: catalog, revision: null, storage: 'bundled' }) };
  };
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new window.Event('close')); };
  try {
    const { initLanguage, setLanguage } = await import('../public/media/i18n.js?v=vercel-cms-20261016');
    const { initGallery } = await import('../public/media/gallery.js?v=vercel-cms-20261016');
    initLanguage();
    const gallery = await initGallery();
    assert.equal(loads, 1);
    assert.equal(window.document.documentElement.lang, 'en');
    assert.equal(window.document.querySelectorAll('.media-card').length, 68);
    assert.equal(gallery.state.visible, 68);
    assert.equal(window.document.querySelector('#load-more'), null);
    assert.equal(window.document.querySelector('#import-dialog'), null);
    assert.equal(window.document.querySelector('.import-trigger').href, 'https://www.vovsmart.net/media/admin/');
    gallery.setFilter('search', 'partner visit');
    assert.equal(gallery.filtered[0].id, 'r1c5');
    gallery.openLightbox('r1c5');
    setLanguage('vi');
    assert.equal(gallery.state.search, 'partner visit');
    assert.equal(gallery.state.activeId, 'r1c5');
    assert.match(window.document.querySelector('#lightbox-title').textContent, /Đối tác đến tham quan/);
    gallery.resetFilters();
    assert.equal(gallery.state.visible, 68);
    const photo = catalog.find(entry => entry.id === 'r1c5');
    assert.equal(gallery.prepareEntry({ ...photo, year: 2010 }).year, 2010);
    assert.equal(gallery.prepareEntry({ ...photo, year: null }).year, null);
    assert.equal(gallery.prepareEntry({ ...photo, year: 2100 }).year, 2100);
    gallery.catalog = gallery.catalog.map(entry => entry.id === 'r1c5' ? { ...entry, year: 2010 } : entry);
    gallery.rebuildEntries(); gallery.renderFilterOptions(); gallery.render();
    gallery.setFilter('year', '2010');
    assert.equal(gallery.state.visible, 1);
    assert.equal(gallery.filtered[0].id, 'r1c5');
    setLanguage('en');
    assert.equal(gallery.state.year, '2010');
    assert.equal(gallery.state.visible, 1);
    gallery.destroy();
  } finally {
    window.close();
    globalThis.fetch = previousFetch;
    for (const [key, value] of before) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
