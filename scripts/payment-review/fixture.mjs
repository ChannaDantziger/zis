import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createTestPaymentService } from '../../zis-api/src/commerce/test-payment.service.ts';

export const ORDER_ID = '00000000-0000-4000-8000-000000000001';
export const ACTOR_ID = '00000000-0000-4000-8000-000000000010';
export const PRODUCT_ID = '00000000-0000-4000-8000-000000000003';
export const VARIANT_ID = '00000000-0000-4000-8000-000000000040';
export const NOW = new Date('2026-11-08T10:00:00Z');

export async function createFixture({ candidateCast = false, failAt } = {}) {
  // A fresh, unnamed, memory-only PostgreSQL. Cannot accept a live connection string.
  const db = new PGlite();
  await db.exec(await readFile(new URL('./fixture.sql', import.meta.url), 'utf8'));
  const calls = [];
  let releases = 0;
  const client = {
    async query(sql, values) {
      let executedSql = sql;
      calls.push({ sql: executedSql, originalSql: sql });
      if (failAt && sql.startsWith(failAt)) {
        throw Object.assign(new Error('Synthetic write failure'), { code: 'TEST_WRITE_FAILURE' });
      }
      const result = await db.query(executedSql, values ? [...values] : []);
      return { rows: result.rows, rowCount: result.affectedRows ?? result.rows.length };
    },
    release() { releases++; },
  };
  const service = createTestPaymentService(async () => client);
  const version = (await db.query('select extract(epoch from updated_at)::text as version from public.orders')).rows[0].version;
  return {
    db, calls, service, version,
    get releases() { return releases; },
    approve: (expectedVersion = version, actor = ACTOR_ID, now = NOW) => service.approve(ORDER_ID, expectedVersion, 'Synthetic payment review', actor, now),
    snapshot: () => snapshot(db),
    close: () => db.close(),
    async addVariant() {
      await db.query('insert into public.product_variants(product_variant_id,product_id,price_per_item,available_sets) values($1,$2,15,20)', [VARIANT_ID,PRODUCT_ID]);
      await db.query('insert into public.product_images(product_id,product_variant_id) values($1,$2)', [PRODUCT_ID,VARIANT_ID]);
      await db.query('update public.order_items set product_variant_id=$1 where product_id=$2', [VARIANT_ID,PRODUCT_ID]);
    },
  };
}

async function snapshot(db) {
  const order = (await db.query('select payment_status, payment_confirmed_at from public.orders where order_id=$1', [ORDER_ID])).rows[0];
  const stock = (await db.query('select available_items from public.products order by product_id')).rows.map(row => row.available_items);
  const variants = (await db.query('select available_sets from public.product_variants order by product_variant_id')).rows.map(row => row.available_sets);
  const counts = {};
  for (const table of ['test_payment_approvals','payments','inventory_movements','order_status_history','admin_audit_log','admin_notifications']) {
    counts[table] = (await db.query(`select count(*)::integer as count from public.${table}`)).rows[0].count;
  }
  return { ...order, stock, variants, counts };
}
