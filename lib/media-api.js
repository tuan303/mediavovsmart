import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const CATALOG_FILE = new URL('../data/catalog.json', import.meta.url);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_CATALOG_BYTES = 1024 * 1024;
const EDITABLE_FIELDS = new Set(['src', 'sourceUrl', 'downloadSrc', 'title', 'title_en', 'location', 'location_en', 'year', 'category', 'filename', 'kind', 'sourceNotice', 'sourceNotice_en']);
const PRESERVED_FIELDS = new Set(['id', 'sourceBytes', 'originalFormat', 'filenameComplete']);
export const CATEGORIES = Object.freeze(['Dấu ấn VOVSMART', 'Kết nối quốc tế', 'Năng lượng & công nghiệp', 'Hạ tầng & giao thông', 'Giao lưu kết nối', 'Khác']);

export class MediaError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
function fail(status, code, message) { throw new MediaError(status, code, message); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
function header(req, name) {
  if (typeof req.headers?.get === 'function') return req.headers.get(name) || '';
  const value = req.headers?.[name];
  return typeof value === 'string' ? value : '';
}
function requiredText(value, field, max, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) {
    fail(400, 'invalid_entry', `Invalid ${field}.`);
  }
  return value.trim();
}
function mediaUrl(value, field, previous) {
  if (typeof value !== 'string' || value.length > 4096) fail(400, 'invalid_entry', `Invalid ${field}.`);
  if (value === previous && /^assets\/photos\/[\w.-]+\.jpe?g$/i.test(value)) return value;
  let url;
  try { url = new URL(value); } catch { fail(400, 'invalid_entry', `${field} must be an HTTPS image link.`); }
  if (!/^https:\/\//i.test(value) || url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    fail(400, 'invalid_entry', `${field} must be an HTTPS link without credentials.`);
  }
  return url.href;
}
function filenameFromSource(src) {
  let filename;
  try { filename = decodeURIComponent(new URL(src).pathname.split('/').pop()); } catch { filename = ''; }
  return (filename || 'media-image').slice(0, 255);
}

/** Accept partial edits, preserving original image and provenance metadata. */
export function normalizeEntry(input, previous = null, createId = randomUUID) {
  if (!isRecord(input)) fail(400, 'invalid_entry', 'Entry must be an object.');
  for (const key of Object.keys(input)) {
    if (PRESERVED_FIELDS.has(key)) {
      if (!previous || input[key] !== previous[key]) fail(400, 'invalid_entry', `${key} cannot be changed.`);
    } else if (!EDITABLE_FIELDS.has(key)) fail(400, 'invalid_entry', `Unsupported entry field: ${key}.`);
  }
  const result = previous ? { ...previous } : {
    id: createId(), kind: 'company', filenameComplete: true,
    location: '', location_en: '',
    sourceNotice: 'Ảnh được quản trị viên bổ sung từ liên kết. Mốc thời gian do quản trị viên xác nhận.',
    sourceNotice_en: 'Photo added by the administrator from a link. The year is confirmed by the administrator.'
  };
  for (const [key, value] of Object.entries(input)) if (EDITABLE_FIELDS.has(key)) result[key] = value;
  if (!previous && !own(input, 'year')) fail(400, 'invalid_entry', 'Choose a year, or null for an undated photo.');
  if (result.year !== null && (!Number.isInteger(result.year) || result.year < 1900 || result.year > 2100)) {
    fail(400, 'invalid_entry', 'Year must be an integer between 1900 and 2100, or null.');
  }
  result.title = requiredText(result.title, 'title', 400);
  result.title_en = requiredText(result.title_en, 'title_en', 400);
  result.location = requiredText(result.location, 'location', 240, true);
  result.location_en = requiredText(result.location_en, 'location_en', 240, true);
  if (!CATEGORIES.includes(result.category)) fail(400, 'invalid_entry', 'Choose a supported category.');
  if (!['company', 'leadership', 'unknown'].includes(result.kind)) fail(400, 'invalid_entry', 'Invalid kind.');
  result.src = mediaUrl(result.src, 'src', previous?.src);
  const sourceChanged = !previous || result.src !== previous.src;
  if (sourceChanged) {
    result.sourceUrl = own(input, 'sourceUrl') ? input.sourceUrl : result.src;
    result.downloadSrc = own(input, 'downloadSrc') ? input.downloadSrc : result.src;
    result.filename = own(input, 'filename') ? input.filename : filenameFromSource(result.src);
    delete result.sourceBytes;
    delete result.originalFormat;
  }
  const yearChanged = !previous || result.year !== previous.year;
  if (sourceChanged || yearChanged) {
    const sourceVi = sourceChanged ? 'Ảnh được quản trị viên bổ sung từ liên kết.' : 'Ảnh từ kho tư liệu VOVSMART.';
    const sourceEn = sourceChanged ? 'Photo added by the administrator from a link.' : 'Photo from the VOVSMART archive.';
    const yearVi = result.year === null ? 'Chưa gán năm cho ảnh.' : `Năm hiển thị ${result.year} do quản trị viên gán.`;
    const yearEn = result.year === null ? 'No year has been assigned to this photo.' : `The displayed year ${result.year} was assigned by the administrator.`;
    if (!own(input, 'sourceNotice')) result.sourceNotice = `${sourceVi} ${yearVi}`;
    if (!own(input, 'sourceNotice_en')) result.sourceNotice_en = `${sourceEn} ${yearEn}`;
  }
  result.sourceUrl = mediaUrl(result.sourceUrl, 'sourceUrl', previous?.sourceUrl);
  result.downloadSrc = mediaUrl(result.downloadSrc, 'downloadSrc', previous?.downloadSrc);
  result.filename = requiredText(result.filename, 'filename', 255);
  result.sourceNotice = requiredText(result.sourceNotice, 'sourceNotice', 2000, true);
  result.sourceNotice_en = requiredText(result.sourceNotice_en, 'sourceNotice_en', 2000, true);
  return result;
}

function validateCatalog(entries) {
  if (!Array.isArray(entries) || entries.length > 10000) throw new Error('Invalid catalog');
  const ids = new Set();
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !/^[\w-]{1,100}$/.test(entry.id) || ids.has(entry.id)) throw new Error('Invalid catalog');
    ids.add(entry.id);
    // Do not normalize/rewrite original records just because the catalog was read.
    normalizeEntry({}, entry);
    for (const key of Object.keys(entry)) if (!EDITABLE_FIELDS.has(key) && !PRESERVED_FIELDS.has(key)) throw new Error('Invalid catalog');
  }
  return entries;
}

function storageConfig(env) {
  const repository = env.GITHUB_REPOSITORY?.trim();
  const token = env.GITHUB_TOKEN?.trim();
  if (!repository && !token) return null;
  if (!repository || !token || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail(503, 'storage_not_configured', 'Configure GitHub repository access before managing media.');
  }
  const branch = env.GITHUB_BRANCH?.trim() || 'main';
  return { repository, token, branch };
}

export function createCatalogStore({ env = process.env, fetchImpl = globalThis.fetch, readBundled = () => readFile(CATALOG_FILE, 'utf8') } = {}) {
  async function github(config, method, payload) {
    const path = config.repository.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.github.com/repos/${path}/contents/data/catalog.json${method === 'GET' ? `?ref=${encodeURIComponent(config.branch)}` : ''}`;
    let response;
    try {
      response = await fetchImpl(url, {
        method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.token}`, 'X-GitHub-Api-Version': '2026-03-10', 'Content-Type': 'application/json' },
        ...(payload ? { body: JSON.stringify(payload) } : {})
      });
    } catch { fail(502, 'upstream_error', 'The media storage service could not be reached. Please try again.'); }
    if (!response.ok) {
      if (method === 'PUT' && (response.status === 409 || response.status === 422)) {
        fail(409, 'revision_conflict', 'The catalog changed. Reload the latest catalog before saving again.');
      }
      fail(502, 'upstream_error', 'The media storage service rejected the request. Check repository access and try again.');
    }
    try { return await response.json(); } catch { fail(502, 'upstream_error', 'The media storage service returned an invalid response.'); }
  }
  return {
    configured() { return storageConfig(env) !== null; },
    async read() {
      const config = storageConfig(env);
      if (!config) {
        try {
          const raw = await readBundled();
          return { entries: validateCatalog(JSON.parse(raw)), revision: null, storage: 'bundled' };
        } catch { fail(500, 'catalog_error', 'The bundled media catalog could not be read.'); }
      }
      const file = await github(config, 'GET');
      try {
        if (file.encoding !== 'base64' || typeof file.content !== 'string' || !/^[a-f0-9]{40,64}$/i.test(file.sha) || file.size > MAX_CATALOG_BYTES) throw new Error();
        const decoded = Buffer.from(file.content, 'base64');
        if (decoded.length > MAX_CATALOG_BYTES) throw new Error();
        return { entries: validateCatalog(JSON.parse(decoded.toString('utf8'))), revision: file.sha, storage: 'github' };
      } catch { fail(502, 'upstream_error', 'The stored media catalog is invalid. Check data/catalog.json in the repository.'); }
    },
    async write(entries, revision, operation) {
      const config = storageConfig(env);
      if (!config) fail(503, 'storage_not_configured', 'Configure GitHub repository access before managing media.');
      const json = JSON.stringify(entries, null, 2) + '\n';
      if (Buffer.byteLength(json) > MAX_CATALOG_BYTES) fail(413, 'catalog_too_large', 'The media catalog has reached its size limit.');
      const saved = await github(config, 'PUT', {
        message: `media: ${operation}`, branch: config.branch, sha: revision, content: Buffer.from(json).toString('base64')
      });
      if (!/^[a-f0-9]{40,64}$/i.test(saved.content?.sha)) fail(502, 'upstream_error', 'The save result could not be verified. Reload the catalog before retrying.');
      return { entries, revision: saved.content.sha, storage: 'github' };
    }
  };
}

function authorize(req, env) {
  const secret = env.MEDIA_ADMIN_KEY || '';
  if (secret.length < 32) fail(503, 'admin_not_configured', 'Configure a media administrator key of at least 32 characters.');
  const authorization = header(req, 'authorization');
  const candidate = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const hash = (value) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(hash(candidate), hash(secret))) fail(401, 'unauthorized', 'A valid media administrator key is required.');
}
function checkOrigin(req, env) {
  const origin = header(req, 'origin');
  if (!origin) return;
  let parsed;
  try { parsed = new URL(origin); } catch { fail(403, 'forbidden_origin', 'This origin is not allowed.'); }
  if (parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol)) fail(403, 'forbidden_origin', 'This origin is not allowed.');
  const host = header(req, 'host');
  const allowed = new Set((env.MEDIA_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  if (host && parsed.host === host && (parsed.protocol === 'https:' || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))) return;
  if (!allowed.has(origin)) fail(403, 'forbidden_origin', 'This origin is not allowed.');
}
async function readBody(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(header(req, 'content-type'))) fail(415, 'unsupported_media_type', 'Use Content-Type: application/json.');
  const declaredLength = Number(header(req, 'content-length'));
  if (declaredLength > MAX_BODY_BYTES) fail(413, 'payload_too_large', 'The request exceeds 64 KB.');
  let raw;
  if (req.body !== undefined) {
    raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  } else {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_BODY_BYTES) fail(413, 'payload_too_large', 'The request exceeds 64 KB.');
      chunks.push(buffer);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (typeof raw !== 'string' || Buffer.byteLength(raw) > MAX_BODY_BYTES) fail(413, 'payload_too_large', 'The request exceeds 64 KB.');
  let body;
  try { body = JSON.parse(raw); } catch { fail(400, 'invalid_json', 'The request must contain valid JSON.'); }
  if (!isRecord(body)) fail(400, 'invalid_json', 'The request must contain a JSON object.');
  return body;
}
function respond(res, status, data, extraHeaders = {}) {
  res.statusCode = status;
  for (const [key, value] of Object.entries({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders })) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}
function handleError(res, error) {
  // Never return upstream payloads, exception details, tokens or environment values.
  if (error instanceof MediaError) return respond(res, error.status, { error: { code: error.code, message: error.message } });
  return respond(res, 500, { error: { code: 'internal_error', message: 'The request could not be completed.' } });
}

export function createCatalogHandler(options = {}) {
  const store = options.store || createCatalogStore(options);
  return async function catalogHandler(req, res) {
    try {
      if (req.method !== 'GET') return respond(res, 405, { error: { code: 'method_not_allowed', message: 'Use GET to read the catalog.' } }, { Allow: 'GET' });
      return respond(res, 200, await store.read());
    } catch (error) { return handleError(res, error); }
  };
}
export function createAdminHandler(options = {}) {
  const env = options.env || process.env;
  const store = options.store || createCatalogStore(options);
  return async function adminHandler(req, res) {
    try {
      if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) return respond(res, 405, { error: { code: 'method_not_allowed', message: 'Use GET, POST, PATCH or DELETE.' } }, { Allow: 'GET, POST, PATCH, DELETE' });
      authorize(req, env);
      checkOrigin(req, env);
      if (!store.configured()) fail(503, 'storage_not_configured', 'Configure GitHub repository access before managing media.');
      if (req.method === 'GET') return respond(res, 200, await store.read());
      const body = await readBody(req);
      if (typeof body.revision !== 'string' || !/^[a-f0-9]{40,64}$/i.test(body.revision)) fail(400, 'revision_required', 'A catalog revision is required. Reload the catalog first.');
      const current = await store.read();
      if (body.revision !== current.revision) fail(409, 'revision_conflict', 'The catalog changed. Reload the latest catalog before saving again.');
      let entries = [...current.entries];
      let entry;
      if (req.method === 'POST') {
        entry = normalizeEntry(body.entry, null, options.createId);
        entries.push(entry);
      } else {
        if (typeof body.id !== 'string') fail(400, 'invalid_entry', 'A media id is required.');
        const index = entries.findIndex(item => item.id === body.id);
        if (index < 0) fail(404, 'not_found', 'The media entry no longer exists. Reload the catalog.');
        if (req.method === 'DELETE') entries.splice(index, 1);
        else {
          entry = normalizeEntry(body.entry, entries[index]);
          entries[index] = entry;
        }
      }
      const saved = await store.write(entries, current.revision, req.method === 'POST' ? 'add photo' : req.method === 'PATCH' ? 'update photo' : 'remove photo reference');
      return respond(res, req.method === 'POST' ? 201 : 200, { ...saved, ...(entry ? { entry } : { deletedId: body.id }) });
    } catch (error) { return handleError(res, error); }
  };
}
