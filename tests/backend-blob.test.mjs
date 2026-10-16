import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BlobPreconditionFailedError } from '@vercel/blob';
import { createAdminHandler, createCatalogHandler } from '../lib/media-api.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const secret = 'test-admin-key-with-more-than-32-characters';
const token = 'test-blob-token-that-must-not-be-returned';
const env = { MEDIA_ADMIN_KEY: secret, BLOB_READ_WRITE_TOKEN: token };
const revision = '"abc123-etag"';
const newEntry = { src: 'https://images.example.com/2010.jpg', title: 'Giao lưu', title_en: 'Connection', year: 2026, category: 'Giao lưu kết nối' };

function mockBlob() {
  let entries = structuredClone(catalog), etag = revision, counter = 0, conflict = false;
  const calls = [];
  const blobClient = {
    BlobPreconditionFailedError,
    async get(path, options) {
      calls.push({ method: 'get', path, options });
      const data = JSON.stringify(entries);
      return { statusCode: 200, stream: new Response(data).body, blob: { etag, size: Buffer.byteLength(data) } };
    },
    async put(path, content, options) {
      calls.push({ method: 'put', path, options });
      if (conflict || options.ifMatch !== etag) throw new BlobPreconditionFailedError();
      entries = JSON.parse(content);
      etag = `"etag-${++counter}"`;
      return { etag, pathname: path };
    }
  };
  return { blobClient, calls, conflict() { conflict = true; }, get entries() { return entries; } };
}
async function invoke(handler, { method = 'GET', body, headers = {} } = {}) {
  const req = { method, body, headers: { host: 'media.example.com', authorization: `Bearer ${secret}`, 'content-type': 'application/json', ...headers } };
  const response = { headers: {} };
  const res = { setHeader(name, value) { response.headers[name] = value; }, end(raw) { response.status = this.statusCode; response.body = JSON.parse(raw); assert.ok(!raw.includes(secret)); assert.ok(!raw.includes(token)); } };
  await handler(req, res);
  assert.equal(response.headers['Cache-Control'], 'no-store, max-age=0');
  return response;
}

test('Blob takes precedence and reads private canonical catalog freshly without exposing metadata or token', async () => {
  const blob = mockBlob();
  const handler = createCatalogHandler({
    env: { ...env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_TOKEN: 'unused' }, blobClient: blob.blobClient,
    fetchImpl: () => { throw new Error('GitHub must not be called'); },
    readBundled: () => { throw new Error('Bundled catalog must not be called'); }
  });
  const result = await invoke(handler, { headers: { authorization: '' } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { entries: catalog, revision, storage: 'blob' });
  assert.equal(blob.calls[0].path, 'media/catalog.json');
  assert.equal(blob.calls[0].options.access, 'private');
  assert.equal(blob.calls[0].options.useCache, false);
  assert.equal(blob.calls[0].options.token, token);
  assert.ok(blob.calls[0].options.abortSignal instanceof AbortSignal);
});

test('Blob CRUD persists all originals and uses atomic ETag overwrite on a deterministic private path', async () => {
  const blob = mockBlob();
  const handler = createAdminHandler({ env, blobClient: blob.blobClient, createId: () => 'blob-created-photo' });
  const created = await invoke(handler, { method: 'POST', body: { entry: newEntry, revision } });
  assert.equal(created.status, 201);
  assert.equal(created.body.entry.year, 2026);
  assert.equal(created.body.entry.location, '');
  assert.deepEqual(created.body.entries.slice(0, 68), catalog);
  const edited = await invoke(handler, { method: 'PATCH', body: { id: 'blob-created-photo', entry: { year: null }, revision: created.body.revision } });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.entry.year, null);
  const deleted = await invoke(handler, { method: 'DELETE', body: { id: 'blob-created-photo', revision: edited.body.revision } });
  assert.equal(deleted.status, 200);
  assert.deepEqual(blob.entries, catalog);
  const writes = blob.calls.filter(call => call.method === 'put');
  assert.equal(writes.length, 3);
  for (const call of writes) {
    assert.equal(call.path, 'media/catalog.json');
    assert.equal(call.options.access, 'private');
    assert.equal(call.options.allowOverwrite, true);
    assert.equal(call.options.addRandomSuffix, false);
    assert.equal(call.options.contentType, 'application/json');
    assert.match(call.options.ifMatch, /^".+"$/);
  }
  assert.equal(writes[0].options.ifMatch, revision);
});

test('Blob authentication rejects unauthorized changes before accessing the store', async () => {
  const blob = mockBlob();
  const handler = createAdminHandler({ env, blobClient: blob.blobClient });
  const result = await invoke(handler, { method: 'POST', body: { entry: newEntry, revision }, headers: { authorization: 'Bearer wrong' } });
  assert.equal(result.status, 401);
  assert.equal(blob.calls.length, 0);
});

test('Blob stale revision and conditional-write races both fail with 409 without data loss', async () => {
  const blob = mockBlob();
  const handler = createAdminHandler({ env, blobClient: blob.blobClient });
  const stale = await invoke(handler, { method: 'DELETE', body: { id: catalog[0].id, revision: '"stale-etag"' } });
  assert.equal(stale.status, 409);
  assert.equal(blob.calls.filter(call => call.method === 'put').length, 0);
  blob.conflict();
  const race = await invoke(handler, { method: 'DELETE', body: { id: catalog[0].id, revision } });
  assert.equal(race.status, 409);
  assert.equal(race.body.error.code, 'revision_conflict');
  assert.deepEqual(blob.entries, catalog);
});

test('Missing, malformed and unreachable Blob catalogs fail closed with no auto-seed or fallback', async () => {
  const cases = [
    [async () => null, 503],
    [async () => { throw new Error(`${token} ${secret}`); }, 502],
    [async () => ({ statusCode: 304, stream: null, blob: { etag: revision } }), 502],
    [async () => ({ statusCode: 200, stream: new Response('{bad').body, blob: { etag: revision, size: 4 } }), 502],
    [async () => ({ statusCode: 200, stream: new Response('[]').body, blob: { etag: '*', size: 2 } }), 502],
    [async () => ({ statusCode: 200, stream: new Response('[]').body, blob: { etag: revision, size: 2 * 1024 * 1024 } }), 502]
  ];
  for (const [get, status] of cases) {
    const handler = createCatalogHandler({ env, blobClient: { get, put() { throw new Error('Must not auto-seed'); } }, readBundled() { throw new Error('No fallback allowed'); } });
    const result = await invoke(handler);
    assert.equal(result.status, status);
  }
});

test('Blob write errors are sanitized and a missing ETag is never accepted as a confirmed save', async () => {
  for (const put of [async () => { throw new Error(`${token} ${secret}`); }, async () => ({ url: 'https://private.example/catalog.json' })]) {
    const blob = mockBlob();
    const handler = createAdminHandler({ env, blobClient: { ...blob.blobClient, put } });
    const result = await invoke(handler, { method: 'PATCH', body: { id: catalog[0].id, revision, entry: { title_en: 'Updated' } } });
    assert.equal(result.status, 502);
    assert.equal(result.body.error.code, 'upstream_error');
  }
});

test('Blob store-id mode delegates OIDC token resolution to SDK, while explicit RW token wins', async () => {
  const blob = mockBlob();
  const storeId = 'store_test';
  const oidcEnv = { MEDIA_ADMIN_KEY: secret, BLOB_STORE_ID: storeId, VERCEL_OIDC_TOKEN: 'unused-by-adapter' };
  assert.equal((await invoke(createCatalogHandler({ env: oidcEnv, blobClient: blob.blobClient }))).status, 200);
  assert.equal(blob.calls[0].options.storeId, storeId);
  assert.equal(blob.calls[0].options.token, undefined);
  assert.equal(blob.calls[0].options.oidcToken, undefined);
  assert.equal((await invoke(createCatalogHandler({ env: { ...oidcEnv, BLOB_READ_WRITE_TOKEN: token }, blobClient: blob.blobClient }))).status, 200);
  assert.equal(blob.calls[1].options.token, token);
  assert.equal(blob.calls[1].options.oidcToken, undefined);
});

test('ETag validation rejects wildcards and injected header lines before accessing Blob', async () => {
  const blob = mockBlob();
  const handler = createAdminHandler({ env, blobClient: blob.blobClient });
  for (const invalid of ['*', '"*"', '"etag"\r\nAuthorization: secret', '', 'W/"weak-etag"']) {
    const result = await invoke(handler, { method: 'DELETE', body: { id: catalog[0].id, revision: invalid } });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, 'revision_required');
  }
  assert.equal(blob.calls.length, 0);
});
