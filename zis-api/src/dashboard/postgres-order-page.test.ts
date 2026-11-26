import assert from 'node:assert/strict';
import test from 'node:test';
import { readOrderPage } from './postgres-order-page.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

const query = { deliveryDate: '2026-10-09', status: 'packed', location: "x' OR 1=1 --", productVariantId: '00000000-0000-4000-8000-000000000001', sortBy: 'total', sortDirection: 'desc', page: 3, pageSize: 24 } as const;

test('order page retains total and daily variant choices even when requested page is empty', async () => {
  const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
  let released = false;
  const client = { query: async (sql: string, values?: readonly unknown[]) => {
    calls.push({ sql, values: values ? [...values] : undefined });
    if (sql.startsWith('select count')) return { rows: [{ count: 25 }] };
    if (sql.includes('as label')) return { rows: [{ value: query.productVariantId, label: 'Product · Variant' }] };
    return { rows: [] };
  }, release: () => { released = true; } } as unknown as SqlClient;
  const result = await readOrderPage(async () => client, query);
  assert.deepEqual(result.page, { page: 3, pageSize: 24, totalItems: 25, totalPages: 2 });
  assert.equal(result.data.length, 0);
  assert.equal(result.variants.length, 1);
  assert.equal(calls[0].sql, 'begin isolation level repeatable read read only');
  assert.equal(calls.at(-1)?.sql, 'commit');
  const countCall = calls.find(call => call.sql.startsWith('select count'))!;
  const listCall = calls.find(call => call.sql.includes('as "itemSummary"'))!;
  const variantsCall = calls.find(call => call.sql.includes('as label'))!;
  assert.deepEqual(countCall.values, [query.deliveryDate, query.status, query.productVariantId, `%${query.location}%`]);
  assert.deepEqual(listCall.values, [...countCall.values!, 24, 48]);
  assert.equal(listCall.sql.includes(query.location), false);
  assert.deepEqual(variantsCall.values, [query.deliveryDate]);
  assert.equal(released, true);
});

test('order page includes bundle-only orders when bundle tables exist', async () => {
  const calls: string[] = [];
  const client = { query: async (sql: string) => {
    calls.push(sql);
    if (sql.includes('to_regclass')) return { rows: [{ present: true }] };
    if (sql.startsWith('select count')) return { rows: [{ count: 1 }] };
    return { rows: [] };
  }, release() {} } as unknown as SqlClient;
  await readOrderPage(async () => client, query);
  assert.match(calls.find(sql => sql.startsWith('select count'))!, /or exists \(select 1 from public.order_bundles/);
  assert.match(calls.find(sql => sql.includes('as "itemSummary"'))!, /left join public.order_items/);
});

test('failed paginated order read rolls back and releases its client', async () => {
  const calls: string[] = [];
  let released = false;
  const client = { query: async (sql: string) => {
    calls.push(sql);
    if (sql.startsWith('select count')) throw new Error('fixture failure');
    return { rows: [] };
  }, release: () => { released = true; } } as unknown as SqlClient;
  await assert.rejects(readOrderPage(async () => client, query), /fixture failure/);
  assert.equal(calls.at(-1), 'rollback');
  assert.equal(calls.includes('commit'), false);
  assert.equal(released, true);
});
