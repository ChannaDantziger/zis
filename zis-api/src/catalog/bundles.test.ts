import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminBundlesController } from '../controllers/admin-bundles.controller.js';
import type { BundlesRepository } from './bundles.repository.js';
import type { AdminUserResolution } from '../controllers/admin-inventory.controller.js';
import { createBundlesRepository } from './bundles.repository.js';
import { createCatalogManagementRepository } from './postgres-catalog-management.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

const id = '00000000-0000-4000-8000-000000000001';
const manager: AdminUserResolution = { status: 'authenticated', role: 'operations_manager', adminUserId: id };
function setup(identity: AdminUserResolution = manager) {
  const calls: unknown[] = [];
  const repo = { save: async (...args: unknown[]) => { calls.push(args); return { bundleId: id }; },
    list: async () => { calls.push('list'); return []; } } as unknown as BundlesRepository;
  const controller = createAdminBundlesController(repo, async () => identity);
  const response = { setHeader() {}, status() { return this; }, json() {} } as never;
  return { controller, response, calls };
}
test('bundle endpoints reject unauthorized access before database access', async () => {
  for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' },
    { status: 'authenticated', role: 'delivery_driver', adminUserId: id }] as AdminUserResolution[]) {
    const f = setup(identity);
    await assert.rejects(() => f.controller.list({ query: { categoryId: id } } as never, f.response));
    await assert.rejects(() => f.controller.save({} as never, f.response));
    assert.deepEqual(f.calls, []);
  }
});
test('bundle creation validates size, category, name and status before saving', async () => {
  const f = setup();
  const input = { categoryId: id, name: 'מארז', description: null, unitCount: 12, status: 'draft' };
  for (const body of [{ ...input, unitCount: 0 }, { ...input, unitCount: 1.5 }, { ...input, categoryId: 'wrong' },
    { ...input, name: ' ' }, { ...input, status: 'invalid' }, { ...input, status: 'active' }]) {
    await assert.rejects(() => f.controller.save({ params: {}, body } as never, f.response));
  }
  assert.equal(f.calls.length, 0);
  await f.controller.save({ params: {}, body: input } as never, f.response);
  assert.equal(f.calls.length, 1);
});

test('publishing requires active category and saved primary image', async () => {
  for (const scenario of [
    { status: 'hidden', image: true, expected: 'BUNDLE_CATEGORY_INACTIVE' },
    { status: 'active', image: false, expected: 'BUNDLE_IMAGE_REQUIRED' },
    { status: 'active', image: true, expected: null },
  ]) {
    const statements: string[] = [];
    const client = { query: async (sql: string) => {
      statements.push(sql);
      if (sql.includes('from public.categories')) return { rows: [{ category_id: id, status: scenario.status }] };
      if (sql.includes('from public.catalog_bundles') && sql.includes('for update')) return { rows: [{ category_id: id, version: 'v1' }] };
      if (sql.includes('from public.catalog_bundle_images') && sql.includes('for share')) return { rows: scenario.image ? [{ image_id: id }] : [] };
      return { rows: [] };
    }, release() {} } as unknown as SqlClient;
    const promise = createBundlesRepository(async () => client).save(id,
      { categoryId: id, name: 'מארז', description: null, unitCount: 9, status: 'active', version: 'v1' }, id);
    if (scenario.expected) {
      await assert.rejects(promise, (e: unknown) => (e as { code?: string }).code === scenario.expected);
      assert.equal(statements.at(-1), 'rollback');
      assert.equal(statements.some(sql => sql.startsWith('update public.catalog_bundles')), false);
    } else {
      assert.deepEqual(await promise, { bundleId: id });
      assert.equal(statements.at(-1), 'commit');
      assert.equal(statements.some(sql => sql.includes('admin_audit_log')), true);
    }
  }
});

test('existing bundle and product cannot be moved to another category', async () => {
  const statements: string[] = [];
  const client = { query: async (sql: string) => {
    statements.push(sql);
    if (sql.includes('from public.categories')) return { rows: [{ category_id: id }] };
    if (sql.includes('for update')) return { rows: [{ version: 'v1', category_id: 'original-category' }] };
    return { rows: [] };
  }, release() {} } as unknown as SqlClient;
  const bundle = createBundlesRepository(async () => client);
  await assert.rejects(() => bundle.save(id, { categoryId: id, name: 'מארז', description: null, unitCount: 9, status: 'draft', version: 'v1' }, id),
    (e: unknown) => (e as { code?: string }).code === 'CATEGORY_CHANGE_NOT_ALLOWED');
  const products = createCatalogManagementRepository(async () => client);
  await assert.rejects(() => products.updateProduct({ productId: id, categoryId: id, name: 'מוצר', description: null,
    setSize: 1, pricePerUnit: '1.00', availableItems: 1, displayOrder: 0, status: 'draft', version: 'v1' }, id),
  (e: unknown) => (e as { code?: string }).code === 'CATEGORY_CHANGE_NOT_ALLOWED');
  assert.equal(statements.some(sql => /^update public\.(products|catalog_bundles)/.test(sql)), false);
  assert.equal(statements.filter(sql => sql === 'rollback').length, 2);
});
