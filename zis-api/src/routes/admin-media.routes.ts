import { Router } from 'express';
import express from 'express';
import {
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BYTES,
} from '../contracts/media.contracts.js';
import type { AdminUserResolver } from '../controllers/admin-inventory.controller.js';
import { createAdminMediaController } from '../controllers/admin-media.controller.js';
import type { StorageService } from '../storage/storage.service.js';

export function createAdminMediaRouter(storage: StorageService, resolveAdminUserId: AdminUserResolver): Router {
  const router = Router();
  router.post(
    '/admin/media/upload',
    express.raw({ type: [...ALLOWED_MEDIA_TYPES], limit: MAX_MEDIA_BYTES }),
    createAdminMediaController(storage, resolveAdminUserId),
  );
  return router;
}
