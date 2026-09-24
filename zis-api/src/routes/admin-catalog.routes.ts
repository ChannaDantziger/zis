import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminCatalogController } from '../controllers/admin-catalog.controller.js';
import type { AdminCatalogService } from '../catalog/admin-catalog.types.js';

export function createAdminCatalogRouter(service: AdminCatalogService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminCatalogController(service, resolveAdminUserId);
  router.post('/admin/products', controller.createProduct);
  router.post('/admin/products/:productId/variants', controller.createVariant);
  router.post('/admin/products/:productId/images', controller.createImage);
  router.patch('/admin/product-images/:imageId', controller.updateImage);
  return router;
}
