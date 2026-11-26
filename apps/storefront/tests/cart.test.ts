import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleKey, CartStore } from '../src/stores/cart.store';
import { ApiError } from '../src/shared/api/http-client';
import { CART_STORAGE_KEY, MAX_QUANTITY_SETS, priceInAgorot, readBundleCart, readCart, writeCart } from '../src/stores/cart.persistence';
import type { CatalogProduct } from '../src/entities/product/types';

const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reference = { productId, quantitySets: 2 };
const product: CatalogProduct = {
  productId, name: 'עוגיות', description: null, category: { categoryId: productId, name: 'מתוקים', slug: 'sweets' },
  setSize: 6, pricePerUnit: '12.35', availableSets: 20, displayOrder: 10, primaryImage: null, gallery: [],
  variants: [],
};

function fixture(changes: Partial<CatalogProduct> = {}): CatalogProduct {
  return { ...product, ...changes };
}

test('storage rejects corrupt, obsolete, excessive and non-reference data', () => {
  for (const value of ['{', '{"version":0,"items":[]}', JSON.stringify({ version: 1, items: Array(101).fill(reference) })]) {
    assert.deepEqual(readCart(value), []);
  }
  const value = JSON.stringify({ version: 1, items: [reference, { ...reference, quantitySets: -1 }, { ...reference, quantitySets: 1.5 }, { ...reference, productId: 'wrong' }, { ...reference, productVariantId: 'old-variant' }] });
  assert.deepEqual(readCart(value), [reference]);
  const contaminated = { ...reference, customer: { email: 'private@example.com' }, price: '0' };
  assert.deepEqual(JSON.parse(writeCart([contaminated])).items, [reference]);
});

test('storage merges duplicates with a quantity limit', () => {
  assert.equal(readCart(JSON.stringify({ version: 1, items: [{ ...reference, quantitySets: MAX_QUANTITY_SETS }, reference] }))[0].quantitySets, MAX_QUANTITY_SETS);
});

test('bundle references survive cart storage without prices or personal details and old carts remain readable', () => {
  const bundle = { bundleId: productId, quantity: 2, components: [{ productId, quantity: 3 }] };
  const contaminated = { ...bundle, price: '0' };
  const saved = writeCart([reference], [contaminated]);
  assert.deepEqual(readCart(saved), [reference]);
  assert.deepEqual(readBundleCart(saved), [bundle]);
  assert.deepEqual(readBundleCart(writeCart([reference])), []);
  assert.deepEqual(readBundleCart(JSON.stringify({ version: 2, bundles: [{ ...bundle, components: [...bundle.components, ...bundle.components] }] })), []);
});

test('bundle cart merges identical compositions and refuses stock shared with loose sets', () => {
  const store = new CartStore();
  const bundle = { bundleId: productId, categoryId: productId, categoryName: 'מתוקים', categorySlug: 'sweets',
    name: 'מארז', description: null, unitCount: 3, images: [] };
  const catalog = { bundles: [bundle], products: [{ productId, categoryId: productId, name: 'עוגיות',
    pricePerUnit: '12.35', availableItems: 12, image: null }] };
  const line = { bundleId: productId, quantity: 1, components: [{ productId, quantity: 3 }] };
  assert.equal(store.addBundle(line, catalog), true);
  assert.equal(store.addBundle(line, catalog), true);
  assert.equal(store.bundles[0].quantity, 2);
  assert.equal(store.subtotalAgorot, 7410);
  assert.equal(store.addItem(product, 2), false);
  assert.match(store.bundleError, /עוגיות/);
  assert.equal(store.setBundleQuantity(bundleKey(line), 5), false);
  assert.equal(store.bundles[0].quantity, 2);
  assert.equal(store.canContinue, false);
});

test('restored bundles reload live details and stay blocked from checkout while integration is incomplete', async () => {
  const bundle = { bundleId: productId, categoryId: productId, categoryName: 'מתוקים', categorySlug: 'sweets',
    name: 'מארז', description: null, unitCount: 3, images: [] };
  const catalog = { bundles: [bundle], products: [{ productId, categoryId: productId, name: 'עוגיות',
    pricePerUnit: '12.35', availableItems: 12, image: null }] };
  const line = { bundleId: productId, quantity: 1, components: [{ productId, quantity: 3 }] };
  const store = new CartStore({ getItem: () => writeCart([], [line]), setItem: () => {} }, async () => product, async () => catalog);
  assert.equal(store.subtotalAgorot, null);
  await store.refresh();
  assert.equal(store.subtotalAgorot, 3705);
  assert.equal(store.canContinue, false);
});

test('prices use integer agorot and reject invalid values', () => {
  assert.equal(priceInAgorot('12.35'), 1235);
  assert.equal(priceInAgorot('0.1'), 10);
  for (const value of ['NaN', '-1', '1e10', '12.345']) assert.equal(priceInAgorot(value), null);
});

test('adding merges by product, validates quantity and persists references only', () => {
  let saved = '';
  const store = new CartStore({ getItem: () => null, setItem: (key, value) => { assert.equal(key, CART_STORAGE_KEY); saved = value; } });
  assert.equal(store.addItem(product, 2), true);
  assert.equal(store.addItem(product, 2), true);
  assert.equal(store.totalSets, 4);
  assert.equal(store.subtotalAgorot, 29640);
  assert.equal(store.addItem(product, 21), false);
  assert.equal(store.addItem(product, 0.5), false);
  assert.deepEqual(JSON.parse(saved).items, [{ productId, quantitySets: 4 }]);
  store.removeItem(`product:${productId}`);
  assert.equal(store.totalSets, 0);
});

test('restored cart is blocked until API details load', async () => {
  const store = new CartStore({ getItem: () => writeCart([reference]), setItem: () => {} }, async () => product);
  assert.equal(store.canContinue, false);
  assert.equal(store.subtotalAgorot, null);
  await store.refresh();
  assert.equal(store.canContinue, true);
  assert.equal(store.subtotalAgorot, 14820);
});

test('refresh presents changed price and insufficient availability without silently changing quantity', async () => {
  const store = new CartStore(undefined, async () => fixture({ pricePerUnit: '20.00', availableSets: 1 }));
  store.addItem(product, 2);
  await store.refresh();
  assert.equal(store.details.get(`product:${productId}`)?.priceChanged, true);
  assert.equal(store.details.get(`product:${productId}`)?.availabilityChanged, true);
  assert.equal(store.items[0].quantitySets, 2);
  assert.equal(store.canContinue, false);
});

test('unsupported complex product or deleted product blocks continuation', async () => {
  for (const loader of [async () => ({ ...product, variants: [{}] }), async () => { throw new ApiError('missing', 404, 'NOT_FOUND'); }]) {
    const store = new CartStore(undefined, loader);
    store.addItem(product, 2);
    await store.refresh();
    assert.equal(store.missing.has(`product:${productId}`), true);
    assert.equal(store.canContinue, false);
    assert.equal(store.totalSets, 2);
  }
});

test('network failure blocks continuation without deleting items', async () => {
  const store = new CartStore(undefined, async () => { throw new Error('offline'); });
  store.addItem(product, 2);
  await store.refresh();
  assert.ok(store.refreshError);
  assert.equal(store.canContinue, false);
  assert.equal(store.totalSets, 2);
});

test('storage failure does not prevent cart use', () => {
  const store = new CartStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } });
  assert.equal(store.addItem(product, 2), true);
  assert.ok(store.storageNotice);
  assert.equal(store.totalSets, 2);
});

test('refresh cannot resurrect an item removed while API request is pending', async () => {
  let resolve!: (value: CatalogProduct) => void;
  const store = new CartStore(undefined, () => new Promise((done) => { resolve = done; }));
  store.addItem(product, 2);
  const pending = store.refresh();
  store.removeItem(`product:${productId}`);
  resolve(product);
  await pending;
  assert.equal(store.details.size, 0);
  assert.equal(store.totalSets, 0);
});

test('an older refresh cannot replace a newer price response', async () => {
  const resolvers: ((value: CatalogProduct) => void)[] = [];
  const store = new CartStore(undefined, () => new Promise((done) => resolvers.push(done)));
  store.addItem(product, 2);
  const first = store.refresh();
  const second = store.refresh();
  resolvers[1](fixture({ pricePerUnit: '25.00' }));
  await second;
  resolvers[0](fixture({ pricePerUnit: '10.00' }));
  await first;
  assert.equal(store.subtotalAgorot, 30000);
});

test('quantity changes have no product minimum and still respect availability', () => {
  const store = new CartStore();
  store.addItem(product, 2);
  store.setQuantity(`product:${productId}`, 1);
  assert.equal(store.canContinue, true);
  store.setQuantity(`product:${productId}`, 3);
  assert.equal(store.canContinue, true);
  store.setQuantity(`product:${productId}`, 21);
  assert.equal(store.canContinue, false);
});
