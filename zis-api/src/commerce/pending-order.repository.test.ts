import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { readPendingOrder } from './pending-order.repository.js';

test('paid orders and orders with a payment in progress cannot be edited', async () => {
  for (const scenario of ['paid', 'payment-started'] as const) {
    let queries = 0;
    const client = { query: async () => {
      queries++;
      if (queries === 1) return { rows: [{ status: 'ordered', payment_status: scenario === 'paid' ? 'paid' : 'pending' }] };
      return { rows: [{ payment_id: 'payment' }] };
    } } as unknown as SqlClient;
    await assert.rejects(readPendingOrder(client, 'hash', new Date()), { code: 'ORDER_NOT_EDITABLE' });
    assert.equal(queries, scenario === 'paid' ? 1 : 2);
  }
});
