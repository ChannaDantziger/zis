import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createPostgresInventoryAdminRepository } from './postgres-inventory-admin.repository.js';
const ID = '11111111-1111-4111-8111-111111111111';
const DATE = '2026-10-09';
function fixture(fail = false) {
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let released = false;
  const client: SqlClient = {
    async query<Row extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      if (sql.startsWith('select v.product_variant_id')) {
        if (fail) throw new Error('failed');
        return { rows: [{ productVariantId: ID } as unknown as Row], rowCount: 1 };
      }
      if (sql.includes('count(*)')) return { rows: [{ total: '50' } as unknown as Row], rowCount: 1 };
      return { rows: [] as Row[], rowCount: 0 };
    }, release() { released = true; },
  };
  return { calls, client, released: () => released };
}
test('variants list pages all undeleted statuses; capacity is separate and only live allocations are summed', async () => {
  const f = fixture();
  const result = await createPostgresInventoryAdminRepository(async () => f.client).list(2, DATE);
  const sql = f.calls.find((call) => call.sql.startsWith('select v.product_variant_id'))!;
  assert.deepEqual(sql.values, [DATE, 24, 24]);
  assert.match(sql.sql, /v.is_deleted = false and p.is_deleted = false/);
  assert.match(sql.sql, /c.week_start_date = \$1::date/);
  assert.match(sql.sql, /a.status = 'allocated'/);
  assert.match(sql.sql, /a.delivery_date < \$1::date \+ 7/);
  assert.ok(!sql.sql.includes("v.status = 'active'"));
  assert.equal(result.page.totalPages, 3);
  assert.equal(f.calls[0].sql, 'begin transaction isolation level repeatable read read only');
  assert.equal(f.calls.at(-1)?.sql, 'commit');
  assert.ok(f.released());
});
test('history count and deterministic paging share the stock read snapshot', async () => {
  const f = fixture();
  await createPostgresInventoryAdminRepository(async () => f.client).details(ID, 3, DATE);
  const history = f.calls.find((call) => call.sql.includes('stock_after as "stockAfter"'))!;
  assert.deepEqual(history.values, [ID, 24, 48]);
  assert.match(history.sql, /where product_variant_id = \$1/);
  assert.match(history.sql, /order by created_at desc, inventory_movement_id desc/);
  assert.ok(f.calls.every((call) => !/^(update|insert|delete) /i.test(call.sql)));
});
test('failed inventory snapshot rolls back and releases', async () => {
  const f = fixture(true);
  await assert.rejects(createPostgresInventoryAdminRepository(async () => f.client).list(1, DATE), /failed/);
  assert.equal(f.calls.at(-1)?.sql, 'rollback');
  assert.ok(f.released());
});