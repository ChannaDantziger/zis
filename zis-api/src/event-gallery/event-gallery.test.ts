import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { EVENT_GALLERY_BUCKET } from '../contracts/media.contracts.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { createEventGalleryService } from './event-gallery.service.js';
import { createPostgresEventGalleryRepository } from './postgres-event-gallery.repository.js';

test('event gallery queries only published, non-deleted images in stable order and releases its client', async () => {
  let released = false;
  let capturedSql = '';
  const rows = [{ event_gallery_image_id: 'image-1', storage_path: 'private/path.webp', sort_order: 2, is_featured: true }];
  const client: SqlClient = {
    async query<Row extends Record<string, unknown>>(sql: string) {
      capturedSql = sql;
      return { rows: rows as unknown as Row[], rowCount: 1 };
    },
    release() { released = true; },
  };
  const result = await createPostgresEventGalleryRepository(async () => client).listPublished();
  assert.match(capturedSql, /where is_published = true and is_deleted = false/);
  assert.match(capturedSql, /order by sort_order, event_gallery_image_id/);
  assert.equal(released, true);
  assert.equal(result[0]?.imageId, 'image-1');
  assert.equal(result[0]?.isFeatured, true);
});

test('event gallery HTTP response uses event storage bucket and exposes URLs without storage metadata', async () => {
  const service = createEventGalleryService({ async listPublished() {
    return [{ imageId: 'event-1', storagePath: 'private/event.webp', sortOrder: 0, isFeatured: true }];
  } }, async (bucket, path) => {
    assert.equal(bucket, EVENT_GALLERY_BUCKET);
    assert.equal(path, 'private/event.webp');
    return 'https://media.invalid/event.webp';
  });
  const response = await request(createApp({ eventGalleryService: service })).get('/event-gallery').expect(200);
  assert.deepEqual(response.body, { data: [{ imageId: 'event-1', url: 'https://media.invalid/event.webp',
    altText: 'תמונת גלריה', sortOrder: 0, isFeatured: true }] });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(response.body), /storagePath|storage_path|private/);
});

test('event gallery releases database client when query fails', async () => {
  let released = false;
  const repository = createPostgresEventGalleryRepository(async () => ({
    async query() { throw new Error('DB unavailable'); },
    release() { released = true; },
  }));
  await assert.rejects(repository.listPublished(), /DB unavailable/);
  assert.equal(released, true);
});
