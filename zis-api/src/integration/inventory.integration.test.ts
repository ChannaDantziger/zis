import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Pool } from 'pg';
import { createPostgresClientFactory, createPostgresPool } from '../infrastructure/postgres.js';
import { createInventoryService } from '../inventory/inventory.service.js';
import { createPostgresInventoryRepository } from '../inventory/postgres-inventory.repository.js';

const integrationEnabled = process.env.RUN_DB_INTEGRATION === 'true';
const developmentUrl = process.env.DATABASE_URL_TRN;
const skipReason = !integrationEnabled
  ? 'Set RUN_DB_INTEGRATION=true to run Development database integration tests.'
  : !developmentUrl
    ? 'DATABASE_URL_TRN is not configured.'
    : process.env.NODE_ENV === 'production'
      ? 'Integration tests are blocked in production.'
      : false;

test('inventory service updates a real Development PostgreSQL database transactionally', { skip: skipReason }, async () => {
  assert.ok(developmentUrl);
  const pool = createPostgresPool({ connectionString: developmentUrl, max: 1 });
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();

  try {
    await pool.query('select 1');
    await pool.query(
      `insert into public.categories (category_id, name, slug)
       values ($1, $2, $3)`,
      [categoryId, 'Integration Test Category', `integration-${categoryId}`],
    );
    await pool.query(
      `insert into public.products (product_id, category_id, name, set_size)
       values ($1, $2, $3, 1)`,
      [productId, categoryId, 'Integration Test Product'],
    );
    await pool.query(
      `insert into public.product_variants
        (product_variant_id, product_id, name, product_code, price_per_set,
         available_sets, low_stock_threshold_sets, default_production_quantity_sets)
       values ($1, $2, $3, $4, 10, 2, 1, 5)`,
      [variantId, productId, 'Integration Test Variant', `integration-${variantId}`],
    );

    const repository = createPostgresInventoryRepository(createPostgresClientFactory(pool));
    const result = await createInventoryService(repository).updateByAdmin({
      productVariantId: variantId,
      deltaSets: 5,
      reason: 'Integration test restock',
      adminUserId: randomUUID(),
    });

    assert.deepEqual(result, { stockBefore: 2, stockAfter: 7 });
    const stored = await pool.query(
      `select available_sets from public.product_variants where product_variant_id = $1`,
      [variantId],
    );
    assert.equal(stored.rows[0]?.available_sets, 7);
  } finally {
    await pool.query('delete from public.product_variants where product_variant_id = $1', [variantId]);
    await pool.query('delete from public.products where product_id = $1', [productId]);
    await pool.query('delete from public.categories where category_id = $1', [categoryId]);
    await pool.end();
  }
});
