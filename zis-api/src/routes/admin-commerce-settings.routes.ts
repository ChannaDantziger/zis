import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminCommerceSettingsController } from '../controllers/admin-commerce-settings.controller.js';
import type { CommerceSettingsService } from '../operations/commerce-settings.types.js';

export function createAdminCommerceSettingsRouter(service: CommerceSettingsService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminCommerceSettingsController(service, resolveAdminUserId);
  router.get('/admin/commerce/settings', controller.get);
  router.patch('/admin/commerce/settings', controller.updateBusiness);
  router.post('/admin/shipping/zones', controller.createZone);
  router.patch('/admin/shipping/zones/:shippingZoneId', controller.updateZone);
  router.patch('/admin/shipping/methods/:shippingMethodId', controller.updateMethod);
  router.post('/admin/shipping/rules', controller.createRule);
  router.patch('/admin/shipping/rules/:shippingRuleId', controller.updateRule);
  router.post('/admin/store-closures', controller.createClosure);
  router.patch('/admin/store-closures/:storeClosureId', controller.updateClosure);
  // Backward-compatible aliases for the first dashboard prototype.
  router.get('/admin/commerce-settings', controller.get);
  router.patch('/admin/commerce-settings/business', controller.updateBusiness);
  router.post('/admin/commerce-settings/zones', controller.createZone);
  router.patch('/admin/commerce-settings/zones/:shippingZoneId', controller.updateZone);
  router.post('/admin/commerce-settings/rules', controller.createRule);
  router.patch('/admin/commerce-settings/rules/:shippingRuleId', controller.updateRule);
  router.post('/admin/commerce-settings/closures', controller.createClosure);
  router.patch('/admin/commerce-settings/closures/:storeClosureId', controller.updateClosure);
  return router;
}
