import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBundleOrder } from './bundle-calculation.js';
import type { BundleOrderInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';

const bundles = [{ bundleId: 'bundle', categoryId: 'category', name: 'מארז', unitCount: 3, active: true }];
const products = [
  { productId: 'a', categoryId: 'category', name: 'שוקולד', pricePerUnit: '10.25', availableItems: 10, active: true },
  { productId: 'b', categoryId: 'category', name: 'וניל', pricePerUnit: '7.50', availableItems: 12, active: true },
];
const selection: BundleOrderInput = { bundleId: 'bundle', quantity: 2,
  components: [{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 1 }] };

test('bundle totals use per-unit agorot and quantity while combining physical stock with loose sets', () => {
  const result = calculateBundleOrder([selection], bundles, products, [{ productId: 'a', quantitySets: 3, setSize: 2 }]);
  assert.equal(result.bundles[0].unitPriceAgorot, 2800);
  assert.equal(result.subtotalAgorot, 5600);
});
test('shared physical stock is checked across different bundles and loose products', () => {
  assert.throws(() => calculateBundleOrder([selection, selection], bundles, products, [{ productId: 'a', quantitySets: 2, setSize: 2 }]),
    error => error instanceof ApiError && error.code === 'STOCK_UNAVAILABLE' && error.fields?.a.includes('שוקולד'));
});
test('incomplete, duplicate and cross-category component selections are rejected', () => {
  assert.throws(() => calculateBundleOrder([{ ...selection, components: [{ productId: 'a', quantity: 1 }] }], bundles, products, []));
  assert.throws(() => calculateBundleOrder([{ ...selection, components: [{ productId: 'a', quantity: 1 }, { productId: 'a', quantity: 2 }] }], bundles, products, []));
  assert.throws(() => calculateBundleOrder([selection], bundles, products.map(product => ({ ...product, categoryId: 'other' })), []));
});
test('unpublished bundles and quantities exceeding supported limits are rejected', () => {
  assert.throws(() => calculateBundleOrder([selection], bundles.map(bundle => ({ ...bundle, active: false })), products, []));
  assert.throws(() => calculateBundleOrder([{ ...selection, quantity: Number.MAX_SAFE_INTEGER }], bundles, products, []));
});

test('pending bundle edits preserve existing component prices while pricing newly added components at current price', () => {
  const snapshot = { orderBundleId: 'line', bundleId: 'bundle', categoryId: 'category', bundleName: 'מארז', categoryName: 'קינוחים',
    unitCount: 3, quantity: 1, unitPrice: '24.00', lineTotal: '24.00', components: [{ productId: 'a', productName: 'שוקולד', quantity: 3, unitPrice: '8.00' }] };
  const updated = { ...selection, orderBundleId: 'line' };
  const result = calculateBundleOrder([updated], bundles, products, [], [snapshot]);
  assert.equal(result.bundles[0].unitPriceAgorot, 2350);
  assert.equal(result.subtotalAgorot, 4700);
  assert.throws(() => calculateBundleOrder([{ ...updated, orderBundleId: 'other' }], bundles, products, [], [snapshot]));
});
