import assert from 'node:assert/strict';
import test from 'node:test';
import { createBundlePreviewRepository } from './bundle-preview.repository.js';
import { createBundlePreviewService } from './bundle-preview.service.js';
import { createBundlePreviewController } from '../controllers/bundle-preview.controller.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { StorageService } from '../storage/storage.service.js';

const id = '00000000-0000-4000-8000-000000000001';
const image = { imageId: id, storagePath: 'private/path', altText: 'תמונה', isPrimary: true, sortOrder: 0 };
const bundle = { bundleId: id, categoryId: id, categoryName: 'קטגוריה', categorySlug: 'test', name: 'מארז',
  description: null, unitCount: 9, images: [image] };
const product = { productId: id, categoryId: id, name: 'מוצר', pricePerUnit: '15.00',
  availableItems: 9, image: { storagePath: 'private/path', altText: 'מוצר' } };
test('preview reads only active, visible, pictured bundles and simple products in one snapshot', async () => {
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  const client = { query: async (sql: string, values?: unknown[]) => {
    calls.push({ sql, values });
    if (sql.includes('as bundle')) return { rows: [{ bundle }] };
    if (sql.includes('as product')) return { rows: [{ product }] };
    return { rows: [] };
  }, release() {} } as unknown as SqlClient;
  const result = await createBundlePreviewRepository(async () => client).list(id);
  assert.deepEqual(result, { bundles: [bundle], products: [product] });
  assert.match(calls[0]!.sql, /repeatable read read only/);
  const bundleSql = calls.find(call => call.sql.includes('as bundle'))!;
  assert.match(bundleSql.sql, /b\.status='active'/); assert.match(bundleSql.sql, /c\.status='active'/);
  assert.match(bundleSql.sql, /i\.is_primary and not i\.is_deleted/); assert.deepEqual(bundleSql.values, [id, 1001]);
  const productSql = calls.find(call => call.sql.includes('as product'))!;
  assert.match(productSql.sql, /p\.status='active'/); assert.match(productSql.sql, /p\.available_items >= 0/);
  assert.match(productSql.sql, /not exists\(select 1 from public\.product_variants/);
  assert.deepEqual(productSql.values, [[id], 5001]); assert.equal(calls.at(-1)?.sql, 'commit');
});
test('preview signs media without exposing storage paths and reuses signatures', async () => {
  const calls: string[] = [];
  const repository = { list: async () => ({ bundles: [bundle], products: [product] }) };
  const storage = { createSignedUrl: async (_bucket: string, path: string) => { calls.push(path); return { url: 'https://example.test/signed' }; } } as StorageService;
  const result = await createBundlePreviewService(repository, storage).list();
  assert.equal(result.bundles[0]?.images[0]?.url, 'https://example.test/signed');
  assert.equal(result.products[0]?.image?.url, 'https://example.test/signed');
  assert.equal(JSON.stringify(result).includes('storagePath'), false);
  assert.deepEqual(calls, ['private/path']);
});
test('invalid category requests are rejected before accessing data', async () => {
  const calls: unknown[] = [];
  const controller = createBundlePreviewController({ list: async category => { calls.push(category); return { bundles: [], products: [] }; } });
  const response = { setHeader() {}, json() {} } as never;
  for (const categoryId of ['invalid', [id, id], '']) {
    await assert.rejects(() => controller({ query: { categoryId } } as never, response));
  }
  assert.deepEqual(calls, []);
  await controller({ query: { categoryId: id } } as never, response);
  assert.deepEqual(calls, [id]);
});
