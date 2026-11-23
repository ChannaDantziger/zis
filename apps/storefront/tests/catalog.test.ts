import assert from 'node:assert/strict';
import test from 'node:test';
import { readCatalogQuery, updateCatalogQuery } from '../src/features/catalog/query';
import { getProductImages } from '../src/features/product-gallery/images';
import type { CatalogProduct } from '../src/entities/product/types';

const primary = { imageId: 'primary', url: 'https://media.invalid/p', altText: 'Primary', imageType: 'primary' as const, sortOrder: 0 };
const second = { ...primary, imageId: 'second', imageType: 'gallery' as const, sortOrder: 1 };
const product: CatalogProduct = { productId: 'product', name: 'Test product', description: null,
  category: { categoryId: 'category', name: 'Test category', slug: 'test' }, setSize: 6, pricePerUnit: '12.50', availableSets: 5, displayOrder: 10,
  primaryImage: primary, gallery: [primary, second], variants: [] };

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
