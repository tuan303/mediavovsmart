import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { createAdminHandler, createCatalogHandler, createCatalogStore } from '../lib/media-api.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const secret = 'test-admin-key-with-more-than-32-characters';
const githubToken = 'test-private-github-token-must-never-be-returned';
const revision = 'a'.repeat(40);
const env = { MEDIA_ADMIN_KEY: secret, GITHUB_REPOSITORY: 'sample/media', GITHUB_TOKEN: githubToken, GITHUB_BRANCH: 'media' };
const newEntry = { src: 'https://images.example.com/2007%20office.jpg', title: 'Đối tác đến thăm', title_en: 'Partner visit', location: 'Văn phòng', location_en: 'Office', year: 2026, category: 'Dấu ấn VOVSMART' };

function mockGitHub(initial = catalog) {
  let entries = structuredClone(initial), sha = revision;
  const calls = [];
  let forceConflict = false;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    assert.equal(new URL(url).host, 'api.github.com', 'Only the GitHub API is accessed, not user image URLs');
    assert.equal(options.headers.Authorization, `Bearer ${githubToken}`);
    assert.equal(options.headers['X-GitHub-Api-Version'], '2026-03-10');
    assert.equal(options.redirect, 'error');
    if (options.method === 'GET') {
      assert.equal(new URL(url).searchParams.get('ref'), 'media');
      const data = JSON.stringify(entries);
      return new Response(JSON.stringify({ encoding: 'base64', content: Buffer.from(data).toString('base64'), sha, size: Buffer.byteLength(data) }));
    }
    const payload = JSON.parse(options.body);
    assert.equal(payload.branch, 'media');
    if (forceConflict || payload.sha !== sha) return new Response(JSON.stringify({ message: `Conflict ${githubToken}` }), { status: 409 });
    entries = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
    sha = (sha === revision ? 'b' : 'c').repeat(40);
    return new Response(JSON.stringify({ content: { sha } }));
  };
  return { fetchImpl, calls, get entries() { return entries; }, get sha() { return sha; }, conflict() { forceConflict = true; } };
}
async function invoke(handler, { method = 'GET', body, headers = {}, stream } = {}) {
  const req = stream ? Readable.from(stream) : {};
  Object.assign(req, { method, headers: { host: 'media.example.com', authorization: `Bearer ${secret}`, 'content-type': 'application/json', ...headers } });
  if (body !== undefined) req.body = body;
  const result = { headers: {} };
  const res = { setHeader(name, value) { result.headers[name] = value; }, end(value) { result.status = this.statusCode; result.raw = value; result.body = JSON.parse(value); } };
  await handler(req, res);
  assert.equal(result.headers['Cache-Control'], 'no-store, max-age=0');
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
  assert.ok(!result.raw.includes(secret));
  assert.ok(!result.raw.includes(githubToken));
  return result;
}

test('bundled public catalog preserves all 68 original records and is read-only', async () => {
  const publicResponse = await invoke(createCatalogHandler({ env: {} }));
  assert.equal(publicResponse.status, 200);
  assert.deepEqual(publicResponse.body, { entries: catalog, revision: null, storage: 'bundled' });
  assert.equal(publicResponse.body.entries.length, 68);
  const adminResponse = await invoke(createAdminHandler({ env: { MEDIA_ADMIN_KEY: secret } }));
  assert.equal(adminResponse.status, 503);
  assert.equal(adminResponse.body.error.code, 'storage_not_configured');
});

test('public and authenticated GET read latest GitHub catalog without mutation', async () => {
  const github = mockGitHub();
  const options = { env, fetchImpl: github.fetchImpl };
  const publicResponse = await invoke(createCatalogHandler(options), { headers: { authorization: '' } });
  const adminResponse = await invoke(createAdminHandler(options));
  assert.equal(publicResponse.status, 200);
  assert.equal(adminResponse.status, 200);
  assert.deepEqual(adminResponse.body, publicResponse.body);
  assert.equal(adminResponse.body.storage, 'github');
  assert.equal(adminResponse.body.revision, revision);
  assert.deepEqual(github.calls.map(call => call.options.method), ['GET', 'GET']);
});

test('authenticated create, partial edit, explicit undated assignment and delete persist to GitHub', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl, createId: () => 'new-photo-id' });
  const created = await invoke(handler, { method: 'POST', body: { entry: newEntry, revision } });
  assert.equal(created.status, 201);
  assert.equal(created.body.entries.length, 69);
  assert.equal(created.body.entry.id, 'new-photo-id');
  assert.equal(created.body.entry.year, 2026, 'Explicit year overrides the 2007 filename');
  assert.equal(created.body.entry.downloadSrc, newEntry.src);
  assert.equal(created.body.entry.sourceUrl, newEntry.src);
  assert.equal(created.body.entry.filename, '2007 office.jpg');
  assert.deepEqual(created.body.entries.slice(0, 68), catalog, 'Existing photos remain byte-for-byte equivalent in JSON');
  const edited = await invoke(handler, { method: 'PATCH', body: { id: 'new-photo-id', revision: created.body.revision, entry: { title_en: 'Office visit', year: null } } });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.entry.year, null);
  assert.equal(edited.body.entry.title_en, 'Office visit');
  assert.equal(edited.body.entry.src, newEntry.src);
  const deleted = await invoke(handler, { method: 'DELETE', body: { id: 'new-photo-id', revision: edited.body.revision } });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.deletedId, 'new-photo-id');
  assert.deepEqual(github.entries, catalog);
  assert.equal(github.calls.filter(call => call.options.method === 'PUT').length, 3);
});

test('title-only edits preserve local preview, download original, metadata and explicit year', async () => {
  const github = mockGitHub();
  const original = catalog.find(entry => entry.originalFormat);
  assert.ok(original);
  const result = await invoke(createAdminHandler({ env, fetchImpl: github.fetchImpl }), { method: 'PATCH', body: { id: original.id, revision, entry: { title: 'Tiêu đề mới', title_en: 'Updated title' } } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.entry, { ...original, title: 'Tiêu đề mới', title_en: 'Updated title' });
});

test('replacing a preview source updates related URLs and discards obsolete source metadata', async () => {
  const github = mockGitHub();
  const original = catalog.find(entry => entry.originalFormat);
  const result = await invoke(createAdminHandler({ env, fetchImpl: github.fetchImpl }), { method: 'PATCH', body: { id: original.id, revision, entry: { src: 'https://images.example.com/replacement.jpg' } } });
  assert.equal(result.status, 200);
  assert.equal(result.body.entry.src, result.body.entry.sourceUrl);
  assert.equal(result.body.entry.src, result.body.entry.downloadSrc);
  assert.equal(result.body.entry.originalFormat, undefined);
  assert.equal(result.body.entry.sourceBytes, undefined);
  assert.match(result.body.entry.sourceNotice, /bổ sung từ liên kết/);
  assert.match(result.body.entry.sourceNotice_en, /added by the administrator from a link/);
  assert.doesNotMatch(result.body.entry.sourceNotice_en, /RAW|embedded|filenames/i);
});

test('changing an existing year replaces filename dating claims and preserves title-only provenance', async () => {
  const github = mockGitHub();
  const original = catalog[0];
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl });
  const titleOnly = await invoke(handler, { method: 'PATCH', body: { id: original.id, revision, entry: { title: 'Tiêu đề mới', title_en: 'Updated title' } } });
  assert.equal(titleOnly.body.entry.sourceNotice, original.sourceNotice);
  assert.equal(titleOnly.body.entry.sourceNotice_en, original.sourceNotice_en);
  const dated = await invoke(handler, { method: 'PATCH', body: { id: original.id, revision: titleOnly.body.revision, entry: { year: 2024 } } });
  assert.equal(dated.status, 200);
  assert.match(dated.body.entry.sourceNotice, /2024 do quản trị viên gán/);
  assert.match(dated.body.entry.sourceNotice_en, /year 2024 was assigned by the administrator/);
  assert.doesNotMatch(dated.body.entry.sourceNotice_en, /filenames/);
  const undated = await invoke(handler, { method: 'PATCH', body: { id: original.id, revision: dated.body.revision, entry: { year: null } } });
  assert.equal(undated.status, 200);
  assert.match(undated.body.entry.sourceNotice, /Chưa gán năm/);
  assert.match(undated.body.entry.sourceNotice_en, /No year has been assigned/);
  assert.doesNotMatch(undated.body.entry.sourceNotice_en, /2024|filenames/);
});

test('deliberately supplied bilingual provenance notices take precedence over regenerated text', async () => {
  const github = mockGitHub();
  const custom = { sourceNotice: 'Thông tin đã được xác minh.', sourceNotice_en: 'Information has been verified.' };
  const result = await invoke(createAdminHandler({ env, fetchImpl: github.fetchImpl }), { method: 'PATCH', body: { id: catalog[0].id, revision, entry: { year: 2023, src: 'https://images.example.com/new.jpg', ...custom } } });
  assert.equal(result.status, 200);
  assert.equal(result.body.entry.sourceNotice, custom.sourceNotice);
  assert.equal(result.body.entry.sourceNotice_en, custom.sourceNotice_en);
});

test('invalid keys and an unconfigured short admin key never touch storage', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl });
  for (const authorization of ['', 'Basic abc', 'Bearer wrong-key', `Bearer ${secret}x`]) {
    const result = await invoke(handler, { headers: { authorization } });
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, 'unauthorized');
  }
  const short = await invoke(createAdminHandler({ env: { ...env, MEDIA_ADMIN_KEY: 'too-short' }, fetchImpl: github.fetchImpl }));
  assert.equal(short.status, 503);
  assert.equal(short.body.error.code, 'admin_not_configured');
  assert.equal(github.calls.length, 0);
});

test('cross-origin browser writes denied, explicit proxy origin and same host accepted', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env: { ...env, MEDIA_ALLOWED_ORIGINS: 'https://vovsmart.net,https://www.vovsmart.net' }, fetchImpl: github.fetchImpl });
  for (const origin of ['https://attacker.example', 'null', 'https://media.example.com/path', 'http://media.example.com']) {
    const denied = await invoke(handler, { headers: { origin } });
    assert.equal(denied.status, 403);
  }
  assert.equal(github.calls.length, 0);
  for (const origin of ['https://media.example.com', 'https://vovsmart.net']) {
    assert.equal((await invoke(handler, { headers: { origin } })).status, 200);
  }
});

test('invalid links, date/category/title and id mutation are rejected without PUT', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl });
  const changes = [
    { src: 'http://images.example.com/a.jpg' }, { src: 'javascript:alert(1)' },
    { src: 'data:image/png;base64,aaaa' }, { src: 'https://user:password@example.com/a.jpg' },
    { src: 'assets/photos/new-local.jpg' }, { year: '2026' }, { year: 1899 }, { year: 2101 },
    { year: 2020.5 }, { category: 'unlisted' }, { title_en: '' }, { title: '' }, { id: 'custom-id' }
  ];
  for (const change of changes) {
    const result = await invoke(handler, { method: 'POST', body: { revision, entry: { ...newEntry, ...change } } });
    assert.equal(result.status, 400, JSON.stringify(change));
    assert.equal(result.body.error.code, 'invalid_entry');
  }
  const missingYear = { ...newEntry }; delete missingYear.year;
  assert.equal((await invoke(handler, { method: 'POST', body: { revision, entry: missingYear } })).status, 400);
  const modifiedId = await invoke(handler, { method: 'PATCH', body: { revision, id: catalog[0].id, entry: { id: 'changed' } } });
  assert.equal(modifiedId.status, 400);
  const localSwap = await invoke(handler, { method: 'PATCH', body: { revision, id: catalog[0].id, entry: { src: 'assets/photos/2025-bosch-camera-preview.jpg' } } });
  assert.equal(localSwap.status, 400);
  assert.equal(github.calls.filter(call => call.options.method === 'PUT').length, 0);
});

test('stale SHA before save and concurrent GitHub conflict both return 409', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl });
  const stale = await invoke(handler, { method: 'POST', body: { revision: 'f'.repeat(40), entry: newEntry } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error.code, 'revision_conflict');
  assert.equal(github.calls.length, 1);
  github.conflict();
  const race = await invoke(handler, { method: 'DELETE', body: { revision, id: catalog[0].id } });
  assert.equal(race.status, 409);
  assert.equal(race.body.error.code, 'revision_conflict');
  assert.deepEqual(github.entries, catalog);
});

test('upstream failure returns a sanitized error and never falls back to bundled data', async () => {
  for (const fetchImpl of [
    async () => { throw new Error(`Network failure ${githubToken} ${secret}`); },
    async () => new Response(JSON.stringify({ message: `${githubToken} ${secret}` }), { status: 403 }),
    async () => new Response('{invalid json'),
    async () => new Response(JSON.stringify({ encoding: 'base64', sha: revision, content: Buffer.from('{bad catalog').toString('base64') }))
  ]) {
    let readBundledCalls = 0;
    const handler = createCatalogHandler({ env, fetchImpl, readBundled: async () => { readBundledCalls++; return JSON.stringify(catalog); } });
    const response = await invoke(handler);
    assert.equal(response.status, 502);
    assert.equal(response.body.error.code, 'upstream_error');
    assert.equal(readBundledCalls, 0);
  }
  const partial = await invoke(createCatalogHandler({ env: { GITHUB_REPOSITORY: 'sample/media' } }));
  assert.equal(partial.status, 503);
});

test('write content type, JSON syntax, size and revision are enforced before mutation', async () => {
  const github = mockGitHub();
  const handler = createAdminHandler({ env, fetchImpl: github.fetchImpl });
  const cases = [
    [{ body: { revision, entry: newEntry }, headers: { 'content-type': 'text/plain' } }, 415],
    [{ body: '{' }, 400],
    [{ body: { entry: newEntry } }, 400],
    [{ body: { revision, entry: { ...newEntry, title: 'a'.repeat(66000) } } }, 413],
    [{ body: '{}', headers: { 'content-length': '70000' } }, 413],
    [{ stream: ['a'.repeat(33000), 'a'.repeat(33000)] }, 413]
  ];
  for (const [options, status] of cases) assert.equal((await invoke(handler, { method: 'POST', ...options })).status, status);
  assert.equal(github.calls.length, 0);
});

test('missing media and unsupported methods never mutate catalog', async () => {
  const github = mockGitHub();
  const options = { env, fetchImpl: github.fetchImpl };
  const admin = createAdminHandler(options);
  assert.equal((await invoke(admin, { method: 'DELETE', body: { revision, id: 'no-longer-present' } })).status, 404);
  const unsupported = await invoke(admin, { method: 'OPTIONS' });
  assert.equal(unsupported.status, 405);
  assert.equal(unsupported.headers.Allow, 'GET, POST, PATCH, DELETE');
  assert.equal((await invoke(createCatalogHandler(options), { method: 'POST' })).status, 405);
  assert.equal(github.calls.filter(call => call.options.method === 'PUT').length, 0);
});

test('default branch is main; provider PUT errors do not expose upstream response', async () => {
  const localEnv = { ...env }; delete localEnv.GITHUB_BRANCH;
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    if (options.method === 'GET') {
      assert.equal(new URL(url).searchParams.get('ref'), 'main');
      return new Response(JSON.stringify({ encoding: 'base64', content: Buffer.from(JSON.stringify(catalog)).toString('base64'), sha: revision }));
    }
    assert.equal(JSON.parse(options.body).branch, 'main');
    return new Response(`${secret} ${githubToken}`, { status: 500 });
  };
  const result = await invoke(createAdminHandler({ env: localEnv, fetchImpl }), { method: 'POST', body: { revision, entry: newEntry } });
  assert.equal(result.status, 502);
  assert.equal(result.body.error.code, 'upstream_error');
  assert.equal(calls, 2);
});

test('catalog store has no secret-bearing fields in its public return value', async () => {
  const github = mockGitHub();
  const result = await createCatalogStore({ env, fetchImpl: github.fetchImpl }).read();
  assert.deepEqual(Object.keys(result).sort(), ['entries', 'revision', 'storage']);
});
