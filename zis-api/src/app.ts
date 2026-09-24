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

export interface AppDependencies {
  inventoryService?: InventoryService;
  resolveAdminUserId?: AdminUserResolver;
  catalogService?: CatalogService;
  readinessChecks?: Record<string, ReadinessCheck>;
  allowedOrigins?: readonly string[];
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
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
