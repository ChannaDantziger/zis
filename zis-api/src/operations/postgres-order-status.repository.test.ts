import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPostgresOrderStatusRepository } from './postgres-order-status.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

describe('package count on dispatch', () => {
  it('blocks dispatch without a saved count and records a supplied count atomically', async () => {
    const queries: Array<{ sql: string; values?: readonly unknown[] }> = [];
    const client = { query: async (sql: string, values?: readonly unknown[]) => {
      queries.push({ sql, values });
      if (sql.includes('from public.orders where order_id')) return { rows: [{ order_number: 'Z1', status: 'packed', payment_status: 'paid', package_count: null, version: '1' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    } } as unknown as SqlClient;
    const repository = createPostgresOrderStatusRepository(async () => client);
    const input = { targetStatus: 'in_transit' as const, adminUserId: 'admin', items: [{ orderId: 'order', version: '1' }] };
    const blocked = await repository.applyBulkStatus(input);
    assert.equal(blocked[0].reason, 'PACKAGE_COUNT_REQUIRED');
    assert.equal(queries.some(entry => entry.sql.includes('update public.orders')), false);
    queries.length = 0;
    const saved = await repository.applyBulkStatus({ ...input, items: [{ ...input.items[0], packageCount: 3 }] });
    assert.equal(saved[0].ok, true);
    assert.deepEqual(queries.find(entry => entry.sql.includes('update public.orders'))?.values, ['in_transit', 'order', 3]);
    assert.match(queries.find(entry => entry.sql.includes('insert into public.order_status_history'))?.sql ?? '', /note/);
  });
});
