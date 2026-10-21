import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminCatalogController } from '../controllers/admin-catalog.controller.js';
import type { AdminCatalogService } from '../catalog/admin-catalog.types.js';
import type { StorageService } from '../storage/storage.service.js';

export function createAdminCatalogRouter(service: AdminCatalogService, resolveAdminUserId: AdminUserResolver, storage?: StorageService): Router {
  const router = Router();
  const controller = createAdminCatalogController(service, resolveAdminUserId, storage);
  router.post('/admin/categories', controller.saveCategory);
  router.patch('/admin/categories/:categoryId', controller.saveCategory);
  router.get('/admin/products', controller.listProducts);
  router.get('/admin/products/:productId', controller.productDetails);
  router.patch('/admin/products/:productId', controller.updateProduct);
  router.patch('/admin/product-variants/:productVariantId', controller.updateVariant);
  router.post('/admin/products', controller.createProduct);
  router.post('/admin/products/:productId/variants', controller.createVariant);
  router.post('/admin/products/:productId/images', controller.createImage);
  router.patch('/admin/product-images/:imageId', controller.updateImage);
  router.get('/admin/event-gallery', controller.listGallery);
  router.post('/admin/event-gallery', controller.addGalleryImage);
  router.patch('/admin/event-gallery/order', controller.reorderGallery);
  router.patch('/admin/event-gallery/:imageId/featured', controller.setGalleryFeatured);
  router.patch('/admin/event-gallery/:imageId', controller.setGalleryActive);
  router.delete('/admin/product-images/:imageId', controller.deleteImage);
  router.delete('/admin/event-gallery/:imageId', controller.deleteImage);
  return router;
}
