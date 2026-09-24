import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import {
  ALLOWED_MEDIA_TYPES,
  EVENT_GALLERY_BUCKET,
  MAX_MEDIA_BYTES,
  PRODUCT_MEDIA_BUCKET,
  type MediaBucket,
} from '../contracts/media.contracts.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { StorageService } from '../storage/storage.service.js';

export function createAdminMediaController(
  storage: StorageService,
  resolveAdminUserId: AdminUserResolver,
) {
  return async function uploadMedia(request: Request, response: Response): Promise<void> {
    const adminResolution = await resolveAdminUserId(request);
    if (adminResolution.status === 'unauthenticated') {
      throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    }
    if (adminResolution.status === 'forbidden') {
      throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    }

    const bucket = readBucket(request.header('X-Media-Bucket'));
    const contentType = request.header('Content-Type');
    const fileName = request.header('X-File-Name');
    const content = request.body;
    if (!contentType || !isAllowedContentType(contentType) || !fileName || !Buffer.isBuffer(content)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Media bucket, file name, content type and binary body are required');
    }
    if (content.length > MAX_MEDIA_BYTES || content.length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Media file size is invalid');
    }

    const result = await storage.upload({
      bucket,
      fileName,
      contentType,
      byteLength: content.length,
    }, content);
    response.status(201).json(result);
  };
}

function readBucket(value: string | undefined): MediaBucket {
  if (value === PRODUCT_MEDIA_BUCKET || value === EVENT_GALLERY_BUCKET) {
    return value;
  }
  throw new ApiError(400, 'VALIDATION_ERROR', 'X-Media-Bucket is invalid');
}

function isAllowedContentType(value: string): value is (typeof ALLOWED_MEDIA_TYPES)[number] {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(value);
}
