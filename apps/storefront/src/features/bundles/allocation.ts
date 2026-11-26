import type { BundleProduct, Selection } from './types';

export function capacity(product: BundleProduct, count: number): number {
  return Math.floor(product.availableItems / count);
}

// Allocates by raising the lowest amounts together, without a loop per physical unit.
function addBalanced(items: BundleProduct[], quantities: Selection, needed: number, count: number): Selection | null {
  const result = { ...quantities };
  const sum = (height: number) => items.reduce((total, item) => total + Math.max(0, Math.min(height, capacity(item, count)) - (result[item.productId] ?? 0)), 0);
  if (sum(Number.MAX_SAFE_INTEGER) < needed) return null;
  let lo = 0, hi = Math.max(0, ...items.map(p => capacity(p, count)));
  while (lo < hi) { const middle = Math.floor((lo + hi + 1) / 2); if (sum(middle) <= needed) lo = middle; else hi = middle - 1; }
  for (const item of items) {
    const current = result[item.productId] ?? 0, next = Math.max(current, Math.min(lo, capacity(item, count)));
    needed -= next - current; result[item.productId] = next;
  }
  for (const item of items) {
    if (needed <= 0) break;
    if ((result[item.productId] ?? 0) < capacity(item, count)) { result[item.productId]++; needed--; }
  }
  return result;
}

export function initialSelection(products: BundleProduct[], unitCount: number, random: () => number = Math.random): Selection | null {
  const shuffled = products.filter(product => product.availableItems > 0);
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  if (shuffled.reduce((sum, item) => sum + item.availableItems, 0) < unitCount) return null;
  let number = Math.min(4, shuffled.length);
  while (number < shuffled.length && shuffled.slice(0, number).reduce((sum, item) => sum + item.availableItems, 0) < unitCount) number++;
  return addBalanced(shuffled.slice(0, number), {}, unitCount, 1);
}

export function adjustSelection(products: BundleProduct[], selection: Selection, unitCount: number, count: number): Selection | null {
  const selected = products.filter(item => (selection[item.productId] ?? 0) > 0);
  const result = { ...selection };
  for (const item of selected) result[item.productId] = Math.min(result[item.productId], capacity(item, count));
  const total = Object.values(result).reduce((sum, amount) => sum + amount, 0);
  if (total < unitCount) return addBalanced(selected, result, unitCount - total, count);
  if (total === unitCount) return result;
  const excess = total - unitCount;
  const removedAt = (height: number) => selected.reduce((sum, item) => sum + Math.max(0, (result[item.productId] ?? 0) - height), 0);
  let lo = 0, hi = Math.max(0, ...selected.map(item => result[item.productId] ?? 0));
  while (lo < hi) { const middle = Math.floor((lo + hi) / 2); if (removedAt(middle) <= excess) hi = middle; else lo = middle + 1; }
  let remaining = excess;
  for (const item of selected) { const current = result[item.productId]; const next = Math.min(current, lo); remaining -= current - next; result[item.productId] = next; }
  for (const item of [...selected].reverse()) {
    if (!remaining) break;
    if (result[item.productId] === lo && lo > 0) { result[item.productId]--; remaining--; }
  }
  return result;
}
export function selectionTotal(selection: Selection): number { return Object.values(selection).reduce((sum, value) => sum + value, 0); }
export function priceAgorot(products: BundleProduct[], selection: Selection): bigint {
  return products.reduce((sum, product) => {
    const [whole, fractional = ''] = product.pricePerUnit.split('.');
    const unitPrice = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, '0'));
    return sum + unitPrice * BigInt(selection[product.productId] ?? 0);
  }, 0n);
}
export function formatBundlePrice(agorot: bigint): string {
  const whole = new Intl.NumberFormat('he-IL').format(agorot / 100n);
  return `₪${whole}.${String(agorot % 100n).padStart(2, '0')}`;
}
