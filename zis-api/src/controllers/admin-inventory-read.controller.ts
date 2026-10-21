import type { Request, Response } from 'express';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { InventoryAdminService } from '../inventory-admin/inventory-admin.types.js';
import { ApiError } from '../http/api-error.js';
export function createAdminInventoryReadController(service: InventoryAdminService, resolve: AdminUserResolver) {
  return {
    list: async (request: Request, response: Response) => {
      await authorize(request, response);
      response.json(await service.list(readPage(request.query.page), readText(request.query.weekStartDate)));
    },
    details: async (request: Request, response: Response) => {
      await authorize(request, response);
      response.json(await service.details(readText(request.params.productVariantId), readPage(request.query.page), readText(request.query.weekStartDate)));
    },
  };
  async function authorize(request: Request, response: Response) {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status !== 'authenticated' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    response.setHeader('Cache-Control', 'no-store');
  }
}
function readText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Required query value must be text');
  return value.trim();
}
function readPage(value: unknown): number {
  if (value === undefined) return 1;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid page');
  return Number(value);
}