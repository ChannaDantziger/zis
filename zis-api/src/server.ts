import { createApp } from './app.js';
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
import { createAdminCatalogService } from './catalog/admin-catalog.service.js';
import { createPostgresDashboardRepository } from './dashboard/postgres-dashboard.repository.js';
import { createDashboardService } from './dashboard/dashboard.service.js';
import { createPostgresOrderStatusRepository } from './operations/postgres-order-status.repository.js';
import { createOrderStatusService } from './operations/order-status.service.js';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const serverConfig = readServerConfig();
const configurationErrors = validateServerConfig(serverConfig);
if (process.env.NODE_ENV === 'production' && configurationErrors.length > 0) {
  throw new Error(`Invalid production configuration: ${configurationErrors.join('; ')}`);
}
const databaseUrl = serverConfig.databaseUrl;
const hasServerDependencies = Boolean(
  databaseUrl && process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
);

const app = hasServerDependencies
  ? (() => {
      const supabase = createSupabaseServerClient();
      const pool = createPostgresPool({ connectionString: databaseUrl as string });
      const repository = createPostgresInventoryRepository(createPostgresClientFactory(pool));
      const inventoryService = createInventoryService(repository);
      const resolveAdminUserId = createSupabaseAuthResolver(supabase);
      const storage = createSupabaseStorageService(supabase);
      const catalogRepository = createPostgresCatalogRepository(createPostgresClientFactory(pool));
      const adminCatalogRepository = createPostgresAdminCatalogRepository(createPostgresClientFactory(pool));
      const dashboardRepository = createPostgresDashboardRepository(createPostgresClientFactory(pool));
      const orderStatusRepository = createPostgresOrderStatusRepository(createPostgresClientFactory(pool));
      const catalogService = createCatalogService(
        catalogRepository,
        (bucket, storagePath) => storage.createSignedUrl(bucket, storagePath).then((result) => result.url),
      );
      return createApp({
        inventoryService,
        resolveAdminUserId,
        catalogService,
        storageService: storage,
        adminCatalogService: createAdminCatalogService(adminCatalogRepository),
        dashboardService: createDashboardService(dashboardRepository),
        orderStatusService: createOrderStatusService(orderStatusRepository),
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
