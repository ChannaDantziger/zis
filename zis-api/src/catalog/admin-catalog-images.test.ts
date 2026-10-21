import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresAdminCatalogRepository } from './postgres-admin-catalog.repository.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

const productId = '00000000-0000-4000-8000-000000000001';
const imageId = '00000000-0000-4000-8000-000000000002';
const actor = '00000000-0000-4000-8000-000000000003';
const input = { productId, productVariantId: null, storagePath: 'zis-product-media/sample.png', altText: 'דוגמה', sortOrder: 10 };

function fixture(hasPrimary: boolean) {
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  const client = {
    async query(sql: string, values?: unknown[]) {
      statements.push({ sql, values });
      if (sql.includes('from public.products where product_id=$1 for update')) return { rows: [{ product_id: productId }] };
      if (sql.includes('from public.product_images where product_image_id=$1 and not is_deleted')) return { rows: [{ productId }] };
      if (sql.includes('from public.product_images') && sql.includes('extract(epoch from updated_at)')) {
        return { rows: [{ product_id: productId, product_variant_id: null, image_type: 'gallery', version: '1' }] };
      }
      if (sql.includes('from public.product_images') && sql.includes('image_type=\'primary\'') && sql.includes('for update')) {
        return { rows: hasPrimary ? [{ imageId }] : [] };
      }
      if (sql.includes('returning product_image_id as id')) return { rows: [{ id: imageId }] };
      return { rows: [] };
    },
    release() {},
  } as unknown as SqlClient;
  return { repository: createPostgresAdminCatalogRepository(async () => client), statements };
}

test('first image becomes primary and later image stays in gallery', async () => {
  const first = fixture(false);
  await first.repository.createImage(input, actor);
  assert.equal(first.statements.find((s) => s.sql.includes('insert into public.product_images'))?.values?.[4], 'primary');

  const second = fixture(true);
  await second.repository.createImage(input, actor);
  assert.equal(second.statements.find((s) => s.sql.includes('insert into public.product_images'))?.values?.[4], 'gallery');
  assert.equal(second.statements.some((s) => s.sql.includes("set image_type='gallery'")), false);
});

test('choosing a new primary demotes the previous one before inserting', async () => {
  const f = fixture(true);
  await f.repository.createImage({ ...input, isPrimary: true }, actor);
  const demote = f.statements.findIndex((s) => s.sql.includes("set image_type='gallery'"));
  const insert = f.statements.findIndex((s) => s.sql.includes('insert into public.product_images'));
  assert.ok(demote >= 0 && demote < insert);
  assert.equal(f.statements[insert]?.values?.[4], 'primary');
  assert.equal(f.statements.at(-1)?.sql, 'commit');
});

test('selecting a gallery image as primary changes both image types in one transaction', async () => {
  const f = fixture(true);
  await f.repository.updateImage({ imageId, version: '1', isPrimary: true }, actor);
  const demote = f.statements.findIndex((s) => s.sql.includes("set image_type='gallery'"));
  const promote = f.statements.findIndex((s) => s.sql.includes("image_type = case when $4 then 'primary'"));
  assert.ok(demote >= 0 && demote < promote);
  assert.equal(f.statements[promote]?.values?.[3], true);
  assert.equal(f.statements.at(-1)?.sql, 'commit');
});
