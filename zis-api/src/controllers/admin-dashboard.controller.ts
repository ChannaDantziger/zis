import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { DashboardService } from '../dashboard/dashboard.types.js';
import type { OrderStatus } from '../domain/order-status.js';

export function createAdminDashboardController(service: DashboardService, resolveAdminUserId: AdminUserResolver) {
  return {
    dashboard: withAdmin(resolveAdminUserId, async (request, response) => { response.json(await service.getDashboard(readDate(request.query.date))); }),
    orders: withAdmin(resolveAdminUserId, async (request, response) => { response.json(await service.listOrders({
      deliveryDate: readDate(request.query.deliveryDate),
      status: readOptionalText(request.query.status) as OrderStatus | undefined,
      productVariantId: readOptionalText(request.query.productVariantId),
      location: readOptionalText(request.query.location),
      sortBy: (readOptionalText(request.query.sortBy) ?? 'status') as 'status',
      sortDirection: (readOptionalText(request.query.sortDirection) ?? 'asc') as 'asc',
    })); }),
    production: withAdmin(resolveAdminUserId, async (request, response) => { response.json(await service.getProduction(readDate(request.query.date))); }),
  };
}

function withAdmin(resolve: AdminUserResolver, handler: (request: Request, response: Response) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const result = await resolve(request);
    if (result.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (result.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    await handler(request, response);
  };
}

function readDate(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'date is required');
  return value;
}

function readOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
