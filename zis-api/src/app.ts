import express from 'express';
import { createOrderRouter } from './routes/order.routes.js';
import type { OrderService } from './commerce/order.types.js';
import { createAdminNotificationsRouter } from './routes/admin-notifications.routes.js';
import type { NotificationsService } from './notifications/notifications.types.js';
import { createAdminInventoryReadRouter } from './routes/admin-inventory-read.routes.js';
import type { InventoryAdminService } from './inventory-admin/inventory-admin.types.js';
import { createAdminOperationsReportsRouter } from './routes/admin-operations-reports.routes.js';
import type { OperationsReportsService } from './operations-reports/operations-reports.types.js';
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
import { createAdminCommerceSettingsRouter } from './routes/admin-commerce-settings.routes.js';
import type { CommerceSettingsService } from './operations/commerce-settings.types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAdminTasksRouter } from './routes/admin-tasks.routes.js';
import type { TasksService } from './tasks/tasks.types.js';
import type { EventGalleryService } from './event-gallery/event-gallery.types.js';
import { createEventGalleryRouter } from './routes/event-gallery.routes.js';

export interface AppDependencies {
  orderService?: OrderService;
  notificationsService?: NotificationsService;
  inventoryAdminService?: InventoryAdminService;
  operationsReportsService?: OperationsReportsService;
  eventGalleryService?: EventGalleryService;
  tasksService?: TasksService;
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
  commerceSettingsService?: CommerceSettingsService;
  supabase?: SupabaseClient;
  authSupabase?: SupabaseClient;
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
  if (dependencies.supabase && dependencies.authSupabase) {
    app.use(createAuthRouter(dependencies.authSupabase, dependencies.supabase));
  }
  app.use(createHealthRouter(dependencies.readinessChecks));
  if (dependencies.tasksService && dependencies.resolveAdminUserId) {
    app.use(createAdminTasksRouter(dependencies.tasksService, dependencies.resolveAdminUserId));
  }
  if (dependencies.catalogService) {
    app.use(createCatalogRouter(dependencies.catalogService));
  }
  if (dependencies.eventGalleryService) {
    app.use(createEventGalleryRouter(dependencies.eventGalleryService));
  }
  if (dependencies.inventoryService && dependencies.resolveAdminUserId) {
    app.use(createAdminInventoryRouter(dependencies.inventoryService, dependencies.resolveAdminUserId));
  }
  if (dependencies.storageService && dependencies.resolveAdminUserId) {
    app.use(createAdminMediaRouter(dependencies.storageService, dependencies.resolveAdminUserId));
  }
  if (dependencies.adminCatalogService && dependencies.resolveAdminUserId) {
    app.use(createAdminCatalogRouter(dependencies.adminCatalogService, dependencies.resolveAdminUserId, dependencies.storageService));
  }
  if (dependencies.dashboardService && dependencies.resolveAdminUserId) {
    app.use(createAdminDashboardRouter(dependencies.dashboardService, dependencies.resolveAdminUserId));
  }
  if (dependencies.orderStatusService && dependencies.resolveAdminUserId) {
    app.use(createAdminOrderStatusRouter(dependencies.orderStatusService, dependencies.resolveAdminUserId));
  }
  if (dependencies.commerceSettingsService && dependencies.resolveAdminUserId) {
    app.use(createAdminCommerceSettingsRouter(dependencies.commerceSettingsService, dependencies.resolveAdminUserId));
  }
  if (dependencies.commerceService) {
    app.use(createCommerceRouter(dependencies.commerceService));
  }
  if (dependencies.operationsReportsService && dependencies.resolveAdminUserId) {
    app.use(createAdminOperationsReportsRouter(dependencies.operationsReportsService, dependencies.resolveAdminUserId));
  }
  if (dependencies.notificationsService && dependencies.resolveAdminUserId) {
    app.use(createAdminNotificationsRouter(dependencies.notificationsService, dependencies.resolveAdminUserId));
  }
  if (dependencies.inventoryAdminService && dependencies.resolveAdminUserId) {
    app.use(createAdminInventoryReadRouter(dependencies.inventoryAdminService, dependencies.resolveAdminUserId));
  }
  if (dependencies.orderService) app.use(createOrderRouter(dependencies.orderService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
