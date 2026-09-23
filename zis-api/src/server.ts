import { createApp } from './app.js';
import { readServerConfig } from './config/server-config.js';
import { createSupabaseServerClient } from './auth/supabase.client.js';
import { createSupabaseAuthResolver } from './auth/supabase-auth.resolver.js';
import { DEFAULT_PORT } from './constants/http.js';
import { createPostgresClientFactory, createPostgresPool } from './infrastructure/postgres.js';
import { createPostgresInventoryRepository } from './inventory/postgres-inventory.repository.js';
import { createInventoryService } from './inventory/inventory.service.js';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const serverConfig = readServerConfig();
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
      return createApp({ inventoryService, resolveAdminUserId });
    })()
  : createApp();

if (!hasServerDependencies) {
  console.warn('Supabase/PostgreSQL configuration is missing; admin inventory routes are disabled.');
} else if (serverConfig.databaseSource === 'DATABASE_URL_TRN') {
  console.warn('Using DATABASE_URL_TRN because DATABASE_URL is not set; confirm this is a Development database.');
}

app.listen(port, () => {
  console.log(`ZIS API listening on port ${port}`);
});
