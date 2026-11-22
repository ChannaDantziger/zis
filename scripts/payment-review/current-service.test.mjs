import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture } from './fixture.mjs';
import { errorHandler } from '../../zis-api/src/middleware/error-handler.ts';

test('application service approves a simple-product test order with zero charge', async () => {
  const f = await createFixture();
  try {
    const result = await f.approve();
    assert.equal(result.charged, false);
    assert.equal(result.paymentStatus, 'paid');
    assert.deepEqual((await f.snapshot()).stock, [96, 8]);
    assert.equal((await f.snapshot()).counts.payments, 1);
    assert.equal(f.calls.at(-1).sql, 'commit');
  } finally { await f.close(); }
});

test('application service approves variant orders and sends a low-stock notice', async () => {
  const f = await createFixture();
  try {
    await f.addVariant();
    const result = await f.approve();
    assert.equal(result.charged, false);
    const after = await f.snapshot();
    assert.deepEqual(after.variants, [17]);
    assert.equal(after.counts.admin_notifications, 1);
  } finally { await f.close(); }
});

test('SQLSTATE 42P08 is safely preserved in server diagnostics', () => {
  let status;
  let body;
  const logs = [];
  const originalError = console.error;
  console.error = message => logs.push(JSON.parse(message));
  try {
    const response = {
      locals: { requestId: 'synthetic-review-request' },
      status(value) { status = value; return this; },
      json(value) { body = value; },
    };
    errorHandler(Object.assign(new Error('synthetic SQL error'), { code: '42P08' }),
      { method: 'POST', path: '/admin/test-orders/synthetic/approve-payment' }, response, () => {});
    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.equal(body.error.requestId, 'synthetic-review-request');
    assert.equal(logs[0].diagnosticCode, '42P08');
    assert.ok(!JSON.stringify(body).includes('synthetic SQL error'));
  } finally { console.error = originalError; }
});
