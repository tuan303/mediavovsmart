import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const entries = JSON.parse(await read('data/catalog.json'));
assert(Array.isArray(entries), 'Catalog must be an array');
assert(new Set(entries.map(entry => entry.id)).size === entries.length, 'Duplicate media IDs');
for (const entry of entries) {
  assert(entry.id && entry.filename && entry.title && entry.title_en, 'Missing media metadata');
  assert(entry.year === null || (Number.isInteger(entry.year) && entry.year >= 1900 && entry.year <= 2100), `Invalid year: ${entry.id}`);
  assert(entry.src, `Missing image link: ${entry.id}`);
  if (entry.src.startsWith('assets/')) {
    const path = resolve(root, 'public/media', entry.src);
    assert(relative(resolve(root, 'public/media/assets'), path).startsWith('..') === false);
    assert((await stat(path)).isFile(), `Missing local photo: ${entry.src}`);
  } else {
    const url = new URL(entry.src);
    assert(url.protocol === 'https:' && !url.username && !url.password, `Image must use HTTPS: ${entry.id}`);
  }
}
async function checkScripts(directory) {
  for (const item of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${item.name}`;
    if (item.isDirectory()) await checkScripts(path);
    else if (/\.m?js$/.test(item.name)) {
      const result = spawnSync(process.execPath, ['--check', resolve(root, path)], { encoding: 'utf8' });
      assert(result.status === 0, `${path}: ${result.stderr}`);
    }
  }
}
for (const path of ['public/media', 'api', 'lib']) await checkScripts(path);
const config = JSON.parse(await read('vercel.json'));
assert.equal(config.outputDirectory, 'public');
assert(config.rewrites.some(rule => rule.source === '/media/api/catalog'));
assert(config.rewrites.some(rule => rule.source === '/media/api/admin'));
for (const page of ['public/media/index.html', 'public/media/admin/index.html']) {
  const html = await read(page);
  assert(html.includes('<html lang="en"'), `${page} must default to English`);
  assert(!html.includes('chatgpt.site'), 'Remove former hosting URLs');
}
console.log(`Validated ${entries.length} media records, JavaScript syntax, and /media deployment configuration.`);
