import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createOrderCorrectionService } from './order-correction.service.js';

const orderId = '00000000-0000-4000-8000-000000000001';
const adminUserId = '00000000-0000-4000-8000-000000000002';

describe('mistaken order status correction', () => {
  it('checks the version before writing and audits an approved correction', async () => {
    const calls: Array<{ sql: string; values?: readonly unknown[] }> = [];
    const client = { query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      if (sql.includes('from public.orders where order_id')) return { rows: [{ status: 'packed', payment_status: 'paid', version: '1' }], rowCount: 1 };
      if (sql.includes('update public.orders')) return { rows: [{ version: '2' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    } } as unknown as SqlClient;
    const service = createOrderCorrectionService(async () => client);
    await assert.rejects(service.correct({ orderId, adminUserId, targetStatus: 'in_preparation', version: '0', note: null }),
      error => error instanceof ApiError && error.statusCode === 409);
    assert.equal(calls.some(call => call.sql.includes('update public.orders')), false);
    calls.length = 0;
    const result = await service.correct({ orderId, adminUserId, targetStatus: 'in_preparation', version: '1', note: 'סומן בטעות' });
    assert.equal(result.status, 'in_preparation');
    assert.equal(calls.filter(call => call.sql.includes('insert into public.order_status_history')).length, 1);
    assert.equal(calls.filter(call => call.sql.includes('insert into public.admin_audit_log')).length, 1);
    assert.equal(calls.at(-1)?.sql, 'commit');
  });

  it('keeps cancellation outside correction', async () => {
    const service = createOrderCorrectionService(async () => { throw new Error('must not read DB'); });
    await assert.rejects(service.correct({ orderId, adminUserId, targetStatus: 'cancelled', version: '1', note: null }),
      error => error instanceof ApiError && error.statusCode === 400);
  });
});
