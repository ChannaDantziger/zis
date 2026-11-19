import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSource } from './load-source.mjs';

const { displayStage } = await import(await loadSource('../src/features/home/order-stage.ts'));

test('pending payment is a separate stage before the paid order', () => {
  assert.equal(displayStage({ status: 'ordered', paymentStatus: 'pending' }), 'payment_pending');
  assert.equal(displayStage({ status: 'ordered', paymentStatus: 'paid' }), 'ordered');
  assert.equal(displayStage({ status: 'in_preparation', paymentStatus: 'paid' }), 'in_preparation');
  assert.equal(displayStage({ status: 'cancelled', paymentStatus: 'pending' }), 'cancelled');
  assert.equal(displayStage({ status: 'ordered', paymentStatus: 'failed' }), 'ordered');
});
