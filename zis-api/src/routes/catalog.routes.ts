import { Router } from 'express';
import type { CatalogService } from '../catalog/catalog.types.js';
import { createCatalogController } from '../controllers/catalog.controller.js';

export function createCatalogRouter(service: CatalogService): Router {
  const router = Router();
  const controller = createCatalogController(service);
  router.get('/categories', controller.listCategories);
  router.get('/catalog', controller.listProducts);
  router.get('/catalog/:productId', controller.getProduct);
  return router;
}
