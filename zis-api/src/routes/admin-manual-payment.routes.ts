import { Router } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import type { ManualPaymentService } from '../commerce/manual-payment.service.js';

export function createAdminManualPaymentRouter(service: ManualPaymentService, resolve: AdminUserResolver) {
  const router = Router();
  router.post('/admin/orders/:orderId/manual-payment', async (request, response) => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status !== 'authenticated' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    const body = request.body;
    if (!body || (body.action !== 'confirm' && body.action !== 'revert') || typeof body.version !== 'string' || typeof body.note !== 'string')
      throw new ApiError(400, 'VALIDATION_ERROR', 'Action, version and explanation are required');
    response.setHeader('Cache-Control', 'no-store');
    response.json(await service.change(String(request.params.orderId), body.version, body.action, body.note, identity.adminUserId));
  });
  return router;
}
