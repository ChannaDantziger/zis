import type { Request, Response } from 'express';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import { ApiError } from '../http/api-error.js';
import type { OperationReportKind, OperationsReportsService } from '../operations-reports/operations-reports.types.js';

export function createAdminOperationsReportsController(service: OperationsReportsService, resolve: AdminUserResolver) {
  return {
    packing: handler('packing'),
    delivery: handler('delivery'),
  };

  function handler(kind: OperationReportKind) {
    return async (request: Request, response: Response): Promise<void> => {
      const identity = await resolve(request);
      if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
      if (identity.status !== 'authenticated' || identity.role !== 'operations_manager') {
        throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
      }
      response.setHeader('Cache-Control', 'no-store');
      const date = readText(request.query.date, true);
      const city = readText(request.query.city);
      const orderIds = readText(request.query.orderIds);
      response.json(await service.read(kind, { date: date!, city, orderIds: orderIds?.split(',') }));
    };
  }
}

function readText(value: unknown, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Report query must contain nonempty text');
  return value.trim();
}