import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from './fixture.mjs';

// This acceptance test imports and exercises the actual application service.
test('REGRESSION: a valid test order must be approved with zero charge', async () => {
  const f = await createFixture();
  try {
    const result = await f.approve();
    assert.equal(result.charged, false);
    assert.equal(result.paymentStatus, 'paid');
    const state = await f.snapshot();
    assert.deepEqual(state.stock, [96, 8]);
    assert.equal(state.counts.payments, 1);
    const payment = (await f.db.query('select amount::text as amount,is_simulated from public.payments')).rows[0];
    assert.deepEqual(payment, { amount: '0.00', is_simulated: true });
  } finally { await f.close(); }
});
