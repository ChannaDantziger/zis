import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { EventGalleryRepository } from './event-gallery.types.js';

interface EventImageRow {
  [key: string]: unknown;
  event_gallery_image_id: string;
  storage_path: string;
  sort_order: number;
  is_featured: boolean;
}

export function createPostgresEventGalleryRepository(factory: SqlClientFactory): EventGalleryRepository {
  return {
    async listPublished() {
      const client = await factory();
      try {
        const result = await client.query<EventImageRow>(
          `select event_gallery_image_id, storage_path, sort_order, is_featured
             from public.event_gallery_images
            where is_published = true and is_deleted = false
            order by sort_order, event_gallery_image_id`,
        );
        return result.rows.map((row) => ({ imageId: row.event_gallery_image_id,
          storagePath: row.storage_path, sortOrder: row.sort_order, isFeatured: row.is_featured }));
      } finally {
        client.release?.();
      }
    },
  };
}
