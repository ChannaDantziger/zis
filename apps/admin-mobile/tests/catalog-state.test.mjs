import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { loadSource } from './load-source.mjs';

const requestUrl = `data:text/javascript;base64,${Buffer.from('export const request = (...args) => globalThis.catalogRequest(...args);').toString('base64')}`;
const catalogUrl = await loadSource('../src/features/catalog/catalog.store.ts', {
  mobx: import.meta.resolve('mobx'), '../../shared/api/http-client.js': requestUrl,
});
const { CatalogStore, catalogStore } = await import(catalogUrl);
const mediaUrl = await loadSource('../src/features/catalog/catalog-media.store.ts', {
  mobx: import.meta.resolve('mobx'), '../../shared/api/http-client.js': requestUrl,
  './catalog.store.js': catalogUrl,
});
const { CatalogMediaStore } = await import(mediaUrl);
const product = { productId: 'product', categoryId: 'category', name: 'Fixture', description: null, setSize: 1, minimumSets: 1, status: 'draft', version: '1', variants: [], images: [] };
const page = (number) => ({ data: [product], categories: [], page: number, pageSize: 25, totalItems: 2 });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => { catalogStore.reset(); });

test('the latest catalog page wins even when earlier requests resolve later', async () => {
  const store = new CatalogStore(), first = deferred(), second = deferred();
  globalThis.catalogRequest = (path) => path.endsWith('=1') ? first.promise : second.promise;
  const old = store.load(1), current = store.load(2);
  second.resolve(page(2)); await current;
  first.resolve(page(1)); await old;
  assert.equal(store.catalog.page, 2); assert.equal(store.page, 2);
});

test('stale catalog failures cannot replace the new page error or loading state', async () => {
  const store = new CatalogStore(), first = deferred(), second = deferred();
  globalThis.catalogRequest = (path) => path.endsWith('=1') ? first.promise : second.promise;
  const old = store.load(1), current = store.load(2);
  first.reject(new Error('old failure')); await old;
  assert.equal(store.loading, true); assert.equal(store.error, '');
  second.resolve(page(2)); await current;
});

test('reset cancels UI effects from both old loads and old product saves', async () => {
  const store = new CatalogStore(), pending = deferred();
  let calls = 0; globalThis.catalogRequest = () => { calls++; return pending.promise; };
  store.newProduct(); const saving = store.saveProduct(); store.reset();
  pending.resolve({ productId: 'old-private-product' }); await saving;
  assert.equal(calls, 1); assert.equal(store.product, null); assert.equal(store.success, '');
  const failure = deferred(); globalThis.catalogRequest = () => failure.promise;
  const loading = store.load(); store.reset(); failure.reject(new Error('previous user'));
  await loading; assert.equal(store.error, ''); assert.equal(store.loading, false);
});

test('successful product creation followed by a refresh failure retries only reads', async () => {
  const store = new CatalogStore(); store.newProduct();
  const calls = []; let failed = false;
  globalThis.catalogRequest = async (path, init) => {
    calls.push(init?.method ?? 'GET');
    if (init?.method === 'POST') return { productId: 'product' };
    if (!failed) { failed = true; throw new Error('network'); }
    return path.includes('?') ? page(1) : product;
  };
  await store.saveProduct(); assert.equal(store.productNeedsRefresh, true);
  store.setProduct('name', 'ignored during recovery'); assert.equal(store.product.name, '');
  await store.saveProduct();
  assert.equal(calls.filter((method) => method === 'POST').length, 1);
  assert.equal(store.product.productId, 'product'); assert.equal(store.productNeedsRefresh, false);
});

test('successful variant creation followed by a refresh failure retries only reads', async () => {
  const store = new CatalogStore(); store.editProduct(product); store.editVariant();
  const calls = []; let failed = false;
  globalThis.catalogRequest = async (path, init) => {
    calls.push(init?.method ?? 'GET');
    if (init?.method === 'POST') return { productVariantId: 'variant' };
    if (!failed) { failed = true; throw new Error('network'); }
    return path.includes('?') ? page(1) : product;
  };
  await store.saveVariant(); assert.equal(store.variantNeedsRefresh, true);
  await store.saveVariant();
  assert.equal(calls.filter((method) => method === 'POST').length, 1);
  assert.equal(store.variant, null); assert.equal(store.variantNeedsRefresh, false);
});

test('uploaded media is reused after failed metadata creation', async () => {
  catalogStore.editProduct(product); const media = new CatalogMediaStore();
  media.file = { type: 'image/png', name: 'fixture.png' };
  const calls = []; let failure = true;
  globalThis.catalogRequest = async (path, init) => {
    calls.push(path);
    if (path.endsWith('/upload')) return { storagePath: 'zis-product-media/fixture.png', url: 'fixture' };
    if (init?.method === 'POST' && failure) { failure = false; throw new Error('metadata'); }
    return product;
  };
  await media.save(); assert.ok(media.uploaded); assert.equal(media.metadataSaved, false);
  await media.save();
  assert.equal(calls.filter((path) => path.endsWith('/upload')).length, 1);
  assert.equal(calls.filter((path) => path.endsWith('/images')).length, 2);
  assert.equal(media.uploaded, null); assert.equal(catalogStore.saving, false);
});

test('successful image metadata creation followed by a GET failure does not create twice', async () => {
  catalogStore.editProduct(product); const media = new CatalogMediaStore();
  media.uploaded = { storagePath: 'zis-product-media/fixture.png', url: 'fixture' };
  const calls = []; let failed = false;
  globalThis.catalogRequest = async (path, init) => {
    calls.push(init?.method ?? 'GET');
    if (init?.method === 'POST') return { imageId: 'image' };
    if (!failed) { failed = true; throw new Error('refresh failed'); }
    return product;
  };
  await media.save(); assert.equal(media.metadataSaved, true);
  await media.save();
  assert.deepEqual(calls, ['POST', 'GET', 'GET', 'GET']); assert.equal(media.metadataSaved, false);
});

test('media reset revokes preview and prevents stale upload from attaching to the new session', async () => {
  catalogStore.editProduct(product); const media = new CatalogMediaStore(), pending = deferred();
  media.file = { type: 'image/png', name: 'fixture.png' }; media.preview = 'blob:fixture';
  const original = URL.revokeObjectURL, revoked = [];
  URL.revokeObjectURL = (url) => revoked.push(url);
  let calls = 0; globalThis.catalogRequest = () => { calls++; return pending.promise; };
  try {
    const saving = media.save(); catalogStore.reset(); media.reset();
    assert.equal(media.saving, false); assert.equal(catalogStore.saving, false);
    pending.resolve({ storagePath: 'zis-product-media/old.png', url: 'old-user' }); await saving;
    assert.deepEqual(revoked, ['blob:fixture']); assert.equal(calls, 1);
    assert.equal(media.uploaded, null); assert.equal(media.success, ''); assert.equal(media.error, '');
  } finally { URL.revokeObjectURL = original; }
});
test('an old media failure cannot unlock a new save after reset', async () => {
  catalogStore.editProduct(product); const media = new CatalogMediaStore();
  const oldUpload = deferred(), newUpload = deferred(); let calls = 0;
  globalThis.catalogRequest = () => (++calls === 1 ? oldUpload.promise : newUpload.promise);
  media.file = { type: 'image/png', name: 'old.png' }; const old = media.save();
  media.reset(); media.file = { type: 'image/png', name: 'new.png' }; const current = media.save();
  oldUpload.reject(new Error('old private error')); await old;
  assert.equal(media.error, ''); assert.equal(media.saving, true); assert.equal(catalogStore.saving, true);
  newUpload.reject(new Error('current error')); await current;
  assert.equal(media.error, 'current error'); assert.equal(media.saving, false); assert.equal(catalogStore.saving, false);
});

test('successful image PATCH followed by a refresh failure retries only the GET', async () => {
  catalogStore.editProduct(product); const media = new CatalogMediaStore();
  media.edit({ imageId: 'image', version: '1', altText: 'Fixture', imageType: 'gallery', sortOrder: 0, productVariantId: null });
  const calls = []; let failed = false;
  globalThis.catalogRequest = async (path, init) => {
    calls.push(init?.method ?? 'GET');
    if (init?.method === 'PATCH') return { imageId: 'image' };
    if (!failed) { failed = true; throw new Error('refresh failed'); }
    return product;
  };
  await media.save(); await media.save();
  assert.deepEqual(calls, ['PATCH', 'GET', 'GET', 'GET']); assert.equal(media.metadataSaved, false);
});
