import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not configured; no Production schema inspection was performed.');

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const tableNames = [
  'categories', 'products', 'product_variants', 'orders', 'store_settings', 'shipping_zones',
  'shipping_rules', 'system_defaults', 'event_gallery_images',
  'admin_tasks', 'admin_task_history', 'order_confirmation_tokens', 'order_creation_requests', 'order_pending_edit_requests', 'storage.buckets',
];
const columnChecks = [
  ['products', 'product_code'], ['product_variants', 'product_code'], ['product_variants', 'available_sets'], ['product_variants', 'price_per_item'],
  ['orders', 'delivery_venue_name'], ['orders', 'payment_confirmed_at'], ['admin_users', 'role'],
  ['shipping_zones', 'dispatch_time'], ['store_settings', 'max_advance_days'], ['orders', 'shipping_method_snapshot'],
  ['orders', 'package_count'], ['admin_tasks', 'workflow_status'],
];

try {
  const tables = {};
  for (const tableName of tableNames) {
    const result = await pool.query('select to_regclass($1)::text as relation', [`${tableName.includes('.') ? tableName : `public.${tableName}`}`]);
    tables[tableName] = Boolean(result.rows[0]?.relation);
  }
  const columns = {};
  for (const [tableName, columnName] of columnChecks) {
    const result = await pool.query(`select exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = $1 and column_name = $2
    ) as exists`, [tableName, columnName]);
    columns[`${tableName}.${columnName}`] = Boolean(result.rows[0]?.exists);
  }
  console.log(JSON.stringify({ checked: true, target: 'production', mode: 'manual-schema-read-only', tables, columns }, null, 2));
} finally {
  await pool.end();
}
