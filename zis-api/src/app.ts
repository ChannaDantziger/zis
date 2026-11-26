import { createFaqRouter } from './routes/faq.routes.js';
import type { FaqService } from './faq/faq.service.js';
import { createAdminTestOrdersRouter } from './routes/admin-test-orders.routes.js';
import type { TestPaymentService } from './commerce/test-payment.service.js';
import { createAdminManualPaymentRouter } from './routes/admin-manual-payment.routes.js';
import type { ManualPaymentService } from './commerce/manual-payment.service.js';
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
import { createAdminHomeRouter } from './routes/admin-home.routes.js';
import type { HomeService } from './dashboard/home.types.js';
import { createAdminHomeTasksRouter } from './routes/admin-home-tasks.routes.js';
import type { HomeTasksRepository } from './tasks/home-tasks.types.js';
import { createAdminOrderCorrectionRouter } from './routes/admin-order-correction.routes.js';
import type { OrderCorrectionService } from './operations/order-correction.service.js';
import type { CommerceService } from './commerce/commerce.types.js';
import { createCommerceRouter } from './routes/commerce.routes.js';
import { createAdminOrderStatusRouter } from './routes/admin-order-status.routes.js';
import type { OrderStatusService } from './operations/order-status.types.js';
import { createAdminCommerceSettingsRouter } from './routes/admin-commerce-settings.routes.js';
import type { CommerceSettingsService } from './operations/commerce-settings.types.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createBundlePreviewController } from './controllers/bundle-preview.controller.js';
import type { BundlePreviewService } from './catalog/bundle-preview.service.js';
import { createAdminBundlesController } from './controllers/admin-bundles.controller.js';
import type { BundlesRepository } from './catalog/bundles.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAdminTasksRouter } from './routes/admin-tasks.routes.js';
import type { TasksService } from './tasks/tasks.types.js';
import type { EventGalleryService } from './event-gallery/event-gallery.types.js';
import { createEventGalleryRouter } from './routes/event-gallery.routes.js';

export interface AppDependencies {
  bundlePreviewService?: BundlePreviewService;
  bundlesRepository?: BundlesRepository;
  faqService?: FaqService;
  testPaymentService?: TestPaymentService;
  manualPaymentService?: ManualPaymentService;
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
  homeService?: HomeService;
  homeTasksService?: HomeTasksRepository;
  orderCorrectionService?: OrderCorrectionService;
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
  if (dependencies.bundlePreviewService) app.get('/bundle-preview', createBundlePreviewController(dependencies.bundlePreviewService));
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
  if (dependencies.bundlesRepository && dependencies.resolveAdminUserId) {
    const bundles = createAdminBundlesController(dependencies.bundlesRepository, dependencies.resolveAdminUserId, dependencies.storageService);
    app.get('/admin/bundles', bundles.list);
    app.post('/admin/bundles', bundles.save);
    app.patch('/admin/bundles/:bundleId', bundles.save);
    app.post('/admin/bundles/:bundleId/images', bundles.addImage);
    app.patch('/admin/bundle-images/:imageId', bundles.updateImage);
    app.delete('/admin/bundle-images/:imageId', bundles.deleteImage);
  }
  if (dependencies.dashboardService && dependencies.resolveAdminUserId) {
    app.use(createAdminDashboardRouter(dependencies.dashboardService, dependencies.resolveAdminUserId));
  }
  if (dependencies.homeService && dependencies.resolveAdminUserId) {
    app.use(createAdminHomeRouter(dependencies.homeService, dependencies.resolveAdminUserId));
  }
  if (dependencies.homeTasksService && dependencies.resolveAdminUserId) {
    app.use(createAdminHomeTasksRouter(dependencies.homeTasksService, dependencies.resolveAdminUserId));
  }
  if (dependencies.orderCorrectionService && dependencies.resolveAdminUserId) {
    app.use(createAdminOrderCorrectionRouter(dependencies.orderCorrectionService, dependencies.resolveAdminUserId));
  }
  if (dependencies.manualPaymentService && dependencies.resolveAdminUserId) app.use(createAdminManualPaymentRouter(dependencies.manualPaymentService, dependencies.resolveAdminUserId));
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
  if(dependencies.faqService && dependencies.resolveAdminUserId) app.use(createFaqRouter(dependencies.faqService,dependencies.resolveAdminUserId));
  if(dependencies.orderService?.createTest && dependencies.testPaymentService && dependencies.resolveAdminUserId) app.use(createAdminTestOrdersRouter(dependencies.orderService,dependencies.testPaymentService,dependencies.resolveAdminUserId));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
