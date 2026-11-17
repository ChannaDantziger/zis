import { Router } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import type { HomeService } from '../dashboard/home.types.js';

export function createAdminHomeRouter(service: HomeService, resolve: AdminUserResolver): Router {
  const router = Router();
  router.get('/admin/home/orders', async (request, response) => {
    const identity = await resolve(request);
    if (identity.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (identity.status === 'forbidden' || identity.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    const from = request.query.from, to = request.query.to;
    if (typeof from !== 'string' || typeof to !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', 'from and to dates are required');
    response.setHeader('Cache-Control', 'no-store');
    response.json(await service.listOrders(from, to));
  });
  return router;
}
