export const CART_STORAGE_KEY = 'zis.storefront.cart';
export const CART_VERSION = 2;
export const MAX_QUANTITY_SETS = 10000;
export const MAX_CART_LINES = 100;
const MAX_STORED_BYTES = 30000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CartReference {
  productId: string;
  quantitySets: number;
}

export function readCart(value: string | null): CartReference[] {
  if (!value || value.length > MAX_STORED_BYTES) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== CART_VERSION) || !Array.isArray(parsed.items)) return [];
    if (parsed.items.length > MAX_CART_LINES) return [];
    const result: CartReference[] = [];
    for (const candidate of parsed.items) {
      const variantId = isRecord(candidate) ? candidate.productVariantId ?? null : null;
      if (!isRecord(candidate) || !isIdentifier(candidate.productId) || variantId !== null
        || !isQuantity(candidate.quantitySets)) continue;
      const existing = result.find((item) => item.productId === candidate.productId);
      if (existing) {
        existing.quantitySets = Math.min(MAX_QUANTITY_SETS, existing.quantitySets + candidate.quantitySets);
      } else {
        result.push({ productId: candidate.productId, quantitySets: candidate.quantitySets });
      }
    }
    return result;
  } catch {
    return [];
  }
}

export function writeCart(items: CartReference[]): string {
  return JSON.stringify({ version: CART_VERSION, items: items.map(({ productId, quantitySets }) => ({ productId, quantitySets })) });
}

export function isQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_QUANTITY_SETS;
}

export function priceInAgorot(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
