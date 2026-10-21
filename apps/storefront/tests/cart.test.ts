import assert from 'node:assert/strict';
import test from 'node:test';
import { CartStore } from '../src/stores/cart.store';
import { ApiError } from '../src/shared/api/http-client';
import { CART_STORAGE_KEY, MAX_QUANTITY_SETS, priceInAgorot, readCart, writeCart } from '../src/stores/cart.persistence';
import type { CatalogProduct } from '../src/entities/product/types';

const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const productVariantId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reference = { productId, productVariantId, quantitySets: 2 };
const product: CatalogProduct = {
  productId, name: 'עוגיות', description: null, category: { categoryId: productId, name: 'מתוקים', slug: 'sweets' },
  setSize: 6, primaryImage: null, gallery: [],
  variants: [{ productVariantId, name: 'שוקולד', productCode: 'cookie-chocolate', pricePerSet: '12.35', availableSets: 20,
    isDefault: true, attributes: null, primaryImage: null, gallery: [] }],
};

function fixture(changes: Partial<CatalogProduct['variants'][number]> = {}): CatalogProduct {
  return { ...product, variants: [{ ...product.variants[0], ...changes }] };
}

test('storage rejects corrupt, obsolete, excessive and non-reference data', () => {
  for (const value of ['{', '{"version":0,"items":[]}', JSON.stringify({ version: 1, items: Array(101).fill(reference) })]) {
    assert.deepEqual(readCart(value), []);
  }
  const value = JSON.stringify({ version: 1, items: [reference, { ...reference, quantitySets: -1 }, { ...reference, quantitySets: 1.5 }, { ...reference, productId: 'wrong' }] });
  assert.deepEqual(readCart(value), [reference]);
  const contaminated = { ...reference, customer: { email: 'private@example.com' }, price: '0' };
  assert.deepEqual(JSON.parse(writeCart([contaminated])).items, [reference]);
});

test('storage merges duplicates with a quantity limit', () => {
  assert.equal(readCart(JSON.stringify({ version: 1, items: [{ ...reference, quantitySets: MAX_QUANTITY_SETS }, reference] }))[0].quantitySets, MAX_QUANTITY_SETS);
});

test('prices use integer agorot and reject invalid values', () => {
  assert.equal(priceInAgorot('12.35'), 1235);
  assert.equal(priceInAgorot('0.1'), 10);
  for (const value of ['NaN', '-1', '1e10', '12.345']) assert.equal(priceInAgorot(value), null);
});

test('adding merges by variant, validates quantity and persists references only', () => {
  let saved = '';
  const store = new CartStore({ getItem: () => null, setItem: (key, value) => { assert.equal(key, CART_STORAGE_KEY); saved = value; } });
  assert.equal(store.addItem(product, product.variants[0], 2), true);
  assert.equal(store.addItem(product, product.variants[0], 2), true);
  assert.equal(store.totalSets, 4);
  assert.equal(store.subtotalAgorot, 4940);
  assert.equal(store.addItem(product, product.variants[0], 21), false);
  assert.equal(store.addItem(product, product.variants[0], 0.5), false);
  assert.deepEqual(JSON.parse(saved).items, [{ ...reference, quantitySets: 4 }]);
  store.removeItem(productVariantId);
  assert.equal(store.totalSets, 0);
});

test('restored cart is blocked until API details load', async () => {
  const store = new CartStore({ getItem: () => writeCart([reference]), setItem: () => {} }, async () => product);
  assert.equal(store.canContinue, false);
  assert.equal(store.subtotalAgorot, null);
  await store.refresh();
  assert.equal(store.canContinue, true);
  assert.equal(store.subtotalAgorot, 2470);
});

test('refresh presents changed price and insufficient availability without silently changing quantity', async () => {
  const store = new CartStore(undefined, async () => fixture({ pricePerSet: '20.00', availableSets: 1 }));
  store.addItem(product, product.variants[0], 2);
  await store.refresh();
  assert.equal(store.details.get(productVariantId)?.priceChanged, true);
  assert.equal(store.details.get(productVariantId)?.availabilityChanged, true);
  assert.equal(store.items[0].quantitySets, 2);
  assert.equal(store.canContinue, false);
});

test('a deleted variant or product remains removable and blocks continuation', async () => {
  for (const loader of [async () => ({ ...product, variants: [] }), async () => { throw new ApiError('missing', 404, 'NOT_FOUND'); }]) {
    const store = new CartStore(undefined, loader);
    store.addItem(product, product.variants[0], 2);
    await store.refresh();
    assert.equal(store.missing.has(productVariantId), true);
    assert.equal(store.canContinue, false);
    assert.equal(store.totalSets, 2);
  }
});

test('network failure blocks continuation without deleting items', async () => {
  const store = new CartStore(undefined, async () => { throw new Error('offline'); });
  store.addItem(product, product.variants[0], 2);
  await store.refresh();
  assert.ok(store.refreshError);
  assert.equal(store.canContinue, false);
  assert.equal(store.totalSets, 2);
});

test('storage failure does not prevent cart use', () => {
  const store = new CartStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } });
  assert.equal(store.addItem(product, product.variants[0], 2), true);
  assert.ok(store.storageNotice);
  assert.equal(store.totalSets, 2);
});

test('refresh cannot resurrect an item removed while API request is pending', async () => {
  let resolve!: (value: CatalogProduct) => void;
  const store = new CartStore(undefined, () => new Promise((done) => { resolve = done; }));
  store.addItem(product, product.variants[0], 2);
  const pending = store.refresh();
  store.removeItem(productVariantId);
  resolve(product);
  await pending;
  assert.equal(store.details.size, 0);
  assert.equal(store.totalSets, 0);
});

test('an older refresh cannot replace a newer price response', async () => {
  const resolvers: ((value: CatalogProduct) => void)[] = [];
  const store = new CartStore(undefined, () => new Promise((done) => resolvers.push(done)));
  store.addItem(product, product.variants[0], 2);
  const first = store.refresh();
  const second = store.refresh();
  resolvers[1](fixture({ pricePerSet: '25.00' }));
  await second;
  resolvers[0](fixture({ pricePerSet: '10.00' }));
  await first;
  assert.equal(store.subtotalAgorot, 5000);
});

test('quantity changes have no product minimum and still respect availability', () => {
  const store = new CartStore();
  store.addItem(product, product.variants[0], 2);
  store.setQuantity(productVariantId, 1);
  assert.equal(store.canContinue, true);
  store.setQuantity(productVariantId, 3);
  assert.equal(store.canContinue, true);
  store.setQuantity(productVariantId, 21);
  assert.equal(store.canContinue, false);
});
