import { DEFAULT_PAGE_SIZE } from '../contracts/common.contracts.js';
import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver, AdminUserResolution } from './admin-inventory.controller.js';
import type { DashboardService } from '../dashboard/dashboard.types.js';
import type { OrderStatus } from '../domain/order-status.js';

export function createAdminDashboardController(service: DashboardService, resolveAdminUserId: AdminUserResolver) {
  return {
    orderPage: async (request: Request, response: Response) => {
      const identity = await resolveAdminUserId(request);
      if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
      response.setHeader('Cache-Control', 'no-store');
      response.json(await service.listOrderPage({
        deliveryDate: readDate(request.query.deliveryDate), status: readOptionalText(request.query.status) as OrderStatus | undefined,
        paymentFilter: readOptionalText(request.query.paymentFilter) as 'pending' | 'not_pending' | undefined,
        productVariantId: readOptionalText(request.query.productVariantId), location: readOptionalText(request.query.location),
        sortBy: (readOptionalText(request.query.sortBy) ?? 'status') as 'status', sortDirection: (readOptionalText(request.query.sortDirection) ?? 'asc') as 'asc',
        page: readPageNumber(request.query.page, 1), pageSize: readPageNumber(request.query.pageSize, DEFAULT_PAGE_SIZE),
      }));
    },
    orderDetails: async (request: Request, response: Response) => {
      const identity = await resolveAdminUserId(request);
      if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
      response.setHeader('Cache-Control', 'no-store');
      response.json(await service.getOrder(String(request.params.orderId)));
    },
    dashboard: withAdmin(resolveAdminUserId, async (request, response, identity) => { response.json(await service.getDashboard(readDate(request.query.date), identity.adminUserId)); }),
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

function withAdmin(resolve: AdminUserResolver, handler: (request: Request, response: Response, identity: Extract<AdminUserResolution, { status: 'authenticated' }>) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const result = await resolve(request);
    if (result.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (result.status === 'forbidden' || result.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    response.setHeader('Cache-Control', 'no-store');
    await handler(request, response, result);
  };
}

function readDate(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'date is required');
  return value;
}

function readOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPageNumber(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'pagination is invalid');
  return Number(value);
}
