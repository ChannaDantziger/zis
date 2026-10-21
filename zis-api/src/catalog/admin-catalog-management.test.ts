import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminCatalogController } from '../controllers/admin-catalog.controller.js';
import type { AdminUserResolution } from '../controllers/admin-inventory.controller.js';
import type { AdminCatalogService } from './admin-catalog.types.js';
import { createCatalogManagementRepository } from './postgres-catalog-management.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
const id = '00000000-0000-4000-8000-000000000001';
const version = '1791500400.123456';
const manager: AdminUserResolution = { status: 'authenticated', adminUserId: id, role: 'operations_manager' };
function fixture(identity = manager) {
  const calls: unknown[] = [];
  const service = { listProducts: async (...args: unknown[]) => { calls.push(args); return { data: [] }; }, updateProduct: async (...args: unknown[]) => { calls.push(args); return {}; }, updateVariant: async (...args: unknown[]) => { calls.push(args); return {}; } } as unknown as AdminCatalogService;
  const controller = createAdminCatalogController(service, async () => identity);
  const headers: Record<string, string> = {};
  const response = { json: (v: unknown) => v, setHeader: (name: string, value: string) => { headers[name] = value; } } as never;
  return { controller, response, calls, headers };
}
for (const identity of [{ status: 'unauthenticated' }, { status: 'forbidden' }, { status: 'authenticated', adminUserId: id }, { status: 'authenticated', adminUserId: id, role: 'delivery_driver' }] as AdminUserResolution[]) {
  test(`catalog rejects ${JSON.stringify(identity)} before data access`, async () => {
    const f = fixture(identity);
    await assert.rejects(() => f.controller.listProducts({ query: {} } as never, f.response));
    await assert.rejects(() => f.controller.updateProduct({} as never, f.response));
    await assert.rejects(() => f.controller.createImage({} as never, f.response));
    assert.deepEqual(f.calls, []);
  });
}
test('catalog pagination rejects repeated, fractional and unbounded values', async () => {
  const f = fixture();
  for (const page of [['1','2'], '0', '1.5', '100001', '9007199254740992']) await assert.rejects(() => f.controller.listProducts({ query: { page } } as never, f.response));
  await f.controller.listProducts({ query: { page: '2' } } as never, f.response);
  assert.deepEqual(f.calls, [[2]]); assert.equal(f.headers['Cache-Control'], 'no-store');
});
test('variant edits cannot overwrite inventory or internal product code', async () => {
  const f = fixture();
  await f.controller.updateVariant({ params: { productVariantId: id }, body: { name: ' שוקולד ', pricePerSet: '24.5', lowStockThresholdSets: 3, defaultProductionQuantitySets: 10, status: 'hidden', version, availableSets: 999, productCode: 'spoofed' } } as never, f.response);
  assert.deepEqual(f.calls, [[{ productVariantId: id, name: 'שוקולד', pricePerSet: '24.50', lowStockThresholdSets: 3, defaultProductionQuantitySets: 10, status: 'hidden', version }, id]]);
});
function databaseFixture(currentVersion: string) {
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  let released = false;
  const client = { query: async (sql: string, values?: unknown[]) => { statements.push({ sql, values }); return { rows: sql.includes('for update') ? [{ version: currentVersion, price_per_set: '10.00' }] : [] }; }, release: () => { released = true; } } as unknown as SqlClient;
  return { repository: createCatalogManagementRepository(async () => client), statements, released: () => released };
}
const variantInput = { productVariantId: id, name: 'New', pricePerSet: '25.00', lowStockThresholdSets: 3, defaultProductionQuantitySets: 10, status: 'active' as const, version };
test('stale catalog edit rolls back without updating or auditing', async () => {
  const f = databaseFixture('changed');
  await assert.rejects(() => f.repository.updateVariant(variantInput, id), (e: unknown) => (e as { statusCode: number }).statusCode === 409);
  assert.equal(f.statements.at(-1)?.sql, 'rollback');
  assert.equal(f.statements.some((s) => s.sql.startsWith('update') || s.sql.includes('admin_audit_log')), false);
  assert.equal(f.released(), true);
});
test('price update preserves inventory and commits its before value in the same Audit transaction', async () => {
  const f = databaseFixture(version);
  await f.repository.updateVariant(variantInput, id);
  const update = f.statements.find((s) => s.sql.startsWith('update'))!;
  assert.ok(update); assert.equal(update.sql.includes('available_sets'), false);
  const audit = f.statements.find((s) => s.sql.includes('admin_audit_log'))!;
  assert.equal((audit.values?.[4] as { price_per_set: string }).price_per_set, '10.00');
  assert.equal(f.statements.at(-1)?.sql, 'commit'); assert.equal(f.released(), true);
});
