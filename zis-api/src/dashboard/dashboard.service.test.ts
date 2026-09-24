import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import { createDashboardService } from './dashboard.service.js';
import type { DashboardRepository } from './dashboard.types.js';

function repository(): DashboardRepository {
  return {
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
    await assert.rejects(() => service.getProduction('24-09-2026'), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
    await assert.rejects(() => service.listOrders({ deliveryDate: '2026-09-24', sortBy: 'bad' as never, sortDirection: 'asc' }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  });
});
