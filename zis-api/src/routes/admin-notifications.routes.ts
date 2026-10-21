import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminNotificationsController } from '../controllers/admin-notifications.controller.js';
import type { NotificationsService } from '../notifications/notifications.types.js';

export function createAdminNotificationsRouter(service: NotificationsService, resolve: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminNotificationsController(service, resolve);
  router.get('/admin/notifications', controller.list);
  router.get('/admin/notifications/preferences', controller.getPreferences);
  router.patch('/admin/notifications/preferences', controller.updatePreferences);
  router.patch('/admin/notifications/:notificationId/read', controller.markRead);
  return router;
}