import { createFaqService } from './faq/faq.service.js';
import { createTestPaymentService } from './commerce/test-payment.service.js';
import { createManualPaymentService } from './commerce/manual-payment.service.js';
import { createApp } from './app.js';
import { createOrderService } from './commerce/order.service.js';
import { createPostgresOrderRepository } from './commerce/postgres-order.repository.js';
import { createNotificationsService } from './notifications/notifications.service.js';
import { createPostgresNotificationsRepository } from './notifications/postgres-notifications.repository.js';
import { createInventoryAdminService } from './inventory-admin/inventory-admin.service.js';
import { createPostgresInventoryAdminRepository } from './inventory-admin/postgres-inventory-admin.repository.js';
import { createOperationsReportsService } from './operations-reports/operations-reports.service.js';
import { createPostgresOperationsReportsRepository } from './operations-reports/postgres-operations-reports.repository.js';
import { readServerConfig, validateServerConfig } from './config/server-config.js';
import { createSupabaseServerClient } from './auth/supabase.client.js';
import { createSupabaseAuthResolver } from './auth/supabase-auth.resolver.js';
import { DEFAULT_PORT } from './constants/http.js';
import { createPostgresClientFactory, createPostgresPool } from './infrastructure/postgres.js';
import { createPostgresInventoryRepository } from './inventory/postgres-inventory.repository.js';
import { createInventoryService } from './inventory/inventory.service.js';
import { createPostgresCatalogRepository } from './catalog/postgres-catalog.repository.js';
import { createCatalogService } from './catalog/catalog.service.js';
import { PRODUCT_MEDIA_BUCKET } from './contracts/media.contracts.js';
import { createSupabaseStorageService } from './storage/storage.service.js';
import { createPostgresAdminCatalogRepository } from './catalog/postgres-admin-catalog.repository.js';
import { createBundlesRepository } from './catalog/bundles.repository.js';
import { createAdminCatalogService } from './catalog/admin-catalog.service.js';
import { createPostgresDashboardRepository } from './dashboard/postgres-dashboard.repository.js';
import { createDashboardService } from './dashboard/dashboard.service.js';
import { createPostgresHomeRepository } from './dashboard/postgres-home.repository.js';
import { createHomeService } from './dashboard/home.service.js';
import { createPostgresHomeTasksRepository } from './tasks/postgres-home-tasks.repository.js';
import { createHomeTasksService } from './tasks/home-tasks.service.js';
import { createOrderCorrectionService } from './operations/order-correction.service.js';
import { createPostgresOrderStatusRepository } from './operations/postgres-order-status.repository.js';
import { createOrderStatusService } from './operations/order-status.service.js';
import { createPostgresCommerceSettingsRepository } from './operations/postgres-commerce-settings.repository.js';
import { createCommerceSettingsService } from './operations/commerce-settings.service.js';
import { createPostgresCommerceRepository } from './commerce/postgres-commerce.repository.js';
import { createCommerceService } from './commerce/commerce.service.js';
import { createPostgresTasksRepository } from './tasks/postgres-tasks.repository.js';
import { createTasksService } from './tasks/tasks.service.js';
import { createPostgresEventGalleryRepository } from './event-gallery/postgres-event-gallery.repository.js';
import { createEventGalleryService } from './event-gallery/event-gallery.service.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envFilePath = join(process.cwd(), '.env');
if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envFilePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const serverConfig = readServerConfig();
const configurationErrors = validateServerConfig(serverConfig);
if (configurationErrors.length > 0) {
  throw new Error(`Invalid server configuration: ${configurationErrors.join('; ')}`);
}
const databaseUrl = serverConfig.databaseUrl;
const hasServerDependencies = Boolean(
  databaseUrl && process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
);

const app = hasServerDependencies
  ? (() => {
      const supabase = createSupabaseServerClient();
      const authSupabase = createSupabaseServerClient();
      const pool = createPostgresPool({ connectionString: databaseUrl as string });
      const repository = createPostgresInventoryRepository(createPostgresClientFactory(pool));
      const inventoryService = createInventoryService(repository);
      const resolveAdminUserId = createSupabaseAuthResolver(supabase);
      const storage = createSupabaseStorageService(supabase);
      const catalogRepository = createPostgresCatalogRepository(createPostgresClientFactory(pool));
      const adminCatalogRepository = createPostgresAdminCatalogRepository(createPostgresClientFactory(pool));
      const dashboardRepository = createPostgresDashboardRepository(createPostgresClientFactory(pool));
      const orderStatusRepository = createPostgresOrderStatusRepository(createPostgresClientFactory(pool));
      const commerceSettingsRepository = createPostgresCommerceSettingsRepository(createPostgresClientFactory(pool));
      const commerceRepository = createPostgresCommerceRepository(createPostgresClientFactory(pool));
      const catalogService = createCatalogService(
        catalogRepository,
        (bucket, storagePath) => storage.createSignedUrl(bucket, storagePath).then((result) => result.url),
      );
      return createApp({
        faqService: createFaqService(createPostgresClientFactory(pool)),
        testPaymentService: createTestPaymentService(createPostgresClientFactory(pool)),
        manualPaymentService: createManualPaymentService(createPostgresClientFactory(pool)),
        orderService: createOrderService(createPostgresOrderRepository(createPostgresClientFactory(pool)),
          serverConfig.orderConfirmationTokenTtlSeconds && serverConfig.orderConfirmationTokenSecret ? {
            confirmationTokenTtlSeconds: serverConfig.orderConfirmationTokenTtlSeconds,
            confirmationTokenSecret: serverConfig.orderConfirmationTokenSecret,
          } : undefined),
        notificationsService: createNotificationsService(createPostgresNotificationsRepository(createPostgresClientFactory(pool))),
        inventoryAdminService: createInventoryAdminService(createPostgresInventoryAdminRepository(createPostgresClientFactory(pool))),
        operationsReportsService: createOperationsReportsService(createPostgresOperationsReportsRepository(createPostgresClientFactory(pool))),
        tasksService: createTasksService(createPostgresTasksRepository(createPostgresClientFactory(pool))),
        supabase,
        authSupabase,
        inventoryService,
        resolveAdminUserId,
        catalogService,
        eventGalleryService: createEventGalleryService(
          createPostgresEventGalleryRepository(createPostgresClientFactory(pool)),
          (bucket, storagePath) => storage.createSignedUrl(bucket, storagePath).then((result) => result.url),
        ),
        storageService: storage,
        adminCatalogService: createAdminCatalogService(adminCatalogRepository),
        bundlesRepository: createBundlesRepository(createPostgresClientFactory(pool)),
        dashboardService: createDashboardService(dashboardRepository),
        homeService: createHomeService(createPostgresHomeRepository(createPostgresClientFactory(pool)),
          (path) => storage.createSignedUrl(PRODUCT_MEDIA_BUCKET, path).then((result) => result.url)),
        homeTasksService: createHomeTasksService(createPostgresHomeTasksRepository(createPostgresClientFactory(pool))),
        orderCorrectionService: createOrderCorrectionService(createPostgresClientFactory(pool)),
        orderStatusService: createOrderStatusService(orderStatusRepository),
        commerceSettingsService: createCommerceSettingsService(commerceSettingsRepository),
        commerceService: createCommerceService(commerceRepository),
        allowedOrigins: serverConfig.allowedOrigins,
        readinessChecks: {
          postgres: async () => {
            await pool.query('select 1');
          },
        },
      });
    })()
  : createApp({
      allowedOrigins: serverConfig.allowedOrigins,
      readinessChecks: {
        configuration: async () => {
          throw new Error('Server dependencies are not configured');
        },
      },
    });

if (!hasServerDependencies) {
  console.warn('Supabase/PostgreSQL configuration is missing; admin inventory routes are disabled.');
} else if (serverConfig.databaseSource === 'DATABASE_URL_TRN') {
  console.warn('Using DATABASE_URL_TRN because DATABASE_URL is not set; confirm this is a Development database.');
}

app.listen(port, () => {
  console.log(`ZIS API listening on port ${port}`);
});
