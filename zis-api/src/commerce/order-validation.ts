import type { CreateOrderInput, DeliveryAddress } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import { readBundleInputs } from './bundle-validation.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000;
export function readOrderInput(value: unknown, allowBundles = false): CreateOrderInput {
  const body = record(value); const address = record(body.deliveryAddress);
  // Until bundle snapshots, inventory and fulfillment are wired together, never
  // silently accept a request while dropping its bundle lines.
  if (!allowBundles && 'bundles' in body && (!Array.isArray(body.bundles) || body.bundles.length > 0)) {
    throw new ApiError(503, 'BUNDLE_ORDER_NOT_AVAILABLE', 'Bundle ordering is not available yet');
  }
  const bundles = allowBundles ? readBundleInputs(body.bundles) : [];
  for (const field of ['status','paymentStatus','total','subtotal','isUrgent','taxRate','isTest','is_test']) if (field in body) invalid(field);
  const items = body.items;
  if (!Array.isArray(items) || (!items.length && !bundles.length) || items.length + bundles.length > MAX_ITEMS) invalid('items');
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
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(customerEmail)) invalid('customerEmail');
  const customerPhone = phone(body.customerPhone, 'customerPhone');
  const deliveryPhone = phone(body.deliveryPhone ?? body.customerPhone, 'deliveryPhone');
  const deliveryAddress: DeliveryAddress = {city:text(address.city,'city',100),street:text(address.street,'street',200),houseNumber:text(address.houseNumber,'houseNumber',30)};
  for (const field of ['neighborhood','apartment','postalCode','venueName'] as const) deliveryAddress[field] = optional(address[field],field,200);
  return { customerName:text(body.customerName,'customerName',150), customerEmail, customerPhone, deliveryPhone, deliveryAddress, deliveryDate,
    shippingZoneId:uuid(body.shippingZoneId,'shippingZoneId'), items:lines, ...(bundles.length ? {bundles} : {}),
    dedicationText:optional(body.dedicationText,'dedicationText',2000), customerNotes:optional(body.customerNotes,'customerNotes',2000) };
}
export function readIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) invalid('Idempotency-Key'); return value;
}
export function readPendingOrderUpdate(value: unknown) {
  const body = record(value);
  for (const field of Object.keys(body)) if (!['items', 'bundles', 'expectedVersion'].includes(field)) invalid(field);
  const expectedVersion = text(body.expectedVersion, 'expectedVersion', 30);
  if (!/^\d{1,20}(?:\.\d{1,6})?$/.test(expectedVersion)) invalid('expectedVersion');
  return { items: body.items, expectedVersion, ...(body.bundles === undefined ? {} : { bundles: body.bundles }) };
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('body'); return value as Record<string,unknown>; }
function text(value: unknown, field: string, max: number): string { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) invalid(field); return value.trim(); }
function optional(value: unknown, field: string, max: number): string | null { return value == null || value === '' ? null : text(value,field,max); }
function uuid(value: unknown, field: string): string { const result=text(value,field,36); if (!UUID.test(result)) invalid(field); return result.toLowerCase(); }
function invalid(field: string): never { throw new ApiError(400,'VALIDATION_ERROR',`Invalid ${field}`); }
function phone(value: unknown, field: string): string {
  const result = text(value, field, 30);
  if (!/^\d[\d .-]*\d$/.test(result) || !/^\d{9,10}$/.test(result.replace(/[ .-]/g,''))) invalid(field);
  return result.replace(/[ .-]/g,'');
}
