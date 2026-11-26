import type { BundleResponse } from '../features/bundles/types';
import type { CatalogProduct } from '../entities/product/types';
import { isQuantity, priceInAgorot, type BundleCartReference, type CartReference } from './cart.persistence';

export interface BundleCartCheck { valid: boolean; error: string; subtotalAgorot: number }

export function checkBundleCart(bundles: BundleCartReference[], catalog: BundleResponse | null,
  loose: CartReference[], products: Map<string, CatalogProduct>): BundleCartCheck {
  if (!bundles.length) return { valid: true, error: '', subtotalAgorot: 0 };
  if (!catalog) return invalid('פרטי המארזים ממתינים לבדיקה.');
  const required = new Map<string, number>();
  const byProduct = new Map(catalog.products.map(product => [product.productId, product]));
  let subtotalAgorot = 0;
  for (const item of loose) {
    const details = products.get(item.productId);
    if (!details) return invalid('פרטי המוצרים ממתינים לבדיקה.');
    required.set(item.productId, (required.get(item.productId) ?? 0) + item.quantitySets * details.setSize);
  }
  for (const line of bundles) {
    const bundle = catalog.bundles.find(candidate => candidate.bundleId === line.bundleId);
    if (!bundle || !isQuantity(line.quantity)) return invalid('אחד המארזים אינו זמין עוד.');
    let total = 0;
    const seen = new Set<string>();
    for (const component of line.components) {
      const product = byProduct.get(component.productId);
      const price = product ? priceInAgorot(product.pricePerUnit) : null;
      if (!product || product.categoryId !== bundle.categoryId || !isQuantity(component.quantity) || price === null || seen.has(component.productId)) {
        return invalid('אחד ממוצרי המארז אינו זמין עוד.');
      }
      seen.add(component.productId);
      total += component.quantity;
      const physical = component.quantity * line.quantity;
      required.set(product.productId, (required.get(product.productId) ?? 0) + physical);
      subtotalAgorot += price * physical;
      if (!Number.isSafeInteger(subtotalAgorot)) return invalid('סכום המארז חורג מהמותר.');
    }
    if (total !== bundle.unitCount) return invalid(`מספר היחידות במארז ${bundle.name} אינו תקין.`);
  }
  const shortages: string[] = [];
  for (const [id, quantity] of required) {
    const item = byProduct.get(id);
    if (item && quantity > item.availableItems) shortages.push(`${item.name}: נדרשות ${quantity} יחידות, זמינות ${item.availableItems}`);
  }
  return shortages.length ? invalid(`אין מספיק מלאי: ${shortages.join('; ')}.`) : { valid: true, error: '', subtotalAgorot };
}
function invalid(error: string): BundleCartCheck { return { valid: false, error, subtotalAgorot: 0 }; }
