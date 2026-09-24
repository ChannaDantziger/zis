import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../http/api-error.js';
import { createOrderStatusService } from './order-status.service.js';
import type { OrderStatusRepository } from './order-status.types.js';

describe('order status service', () => {
  it('rejects an empty or cancelled bulk transition', async () => {
    const repository: OrderStatusRepository = { applyBulkStatus: async () => [] };
    const service = createOrderStatusService(repository);
    await assert.rejects(() => service.applyBulkStatus({ items: [], targetStatus: 'packed', adminUserId: 'admin' }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
    await assert.rejects(() => service.applyBulkStatus({ items: [{ orderId: 'order', version: 'v1' }], targetStatus: 'cancelled', adminUserId: 'admin' }), (error: unknown) => error instanceof ApiError && error.statusCode === 400);
  });

  it('passes a valid request to the repository', async () => {
    let received = false;
    const repository: OrderStatusRepository = { applyBulkStatus: async (request) => { received = request.targetStatus === 'packed'; return []; } };
    await createOrderStatusService(repository).applyBulkStatus({ items: [{ orderId: 'order', version: 'v1' }], targetStatus: 'packed', adminUserId: 'admin' });
    assert.equal(received, true);
  });
});
