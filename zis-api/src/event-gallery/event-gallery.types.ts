import type { EventGalleryImage } from '../contracts/event-gallery.contracts.js';

export interface EventGalleryRecord {
  imageId: string;
  storagePath: string;
  sortOrder: number;
  isFeatured: boolean;
}

export interface EventGalleryRepository {
  listPublished(): Promise<EventGalleryRecord[]>;
}

export interface EventGalleryService {
  listPublished(): Promise<EventGalleryImage[]>;
}
