import { makeAutoObservable, runInAction } from 'mobx';
import { getProduct } from '../entities/product/api';
import type { CatalogProduct } from '../entities/product/types';
import { ApiError } from '../shared/api/http-client';
import { CART_STORAGE_KEY, MAX_CART_LINES, MAX_QUANTITY_SETS, isQuantity, priceInAgorot, readCart, writeCart, type CartReference } from './cart.persistence';

interface CartDetails {
  product: CatalogProduct;
  priceChanged: boolean;
  availabilityChanged: boolean;
}

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>;
type ProductLoader = (id: string) => Promise<CatalogProduct>;
export const OUT_OF_STOCK_MESSAGE = 'מצטערים, המלאי אזל. תוכלו לבחור מוצר אחר, לא פחות טעים ומרשים, מאותה קטגוריה.';

export class CartStore {
  items: CartReference[] = [];
  details = new Map<string, CartDetails>();
  missing = new Set<string>();
  isOpen = false;
  isRefreshing = false;
  refreshError = '';
  storageNotice = '';
  private refreshVersion = 0;
  private storage: CartStorage | undefined;
  private loadProduct: ProductLoader;

  constructor(storage?: CartStorage, loadProduct: ProductLoader = getProduct) {
    this.storage = storage;
    this.loadProduct = loadProduct;
    try {
      this.items = readCart(storage?.getItem(CART_STORAGE_KEY) ?? null);
    } catch {
      this.storageNotice = 'שמירת העגלה אינה זמינה בדפדפן זה. העגלה תישמר עד סגירת הדף.';
    }
    makeAutoObservable<CartStore, 'storage' | 'loadProduct'>(this, { storage: false, loadProduct: false }, { autoBind: true });
  }

  get totalSets() { return this.items.reduce((sum, item) => sum + item.quantitySets, 0); }

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
    return subtotal;
  }

  get canContinue() {
    return this.items.length > 0 && !this.isRefreshing && !this.refreshError && this.subtotalAgorot !== null
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
    if (existing) existing.quantitySets = nextQuantity;
    else this.items.push({ productId: product.productId, quantitySets });
    this.details.set(key, { product, priceChanged: false, availabilityChanged: false });
    this.missing.delete(key);
    this.persist();
    return true;
  }

  setQuantity(key: string, quantitySets: number) {
    const item = this.items.find((entry) => cartKey(entry) === key);
    if (!item || !isQuantity(quantitySets)) return;
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
    const results = await Promise.allSettled(productIds.map((id) => this.loadProduct(id)));
    runInAction(() => {
      if (version !== this.refreshVersion) return;
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
      this.storage?.setItem(CART_STORAGE_KEY, writeCart(this.items));
    } catch {
      this.storageNotice = 'לא ניתן לשמור את העגלה לרענון הבא. הפריטים נשארים בעגלה הנוכחית.';
    }
  }
}

export function cartKey(item: { productId: string }): string {
  return `product:${item.productId}`;
}

function browserStorage(): CartStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

export const cartStore = new CartStore(browserStorage());
