import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import { createHomeService } from './home.service.js';
import type { HomeOrder, HomeOrderRepository } from './home.types.js';

describe('admin home data', () => {
  it('accepts a rolling eight-day inclusive range and signs each product image once', async () => {
    const ranges: string[][] = [], signed: string[] = [];
    const repository: HomeOrderRepository = { list: async (from, to) => {
      ranges.push([from, to]);
      return [{ orderId: 'o1', orderNumber: 'Z1', status: 'ordered', paymentStatus: 'paid',
        deliveryDate: from, city: 'ירושלים', address: 'המלך 1', zoneName: 'ירושלים', version: '1', packageCount: null,
        items: ['i1', 'i2'].map(orderItemId => ({ orderItemId, productName: 'מוצר', variantName: '',
          quantitySets: 2, categoryName: 'עוגות', productId: 'p1', productVariantId: null,
          imagePath: 'image/p1', imageUrl: null })) }];
    } };
    const service = createHomeService(repository, async path => { signed.push(path); return `signed:${path}`; });
    const result = await service.listOrders('2026-11-10', '2026-11-17');
    assert.deepEqual(ranges, [['2026-11-10', '2026-11-17']]);
    assert.deepEqual(signed, ['image/p1']);
    assert.deepEqual(result.orders[0].items.map(item => item.imageUrl), ['signed:image/p1', 'signed:image/p1']);
  });

  it('rejects invalid or longer ranges before reading orders', async () => {
    let reads = 0;
    const service = createHomeService({ list: async () => { reads++; return []; } }, async () => '');
    for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-11-10', '2026-11-18'], ['2026-11-11', '2026-11-10']])
      await assert.rejects(() => service.listOrders(from, to), error => error instanceof ApiError && error.statusCode === 400);
    assert.equal(reads, 0);
  });

  it('uses the bundle image for order summaries and keeps the storage path private', async () => {
    const order = { items: [], bundles: [{ bundleName: 'מארז', imagePath: 'bundle-image', components: [] }] } as unknown as HomeOrder;
    const result = await createHomeService({ list: async () => [order] }, async path => `signed:${path}`).listOrders('2026-11-10', '2026-11-10');
    const bundle = result.orders[0].bundles![0] as unknown as { imageUrl: string; imagePath?: string };
    assert.equal(bundle.imageUrl, 'signed:bundle-image');
    assert.equal('imagePath' in bundle, false);
  });
});
