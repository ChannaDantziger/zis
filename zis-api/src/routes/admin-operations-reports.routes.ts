import { Router } from 'express';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminOperationsReportsController } from '../controllers/admin-operations-reports.controller.js';
import type { OperationsReportsService } from '../operations-reports/operations-reports.types.js';

export function createAdminOperationsReportsRouter(service: OperationsReportsService, resolve: AdminUserResolver): Router {
  const router = Router();
  const controller = createAdminOperationsReportsController(service, resolve);
  router.get('/admin/reports/packing', controller.packing);
  router.get('/admin/reports/delivery', controller.delivery);
  return router;
}