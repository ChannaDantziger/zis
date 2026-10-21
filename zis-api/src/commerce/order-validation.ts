import type { CreateOrderInput, DeliveryAddress } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000;
export function readOrderInput(value: unknown): CreateOrderInput {
  const body = record(value); const address = record(body.deliveryAddress);
  for (const field of ['status','paymentStatus','total','subtotal','isUrgent','taxRate']) if (field in body) invalid(field);
  const items = body.items;
  if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) invalid('items');
  const seen = new Set<string>();
  const lines = items.map((value) => {
    const item = record(value); const productId = uuid(item.productId, 'productId');
    const productVariantId = item.productVariantId == null ? null : uuid(item.productVariantId, 'productVariantId');
    const key = productVariantId ?? productId;
    if (seen.has(key)) invalid('duplicate product item'); seen.add(key);
    if (!Number.isSafeInteger(item.quantitySets) || Number(item.quantitySets) < 1 || Number(item.quantitySets) > MAX_QUANTITY) invalid('quantitySets');
    return { productId, productVariantId, quantitySets: Number(item.quantitySets) };
  }).sort((a, b) => (a.productVariantId ?? a.productId).localeCompare(b.productVariantId ?? b.productId));
  const deliveryDate = text(body.deliveryDate, 'deliveryDate', 10);
  const parsedDate=new Date(deliveryDate+'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== deliveryDate) invalid('deliveryDate');
  const customerEmail = text(body.customerEmail, 'customerEmail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) invalid('customerEmail');
  const customerPhone = text(body.customerPhone, 'customerPhone', 30);
  const digits=customerPhone.replace(/\D/g,'');
  if (!/^\+?[\d ()-]{7,30}$/.test(customerPhone) || digits.length < 7 || digits.length > 15) invalid('customerPhone');
  const deliveryAddress: DeliveryAddress = {city:text(address.city,'city',100),street:text(address.street,'street',200),houseNumber:text(address.houseNumber,'houseNumber',30)};
  for (const field of ['neighborhood','apartment','postalCode','venueName'] as const) deliveryAddress[field] = optional(address[field],field,200);
  return { customerName:text(body.customerName,'customerName',150), customerEmail, customerPhone, deliveryAddress, deliveryDate,
    shippingZoneId:uuid(body.shippingZoneId,'shippingZoneId'), shippingMethodId:uuid(body.shippingMethodId,'shippingMethodId'), items:lines,
    dedicationText:optional(body.dedicationText,'dedicationText',2000), customerNotes:optional(body.customerNotes,'customerNotes',2000) };
}
export function readIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) invalid('Idempotency-Key'); return value;
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body'); return value as Record<string,unknown>; }
function text(value: unknown, field: string, max: number): string { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) invalid(field); return value.trim(); }
function optional(value: unknown, field: string, max: number): string | null { return value == null || value === '' ? null : text(value,field,max); }
function uuid(value: unknown, field: string): string { const result=text(value,field,36); if (!UUID.test(result)) invalid(field); return result.toLowerCase(); }
function invalid(field: string): never { throw new ApiError(400,'VALIDATION_ERROR',`Invalid ${field}`); }
