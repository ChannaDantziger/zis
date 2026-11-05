import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { AdminCatalogService } from '../catalog/admin-catalog.types.js';
import type { StorageService } from '../storage/storage.service.js';
import { PRODUCT_MEDIA_BUCKET } from '../contracts/media.contracts.js';
import type { ManagedCatalog } from '../catalog/admin-catalog-management.types.js';

export function createAdminCatalogController(service: AdminCatalogService, resolveAdminUserId: AdminUserResolver, storage?: StorageService) {
  return {
    saveCategory: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      const result = await service.saveCategory({
        categoryId: request.params.categoryId === undefined ? undefined : readUuid(request.params.categoryId, 'categoryId'),
        name: readText(body.name, 'name'),
        sortOrder: body.sortOrder === undefined ? 0 : readNonNegativeInteger(body.sortOrder, 'sortOrder'),
        status: body.status === undefined ? 'active' : readEnum(body.status, ['active', 'hidden'] as const, 'status'),
      }, actor);
      response.status(request.params.categoryId ? 200 : 201).json(result);
    }),
    listProducts: withAdmin(resolveAdminUserId, async (request, response) => {
      const raw = request.query.page ?? '1';
      if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 100000) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid page');
      const categoryId = request.query.categoryId === undefined ? undefined : readUuid(request.query.categoryId, 'categoryId');
      const catalog = categoryId ? await service.listProducts(Number(raw), undefined, categoryId) : await service.listProducts(Number(raw));
      response.json(await withImageUrls(catalog, storage));
    }),
    productDetails: withAdmin(resolveAdminUserId, async (request, response) => {
      const catalog = await service.listProducts(1, readUuid(request.params.productId, 'productId'));
      if (!catalog.data[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Product not found');
      response.json((await withImageUrls(catalog, storage)).data[0]);
    }),
    updateProduct: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      response.json(await service.updateProduct({
        productId: readUuid(request.params.productId, 'productId'),
        categoryId: readUuid(body.categoryId, 'categoryId'), name: readText(body.name, 'name'),
        description: readNullableText(body.description, 'description'),
        setSize: readPositiveInteger(body.setSize, 'setSize'), pricePerUnit: body.pricePerUnit === null ? null : readMoney(body.pricePerUnit, 'pricePerUnit'),
        availableItems: readNonNegativeInteger(body.availableItems, 'availableItems'), displayOrder: readNonNegativeInteger(body.displayOrder, 'displayOrder'),
        status: readEnum(body.status, ['draft', 'active', 'hidden', 'sold_out', 'archived'] as const, 'status'),
        version: readText(body.version, 'version'),
      }, actor));
    }),
    updateVariant: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      response.json(await service.updateVariant({
        productVariantId: readUuid(request.params.productVariantId, 'productVariantId'),
        name: readText(body.name, 'name'), pricePerUnit: readMoney(body.pricePerUnit, 'pricePerUnit'),
        lowStockThresholdSets: readNonNegativeInteger(body.lowStockThresholdSets, 'lowStockThresholdSets'),
        defaultProductionQuantitySets: readPositiveInteger(body.defaultProductionQuantitySets, 'defaultProductionQuantitySets'),
        status: readEnum(body.status, ['active', 'hidden', 'sold_out', 'archived'] as const, 'status'),
        version: readText(body.version, 'version'),
      }, actor));
    }),
    createProduct: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const result = await service.createProduct({
        categoryId: readUuid(body.categoryId, 'categoryId'),
        name: readText(body.name, 'name'),
        description: readNullableText(body.description, 'description'),
        setSize: readPositiveInteger(body.setSize, 'setSize'), pricePerUnit: readMoney(body.pricePerUnit, 'pricePerUnit'),
        availableItems: readNonNegativeInteger(body.availableItems, 'availableItems'), displayOrder: readNonNegativeInteger(body.displayOrder, 'displayOrder'),
      }, adminUserId);
      response.status(201).json(result);
    }),
    createVariant: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const productId = readUuid(request.params.productId, 'productId');
      const result = await service.createVariant({
        productId,
        name: readText(body.name, 'name'),
        productCode: readText(body.productCode, 'productCode'),
        pricePerUnit: readMoney(body.pricePerUnit, 'pricePerUnit'),
        availableSets: readNonNegativeInteger(body.availableSets, 'availableSets'),
        lowStockThresholdSets: readNonNegativeInteger(body.lowStockThresholdSets, 'lowStockThresholdSets'),
        defaultProductionQuantitySets: readPositiveInteger(body.defaultProductionQuantitySets, 'defaultProductionQuantitySets'),
        attributes: readAttributes(body.attributes),
        isDefault: readBoolean(body.isDefault, 'isDefault'),
        status: readEnum(body.status, ['active', 'hidden'] as const, 'status'),
      }, adminUserId);
      response.status(201).json(result);
    }),
    createImage: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const result = await service.createImage({
        productId: readUuid(request.params.productId, 'productId'),
        productVariantId: body.productVariantId === null || body.productVariantId === undefined
          ? null : readUuid(body.productVariantId, 'productVariantId'),
        storagePath: readText(body.storagePath, 'storagePath'),
        altText: readText(body.altText, 'altText'),
        sortOrder: readNonNegativeInteger(body.sortOrder, 'sortOrder'),
        isPrimary: body.isPrimary === undefined ? undefined : readBoolean(body.isPrimary, 'isPrimary'),
      }, adminUserId);
      response.status(201).json(result);
    }),
    updateImage: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const result = await service.updateImage({
        imageId: readUuid(request.params.imageId, 'imageId'),
        version: readText(body.version, 'version'),
        altText: body.altText === undefined ? undefined : readText(body.altText, 'altText'),
        sortOrder: body.sortOrder === undefined ? undefined : readNonNegativeInteger(body.sortOrder, 'sortOrder'),
        isPrimary: body.isPrimary === undefined ? undefined : readBoolean(body.isPrimary, 'isPrimary'),
      }, adminUserId);
      response.status(200).json(result);
    }),
    listGallery: withAdmin(resolveAdminUserId, async (_request, response) => {
      const images = await service.listGallery();
      response.json(await Promise.all(images.map(async (image) => ({ ...image,
        url: storage ? (await storage.createSignedUrl('zis-event-gallery', image.storagePath)).url : undefined,
      }))));
    }),
    reorderGallery: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      if (!Array.isArray(body.imageIds)) throw new ApiError(400, 'VALIDATION_ERROR', 'imageIds must be an array');
      await service.reorderGallery(body.imageIds.map((id) => readUuid(id, 'imageId')), actor);
      response.status(204).end();
    }),
    addGalleryImage: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      response.status(201).json(await service.addGalleryImage(readText(body.storagePath, 'storagePath'), readNonNegativeInteger(body.sortOrder, 'sortOrder'), actor));
    }),
    setGalleryActive: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      const body = asRecord(request.body);
      await service.setGalleryActive(readUuid(request.params.imageId, 'imageId'), readBoolean(body.isActive, 'isActive'), actor);
      response.status(204).end();
    }),
    setGalleryFeatured: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      await service.setGalleryFeatured(readUuid(request.params.imageId, 'imageId'), actor);
      response.status(204).end();
    }),
    deleteImage: withAdmin(resolveAdminUserId, async (request, response, actor) => {
      if (!storage) throw new ApiError(503, 'MEDIA_STORAGE_UNAVAILABLE', 'Media storage is unavailable');
      const result = await service.deleteImage(readUuid(request.params.imageId, 'imageId'), actor);
      try { await storage.remove(result.bucket, result.storagePath); }
      catch { throw new ApiError(503, 'MEDIA_DELETE_RETRY_REQUIRED', 'Image cleanup failed in storage'); }
      await service.completeImageDelete(readUuid(request.params.imageId, 'imageId'), actor);
      response.status(204).end();
    }),
  };
}

async function withImageUrls(catalog: ManagedCatalog, storage?: StorageService): Promise<ManagedCatalog> {
  if (!storage) return catalog;
  return { ...catalog, categories:await Promise.all(catalog.categories.map(async category=>({...category,
    previewImages:await Promise.all((category.previewImages??[]).map(async image=>({...image,url:(await storage.createSignedUrl(PRODUCT_MEDIA_BUCKET,image.storagePath)).url}))),
  }))), data: await Promise.all(catalog.data.map(async (product) => ({
    ...product,
    images: await Promise.all(product.images.map(async (image) => ({
      ...image,
      url: (await storage.createSignedUrl(PRODUCT_MEDIA_BUCKET, image.storagePath)).url,
    }))),
  }))) };
}

function withAdmin(resolveAdminUserId: AdminUserResolver, handler: (request: Request, response: Response, adminUserId: string) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const resolution = await resolveAdminUserId(request);
    if (resolution.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (resolution.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
    if (resolution.role !== 'operations_manager') throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    response.setHeader('Cache-Control', 'no-store');
    await handler(request, response, resolution.adminUserId);
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'JSON object body is required');
  return value as Record<string, unknown>;
}

function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required`, { [field]: 'required' });
  return value.trim();
}

function readNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  return readText(value, field);
}

function readUuid(value: unknown, field: string): string {
  const text = readText(value, field);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a UUID`, { [field]: 'invalid UUID' });
  }
  return text;
}

function readPositiveInteger(value: unknown, field: string): number {
  const number = readNumber(value, field);
  if (!Number.isSafeInteger(number) || number < 1 || number > 2147483647) throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a positive integer`);
  return number;
}

function readNonNegativeInteger(value: unknown, field: string): number {
  const number = readNumber(value, field);
  if (!Number.isSafeInteger(number) || number < 0 || number > 2147483647) throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a non-negative integer`);
  return number;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a number`);
  return value;
}

function readMoney(value: unknown, field: string): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a non-negative amount with up to two decimals`);
  }
  if (!Number.isFinite(Number(value)) || Number(value) > 9999999999.99) throw new ApiError(400, 'VALIDATION_ERROR', 'Amount is too large');
  return Number(value).toFixed(2);
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be boolean`);
  return value;
}

function readAttributes(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'attributes must be an object');
  return value as Record<string, unknown>;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is invalid`);
  return value as T;
}
