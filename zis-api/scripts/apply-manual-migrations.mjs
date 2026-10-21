import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

if (process.env.NODE_ENV === 'production') throw new Error('Refusing manual migrations in production.');
if (process.env.APPLY_MANUAL_MIGRATIONS !== '005-008') throw new Error('Set APPLY_MANUAL_MIGRATIONS=005-008 to confirm a Development migration run.');
const databaseUrl = process.env.DATABASE_URL_TRN;
if (!databaseUrl) throw new Error('Development DATABASE_URL_TRN is not configured; no migrations were applied. This script is never for Production.');

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'zis-db', 'migrations');
const migrationFiles = ['005_event_gallery_images.sql', '006_operations_delivery_and_admin.sql', '007_p1_storage_and_confirmation.sql', '008_admin_commerce_settings.sql'];
const requiredTables = ['categories', 'products', 'product_variants', 'orders', 'store_settings', 'shipping_zones', 'shipping_methods', 'shipping_rules', 'system_defaults'];
const forbiddenExistingTables = ['event_gallery_images', 'admin_tasks', 'order_confirmation_tokens'];
const requiredColumns = [['product_variants', 'product_code'], ['product_variants', 'available_sets'], ['store_settings', 'max_advance_days']];
const forbiddenColumns = [['admin_users', 'role'], ['orders', 'payment_confirmed_at'], ['orders', 'delivery_venue_name'], ['shipping_zones', 'dispatch_time']];
const policyNames = ['public_event_gallery_read', 'admin_event_gallery_write', 'admin_order_delivery_date_overrides', 'admin_order_cancellations', 'admin_tasks', 'admin_notification_preferences', 'admin_faq_entries', 'admin_zis_media_read', 'admin_zis_media_insert', 'admin_zis_media_update', 'admin_zis_media_delete', 'admin_shipping_zones_manage', 'admin_shipping_methods_manage', 'admin_shipping_rules_manage', 'admin_store_settings_manage', 'admin_store_closures_manage'];
const adminFunctionRepairSql = `
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_user_id = auth.uid()
      and status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;
`;

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await assertPreconditions(client);
  const repairAdminFunction = (await client.query("select to_regprocedure('public.is_active_admin()') is null as missing")).rows[0].missing;
  await client.query('begin');
  if (repairAdminFunction) await client.query(adminFunctionRepairSql);
  for (const file of migrationFiles) await client.query(await readFile(join(migrationDirectory, file), 'utf8'));
  await client.query('commit');
  console.log(JSON.stringify({ applied: migrationFiles, repaired: repairAdminFunction ? ['public.is_active_admin()'] : [], transaction: 'committed', target: 'development' }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch { /* preserve original failure */ }
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function assertPreconditions(client) {
  const missingTables = await missingTablesFor(client, requiredTables);
  if (missingTables.length) throw new Error(`Refusing migrations: required pre-003 tables are missing: ${missingTables.join(', ')}`);
  const existingTables = await existingTablesFor(client, forbiddenExistingTables);
  if (existingTables.length) throw new Error(`Refusing migrations: migration markers already exist; inspect partial/manual state: ${existingTables.join(', ')}`);
  const missingColumns = await missingColumnsFor(client, requiredColumns);
  if (missingColumns.length) throw new Error(`Refusing migrations: required pre-003 columns are missing: ${missingColumns.join(', ')}`);
  const existingColumns = await existingColumnsFor(client, forbiddenColumns);
  if (existingColumns.length) throw new Error(`Refusing migrations: migration 006/008 appears partially applied: ${existingColumns.join(', ')}`);
  const existingPolicies = await policiesFor(client, policyNames);
  if (existingPolicies.length) throw new Error(`Refusing migrations: policies already exist; inspect partial/manual state: ${existingPolicies.join(', ')}`);
}

async function existingTablesFor(client, names) { const result = await client.query(`select table_schema || '.' || table_name as name from information_schema.tables where (table_schema, table_name) in (${names.map((_, index) => `('public', $${index + 1})`).join(', ')})`, names); return result.rows.map((row) => row.name); }
async function missingTablesFor(client, names) { const existing = await existingTablesFor(client, names); return names.filter((name) => !existing.includes(`public.${name}`)); }
async function existingColumnsFor(client, pairs) { const result = await client.query(`select table_name || '.' || column_name as name from information_schema.columns where table_schema = 'public' and (${pairs.map((_, index) => `(table_name = $${index * 2 + 1} and column_name = $${index * 2 + 2})`).join(' or ')})`, pairs.flat()); return result.rows.map((row) => row.name); }
async function missingColumnsFor(client, pairs) { const existing = await existingColumnsFor(client, pairs); return pairs.map(([table, column]) => `${table}.${column}`).filter((name) => !existing.includes(name)); }
async function policiesFor(client, names) { const result = await client.query(`select schemaname || '.' || policyname as name from pg_policies where schemaname in ('public', 'storage') and policyname = any($1::text[])`, [names]); return result.rows.map((row) => row.name); }
