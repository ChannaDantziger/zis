import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ALLOWED_MEDIA_TYPES,
  EVENT_GALLERY_BUCKET,
  MAX_MEDIA_BYTES,
  PRODUCT_MEDIA_BUCKET,
  type MediaBucket,
  type MediaUploadInput,
  type MediaUploadResult,
} from '../contracts/media.contracts.js';

export interface StorageService {
  upload(input: MediaUploadInput, content: Buffer): Promise<MediaUploadResult>;
  createSignedUrl(bucket: MediaBucket, storagePath: string): Promise<MediaUploadResult>;
  remove(bucket: MediaBucket, storagePath: string): Promise<void>;
}

const SIGNED_URL_TTL_SECONDS = 60 * 15;

export function createSupabaseStorageService(supabase: SupabaseClient): StorageService {
  return {
    upload,
    createSignedUrl,
    remove,
  };

  async function upload(input: MediaUploadInput, content: Buffer): Promise<MediaUploadResult> {
    validateUpload(input, content);
    const storagePath = buildStoragePath(input.bucket, input.fileName);
    const { error } = await supabase.storage.from(input.bucket).upload(storagePath, content, {
      contentType: input.contentType,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      throw new Error('Media upload failed');
    }

    return createSignedUrl(input.bucket, storagePath);
  }

  async function createSignedUrl(bucket: MediaBucket, storagePath: string): Promise<MediaUploadResult> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw new Error('Media URL generation failed');
    }

    return {
      bucket,
      storagePath,
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async function remove(bucket: MediaBucket, storagePath: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) {
      throw new Error('Media removal failed');
    }
  }
}

function validateUpload(input: MediaUploadInput, content: Buffer): void {
  if (!isMediaBucket(input.bucket) || !isAllowedContentType(input.contentType)) {
    throw new Error('Unsupported media bucket or content type');
  }

  if (content.length !== input.byteLength || content.length > MAX_MEDIA_BYTES || content.length === 0) {
    throw new Error('Media file size is invalid');
  }

  if (!input.fileName.trim()) {
    throw new Error('Media file name is required');
  }
}

function buildStoragePath(bucket: MediaBucket, fileName: string): string {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : '';
  return `${bucket}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
}

function isMediaBucket(value: string): value is MediaBucket {
  return value === PRODUCT_MEDIA_BUCKET || value === EVENT_GALLERY_BUCKET;
}

function isAllowedContentType(value: string): value is (typeof ALLOWED_MEDIA_TYPES)[number] {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}
