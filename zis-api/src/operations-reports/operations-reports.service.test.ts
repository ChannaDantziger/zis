import assert from 'node:assert/strict';
import test from 'node:test';
import type { OperationReport, OperationReportOrder } from './operations-reports.types.js';
import { createOperationsReportsService, MAX_REPORT_ORDERS } from './operations-reports.service.js';

const ORDER_ID = '11111111-1111-4111-8111-111111111111';
const DATE = '2026-10-09';
const emptyReport: OperationReport = { kind: 'packing', date: DATE, generatedAt: '2026-10-09T10:00:00Z', orders: [] };

test('invalid calendar dates and SQL-shaped selections fail before repository access', async () => {
  let calls = 0;
  const service = createOperationsReportsService({ read: async () => { calls += 1; return emptyReport; } });
  await assert.rejects(service.read('packing', { date: '2026-02-30' }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.read('delivery', { date: DATE, orderIds: ["') or true --"] }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.read('packing', { date: DATE, orderIds: [] }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(service.read('packing', { date: DATE, orderIds: Array(101).fill(ORDER_ID) }), { code: 'VALIDATION_ERROR' });
  assert.equal(calls, 0);
});

test('selected reports never silently omit an order that no longer qualifies', async () => {
  const service = createOperationsReportsService({ read: async () => emptyReport });
  await assert.rejects(service.read('packing', { date: DATE, orderIds: [ORDER_ID] }), { code: 'REPORT_SELECTION_CHANGED' });
});

test('oversized daily reports fail rather than print truncated deliveries', async () => {
  const orders = Array(MAX_REPORT_ORDERS + 1).fill({ orderId: ORDER_ID } as OperationReportOrder);
  const service = createOperationsReportsService({ read: async () => ({ ...emptyReport, orders }) });
  await assert.rejects(service.read('delivery', { date: DATE }), { code: 'REPORT_TOO_LARGE' });
});

test('normalizes city and UUID case and removes duplicates without widening selection', async () => {
  const mixedId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const order = { orderId: mixedId } as OperationReportOrder;
  const service = createOperationsReportsService({ read: async (_kind, query) => {
    assert.deepEqual(query, { date: DATE, city: 'ירושלים', orderIds: [mixedId] });
    return { ...emptyReport, orders: [order] };
  } });
  await service.read('packing', { date: DATE, city: ' ירושלים ', orderIds: [mixedId.toUpperCase(), mixedId] });
});