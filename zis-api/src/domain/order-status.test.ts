import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartPreparation } from './order-status.js';

test('preparation requires paid order and configured preparation status', () => {
  assert.equal(canStartPreparation({ orderStatus: 'ordered', paymentStatus: 'paid', defaults: { preparationStatus: 'ordered' } }), true);
  assert.equal(canStartPreparation({ orderStatus: 'ordered', paymentStatus: 'pending', defaults: { preparationStatus: 'ordered' } }), false);
  assert.equal(canStartPreparation({ orderStatus: 'in_preparation', paymentStatus: 'paid', defaults: { preparationStatus: 'ordered' } }), false);
});
