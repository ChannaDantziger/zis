import { makeAutoObservable, runInAction } from 'mobx';
import { getProduct } from '../entities/product/api';
import type { CatalogProduct } from '../entities/product/types';
import { ApiError } from '../shared/api/http-client';
import { apiRequest } from '../shared/api/http-client';
import type { BundleResponse } from '../features/bundles/types';
import { BUNDLE_PURCHASE_ENABLED } from '../features/bundles/feature';
import { checkBundleCart } from './bundle-cart.validation';
import { CART_STORAGE_KEY, MAX_CART_LINES, MAX_QUANTITY_SETS, isQuantity, priceInAgorot, readBundleCart, readCart, writeCart, type BundleCartReference, type CartReference } from './cart.persistence';

interface CartDetails {
  product: CatalogProduct;
  priceChanged: boolean;
  availabilityChanged: boolean;
}

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>;
type ProductLoader = (id: string) => Promise<CatalogProduct>;
type BundleLoader = () => Promise<BundleResponse>;
export const OUT_OF_STOCK_MESSAGE = 'מצטערים, המלאי אזל. תוכלו לבחור מוצר אחר, לא פחות טעים ומרשים, מאותה קטגוריה.';

export class CartStore {
  items: CartReference[] = [];
  bundles: BundleCartReference[] = [];
  bundleCatalog: BundleResponse | null = null;
  details = new Map<string, CartDetails>();
  missing = new Set<string>();
  isOpen = false;
  isRefreshing = false;
  refreshError = '';
  storageNotice = '';
  bundleError = '';
  private refreshVersion = 0;
  private storage: CartStorage | undefined;
  private loadProduct: ProductLoader;
  private loadBundles: BundleLoader;

  constructor(storage?: CartStorage, loadProduct: ProductLoader = getProduct, loadBundles: BundleLoader = () => apiRequest<BundleResponse>('/bundle-preview')) {
    this.storage = storage;
    this.loadProduct = loadProduct;
    this.loadBundles = loadBundles;
    try {
      const saved = storage?.getItem(CART_STORAGE_KEY) ?? null;
      this.items = readCart(saved);
      this.bundles = readBundleCart(saved);
    } catch {
      this.storageNotice = 'שמירת העגלה אינה זמינה בדפדפן זה. העגלה תישמר עד סגירת הדף.';
    }
    makeAutoObservable<CartStore, 'storage' | 'loadProduct' | 'loadBundles'>(this, { storage: false, loadProduct: false, loadBundles: false }, { autoBind: true });
  }

  get totalSets() { return this.items.reduce((sum, item) => sum + item.quantitySets, 0) + this.bundles.reduce((sum, bundle) => sum + bundle.quantity, 0); }

  get subtotalAgorot(): number | null {
    let subtotal = 0;
    for (const item of this.items) {
      const key = cartKey(item);
      const details = this.details.get(key);
      const amount = details ? priceInAgorot(details.product.pricePerUnit) : null;
      if (amount === null || !details || !Number.isSafeInteger(details.product.setSize) || details.product.setSize < 1 || this.missing.has(key)) return null;
      subtotal += amount * details.product.setSize * item.quantitySets;
      if (!Number.isSafeInteger(subtotal)) return null;
    }
    const bundleCheck = this.checkBundles(this.bundles, this.bundleCatalog);
    if (!bundleCheck.valid) return null;
    const total = subtotal + bundleCheck.subtotalAgorot;
    return Number.isSafeInteger(total) ? total : null;
  }

  get canContinue() {
    // Bundle checkout must remain closed until order snapshots and payment stock paths are complete.
    if (this.bundles.length && !BUNDLE_PURCHASE_ENABLED) return false;
    return (this.items.length > 0 || this.bundles.length > 0) && !this.isRefreshing && !this.refreshError && this.subtotalAgorot !== null
      && this.items.every((item) => {
        const details = this.details.get(cartKey(item));
        return details && item.quantitySets <= details.product.availableSets;
      });
  }

  open() { this.isOpen = true; }
  close() { this.isOpen = false; }

  addItem(product: CatalogProduct, quantitySets: number): boolean {
    if (product.variants.length > 0 || !isQuantity(quantitySets)) return false;
    const key = cartKey({ productId: product.productId });
    const existing = this.items.find((item) => cartKey(item) === key);
    if (!existing && this.items.length >= MAX_CART_LINES) return false;
    const nextQuantity = (existing?.quantitySets ?? 0) + quantitySets;
    const price = product.pricePerUnit;
    const available = product.availableSets;
    if (nextQuantity > MAX_QUANTITY_SETS || nextQuantity > available) return false;
    const unitAgorot = priceInAgorot(price);
    if (unitAgorot === null || !Number.isSafeInteger(product.setSize) || product.setSize < 1
      || !Number.isSafeInteger(unitAgorot * product.setSize * nextQuantity)) return false;
    if (this.bundles.length) {
      const next = this.items.filter(item => cartKey(item) !== key).concat({ productId: product.productId, quantitySets: nextQuantity });
      const details = new Map([...this.details.values()].map(item => [item.product.productId, item.product]));
      details.set(product.productId, product);
      const check = checkBundleCart(this.bundles, this.bundleCatalog, next, details);
      if (!check.valid) { this.bundleError = check.error; return false; }
    }
    if (existing) existing.quantitySets = nextQuantity;
    else this.items.push({ productId: product.productId, quantitySets });
    this.details.set(key, { product, priceChanged: false, availabilityChanged: false });
    this.missing.delete(key);
    this.persist();
    return true;
  }

  addBundle(reference: BundleCartReference, catalog: BundleResponse): boolean {
    const key = bundleKey(reference);
    const existing = this.bundles.find(item => bundleKey(item) === key);
    if ((!existing && this.bundles.length + this.items.length >= MAX_CART_LINES) || !isQuantity(reference.quantity)) return false;
    const next = this.bundles.map(item => ({ ...item, components: item.components.map(component => ({ ...component })) }));
    const target = next.find(item => bundleKey(item) === key);
    if (target) target.quantity += reference.quantity;
    else next.push({ ...reference, components: reference.components.map(component => ({ ...component })) });
    const check = this.checkBundles(next, catalog);
    if (!check.valid) { this.bundleError = check.error; return false; }
    this.bundles = next; this.bundleCatalog = catalog; this.bundleError = ''; this.persist(); return true;
  }

  setBundleQuantity(key: string, quantity: number): boolean {
    if (!isQuantity(quantity)) return false;
    const next = this.bundles.map(item => ({ ...item, quantity: bundleKey(item) === key ? quantity : item.quantity }));
    const check = this.checkBundles(next, this.bundleCatalog);
    if (!check.valid) { this.bundleError = check.error; return false; }
    this.bundles = next; this.bundleError = ''; this.persist(); return true;
  }

  replaceBundle(key: string, replacement: BundleCartReference): boolean {
    if (!this.bundles.some(item => bundleKey(item) === key) || !isQuantity(replacement.quantity)) return false;
    const next = this.bundles.filter(item => bundleKey(item) !== key).map(item => ({ ...item, components: item.components.map(component => ({ ...component })) }));
    const existing = next.find(item => bundleKey(item) === bundleKey(replacement));
    if (existing) existing.quantity += replacement.quantity;
    else next.push({ ...replacement, components: replacement.components.map(component => ({ ...component })) });
    const check = this.checkBundles(next, this.bundleCatalog);
    if (!check.valid) { this.bundleError = check.error; return false; }
    this.bundles = next; this.bundleError = ''; this.persist(); return true;
  }

  removeBundle(key: string) {
    this.bundles = this.bundles.filter(item => bundleKey(item) !== key);
    this.bundleError = ''; this.persist();
  }

  setQuantity(key: string, quantitySets: number) {
    const item = this.items.find((entry) => cartKey(entry) === key);
    if (!item || !isQuantity(quantitySets)) return;
    if (this.bundles.length) {
      const next = this.items.map(entry => cartKey(entry) === key ? { ...entry, quantitySets } : entry);
      const details = new Map([...this.details.values()].map(entry => [entry.product.productId, entry.product]));
      const check = checkBundleCart(this.bundles, this.bundleCatalog, next, details);
      if (!check.valid) { this.bundleError = check.error; return; }
    }
    item.quantitySets = quantitySets;
    this.persist();
  }

  removeItem(key: string) {
    this.items = this.items.filter((item) => cartKey(item) !== key);
    this.details.delete(key);
    this.missing.delete(key);
    this.persist();
  }

  clear() {
    this.refreshVersion++;
    this.items = [];
    this.bundles = [];
    this.bundleCatalog = null;
    this.bundleError = '';
    this.details.clear();
    this.missing.clear();
    this.refreshError = '';
    this.isRefreshing = false;
    this.persist();
  }

  async refresh() {
    const version = ++this.refreshVersion;
    this.isRefreshing = true;
    this.refreshError = '';
    const productIds = [...new Set(this.items.map((item) => item.productId))];
    const [results, bundleResult] = await Promise.all([
      Promise.allSettled(productIds.map((id) => this.loadProduct(id))),
      this.bundles.length ? this.loadBundles().then(value => ({ value, failed: false as const })).catch(() => ({ failed: true as const })) : Promise.resolve(null),
    ]);
    runInAction(() => {
      if (version !== this.refreshVersion) return;
      if (bundleResult?.failed) { this.bundleCatalog = null; this.refreshError = 'לא ניתן לטעון כרגע את פרטי המארזים בעגלה. נסו שוב.'; }
      else if (bundleResult) this.bundleCatalog = bundleResult.value;
      results.forEach((result, index) => {
        const references = this.items.filter((item) => item.productId === productIds[index]);
        if (result.status === 'rejected') {
          if (result.reason instanceof ApiError && result.reason.status === 404) {
            for (const item of references) {
              this.missing.add(cartKey(item));
              this.details.delete(cartKey(item));
            }
            return;
          }
          this.refreshError = 'לא ניתן לטעון כרגע את פרטי העגלה. נסו שוב לפני המשך ההזמנה.';
          return;
        }
        for (const item of references) {
          const product = result.value;
          if (product.variants.length > 0) {
            this.missing.add(cartKey(item));
            this.details.delete(cartKey(item));
            continue;
          }
          const key = cartKey(item);
          const previous = this.details.get(key);
          this.details.set(key, {
            product,
            priceChanged: Boolean(previous && (priceInAgorot(previous.product.pricePerUnit) !== priceInAgorot(product.pricePerUnit)
              || previous.product.setSize !== product.setSize)),
            availabilityChanged: Boolean(previous && previous.product.availableSets !== product.availableSets),
          });
          this.missing.delete(key);
        }
      });
      this.isRefreshing = false;
    });
  }

  private persist() {
    try {
      this.storage?.setItem(CART_STORAGE_KEY, writeCart(this.items, this.bundles));
    } catch {
      this.storageNotice = 'לא ניתן לשמור את העגלה לרענון הבא. הפריטים נשארים בעגלה הנוכחית.';
    }
  }

  private checkBundles(bundles: BundleCartReference[], catalog: BundleResponse | null) {
    const details = new Map([...this.details.values()].map(item => [item.product.productId, item.product]));
    return checkBundleCart(bundles, catalog, this.items, details);
  }
}

export function cartKey(item: { productId: string }): string {
  return `product:${item.productId}`;
}

export function bundleKey(item: BundleCartReference): string {
  return `bundle:${item.bundleId}:${[...item.components].sort((a, b) => a.productId.localeCompare(b.productId)).map(part => `${part.productId}=${part.quantity}`).join(',')}`;
}

function browserStorage(): CartStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

export const cartStore = new CartStore(browserStorage());
