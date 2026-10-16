import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { createAdminHandler } from '../lib/media-api.js';

const html = await readFile(new URL('../public/media/admin/index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../public/media/admin/admin.js', import.meta.url), 'utf8');
const originalCatalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const adminKey = 'admin-ui-test-key-at-least-32-characters';
const githubToken = 'github-server-token-never-exposed-to-the-browser';
const imageUrl = 'https://images.example.com/2007%20partner-visit.jpg';

async function eventually(check, description = 'Expected UI state') {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(check(), description);
}

function fixture() {
  const dom = new JSDOM(html, { url: 'https://media.example.com/media/admin/', runScripts: 'outside-only' });
  const { window } = dom;
  const $ = (id) => window.document.getElementById(id);
  let entries = structuredClone(originalCatalog), generation = 1, idCounter = 0, pauseNext = null;
  const revision = () => generation.toString(16).padStart(40, '0');
  const githubCalls = [], apiCalls = [], imageRequests = [];

  // The real handlers run against an in-memory GitHub Contents transport. No network is used.
  const handler = createAdminHandler({
    env: { MEDIA_ADMIN_KEY: adminKey, GITHUB_TOKEN: githubToken, GITHUB_REPOSITORY: 'test/media', GITHUB_BRANCH: 'main' },
    createId: () => `new-image-${++idCounter}`,
    fetchImpl: async (url, options) => {
      assert.equal(new URL(url).host, 'api.github.com');
      githubCalls.push({ url, method: options.method });
      if (options.method === 'GET') {
        const content = JSON.stringify(entries);
        return new Response(JSON.stringify({ sha: revision(), encoding: 'base64', content: Buffer.from(content).toString('base64'), size: Buffer.byteLength(content) }));
      }
      const body = JSON.parse(options.body);
      if (body.sha !== revision()) return new Response(JSON.stringify({ message: 'Conflict' }), { status: 409 });
      entries = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      generation++;
      return new Response(JSON.stringify({ content: { sha: revision() } }));
    }
  });
  window.fetch = async (url, options) => {
    assert.equal(url, '/media/api/admin');
    apiCalls.push({ method: options.method, headers: { ...options.headers }, body: options.body ? JSON.parse(options.body) : undefined });
    if (pauseNext) { const pending = pauseNext; pauseNext = null; await pending; }
    const headers = { host: 'media.example.com', origin: 'https://media.example.com' };
    for (const [key, value] of Object.entries(options.headers)) headers[key.toLowerCase()] = value;
    let status, responseBody;
    await handler({ method: options.method, headers, body: options.body ? JSON.parse(options.body) : undefined }, {
      setHeader() {}, end(body) { status = this.statusCode; responseBody = body; }
    });
    assert.ok(!responseBody.includes(githubToken));
    return new Response(responseBody, { status, headers: { 'Content-Type': 'application/json' } });
  };
  window.Image = class {
    naturalWidth = 0;
    set src(value) {
      imageRequests.push(value);
      window.queueMicrotask(() => {
        if (value.includes('broken')) this.onerror?.();
        else { this.naturalWidth = 1600; this.onload?.(); }
      });
    }
  };
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.eval(script);
  const submit = (id) => $(id).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  const change = (id, value) => { $(id).value = value; $(id).dispatchEvent(new window.Event('change', { bubbles: true })); };
  const input = (id, value) => { $(id).value = value; $(id).dispatchEvent(new window.Event('input', { bubbles: true })); };
  const settle = () => eventually(() => $('media-form').getAttribute('aria-busy') !== 'true');
  const login = async () => { $('access-key').value = adminKey; submit('login-form'); await eventually(() => !$('dashboard').hidden); await settle(); };
  const findRow = (title) => [...window.document.querySelectorAll('.media-row')].find((row) => row.querySelector('h2').textContent === title);
  const edit = (title) => { const row = findRow(title); assert.ok(row, `Photo row exists: ${title}`); row.querySelector('button').click(); };
  const fillNew = ({ year = 2028, src = imageUrl, title = 'Partner visit', titleVi = 'Đối tác đến thăm' } = {}) => {
    $('add-media').click(); $('image-url').value = src; $('title-en').value = title; $('title-vi').value = titleVi;
    $('location-en').value = 'VOVSMART office'; $('location-vi').value = 'Văn phòng VOVSMART'; $('media-year').value = year;
  };
  return {
    dom, window, $, submit, change, input, settle, login, edit, fillNew, findRow, apiCalls, githubCalls, imageRequests,
    get entries() { return structuredClone(entries); },
    get revision() { return revision(); },
    externalUpdate(update) { update(entries); generation++; },
    pauseNextRequest() { let release; pauseNext = new Promise((resolve) => { release = resolve; }); return release; },
    close() { window.close(); }
  };
}

test('admin: invalid key is rejected, valid login lists all 68 media, and keys stay out of browser storage', async (context) => {
  const ui = fixture(); context.after(() => ui.close());
  assert.equal(ui.window.document.documentElement.lang, 'en');
  assert.equal(ui.$('dashboard').hidden, true);
  ui.$('access-key').value = 'wrong-key'; ui.submit('login-form'); await ui.settle();
  assert.equal(ui.$('login-error').hidden, false);
  assert.match(ui.$('login-error').textContent, /access key is not valid/);
  assert.equal(ui.$('access-key').value, '');
  assert.equal(ui.githubCalls.length, 0, 'Rejected logins never access shared storage');
  await ui.login();
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 68);
  assert.equal(ui.$('total-count').textContent, '68');
  assert.equal(ui.$('login-panel').hidden, true);
  assert.equal(ui.$('access-key').value, '');
  assert.equal(ui.window.localStorage.length, 0);
  assert.equal(ui.window.sessionStorage.length, 0);
  assert.ok(!ui.window.document.documentElement.outerHTML.includes(adminKey));
  assert.ok(!ui.window.location.href.includes(adminKey));
  ui.$('logout').click();
  assert.equal(ui.$('dashboard').hidden, true);
  assert.equal(ui.$('media-list').children.length, 0);
  assert.equal(ui.$('access-key').value, '');
  ui.$('access-key').value = 'bad-after-logout'; ui.submit('login-form'); await ui.settle();
  assert.equal(ui.apiCalls.at(-1).headers.Authorization, 'Bearer bad-after-logout', 'Old key is not reused');
  assert.equal(ui.$('dashboard').hidden, true);
});

test('admin: add HTTPS media with explicit year, edit to undated then another year, and confirm deletion', async (context) => {
  const ui = fixture(); context.after(() => ui.close()); await ui.login();
  ui.fillNew();
  const release = ui.pauseNextRequest();
  ui.submit('media-form');
  assert.equal(ui.$('save-media').disabled, true);
  assert.equal(ui.$('image-url').disabled, true);
  await eventually(() => ui.apiCalls.some((call) => call.method === 'POST'));
  assert.equal(ui.$('editor-dialog').open, true, 'Editor stays open until the server confirms persistence');
  release(); await ui.settle();
  assert.equal(ui.$('editor-dialog').open, false);
  assert.equal(ui.entries.length, 69);
  let entry = ui.entries.find((item) => item.id === 'new-image-1');
  assert.equal(entry.year, 2028, 'Selected year overrides the 2007 image filename');
  assert.equal(entry.src, imageUrl);
  assert.equal(entry.location_en, 'VOVSMART office');
  assert.equal(ui.imageRequests.includes(imageUrl), true);
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 69);
  assert.equal(ui.apiCalls.find((call) => call.method === 'POST').body.entry.id, undefined, 'Server generates IDs');
  ui.edit('Partner visit');
  ui.$('no-year').checked = true; ui.$('no-year').dispatchEvent(new ui.window.Event('change'));
  assert.equal(ui.$('media-year').disabled, true);
  assert.equal(ui.$('media-category').value, 'Giao lưu kết nối');
  ui.$('title-en').value = 'Visiting our team'; ui.submit('media-form'); await ui.settle();
  entry = ui.entries.find((item) => item.id === 'new-image-1');
  assert.equal(entry.year, null); assert.equal(entry.title_en, 'Visiting our team');
  assert.equal(ui.apiCalls.at(-1).body.entry.sourceNotice, undefined, 'Backend controls year/source provenance');
  assert.match(entry.sourceNotice_en, /No year has been assigned/);
  ui.change('filter-year', 'none');
  assert.ok(ui.findRow('Visiting our team'));
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 6);
  ui.edit('Visiting our team');
  ui.$('no-year').checked = false; ui.$('no-year').dispatchEvent(new ui.window.Event('change'));
  ui.$('media-year').value = '2024'; ui.submit('media-form'); await ui.settle();
  assert.equal(ui.entries.find((item) => item.id === 'new-image-1').year, 2024);
  ui.change('filter-year', '2024');
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 1);
  const deletesBefore = ui.apiCalls.filter((call) => call.method === 'DELETE').length;
  ui.findRow('Visiting our team').querySelector('.delete-action').click();
  assert.equal(ui.$('delete-dialog').open, true);
  assert.equal(ui.$('delete-name').textContent, 'Visiting our team');
  assert.equal(ui.apiCalls.filter((call) => call.method === 'DELETE').length, deletesBefore, 'Opening confirmation does not delete');
  ui.$('cancel-delete').click();
  assert.equal(ui.entries.length, 69);
  ui.findRow('Visiting our team').querySelector('.delete-action').click();
  ui.$('confirm-delete').click(); await ui.settle();
  assert.equal(ui.entries.length, 68);
  assert.deepEqual(ui.entries, originalCatalog, 'All original records survive create/edit/delete unchanged');
  assert.equal(ui.$('delete-dialog').open, false);
});

test('admin: language switches preserve unsaved fields, search works in both languages, and discard is explicit', async (context) => {
  const ui = fixture(); context.after(() => ui.close()); await ui.login();
  ui.input('search-media', 'đối tác đến tham quan');
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 1);
  ui.window.document.querySelector('[data-lang="vi"]').click();
  assert.equal(ui.window.document.documentElement.lang, 'vi');
  assert.equal(ui.$('search-media').value, 'đối tác đến tham quan');
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 1);
  ui.input('search-media', 'Partner visit and meetings');
  assert.equal(ui.window.document.querySelectorAll('.media-row').length, 1, 'English search also works while displaying Vietnamese');
  ui.fillNew({ title: 'Unsaved English title', titleVi: 'Tiêu đề chưa lưu' });
  ui.$('media-category').value = 'Khác';
  ui.window.document.querySelector('[data-lang="en"]').click();
  assert.equal(ui.$('title-en').value, 'Unsaved English title');
  assert.equal(ui.$('title-vi').value, 'Tiêu đề chưa lưu');
  assert.equal(ui.$('image-url').value, imageUrl);
  assert.equal(ui.$('media-year').value, '2028');
  assert.equal(ui.$('media-category').value, 'Khác');
  assert.equal(ui.window.localStorage.getItem('vovsmart-display-language'), 'en');
  assert.equal(ui.window.localStorage.length, 1, 'Only language preference is stored');
  ui.$('close-editor').click();
  assert.equal(ui.$('reload-dialog').open, true);
  assert.match(ui.$('reload-title').textContent, /Discard unsaved edits/);
  ui.$('cancel-reload').click();
  assert.equal(ui.$('editor-dialog').open, true);
  assert.equal(ui.$('title-en').value, 'Unsaved English title');
  ui.$('close-editor').click(); ui.$('confirm-reload').click();
  assert.equal(ui.$('editor-dialog').open, false);
  assert.equal(ui.apiCalls.filter((call) => call.method !== 'GET').length, 0);
});

test('admin: concurrent edit returns 409, preserves unsaved content, and requires confirmed reload', async (context) => {
  const ui = fixture(); context.after(() => ui.close()); await ui.login();
  const entry = originalCatalog[0];
  ui.edit(entry.title_en);
  ui.$('title-en').value = 'My unsaved version';
  const staleRevision = ui.revision;
  ui.externalUpdate((entries) => { entries[0].title_en = 'Saved in another session'; });
  ui.submit('media-form'); await ui.settle();
  assert.equal(ui.apiCalls.at(-1).body.revision, staleRevision);
  assert.equal(ui.$('editor-dialog').open, true);
  assert.equal(ui.$('title-en').value, 'My unsaved version');
  assert.equal(ui.$('editor-conflict').hidden, false);
  assert.equal(ui.$('save-media').disabled, true);
  assert.equal(ui.entries[0].title_en, 'Saved in another session');
  const requestsBeforeRetry = ui.apiCalls.length;
  ui.submit('media-form');
  assert.equal(ui.apiCalls.length, requestsBeforeRetry, 'Conflict prevents silent overwrite');
  ui.$('editor-conflict').querySelector('button').click();
  assert.equal(ui.$('reload-dialog').open, true);
  assert.equal(ui.$('title-en').value, 'My unsaved version');
  ui.$('cancel-reload').click();
  assert.equal(ui.$('title-en').value, 'My unsaved version');
  ui.$('editor-conflict').querySelector('button').click(); ui.$('confirm-reload').click(); await ui.settle();
  assert.equal(ui.$('editor-dialog').open, false);
  assert.equal(ui.$('editor-conflict').hidden, true);
  assert.ok(ui.findRow('Saved in another session'));
  ui.edit('Saved in another session');
  assert.equal(ui.$('save-media').disabled, false);
  assert.equal(ui.$('title-en').value, 'Saved in another session');
  ui.$('title-en').value = 'Merged after reload'; ui.submit('media-form'); await ui.settle();
  assert.equal(ui.entries[0].title_en, 'Merged after reload');
});

test('admin: broken/unsafe new image links are not saved and local archive previews retain original metadata', async (context) => {
  const ui = fixture(); context.after(() => ui.close()); await ui.login();
  ui.fillNew({ src: 'http://images.example.com/image.jpg' }); ui.submit('media-form'); await ui.settle();
  assert.match(ui.$('editor-error').textContent, /HTTPS image URL/);
  assert.equal(ui.apiCalls.filter((call) => call.method === 'POST').length, 0);
  ui.$('image-url').value = 'https://images.example.com/broken.jpg'; ui.submit('media-form'); await ui.settle();
  assert.match(ui.$('preview-status').textContent, /could not be loaded/);
  assert.equal(ui.apiCalls.filter((call) => call.method === 'POST').length, 0);
  ui.$('cancel-editor').click(); ui.$('confirm-reload').click();
  const original = originalCatalog.find((entry) => entry.originalFormat);
  ui.edit(original.title_en);
  await eventually(() => !ui.$('image-preview').hidden);
  assert.equal(ui.$('image-preview').src, `https://media.example.com/media/${original.src}`);
  ui.$('title-en').value = 'Updated archive caption'; ui.submit('media-form'); await ui.settle();
  assert.deepEqual(ui.entries.find((entry) => entry.id === original.id), { ...original, title_en: 'Updated archive caption' });
  const lastPatch = ui.apiCalls.at(-1).body.entry;
  assert.equal(lastPatch.downloadSrc, undefined);
  assert.equal(lastPatch.sourceUrl, undefined);
  assert.equal(lastPatch.sourceNotice, undefined);
});
