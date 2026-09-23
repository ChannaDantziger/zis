import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { createAdminInventoryRouter } from './routes/admin-inventory.routes.js';
import type { AdminUserResolver } from './controllers/admin-inventory.controller.js';
import type { InventoryService } from './inventory/inventory.service.js';

export interface AppDependencies {
  inventoryService?: InventoryService;
  resolveAdminUserId?: AdminUserResolver;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(healthRouter);
  if (dependencies.inventoryService && dependencies.resolveAdminUserId) {
    app.use(createAdminInventoryRouter(dependencies.inventoryService, dependencies.resolveAdminUserId));
  }

  return app;
}
