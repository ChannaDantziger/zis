export const PRODUCT_MEDIA_BUCKET = 'zis-product-media';
export const EVENT_GALLERY_BUCKET = 'zis-event-gallery';
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type MediaBucket = typeof PRODUCT_MEDIA_BUCKET | typeof EVENT_GALLERY_BUCKET;

export interface MediaUploadInput {
  bucket: MediaBucket;
  fileName: string;
  contentType: (typeof ALLOWED_MEDIA_TYPES)[number];
  byteLength: number;
}

export interface MediaUploadResult {
  bucket: MediaBucket;
  storagePath: string;
  url: string;
  expiresAt: string;
}

export interface ProductImageAdminInput {
  productId: string;
  productVariantId?: string | null;
  storagePath: string;
  altText: string;
  sortOrder: number;
}

export interface EventGalleryImageAdminInput {
  storagePath: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface MediaReplaceInput {
  previousStoragePath: string;
  replacement: MediaUploadResult;
}
