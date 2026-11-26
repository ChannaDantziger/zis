import type { BundleOrderInput } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LINES = 100;
const MAX_QUANTITY = 1_000_000;

export function readBundleInputs(value: unknown): BundleOrderInput[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_LINES) invalid();
  const seenLines = new Set<string>();
  return value.map(value => {
    const item = record(value);
    const bundleId = id(item.bundleId);
    const orderBundleId = item.orderBundleId == null ? undefined : id(item.orderBundleId);
    if (orderBundleId && seenLines.has(orderBundleId)) invalid();
    if (orderBundleId) seenLines.add(orderBundleId);
    const quantity = positive(item.quantity);
    if (!Array.isArray(item.components) || item.components.length === 0 || item.components.length > MAX_LINES) invalid();
    const seen = new Set<string>();
    const components = item.components.map(value => {
      const component = record(value);
      const productId = id(component.productId);
      if (seen.has(productId)) invalid();
      seen.add(productId);
      return { productId, quantity: positive(component.quantity) };
    }).sort((a, b) => a.productId.localeCompare(b.productId));
    return { bundleId, quantity, components, ...(orderBundleId ? { orderBundleId } : {}) };
  }).sort((a, b) => a.bundleId.localeCompare(b.bundleId) || (a.orderBundleId ?? '').localeCompare(b.orderBundleId ?? '') || JSON.stringify(a.components).localeCompare(JSON.stringify(b.components)));
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) invalid();
  return value.toLowerCase();
}
function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_QUANTITY) invalid();
  return value;
}
function invalid(): never { throw new ApiError(400, 'VALIDATION_ERROR', 'הרכב המארז אינו תקין'); }
