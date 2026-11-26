import { ApiError } from '../http/api-error.js';
import type { BundleOrderInput, OrderBundleSnapshot } from '../contracts/commerce.contracts.js';

export interface BundleForSale {
  bundleId: string;
  categoryId: string;
  name: string;
  categoryName?: string;
  imagePath?: string | null;
  unitCount: number;
  active: boolean;
}

export interface BundleProductForSale {
  productId: string;
  categoryId: string;
  name: string;
  imagePath?: string | null;
  pricePerUnit: string;
  availableItems: number;
  active: boolean;
}

export interface LooseProductQuantity { productId: string; quantitySets: number; setSize: number }
export interface CalculatedBundle {
  bundle: BundleForSale;
  quantity: number;
  unitPriceAgorot: number;
  components: Array<{ product: BundleProductForSale; quantity: number; unitPriceAgorot: number }>;
}

const MAX_QUANTITY = 1_000_000;
const MAX_STOCK = 2_147_483_647;
const MAX_MONEY = 999_999_999_999;

/** Validate complete bundle composition and total physical stock across the whole order. */
export function calculateBundleOrder(
  inputs: BundleOrderInput[], bundles: BundleForSale[], products: BundleProductForSale[], loose: LooseProductQuantity[], snapshots: OrderBundleSnapshot[] = [],
): { bundles: CalculatedBundle[]; subtotalAgorot: number } {
  const byBundle = new Map(bundles.map(item => [item.bundleId, item]));
  const byProduct = new Map(products.map(item => [item.productId, item]));
  const required = new Map<string, number>();
  const addRequired = (id: string, amount: number) => {
    const next = (required.get(id) ?? 0) + amount;
    if (!Number.isSafeInteger(next) || next > MAX_STOCK) invalid('כמות המוצרים חורגת מהמותר');
    required.set(id, next);
  };
  for (const item of loose) {
    positive(item.quantitySets); positive(item.setSize);
    addRequired(item.productId, item.quantitySets * item.setSize);
  }
  let subtotalAgorot = 0;
  const lines = inputs.map(input => {
    positive(input.quantity);
    const bundle = byBundle.get(input.bundleId);
    if (!bundle || !bundle.active) throw new ApiError(422, 'BUNDLE_UNAVAILABLE', 'המארז אינו זמין');
    const saved = input.orderBundleId ? snapshots.find(snapshot => snapshot.orderBundleId === input.orderBundleId) : undefined;
    if (input.orderBundleId && (!saved || saved.bundleId !== input.bundleId)) invalid('המארז אינו שייך להזמנה');
    const currentBundle = saved ? { ...bundle, name: saved.bundleName, categoryId: saved.categoryId, categoryName: saved.categoryName,
      unitCount: saved.unitCount, imagePath: saved.imagePath } : bundle;
    if (!input.components.length || input.components.length > 100) invalid('הרכב המארז אינו תקין');
    const seen = new Set<string>();
    let units = 0, unitPriceAgorot = 0;
    const components = input.components.map(component => {
      positive(component.quantity);
      if (seen.has(component.productId)) invalid('מוצר מופיע יותר מפעם אחת באותו מארז');
      seen.add(component.productId);
      const product = byProduct.get(component.productId);
      if (!product || !product.active || product.categoryId !== currentBundle.categoryId) {
        throw new ApiError(422, 'BUNDLE_PRODUCT_UNAVAILABLE', 'מוצר במארז אינו זמין בקטגוריה');
      }
      const oldProduct = saved?.components.find(item => item.productId === product.productId);
      const price = money(oldProduct?.unitPrice ?? product.pricePerUnit);
      units += component.quantity;
      unitPriceAgorot += price * component.quantity;
      addRequired(product.productId, component.quantity * input.quantity);
      return { product: oldProduct ? { ...product, name: oldProduct.productName, imagePath: oldProduct.imagePath } : product,
        quantity: component.quantity, unitPriceAgorot: price };
    });
    if (units !== currentBundle.unitCount) invalid('מספר היחידות אינו תואם למארז');
    subtotalAgorot += unitPriceAgorot * input.quantity;
    if (!Number.isSafeInteger(subtotalAgorot) || subtotalAgorot > MAX_MONEY) invalid('סכום המארז חורג מהמותר');
    return { bundle: currentBundle, quantity: input.quantity, unitPriceAgorot, components };
  });
  const shortages: Record<string, string> = {};
  for (const [id, quantity] of required) {
    const product = byProduct.get(id);
    if (!product || !product.active || !Number.isSafeInteger(product.availableItems) || product.availableItems < 0) {
      throw new ApiError(422, 'STOCK_UNAVAILABLE', 'מוצר בהזמנה אינו זמין');
    }
    if (quantity > product.availableItems) shortages[id] = `${product.name}: נדרשות ${quantity}, זמינות ${product.availableItems}`;
  }
  if (Object.keys(shortages).length) throw new ApiError(422, 'STOCK_UNAVAILABLE', 'אין מספיק מלאי למוצרים בהזמנה', shortages);
  return { bundles: lines, subtotalAgorot };
}

function positive(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_QUANTITY) invalid('כמות אינה תקינה');
}
function money(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new ApiError(500, 'INTERNAL_ERROR', 'מחיר מוצר אינו תקין');
  const [whole, cents = ''] = value.split('.');
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > MAX_MONEY) throw new ApiError(500, 'INTERNAL_ERROR', 'מחיר מוצר אינו תקין');
  return amount;
}
function invalid(message: string): never { throw new ApiError(400, 'VALIDATION_ERROR', message); }
