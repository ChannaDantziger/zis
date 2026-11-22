import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, ACTOR_ID, PRODUCT_ID, NOW } from './fixture.mjs';

// All cases execute the application service directly against in-memory PostgreSQL.
test('service approves simple products once, records zero charge, and consumes physical units', async () => {
  const f = await createFixture();
  try {
    const result = await f.approve();
    assert.equal(result.paymentStatus, 'paid');
    assert.equal(result.charged, false);
    assert.equal(result.isTest, true);
    assert.equal(result.simulated, true);
    const after = await f.snapshot();
    assert.deepEqual(after.stock, [96, 8]);
    assert.equal(after.payment_status, 'paid');
    assert.ok(after.payment_confirmed_at);
    assert.deepEqual(after.counts, {
      test_payment_approvals: 1, payments: 1, inventory_movements: 2,
      order_status_history: 1, admin_audit_log: 1, admin_notifications: 0,
    });
    const payment = (await f.db.query('select provider, amount::text as amount,is_simulated,provider_payload from public.payments')).rows[0];
    assert.deepEqual(payment, { provider: 'admin_test', amount: '0.00', is_simulated: true,
      provider_payload: { charged: false, simulated: true } });
    assert.ok(f.calls.some(call => call.sql.includes('values($1::uuid,\'admin_test\',$1::text')));
    assert.equal(f.calls.at(-1).sql, 'commit');
  } finally { await f.close(); }
});

test('service replay after lost response does not deduct stock or write payment twice', async () => {
  const f = await createFixture();
  try {
    const result = await f.approve();
    const after = await f.snapshot();
    const replayStart = f.calls.length;
    const replay = await f.approve('1');
    assert.deepEqual(replay, result);
    assert.deepEqual(await f.snapshot(), after);
    assert.ok(!f.calls.slice(replayStart).some(({ sql }) => /^(insert|update)/.test(sql)));
  } finally { await f.close(); }
});

test('service handles variant stock and writes a manager low-stock notification', async () => {
  const f = await createFixture();
  try {
    await f.addVariant();
    await f.approve();
    const after = await f.snapshot();
    assert.deepEqual(after.stock, [96, 20]);
    assert.deepEqual(after.variants, [17]);
    assert.equal(after.counts.admin_notifications, 1);
    assert.equal(after.counts.inventory_movements, 2);
  } finally { await f.close(); }
});

const rejections = [
  { name: 'real order', code: 'TEST_ORDER_REQUIRED', sql: 'update public.orders set is_test=false' },
  { name: 'revoked manager', code: 'OPERATIONS_MANAGER_REQUIRED', sql: "update public.admin_users set status='disabled'" },
  { name: 'delivery-driver role', code: 'OPERATIONS_MANAGER_REQUIRED', sql: "update public.admin_users set role='delivery_driver'" },
  { name: 'stale version', code: 'ORDER_CHANGED', version: '1' },
  { name: 'cancelled order', code: 'INVALID_PAYMENT_STATE', sql: "update public.orders set status='cancelled'" },
  { name: 'insufficient second-product stock', code: 'STOCK_UNAVAILABLE', sql: 'update public.products set available_items=11 where product_id=$1', values: [PRODUCT_ID] },
  { name: 'changed set size', code: 'ORDER_PRODUCT_CHANGED', sql: 'update public.products set set_size=5 where product_id=$1', values: [PRODUCT_ID] },
  { name: 'missing units snapshot', code: 'ORDER_ITEM_UNITS_MISSING', sql: 'update public.order_items set set_size_snapshot=null' },
  { name: 'changed product price', code: 'ORDER_PRICE_CHANGED', sql: 'update public.products set price_per_item=16 where product_id=$1', values: [PRODUCT_ID] },
  { name: 'changed shipping price', code: 'ORDER_PRICE_CHANGED', sql: 'update public.shipping_rules set base_price=40' },
  { name: 'inactive product', code: 'STOCK_UNAVAILABLE', sql: "update public.products set status='draft' where product_id=$1", values: [PRODUCT_ID] },
  { name: 'inactive shipping rule', code: 'BUSINESS_RULE_VIOLATION', sql: 'update public.shipping_rules set is_active=false' },
  { name: 'closed store', code: 'BUSINESS_RULE_VIOLATION', sql: 'update public.store_settings set store_open=false' },
  { name: 'same-day cutoff passed', code: 'BUSINESS_RULE_VIOLATION', now: new Date('2026-11-09T10:00:00Z') },
  { name: 'payment schema column missing', code: '42703', sql: 'alter table public.payments rename column is_simulated to fixture_hidden_simulated' },
];

for (const scenario of rejections) {
  test(`service rejects ${scenario.name} without partial effects`, async () => {
    const f = await createFixture();
    try {
      if (scenario.sql) await f.db.query(scenario.sql, scenario.values ?? []);
      const before = await f.snapshot();
      await assert.rejects(f.approve(scenario.version ?? f.version, ACTOR_ID, scenario.now ?? NOW), { code: scenario.code });
      assert.deepEqual(await f.snapshot(), before);
      assert.equal(f.calls.at(-1).sql, 'rollback');
      assert.equal(f.releases, 1);
    } finally { await f.close(); }
  });
}

for (const failure of ['insert into public.order_status_history','insert into public.admin_audit_log']) {
  test(`service rolls back stock and payment on failure in ${failure}`, async () => {
    const f = await createFixture({ failAt: failure });
    try {
      const before = await f.snapshot();
      await assert.rejects(f.approve(), { code: 'TEST_WRITE_FAILURE' });
      assert.ok(f.calls.some(({ sql }) => sql.startsWith('update public.orders')));
      assert.deepEqual(await f.snapshot(), before);
    } finally { await f.close(); }
  });
}
