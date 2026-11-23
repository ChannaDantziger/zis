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
    if (item.packageCount !== undefined && (!Number.isInteger(item.packageCount) || item.packageCount < 1 || item.packageCount > 9999 || !['packed', 'in_transit'].includes(request.targetStatus)))
      throw new ApiError(400, 'VALIDATION_ERROR', 'packageCount must be a positive integer for packing or dispatch');
    ids.add(item.orderId);
  }
}
