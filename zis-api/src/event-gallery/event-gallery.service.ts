import { EVENT_GALLERY_BUCKET } from '../contracts/media.contracts.js';
import type { EventGalleryRepository, EventGalleryService } from './event-gallery.types.js';

export function createEventGalleryService(repository: EventGalleryRepository,
  resolveUrl: (bucket: typeof EVENT_GALLERY_BUCKET, storagePath: string) => Promise<string>): EventGalleryService {
  return {
    async listPublished() {
      const records = await repository.listPublished();
      return Promise.all(records.map(async (image) => ({
        imageId: image.imageId,
        url: await resolveUrl(EVENT_GALLERY_BUCKET, image.storagePath),
        altText: 'תמונת גלריה',
        sortOrder: image.sortOrder,
        isFeatured: image.isFeatured,
      })));
    },
  };
}
