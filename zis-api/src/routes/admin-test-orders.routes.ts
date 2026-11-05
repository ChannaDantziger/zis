import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import type { OrderService } from '../commerce/order.types.js';
import type { TestPaymentService } from '../commerce/test-payment.service.js';
import { createAdminTestOrdersController } from '../controllers/admin-test-orders.controller.js';
export function createAdminTestOrdersRouter(orders:OrderService,payments:TestPaymentService,resolve:AdminUserResolver) {
  const router=Router();const controller=createAdminTestOrdersController(orders,payments,resolve);
  router.post('/admin/test-orders',controller.create);
  router.post('/admin/test-orders/:orderId/approve-payment',controller.approve);
  return router;
}
