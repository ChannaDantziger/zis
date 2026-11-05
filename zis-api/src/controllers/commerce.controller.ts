import type { Request, Response } from 'express';
import type { AvailabilityRequest, CartItemInput, ShippingQuoteInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { CommerceService } from '../commerce/commerce.types.js';

export function createCommerceController(service: CommerceService) {
  return {
    getDeliveryDates: async (request: Request, response: Response) => {
      const zone=readText(request.query.shippingZoneId,'shippingZoneId');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zone)) throw new ApiError(400,'VALIDATION_ERROR','Invalid shippingZoneId');
      response.json(await service.getDeliveryDates!(zone));
    },
    getStoreStatus: async (_request: Request, response: Response) => response.status(200).json(await service.getStoreStatus()),
    listShippingZones: async (_request: Request, response: Response) => response.status(200).json({ data: await service.listShippingZones() }),
    getAvailability: async (request: Request, response: Response) => response.status(200).json(await service.getAvailability(readAvailabilityInput(request.body))),
    calculateQuote: async (request: Request, response: Response) => response.status(200).json(await service.calculateQuote(readQuoteInput(request.body))),
  };
}

function readAvailabilityInput(value: unknown): AvailabilityRequest {
  const body = asRecord(value);
  return { deliveryDate: readText(body.deliveryDate, 'deliveryDate'), items: readItems(body.items) };
}

function readQuoteInput(value: unknown): ShippingQuoteInput {
  const body = asRecord(value);
  return {
    deliveryDate: readText(body.deliveryDate, 'deliveryDate'),
    shippingZoneId: readText(body.shippingZoneId, 'shippingZoneId'),
    items: readItems(body.items),
    isUrgent: body.isUrgent === undefined || body.isUrgent === false ? false : rejectUrgent(),
  };
}

function readItems(value: unknown): CartItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'items must be a non-empty array');
  return value.map((item) => {
    const record = asRecord(item);
    const quantitySets = record.quantitySets;
    if (typeof quantitySets !== 'number' || !Number.isInteger(quantitySets) || quantitySets < 1) {
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
