import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogService } from './catalog.service.js';
import type { CatalogRepository } from './catalog.types.js';

test('catalog service falls back to product images for a variant without its own gallery', async () => {
  const repository: CatalogRepository = {
    async listCategories() { return []; },
    async listProducts() { return { products: [], totalItems: 0 }; },
    async getProduct() {
      return {
        productId: 'product-1',
        category: { categoryId: 'category-1', name: 'Cakes', slug: 'cakes' },
        name: 'Example',
        description: null,
        setSize: 1,
        minimumSets: 1,
        images: [{
          imageId: 'image-1', productId: 'product-1', productVariantId: null,
          storagePath: 'product/image-1.webp', altText: 'Example cake', imageType: 'primary', sortOrder: 0,
        }],
        variants: [{
          productVariantId: 'variant-1', productId: 'product-1', name: 'Default', productCode: 'EXAMPLE',
          pricePerSet: '100.00', availableSets: 3, isDefault: true, attributes: null, images: [],
        }],
      };
    },
  };
  const service = createCatalogService(repository, async (_bucket, path) => `https://media.invalid/${path}`);

  const product = await service.getProduct('product-1');

  assert.equal(product?.variants[0]?.primaryImage?.url, 'https://media.invalid/product/image-1.webp');
  assert.equal(product?.primaryImage?.altText, 'Example cake');
  assert.equal(product?.variants[0]?.gallery[0]?.url, 'https://media.invalid/product/image-1.webp');
});
