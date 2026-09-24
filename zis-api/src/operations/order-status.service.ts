import { ApiError } from '../http/api-error.js';
import { ORDER_STATUSES } from '../domain/order-status.js';
import type { OrderStatusRepository, OrderStatusService, BulkStatusRequest } from './order-status.types.js';

export function createOrderStatusService(repository: OrderStatusRepository): OrderStatusService {
  return { applyBulkStatus: async (request) => { validateRequest(request); return repository.applyBulkStatus(request); } };
}

function validateRequest(request: BulkStatusRequest): void {
  if (!request.items.length || request.items.length > 100) throw new ApiError(400, 'VALIDATION_ERROR', 'items must contain between 1 and 100 orders');
  if (!(ORDER_STATUSES as readonly string[]).includes(request.targetStatus) || request.targetStatus === 'cancelled') throw new ApiError(400, 'VALIDATION_ERROR', 'targetStatus must be a forward order status');
  const ids = new Set<string>();
  for (const item of request.items) {
    if (!item.orderId || !item.version || ids.has(item.orderId)) throw new ApiError(400, 'VALIDATION_ERROR', 'items must contain unique orderId and version values');
    ids.add(item.orderId);
  }
}
