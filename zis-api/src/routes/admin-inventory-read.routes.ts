import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminInventoryReadController } from '../controllers/admin-inventory-read.controller.js';
import type { InventoryAdminService } from '../inventory-admin/inventory-admin.types.js';
export function createAdminInventoryReadRouter(service: InventoryAdminService, resolve: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminInventoryReadController(service, resolve);
  router.get('/admin/inventory/variants', controller.list);
  router.get('/admin/inventory/variants/:productVariantId', controller.details);
  return router;
}