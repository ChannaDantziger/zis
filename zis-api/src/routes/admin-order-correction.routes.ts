import { Router } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import type { OrderCorrectionService } from '../operations/order-correction.service.js';
import type { OrderStatus } from '../domain/order-status.js';

export function createAdminOrderCorrectionRouter(service: OrderCorrectionService, resolve: AdminUserResolver): Router {
  const router = Router();
  router.post('/admin/orders/:orderId/correct-status', async (request, response) => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    const body = request.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.targetStatus !== 'string'
      || typeof body.version !== 'string' || (body.note !== null && body.note !== undefined && typeof body.note !== 'string'))
      throw new ApiError(400, 'VALIDATION_ERROR', 'targetStatus and version are required');
    response.setHeader('Cache-Control', 'no-store');
    response.json(await service.correct({ orderId: String(request.params.orderId), targetStatus: body.targetStatus as OrderStatus,
      version: body.version, note: body.note ?? null, adminUserId: identity.adminUserId }));
  });
  return router;
}
