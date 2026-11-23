import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createPostgresOperationsReportsRepository } from './postgres-operations-reports.repository.js';

const DATE = '2026-10-09';
const ORDER_ID = '11111111-1111-4111-8111-111111111111';

function fakeClient(fail = false) {
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let released = false;
  const client: SqlClient = {
    async query<Row extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) {
      calls.push({ sql, values });
      if (sql.includes('transaction_timestamp')) return { rows: [{ generatedAt: '2026-10-09T10:00:00Z' } as unknown as Row], rowCount: 1 };
      if (fail && sql.startsWith('with selected')) throw new Error('query failed');
      return { rows: [] as Row[], rowCount: 0 };
    },
    release() { released = true; },
  };
  return { client, calls, released: () => released };
}

test('packing uses packed history, paid active orders and parameterized exact selection', async () => {
  const fixture = fakeClient();
  const repo = createPostgresOperationsReportsRepository(async () => fixture.client);
  const city = "ירושלים' OR true --";
  await repo.read('packing', { date: DATE, city, orderIds: [ORDER_ID] });
  const statement = fixture.calls.find((call) => call.sql.startsWith('with selected'))!;
  assert.match(statement.sql, /o.delivery_date = \$1::date/);
  assert.match(statement.sql, /h.to_status = 'packed'/);
  assert.match(statement.sql, /payment_status = 'paid'/);
  assert.match(statement.sql, /o.status <> 'cancelled'/);
  assert.match(statement.sql, /o.package_count as "packageCount"/);
  assert.ok(!statement.sql.includes(city));
  assert.deepEqual(statement.values, [DATE, city, [ORDER_ID], 501]);
  assert.match(statement.sql, /limit \$4/);
  assert.equal(fixture.calls[0].sql, 'begin transaction isolation level repeatable read read only');
  assert.equal(fixture.calls.at(-1)?.sql, 'commit');
  assert.ok(fixture.released());
});

test('delivery is based on Israel transition day, keeps cancelled history and groups street order', async () => {
  const fixture = fakeClient();
  const repo = createPostgresOperationsReportsRepository(async () => fixture.client);
  await repo.read('delivery', { date: DATE });
  const statement = fixture.calls.find((call) => call.sql.startsWith('with selected'))!;
  assert.match(statement.sql, /h.to_status = 'in_transit'/);
  assert.match(statement.sql, /h.created_at >=/);
  assert.match(statement.sql, /h.created_at </);
  assert.match(statement.sql, /at time zone \$2/);
  assert.ok(!statement.sql.includes("o.status <> 'cancelled'"));
  assert.match(statement.sql, /order by o.delivery_address->>'city', o.delivery_address->>'street'/);
  assert.deepEqual(statement.values, [DATE, 'Asia/Jerusalem', null, null, 501]);
  assert.match(statement.sql, /limit \$5/);
});

test('report failure rolls back and releases connection', async () => {
  const fixture = fakeClient(true);
  const repo = createPostgresOperationsReportsRepository(async () => fixture.client);
  await assert.rejects(repo.read('delivery', { date: DATE }), /query failed/);
  assert.equal(fixture.calls.at(-1)?.sql, 'rollback');
  assert.ok(fixture.released());
});
