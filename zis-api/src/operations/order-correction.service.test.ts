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
      if (sql.includes('from public.orders where order_id')) return { rows: [{ status: 'packed', payment_status: 'paid', package_count: 7, version: '1' }], rowCount: 1 };
      if (sql.includes('update public.orders')) return { rows: [{ version: '2' }], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    } } as unknown as SqlClient;
    const service = createOrderCorrectionService(async () => client);
    await assert.rejects(service.correct({ orderId, adminUserId, targetStatus: 'in_preparation', version: '0', note: null }),
      error => error instanceof ApiError && error.statusCode === 409);
    assert.equal(calls.some(call => call.sql.includes('update public.orders')), false);
    calls.length = 0;
    const result = await service.correct({ orderId, adminUserId, targetStatus: 'in_preparation', version: '1', note: 'סומן בטעות', resetPackageCount: true });
    assert.equal(result.status, 'in_preparation');
    assert.equal(calls.filter(call => call.sql.includes('insert into public.order_status_history')).length, 1);
    assert.equal(calls.filter(call => call.sql.includes('insert into public.admin_audit_log')).length, 1);
    assert.deepEqual(calls.find(call => call.sql.includes('update public.orders'))?.values, [orderId, 'in_preparation', true]);
    const audit = calls.find(call => call.sql.includes('insert into public.admin_audit_log'))!;
    assert.equal(JSON.parse(String(audit.values?.[2])).packageCount, 7);
    assert.equal(JSON.parse(String(audit.values?.[3])).packageCount, null);
    assert.equal(calls.at(-1)?.sql, 'commit');
  });

  it('keeps the package count when correcting a later operational status', async () => {
    let reset: unknown;
    const client = { query: async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes('from public.orders where order_id')) return { rows: [{ status: 'packed', payment_status: 'paid', package_count: 4, version: '1' }] };
      if (sql.includes('update public.orders')) { reset = values?.[2]; return { rows: [{ version: '2' }] }; }
      return { rows: [] };
    } } as unknown as SqlClient;
    await createOrderCorrectionService(async () => client).correct({ orderId, adminUserId, targetStatus: 'in_transit', version: '1', note: null });
    assert.equal(reset, false);
  });

  it('requires an explicit reset choice on backward transitions and honors keeping the count', async () => {
    let writes = 0, reset: unknown;
    const client = { query: async (sql: string, values?: readonly unknown[]) => {
      if (sql.includes('from public.orders where order_id')) return { rows: [{ status: 'in_transit', payment_status: 'paid', package_count: 4, version: '1' }] };
      if (sql.includes('update public.orders')) { writes++; reset = values?.[2]; return { rows: [{ version: '2' }] }; }
      return { rows: [] };
    } } as unknown as SqlClient;
    const service = createOrderCorrectionService(async () => client);
    const input = { orderId, adminUserId, targetStatus: 'packed' as const, version: '1', note: null };
    await assert.rejects(service.correct(input), { code: 'PACKAGE_COUNT_CHOICE_REQUIRED' });
    assert.equal(writes, 0);
    await service.correct({ ...input, resetPackageCount: false });
    assert.equal(reset, false);
    await service.correct({ ...input, resetPackageCount: true });
    assert.equal(reset, true);
  });

  it('keeps cancellation outside correction', async () => {
    const service = createOrderCorrectionService(async () => { throw new Error('must not read DB'); });
    await assert.rejects(service.correct({ orderId, adminUserId, targetStatus: 'cancelled', version: '1', note: null }),
      error => error instanceof ApiError && error.statusCode === 400);
  });
});
