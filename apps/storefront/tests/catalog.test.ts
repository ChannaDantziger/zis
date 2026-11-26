import assert from 'node:assert/strict';
import test from 'node:test';
import { readCatalogQuery, updateCatalogQuery } from '../src/features/catalog/query';
import { getProductImages } from '../src/features/product-gallery/images';
import type { CatalogProduct } from '../src/entities/product/types';
import type { BundleProduct } from '../src/features/bundles/types';
import { adjustSelection, initialSelection, priceAgorot, selectionTotal } from '../src/features/bundles/allocation';
import { productWindow } from '../src/features/bundles/pagination';
import { BUNDLE_PURCHASE_ENABLED, canEnableBundleTest } from '../src/features/bundles/feature';

const primary = { imageId: 'primary', url: 'https://media.invalid/p', altText: 'Primary', imageType: 'primary' as const, sortOrder: 0 };
const second = { ...primary, imageId: 'second', imageType: 'gallery' as const, sortOrder: 1 };
const product: CatalogProduct = { productId: 'product', name: 'Test product', description: null,
  category: { categoryId: 'category', name: 'Test category', slug: 'test' }, setSize: 6, pricePerUnit: '12.50', availableSets: 5, displayOrder: 10,
  primaryImage: primary, gallery: [primary, second], variants: [] };

test('bundle purchase test mode is off by default and cannot be enabled on a remote host', () => {
  assert.equal(BUNDLE_PURCHASE_ENABLED, false);
  assert.equal(canEnableBundleTest(true, 'localhost'), true);
  assert.equal(canEnableBundleTest(true, '127.0.0.1'), true);
  assert.equal(canEnableBundleTest(true, 'shop.example.test'), false);
  assert.equal(canEnableBundleTest(false, 'localhost'), false);
});

test('catalog URL parser normalizes malformed pages, sorting and excessive search', () => {
  const query = readCatalogQuery(new URLSearchParams({ page: '-3', sort: 'unsafe', direction: 'unsafe', search: ' x'.repeat(100) }));
  assert.equal(query.page, 1);
  assert.equal(query.sort, 'display');
  assert.equal(query.direction, 'asc');
  assert.equal(query.search?.length, 100);
  assert.equal(query.pageSize, 24);
  assert.equal(readCatalogQuery(new URLSearchParams({ page: '2.5' })).page, 1);
});

test('filter changes reset page and preserve unrelated URL state; paging preserves filters', () => {
  const current = new URLSearchParams('page=4&search=cake&campaign=approved');
  const filtered = updateCatalogQuery(current, { categorySlug: 'desserts' });
  assert.equal(filtered.has('page'), false);
  assert.equal(filtered.get('campaign'), 'approved');
  const paged = updateCatalogQuery(filtered, { page: '2' });
  assert.equal(paged.get('categorySlug'), 'desserts');
  assert.equal(paged.get('page'), '2');
  assert.equal(current.get('page'), '4');
});

test('product gallery contains only product-level media', () => {
  assert.deepEqual(getProductImages({ ...product, primaryImage: null, gallery: [] }), []);
  assert.deepEqual(getProductImages(product).map((image) => image.imageId), ['primary', 'second']);
});

const bundleProducts: BundleProduct[] = Array.from({ length: 5 }, (_, index) => ({
  productId: String(index), categoryId: 'category', name: String(index), pricePerUnit: index ? '15.15' : '10.10',
  availableItems: 20, image: null,
}));
test('bundle initial amounts are balanced, within stock, and add extra products when needed', () => {
  const result = initialSelection(bundleProducts, 11, () => 0.999)!;
  assert.deepEqual(Object.values(result), [3, 3, 3, 2]);
  const scarce = bundleProducts.map((item, i) => ({ ...item, availableItems: i < 4 ? 1 : 7 }));
  const more = initialSelection(scarce, 9, () => 0.999)!;
  assert.equal(selectionTotal(more), 9); assert.equal(more['4'], 5);
  assert.equal(initialSelection(scarce, 12, () => 0.999), null);
});
test('bundle adjust removes from largest and last on tie, and fills selected products only', () => {
  assert.deepEqual(adjustSelection(bundleProducts, { '0': 4, '1': 4, '2': 2 }, 9, 1), { '0': 4, '1': 3, '2': 2 });
  assert.deepEqual(adjustSelection(bundleProducts, { '0': 1, '1': 2 }, 6, 1), { '0': 3, '1': 3 });
  const small = bundleProducts.slice(0, 2).map(item => ({ ...item, availableItems: 2 }));
  assert.equal(adjustSelection(small, { '0': 1, '1': 1 }, 5, 1), null);
});
test('bundle quantities count physical inventory across identical boxes and price in agorot', () => {
  const products = [{ ...bundleProducts[0], availableItems: 4 }, { ...bundleProducts[1], availableItems: 8 }];
  assert.deepEqual(adjustSelection(products, { '0': 4, '1': 2 }, 6, 2), { '0': 2, '1': 4 });
  assert.equal(priceAgorot(products, { '0': 2, '1': 4 }), 8080n);
});
test('automatic adjustment uses default allocation when nothing is selected and checks the number of identical boxes', () => {
  const products = bundleProducts.map((item, index) => ({ ...item, availableItems: index === 4 ? 8 : 2 }));
  const result = adjustSelection(products, {}, 5, 2)!;
  assert.equal(selectionTotal(result), 5);
  for (const item of products) assert.ok((result[item.productId] ?? 0) * 2 <= item.availableItems);
  assert.equal(adjustSelection(products, {}, 9, 2), null);
  assert.equal(adjustSelection(products, {}, 5, 0), null);
});
test('combined paging places bundles first without skipping or duplicating products', () => {
  assert.deepEqual(productWindow(1, 24, 30).pageNumbers, []);
  assert.deepEqual(productWindow(2, 24, 30), { start: 24, productStart: 0, productEnd: 18, pageNumbers: [1] });
  assert.deepEqual(productWindow(3, 24, 30), { start: 48, productStart: 18, productEnd: 42, pageNumbers: [1, 2] });
  assert.deepEqual(productWindow(2, 24, 0), { start: 24, productStart: 24, productEnd: 48, pageNumbers: [2] });
});
