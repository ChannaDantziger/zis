import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import { createDashboardService } from './dashboard.service.js';
import type { AdminOrderDetails, DashboardRepository } from './dashboard.types.js';

function repository(): DashboardRepository {
  return {
    listOrderPage: async (query) => ({ data: [], variants: [], page: { page: query.page, pageSize: query.pageSize, totalItems: 0, totalPages: 0 } }),
    getOrder: async () => null,
    getDashboard: async (date) => ({ date, todayOrderCount: 0, cancelledOrderCount: 0, unreadNotificationCount: 0, statusCounts: [], openTasks: [], nextOrders: [], production: [] }),
    listOrders: async (query) => [{
      orderId: 'order', orderNumber: 'ZIS-1', status: query.status ?? 'ordered', total: '10.00', location: 'Tel Aviv', itemSummary: 'Box', hasOpenTask: false,
      deliveryDate: query.deliveryDate, city: 'Tel Aviv', productVariantId: null, allowedNextStatuses: ['in_preparation'], version: 'v1',
    }],
    getProduction: async () => [],
  };
}

describe('dashboard service', () => {
  it('normalizes a valid orders query', async () => {
    const rows = await createDashboardService(repository()).listOrders({ deliveryDate: '2026-09-24', sortBy: 'total', sortDirection: 'desc' });
    assert.equal(rows[0]?.deliveryDate, '2026-09-24');
  });

  it('rejects invalid dates and sort values', async () => {
    const service = createDashboardService(repository());
    assert.throws(() => service.getProduction('24-09-2026'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
    assert.throws(() => service.getProduction('2026-02-30'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
    assert.throws(() => service.listOrders({ deliveryDate: '2026-09-24', sortBy: 'bad' as never, sortDirection: 'asc' }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  });
});

it('signs order and bundle component images without exposing storage paths', async () => {
  const repo = repository();
  repo.getOrder = async () => ({ items: [{ orderItemId: 'item', imagePath: 'product-path' }],
    bundles: [{ orderBundleId: 'bundle', imagePath: 'bundle-path', components: [{ productId: 'product', imagePath: 'product-path' }] }] } as unknown as AdminOrderDetails);
  const signed: string[] = [];
  const order = await createDashboardService(repo, async path => { signed.push(path); return `signed:${path}`; }).getOrder('00000000-0000-4000-8000-000000000001');
  assert.deepEqual(signed.sort(), ['bundle-path', 'product-path']);
  assert.equal(order.items[0]?.imageUrl, 'signed:product-path');
  assert.equal('imagePath' in order.items[0]!, false);
  assert.equal((order.bundles?.[0]?.components[0] as { imageUrl?: string }).imageUrl, 'signed:product-path');
  assert.equal('imagePath' in order.bundles![0]!.components[0]!, false);
});

it('order pagination rejects unsafe pages, oversized pages and malformed variants before repository access', () => {
  const service = createDashboardService(repository());
  const query = { deliveryDate: '2026-10-09', sortBy: 'status', sortDirection: 'asc', page: 1, pageSize: 24 } as const;
  for (const changes of [{ page: 0 }, { pageSize: 51 }, { page: Number.MAX_SAFE_INTEGER }, { productVariantId: 'bad-id' }]) {
    assert.throws(() => service.listOrderPage({ ...query, ...changes }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  }
});
