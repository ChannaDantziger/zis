import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminDashboardController } from '../controllers/admin-dashboard.controller.js';
import type { DashboardService } from '../dashboard/dashboard.types.js';

export function createAdminDashboardRouter(service: DashboardService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminDashboardController(service, resolveAdminUserId);
  router.get('/admin/dashboard', controller.dashboard);
  router.get('/admin/orders', controller.orders);
  router.get('/admin/orders/page', controller.orderPage);
  router.get('/admin/orders/:orderId', controller.orderDetails);
  router.get('/admin/production', controller.production);
  return router;
}
