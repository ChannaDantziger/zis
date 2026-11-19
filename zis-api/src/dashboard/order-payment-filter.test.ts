import assert from 'node:assert/strict';
import test from 'node:test';
import { orderFilters } from './postgres-order-list.js';

test('pending payment and received-order filters are distinct and scoped to the selected day', () => {
  const base = { deliveryDate: '2026-11-23', status: 'ordered' as const, sortBy: 'status' as const, sortDirection: 'asc' as const };
  const pending = orderFilters({ ...base, paymentFilter: 'pending' });
  const received = orderFilters({ ...base, paymentFilter: 'not_pending' });
  assert.deepEqual(pending.values, ['2026-11-23', 'ordered']);
  assert.ok(pending.filters.includes("o.payment_status = 'pending'"));
  assert.ok(received.filters.includes("o.payment_status is distinct from 'pending'"));
});
