import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminOrderStatusController } from '../controllers/admin-order-status.controller.js';
import type { OrderStatusService } from '../operations/order-status.types.js';

export function createAdminOrderStatusRouter(service: OrderStatusService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  router.post('/admin/orders/bulk-status', createAdminOrderStatusController(service, resolveAdminUserId));
  return router;
}
