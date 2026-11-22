import { Router } from 'express';
import type { CommerceService } from '../commerce/commerce.types.js';
import { createCommerceController } from '../controllers/commerce.controller.js';

export function createCommerceRouter(service: CommerceService): Router {
  const router = Router();
  const controller = createCommerceController(service);
  router.get('/delivery-dates', controller.getDeliveryDates);
  router.get('/store-status', controller.getStoreStatus);
  router.get('/shipping/zones', controller.listShippingZones);
  router.post('/availability', controller.getAvailability);
  router.post('/quote', controller.calculateQuote);
  return router;
}
