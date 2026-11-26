import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateOrderStock } from './order-stock.js';

test('inventory movements aggregate physical units from independent lines for the same product', () => {
  assert.deepEqual(aggregateOrderStock([
    { product_id: 'a', product_variant_id: null, quantity_sets: 2, set_size_snapshot: 6 },
    { product_id: 'a', product_variant_id: null, quantity_sets: 3, set_size_snapshot: 1 },
    { product_id: 'b', product_variant_id: 'v', quantity_sets: 2, set_size_snapshot: 4 },
  ]), [
    { product_id: 'a', product_variant_id: null, quantity: 15 },
    { product_id: 'b', product_variant_id: 'v', quantity: 2 },
  ]);
});
test('invalid legacy unit sizes and stock overflow fail closed', () => {
  assert.throws(() => aggregateOrderStock([{ product_id: 'a', product_variant_id: null, quantity_sets: 1, set_size_snapshot: null }]));
  assert.throws(() => aggregateOrderStock([{ product_id: 'a', product_variant_id: null, quantity_sets: 2_147_483_647, set_size_snapshot: 2 }]));
});
