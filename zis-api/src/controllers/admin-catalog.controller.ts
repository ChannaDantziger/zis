import type { Request, Response } from 'express';
import { ApiError } from '../http/api-error.js';
import type { AdminUserResolver } from './admin-inventory.controller.js';
import type { AdminCatalogService } from '../catalog/admin-catalog.types.js';

export function createAdminCatalogController(service: AdminCatalogService, resolveAdminUserId: AdminUserResolver) {
  return {
    createProduct: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const result = await service.createProduct({
        categoryId: readUuid(body.categoryId, 'categoryId'),
        name: readText(body.name, 'name'),
        description: readNullableText(body.description, 'description'),
        setSize: readPositiveInteger(body.setSize, 'setSize'),
        minimumSets: readPositiveInteger(body.minimumSets, 'minimumSets'),
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
        pricePerSet: readMoney(body.pricePerSet, 'pricePerSet'),
        availableSets: readNonNegativeInteger(body.availableSets, 'availableSets'),
        lowStockThresholdSets: readNonNegativeInteger(body.lowStockThresholdSets, 'lowStockThresholdSets'),
        defaultProductionQuantitySets: readPositiveInteger(body.defaultProductionQuantitySets, 'defaultProductionQuantitySets'),
        attributes: readAttributes(body.attributes),
        isDefault: readBoolean(body.isDefault, 'isDefault'),
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
        imageType: readEnum(body.imageType, ['primary', 'gallery'] as const, 'imageType'),
        sortOrder: readNonNegativeInteger(body.sortOrder, 'sortOrder'),
      }, adminUserId);
      response.status(201).json(result);
    }),
    updateImage: withAdmin(resolveAdminUserId, async (request, response, adminUserId) => {
      const body = asRecord(request.body);
      const result = await service.updateImage({
        imageId: readUuid(request.params.imageId, 'imageId'),
        altText: body.altText === undefined ? undefined : readText(body.altText, 'altText'),
        imageType: body.imageType === undefined ? undefined : readEnum(body.imageType, ['primary', 'gallery'] as const, 'imageType'),
        sortOrder: body.sortOrder === undefined ? undefined : readNonNegativeInteger(body.sortOrder, 'sortOrder'),
        isDeleted: body.isDeleted === undefined ? undefined : readBoolean(body.isDeleted, 'isDeleted'),
      }, adminUserId);
      response.status(200).json(result);
    }),
  };
}

function withAdmin(resolveAdminUserId: AdminUserResolver, handler: (request: Request, response: Response, adminUserId: string) => Promise<void>) {
  return async (request: Request, response: Response): Promise<void> => {
    const resolution = await resolveAdminUserId(request);
    if (resolution.status === 'unauthenticated') throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required');
    if (resolution.status === 'forbidden') throw new ApiError(403, 'ADMIN_ACCESS_REQUIRED', 'Active admin access required');
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
  if (!Number.isInteger(number) || number < 1) throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a positive integer`);
  return number;
}

function readNonNegativeInteger(value: unknown, field: string): number {
  const number = readNumber(value, field);
  if (!Number.isInteger(number) || number < 0) throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a non-negative integer`);
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
