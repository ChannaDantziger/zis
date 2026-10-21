import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not configured; no Production migration ledger check was performed.');

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, '..', '..', 'zis-db', 'migrations');
const expectedFiles = readdirSync(migrationsDirectory).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

try {
  const candidates = ['supabase_migrations.schema_migrations', 'public.schema_migrations', 'public._migrations'];
  const available = [];
  for (const candidate of candidates) {
    const result = await pool.query('select to_regclass($1)::text as relation', [candidate]);
    if (result.rows[0]?.relation) available.push(candidate);
  }
  if (!available.length) {
    throw new Error('Connected to PostgreSQL, but no recognized migration ledger table exists; stop and identify the migration tool before applying SQL.');
  }

  const ledger = available[0];
  const rows = await pool.query(`select * from ${ledger} order by 1`);
  console.log(JSON.stringify({ checked: true, target: 'production', ledger, rowCount: rows.rowCount, expectedMigrationFiles: expectedFiles, ledgerRows: rows.rows }, null, 2));
} finally {
  await pool.end();
}
