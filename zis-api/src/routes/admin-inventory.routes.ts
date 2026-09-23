import { Router } from 'express';
import type { InventoryService } from '../inventory/inventory.service.js';
import { createAdminInventoryController, type AdminUserResolver } from '../controllers/admin-inventory.controller.js';

export function createAdminInventoryRouter(service: InventoryService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  router.post('/admin/inventory/:productVariantId/adjust', createAdminInventoryController(service, resolveAdminUserId));
  return router;
}
