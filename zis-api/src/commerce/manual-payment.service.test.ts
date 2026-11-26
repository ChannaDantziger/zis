import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createManualPaymentService } from './manual-payment.service.js';

const orderId = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';
const productId = '00000000-0000-4000-8000-000000000003';
const paymentId = '00000000-0000-4000-8000-000000000004';

function fixture(options: { paid?: boolean; denied?: boolean; stale?: boolean; noStock?: boolean; missingHistory?: boolean; otherPaid?: boolean; bundle?: boolean } = {}) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const client = { async query(sql: string, values: readonly unknown[] = []) {
    calls.push({ sql, values });
    let rows: Record<string, unknown>[] = [];
    if (sql.includes('as allowed')) rows = [{ allowed: !options.denied }];
    else if (sql.includes('select status,payment_status')) rows = [{ status: 'ordered', payment_status: options.paid ? 'paid' : 'pending', total: '40.00', version: options.stale ? '2' : '1' }];
    else if (sql.includes("provider='manual_external'")) rows = [{ payment_id: paymentId }];
    else if (sql.includes('payment_id<>')) rows = options.otherPaid ? [{ payment_id: 'other' }] : [];
    else if (sql.includes('select payment_id from public.payments')) rows = options.otherPaid ? [{ payment_id: 'other' }] : [];
    else if (sql.includes('to_regclass')) rows = [{ present: Boolean(options.bundle) }];
    else if (sql.includes('from public.order_bundles')) rows = options.bundle ? [{ order_bundle_id: 'bundle', product_id: productId, quantity: '4', per_bundle: 2, unit_count: 2 }] : [];
    else if (sql.includes('from public.order_items')) rows = [{ product_id: productId, product_variant_id: null, quantity_sets: 2, set_size_snapshot: 3 }];
    else if (sql.includes('from public.inventory_movements')) rows = options.missingHistory ? [] : [{ product_id: productId, product_variant_id: null, quantity: options.bundle ? 10 : 6 }];
    else if (sql.startsWith('update public.products')) rows = options.noStock ? [] : [{ after: options.paid ? 10 : 4 }];
    else if (sql.startsWith('update public.orders')) rows = [{ version: '3' }];
    return { rows, rowCount: rows.length };
  }, release() {} } as unknown as SqlClient;
  return { calls, service: createManualPaymentService(async () => client) };
}

test('external payment confirmation records the full amount and deducts snapshot units atomically', async () => {
  const f = fixture();
  const result = await f.service.change(orderId, '1', 'confirm', 'העברה בנקאית', actor);
  assert.equal(result.paymentStatus, 'paid');
  assert.deepEqual(f.calls.find(c => c.sql.startsWith('update public.products'))?.values.slice(0, 2), [productId, -6]);
  const payment = f.calls.find(c => c.sql.includes('insert into public.payments'))!;
  assert.equal(payment.values[2], '40.00'); assert.match(String(payment.values[3]), /העברה בנקאית/);
  assert.ok(f.calls.some(c => c.sql.includes('admin_audit_log'))); assert.equal(f.calls.at(-1)?.sql, 'commit');
});

test('reverting a manual confirmation restores exactly its recorded stock and marks payment pending', async () => {
  const f = fixture({ paid: true });
  const result = await f.service.change(orderId, '1', 'revert', 'ההעברה לא התקבלה', actor);
  assert.equal(result.paymentStatus, 'pending');
  assert.deepEqual(f.calls.find(c => c.sql.startsWith('update public.products'))?.values.slice(0, 2), [productId, 6]);
  assert.ok(f.calls.some(c => c.sql.includes("set status='failed'")));
  assert.equal(f.calls.at(-1)?.sql, 'commit');
});

test('stale, unauthorized, insufficient stock and inconsistent histories fail without commit', async () => {
  for (const options of [{ denied: true }, { stale: true }, { noStock: true }, { paid: true, missingHistory: true }, { paid: true, otherPaid: true }]) {
    const f = fixture(options);
    await assert.rejects(f.service.change(orderId, '1', options.paid ? 'revert' : 'confirm', 'בדיקה', actor));
    assert.equal(f.calls.at(-1)?.sql, 'rollback');
    assert.ok(!f.calls.some(c => c.sql === 'commit'));
  }
});

test('a payment method or reversal explanation is required', async () => {
  const f = fixture();
  await assert.rejects(f.service.change(orderId, '1', 'confirm', '  ', actor), { code: 'VALIDATION_ERROR' });
  assert.equal(f.calls.length, 0);
});

test('manual payment and reversal combine bundle components with loose items exactly once', async () => {
  const confirmed = fixture({ bundle: true });
  await confirmed.service.change(orderId, '1', 'confirm', 'העברה בנקאית', actor);
  assert.deepEqual(confirmed.calls.find(call => call.sql.startsWith('update public.products'))?.values.slice(0, 2), [productId, -10]);
  const reverted = fixture({ paid: true, bundle: true });
  await reverted.service.change(orderId, '1', 'revert', 'ביטול אישור', actor);
  assert.deepEqual(reverted.calls.find(call => call.sql.startsWith('update public.products'))?.values.slice(0, 2), [productId, 10]);
});
