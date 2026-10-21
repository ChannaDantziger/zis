import { makeAutoObservable, runInAction } from 'mobx';
import { getProduct } from '../entities/product/api';
import type { CatalogProduct, CatalogVariant } from '../entities/product/types';
import { ApiError } from '../shared/api/http-client';
import { CART_STORAGE_KEY, MAX_CART_LINES, MAX_QUANTITY_SETS, isQuantity, priceInAgorot, readCart, writeCart, type CartReference } from './cart.persistence';

interface CartDetails {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  priceChanged: boolean;
  availabilityChanged: boolean;
}

type CartStorage = Pick<Storage, 'getItem' | 'setItem'>;
type ProductLoader = (id: string) => Promise<CatalogProduct>;

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
      const amount = details ? priceInAgorot(details.variant?.pricePerSet ?? details.product.pricePerSet) : null;
      if (amount === null || this.missing.has(key)) return null;
      subtotal += amount * item.quantitySets;
      if (!Number.isSafeInteger(subtotal)) return null;
    }
    return subtotal;
  }

  get canContinue() {
    return this.items.length > 0 && !this.isRefreshing && !this.refreshError && this.subtotalAgorot !== null
      && this.items.every((item) => {
        const details = this.details.get(cartKey(item));
        return details && item.quantitySets <= (details.variant?.availableSets ?? details.product.availableSets);
      });
  }

  open() { this.isOpen = true; }
  close() { this.isOpen = false; }

  addItem(product: CatalogProduct, variant: CatalogVariant | null, quantitySets: number): boolean {
    if ((variant && !product.variants.some((entry) => entry.productVariantId === variant.productVariantId))
      || (!variant && product.variants.length > 0) || !isQuantity(quantitySets)) return false;
    const key = cartKey({ productId: product.productId, productVariantId: variant?.productVariantId ?? null });
    const existing = this.items.find((item) => cartKey(item) === key);
    if (!existing && this.items.length >= MAX_CART_LINES) return false;
    const nextQuantity = (existing?.quantitySets ?? 0) + quantitySets;
    const price = variant?.pricePerSet ?? product.pricePerSet;
    const available = variant?.availableSets ?? product.availableSets;
    if (nextQuantity > MAX_QUANTITY_SETS || nextQuantity > available) return false;
    if (priceInAgorot(price) === null) return false;
    if (existing) existing.quantitySets = nextQuantity;
    else this.items.push({ productId: product.productId, productVariantId: variant?.productVariantId ?? null, quantitySets });
    this.details.set(key, { product, variant, priceChanged: false, availabilityChanged: false });
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
          this.refreshError = 'לא ניתן לבדוק כרגע את המחירים והזמינות. נסו שוב לפני המשך ההזמנה.';
          return;
        }
        for (const item of references) {
          const product = result.value;
          const variant = item.productVariantId ? product.variants.find((entry) => entry.productVariantId === item.productVariantId) ?? null : null;
          if ((item.productVariantId && !variant) || (!item.productVariantId && product.variants.length > 0)) {
            this.missing.add(cartKey(item));
            this.details.delete(cartKey(item));
            continue;
          }
          const key = cartKey(item);
          const previous = this.details.get(key);
          this.details.set(key, {
            product, variant,
            priceChanged: Boolean(previous && priceInAgorot(previous.variant?.pricePerSet ?? previous.product.pricePerSet) !== priceInAgorot(variant?.pricePerSet ?? product.pricePerSet)),
            availabilityChanged: Boolean(previous && (previous.variant?.availableSets ?? previous.product.availableSets) !== (variant?.availableSets ?? product.availableSets)),
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

export function cartKey(item: Pick<CartReference, 'productId' | 'productVariantId'>): string {
  return item.productVariantId ?? `product:${item.productId}`;
}

function browserStorage(): CartStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

export const cartStore = new CartStore(browserStorage());
