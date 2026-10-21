import assert from 'node:assert/strict';
import test from 'node:test';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createPostgresAdminCatalogRepository } from './postgres-admin-catalog.repository.js';

const imageId = '00000000-0000-4000-8000-000000000001';
const actor = '00000000-0000-4000-8000-000000000002';

function fixture() {
  const statements: Array<{ sql: string; values?: unknown[] }> = [];
  const client = {
    async query(sql: string, values?: unknown[]) {
      statements.push({ sql, values });
      if (sql.includes('select * from public.event_gallery_images')) return { rows: [{ event_gallery_image_id: imageId, is_published: true }] };
      if (sql.includes('returning event_gallery_image_id as id')) return { rows: [{ id: imageId }] };
      return { rows: [] };
    },
    release() {},
  } as unknown as SqlClient;
  return { repository: createPostgresAdminCatalogRepository(async () => client), statements };
}

test('new gallery pictures are published by default', async () => {
  const f = fixture();
  await f.repository.addGalleryImage('zis-event-gallery/sample.webp', 2, actor);
  const insert = f.statements.find((statement) => statement.sql.includes('insert into public.event_gallery_images'));
  assert.match(insert?.sql ?? '', /values\(\$1,\$2, true\)/);
});

test('selecting the hero demotes the old image before promoting the visible new one', async () => {
  const f = fixture();
  await f.repository.setGalleryFeatured(imageId, actor);
  const demote = f.statements.findIndex((statement) => statement.sql.includes('set is_featured=false'));
  const promote = f.statements.findIndex((statement) => statement.sql.includes('set is_featured=true'));
  assert.ok(demote >= 0 && promote > demote);
  assert.equal(f.statements.at(-1)?.sql, 'commit');
});
