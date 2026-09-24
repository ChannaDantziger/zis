import express from 'express';
import { DEFAULT_RATE_LIMIT_MAX_REQUESTS, DEFAULT_RATE_LIMIT_WINDOW_MS } from './constants/http.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestContext } from './middleware/request-context.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';
import { createHealthRouter } from './routes/health.routes.js';
import { createAdminInventoryRouter } from './routes/admin-inventory.routes.js';
import type { AdminUserResolver } from './controllers/admin-inventory.controller.js';
import type { InventoryService } from './inventory/inventory.service.js';
import type { CatalogService } from './catalog/catalog.types.js';
import { createCatalogRouter } from './routes/catalog.routes.js';
import type { ReadinessCheck } from './health/readiness.js';
import type { StorageService } from './storage/storage.service.js';
import { createAdminMediaRouter } from './routes/admin-media.routes.js';
import { createAdminCatalogRouter } from './routes/admin-catalog.routes.js';
import type { AdminCatalogService } from './catalog/admin-catalog.types.js';
import { createAdminDashboardRouter } from './routes/admin-dashboard.routes.js';
import type { DashboardService } from './dashboard/dashboard.types.js';
import type { CommerceService } from './commerce/commerce.types.js';
import { createCommerceRouter } from './routes/commerce.routes.js';
import { createAdminOrderStatusRouter } from './routes/admin-order-status.routes.js';
import type { OrderStatusService } from './operations/order-status.types.js';

export interface AppDependencies {
  inventoryService?: InventoryService;
  resolveAdminUserId?: AdminUserResolver;
  catalogService?: CatalogService;
  readinessChecks?: Record<string, ReadinessCheck>;
  allowedOrigins?: readonly string[];
  storageService?: StorageService;
  adminCatalogService?: AdminCatalogService;
  dashboardService?: DashboardService;
  commerceService?: CommerceService;
  orderStatusService?: OrderStatusService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(createCorsMiddleware(dependencies.allowedOrigins ?? []));
  app.use(createRateLimitMiddleware({
    windowMilliseconds: DEFAULT_RATE_LIMIT_WINDOW_MS,
    maxRequests: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
  }));
  app.use(express.json());
  app.use(createHealthRouter(dependencies.readinessChecks));
  if (dependencies.catalogService) {
    app.use(createCatalogRouter(dependencies.catalogService));
  }
  if (dependencies.inventoryService && dependencies.resolveAdminUserId) {
    app.use(createAdminInventoryRouter(dependencies.inventoryService, dependencies.resolveAdminUserId));
  }
  if (dependencies.storageService && dependencies.resolveAdminUserId) {
    app.use(createAdminMediaRouter(dependencies.storageService, dependencies.resolveAdminUserId));
  }
  if (dependencies.adminCatalogService && dependencies.resolveAdminUserId) {
    app.use(createAdminCatalogRouter(dependencies.adminCatalogService, dependencies.resolveAdminUserId));
  }
  if (dependencies.dashboardService && dependencies.resolveAdminUserId) {
    app.use(createAdminDashboardRouter(dependencies.dashboardService, dependencies.resolveAdminUserId));
  }
  if (dependencies.orderStatusService && dependencies.resolveAdminUserId) {
    app.use(createAdminOrderStatusRouter(dependencies.orderStatusService, dependencies.resolveAdminUserId));
  }
  if (dependencies.commerceService) {
    app.use(createCommerceRouter(dependencies.commerceService));
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
