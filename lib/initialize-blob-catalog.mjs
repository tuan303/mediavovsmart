import { put } from '@vercel/blob';
import { createCatalogStore } from './media-api.js';

// Run explicitly once with npm run catalog:init; never invoked by an API request.
// No overwrite: an existing live catalog is not replaced by the bundled seed.
try {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (!token && !storeId) throw new Error('Missing private storage configuration');
  const { entries } = await createCatalogStore({ env: {} }).read();
  const result = await put('media/catalog.json', JSON.stringify(entries, null, 2) + '\n', {
    ...(token ? { token } : { storeId }),
    access: 'private', addRandomSuffix: false, allowOverwrite: false,
    contentType: 'application/json', cacheControlMaxAge: 60,
    abortSignal: AbortSignal.timeout(15000)
  });
  if (result.pathname !== 'media/catalog.json') throw new Error('Unexpected catalog path');
  console.log(`Initialized ${result.pathname} with ${entries.length} media entries.`);
  console.log(`Private catalog URL: ${result.url}`);
} catch {
  console.error('Private catalog initialization failed. Check storage access and whether media/catalog.json already exists; no existing catalog is overwritten.');
  process.exitCode = 1;
}
