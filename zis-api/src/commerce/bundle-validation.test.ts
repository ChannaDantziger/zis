import assert from 'node:assert/strict';
import test from 'node:test';
import { readBundleInputs } from './bundle-validation.js';

const id = '00000000-0000-4000-8000-000000000001';
const product = '00000000-0000-4000-8000-000000000002';
const line = '00000000-0000-4000-8000-000000000003';
test('bundle input is canonical and permits an existing order bundle identity', () => {
  assert.deepEqual(readBundleInputs([{ bundleId: id, orderBundleId: line, quantity: 2, components: [{ productId: product, quantity: 3 }] }]),
    [{ bundleId: id, orderBundleId: line, quantity: 2, components: [{ productId: product, quantity: 3 }] }]);
  assert.deepEqual(readBundleInputs(undefined), []);
});
test('bundle input rejects duplicate components, duplicate identities and invalid quantities', () => {
  const valid = { bundleId: id, orderBundleId: line, quantity: 2, components: [{ productId: product, quantity: 3 }] };
  assert.throws(() => readBundleInputs([{ ...valid, components: [...valid.components, ...valid.components] }]));
  assert.throws(() => readBundleInputs([valid, valid]));
  assert.throws(() => readBundleInputs([{ ...valid, quantity: -1 }]));
});
