import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { OrderStatusService } from '../operations/order-status.types.js';
import type { OrderStatus } from '../domain/order-status.js';

export function createAdminOrderStatusController(service: OrderStatusService, resolveAdminUserId: AdminUserResolver) {
  return async function bulkStatus(request: Request, response: Response): Promise<void> {
    const identity = await resolveAdminUserId(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    const body = asRecord(request.body);
    const result = await service.applyBulkStatus({
      items: readItems(body.items), targetStatus: readTargetStatus(body.targetStatus),
      adminUserId: identity.adminUserId, adminRole: identity.role,
    });
    response.status(200).json({ requested: result.length, succeeded: result.filter((item) => item.ok).length, failed: result.filter((item) => !item.ok).length, results: result });
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'JSON object body is required');
  return value as Record<string, unknown>;
}

function readItems(value: unknown): Array<{ orderId: string; version: string; packageCount?: number }> {
  if (!Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'items is required');
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'VALIDATION_ERROR', 'each item must be an object');
    const record = item as Record<string, unknown>;
    if (typeof record.orderId !== 'string' || typeof record.version !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'orderId and version are required');
    return { orderId: record.orderId, version: record.version,
      ...(record.packageCount === undefined ? {} : { packageCount: record.packageCount as number }) };
  });
}

function readTargetStatus(value: unknown): OrderStatus {
  if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'targetStatus is required');
  return value as OrderStatus;
}
