import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import { PRODUCT_MEDIA_BUCKET } from '../contracts/media.contracts.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { StorageService } from '../storage/storage.service.js';
import type { BundlesRepository } from '../catalog/bundles.repository.js';

export function createAdminBundlesController(repo: BundlesRepository, resolve: AdminUserResolver, storage?: StorageService) {
  const guard = (handler: (req: Request, res: Response, actor: string) => Promise<void>) => async (req: Request, res: Response) => {
    const user = await resolve(req);
    if (user.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (user.status === 'forbidden' || user.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    res.setHeader('Cache-Control', 'no-store');
    await handler(req, res, user.adminUserId);
  };
  return {
    list: guard(async (req, res) => {
      const bundles = await repo.list(uuid(req.query.categoryId));
      const result = await Promise.all(bundles.map(async bundle => ({ ...bundle, images: await Promise.all(
        (bundle.images as Array<Record<string, unknown>>).map(async image => ({ ...image,
          url: storage && !image.isDeleted ? (await storage.createSignedUrl(PRODUCT_MEDIA_BUCKET, String(image.storagePath))).url : undefined })) ) })));
      res.json(result);
    }),
    save: guard(async (req, res, actor) => {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid input');
      const name = text(body.name);
      if (name.length > 200) throw new ApiError(400, 'VALIDATION_ERROR', 'Name too long');
      if (!Number.isSafeInteger(body.unitCount) || Number(body.unitCount) < 1 || Number(body.unitCount) > 2147483647) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid unit count');
      const id = req.params.bundleId ? uuid(req.params.bundleId) : undefined;
      const status = body.status === 'hidden' ? 'hidden' : body.status === 'draft' ? 'draft' : null;
      if (!status) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid status');
      const result = await repo.save(id, { categoryId: uuid(body.categoryId), name, description: body.description ? text(body.description) : null,
        unitCount: Number(body.unitCount), status, version: id ? text(body.version) : undefined }, actor);
      res.status(id ? 200 : 201).json(result);
    }),
    addImage: guard(async (req, res, actor) => {
      const path = text(req.body?.storagePath);
      if (!path.startsWith('zis-product-media/') || path.includes('..')) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid image path');
      res.status(201).json(await repo.addImage(uuid(req.params.bundleId), path, text(req.body?.altText), actor));
    }),
    updateImage: guard(async (req, res, actor) => {
      const order = req.body?.sortOrder;
      if (!Number.isSafeInteger(order) || order < 0 || order > 2147483647) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid sort order');
      await repo.updateImage(uuid(req.params.imageId), text(req.body?.version), text(req.body?.altText), order, actor);
      res.status(204).end();
    }),
    deleteImage: guard(async (req, res, actor) => {
      if (!storage) throw new ApiError(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Media storage is unavailable');
      const id = uuid(req.params.imageId), path = await repo.markImageDeleted(id, actor);
      try { await storage.remove(PRODUCT_MEDIA_BUCKET, path); }
      catch { throw new ApiError(503, 'MEDIA_DELETE_RETRY_REQUIRED', 'Image cleanup failed in storage'); }
      await repo.finishImageDelete(id, actor);
      res.status(204).end();
    }),
  };
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Text is required');
  return value.trim();
}
function uuid(value: unknown): string {
  const id = text(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid identifier');
  return id;
}
