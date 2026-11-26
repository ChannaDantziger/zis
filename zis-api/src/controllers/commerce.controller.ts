import type { Request, Response } from 'express';
import type { AvailabilityRequest, CartItemInput, ShippingQuoteInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { CommerceService } from '../commerce/commerce.types.js';
import { readBundleInputs } from '../commerce/bundle-validation.js';

const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000;

export function createCommerceController(service: CommerceService, options: { bundlesEnabled?: boolean } = {}) {
  return {
    getDeliveryDates: async (_request: Request, response: Response) => {
      response.json(await service.getDeliveryDates!());
    },
    getStoreStatus: async (_request: Request, response: Response) => response.status(200).json(await service.getStoreStatus()),
    listShippingZones: async (_request: Request, response: Response) => response.status(200).json({ data: await service.listShippingZones() }),
    getAvailability: async (request: Request, response: Response) => response.status(200).json(await service.getAvailability(readAvailabilityInput(request.body, options.bundlesEnabled === true))),
    calculateQuote: async (request: Request, response: Response) => response.status(200).json(await service.calculateQuote(readQuoteInput(request.body, options.bundlesEnabled === true))),
  };
}

function readAvailabilityInput(value: unknown, bundlesEnabled: boolean): AvailabilityRequest {
  const body = asRecord(value);
  if (!bundlesEnabled) rejectUnsupportedBundles(body);
  const bundles = bundlesEnabled ? readBundleInputs(body.bundles) : [];
  const items = readItems(body.items, bundles.length > 0);
  if (items.length + bundles.length > MAX_ITEMS) throw new ApiError(400, 'VALIDATION_ERROR', 'Too many order lines');
  return { deliveryDate: readText(body.deliveryDate, 'deliveryDate'), items, ...(bundles.length ? { bundles } : {}) };
}

function readQuoteInput(value: unknown, bundlesEnabled: boolean): ShippingQuoteInput {
  const body = asRecord(value);
  if (!bundlesEnabled) rejectUnsupportedBundles(body);
  const bundles = bundlesEnabled ? readBundleInputs(body.bundles) : [];
  const items = readItems(body.items, bundles.length > 0);
  if (items.length + bundles.length > MAX_ITEMS) throw new ApiError(400, 'VALIDATION_ERROR', 'Too many order lines');
  return {
    deliveryDate: readText(body.deliveryDate, 'deliveryDate'),
    shippingZoneId: readText(body.shippingZoneId, 'shippingZoneId'),
    items,
    ...(bundles.length ? { bundles } : {}),
    isUrgent: body.isUrgent === undefined || body.isUrgent === false ? false : rejectUrgent(),
  };
}

function rejectUnsupportedBundles(body: Record<string, unknown>): void {
  if ('bundles' in body && (!Array.isArray(body.bundles) || body.bundles.length > 0)) {
    throw new ApiError(503, 'BUNDLE_ORDER_NOT_AVAILABLE', 'Bundle ordering is not available yet');
  }
}

function readItems(value: unknown, hasBundles = false): CartItemInput[] {
  if (!Array.isArray(value) || (!value.length && !hasBundles) || value.length > MAX_ITEMS) throw new ApiError(400, 'VALIDATION_ERROR', 'items must be a non-empty array');
  return value.map((item) => {
    const record = asRecord(item);
    const quantitySets = record.quantitySets;
    if (typeof quantitySets !== 'number' || !Number.isSafeInteger(quantitySets) || quantitySets < 1 || quantitySets > MAX_QUANTITY) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'quantitySets must be a positive integer');
    }
    return { productId: readText(record.productId, 'productId'), productVariantId: record.productVariantId == null ? null : readText(record.productVariantId, 'productVariantId'), quantitySets };
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'JSON object body is required');
  return value as Record<string, unknown>;
}

function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required`);
  return value.trim();
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be boolean`);
  return value;
}

function rejectUrgent(): never { throw new ApiError(400,'VALIDATION_ERROR','Urgent shipping is not available for public orders'); }
