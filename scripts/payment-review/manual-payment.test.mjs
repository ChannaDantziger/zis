import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixture, ORDER_ID, ACTOR_ID } from './fixture.mjs';
import { createManualPaymentService } from '../../zis-api/src/commerce/manual-payment.service.ts';

test('manual confirmation and reversal use one transaction and restore exact stock', async () => {
  const fixture = await createFixture();
  try {
    await fixture.db.exec('alter table public.payments add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now()');
    const client = { query: async (sql, values) => {
      const result = await fixture.db.query(sql, values ? [...values] : []);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    }, release() {} };
    const service = createManualPaymentService(async () => client);
    const before = await fixture.snapshot();
    const paid = await service.change(ORDER_ID, fixture.version, 'confirm', 'העברה בנקאית', ACTOR_ID);
    const afterPaid = await fixture.snapshot();
    assert.equal(paid.paymentStatus, 'paid');
    assert.deepEqual(afterPaid.stock, before.stock.map((value, index) => value - [4, 12][index]));
    await assert.rejects(service.change(ORDER_ID, fixture.version, 'confirm', 'כפול', ACTOR_ID));
    const pending = await service.change(ORDER_ID, paid.version, 'revert', 'ההעברה לא התקבלה', ACTOR_ID);
    const afterReversal = await fixture.snapshot();
    assert.equal(pending.paymentStatus, 'pending');
    assert.deepEqual(afterReversal.stock, before.stock);
    assert.equal(afterReversal.counts.inventory_movements, 4);
    assert.equal(afterReversal.counts.admin_audit_log, 2);
    await assert.rejects(service.change(ORDER_ID, paid.version, 'revert', 'כפול', ACTOR_ID));
  } finally { await fixture.close(); }
});

test('stock shortage rolls back earlier stock changes and creates no payment', async () => {
  const fixture = await createFixture();
  try {
    await fixture.db.exec('alter table public.payments add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now()');
    await fixture.db.query('update public.products set available_items=0 where product_id=$1', ['00000000-0000-4000-8000-000000000003']);
    const before = await fixture.snapshot();
    const client = { query: async (sql, values) => {
      const result = await fixture.db.query(sql, values ? [...values] : []);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    }, release() {} };
    const service = createManualPaymentService(async () => client);
    await assert.rejects(service.change(ORDER_ID, fixture.version, 'confirm', 'מזומן', ACTOR_ID), { code: 'STOCK_UNAVAILABLE' });
    const after = await fixture.snapshot();
    assert.deepEqual(after.stock, before.stock);
    assert.equal(after.payment_status, 'pending');
    assert.equal(after.counts.payments, 0);
    assert.equal(after.counts.inventory_movements, 0);
  } finally { await fixture.close(); }
});
