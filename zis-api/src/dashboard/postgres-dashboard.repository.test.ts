import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresDashboardRepository } from './postgres-dashboard.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

const query = { deliveryDate: '2026-10-08', sortBy: 'status', sortDirection: 'asc' } as const;

test('orders offer preparation only after confirmed payment', async () => {
  let released = false;
  const rows = [
    { orderId: 'unpaid', status: 'ordered', paymentStatus: 'pending' },
    { orderId: 'paid', status: 'ordered', paymentStatus: 'paid' },
    { orderId: 'packed', status: 'packed', paymentStatus: 'paid' },
    { orderId: 'cancelled', status: 'cancelled', paymentStatus: 'paid' },
  ];
  const client = { query: async () => ({ rows, rowCount: rows.length }), release: () => { released = true; } } as unknown as SqlClient;
  const result = await createPostgresDashboardRepository(async () => client).listOrders(query);
  assert.deepEqual(result.map((row) => row.allowedNextStatuses), [[], ['in_preparation'], ['in_transit'], []]);
  assert.equal(released, true);
});

test('order filters are query parameters rather than SQL text', async () => {
  const location = "x' OR 1=1 --";
  const productVariantId = '00000000-0000-0000-0000-000000000001';
  let statement = '';
  let parameters: readonly unknown[] | undefined;
  const client = { query: async (sql: string, values?: readonly unknown[]) => {
    statement = sql; parameters = values; return { rows: [], rowCount: 0 };
  } } as unknown as SqlClient;
  await createPostgresDashboardRepository(async () => client).listOrders({ ...query, status: 'packed', location, productVariantId });
  assert.equal(statement.includes(location), false);
  assert.deepEqual(parameters, [query.deliveryDate, 'packed', productVariantId, `%${location}%`]);
});

test('order query failures release the database client', async () => {
  let released = false;
  const client = { query: async () => { throw new Error('test failure'); }, release: () => { released = true; } } as unknown as SqlClient;
  await assert.rejects(createPostgresDashboardRepository(async () => client).listOrders(query), /test failure/);
  assert.equal(released, true);
});

test('dashboard counts only current admin notifications; absent context fails closed', async () => {
  const calls: Array<{ sql: string; parameters?: readonly unknown[] }> = [];
  const client = { query: async (sql: string, parameters?: readonly unknown[]) => {
    calls.push({ sql, parameters });
    if (sql.includes('public.admin_notifications')) return { rows: [{ count: parameters?.[0] === 'manager-fixture' ? 2 : 0 }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  } } as unknown as SqlClient;
  const repository = createPostgresDashboardRepository(async () => client);
  assert.equal((await repository.getDashboard(query.deliveryDate, 'manager-fixture')).unreadNotificationCount, 2);
  assert.equal((await repository.getDashboard(query.deliveryDate)).unreadNotificationCount, 0);
  const notificationQueries = calls.filter((call) => call.sql.includes('public.admin_notifications'));
  assert.equal(notificationQueries.length, 2);
  for (const call of notificationQueries) assert.match(call.sql, /admin_user_id = \$1/);
  assert.deepEqual(notificationQueries.map((call) => call.parameters), [['manager-fixture'], [null]]);
  assert.ok(notificationQueries.every((call) => !call.sql.includes('manager-fixture')));
});