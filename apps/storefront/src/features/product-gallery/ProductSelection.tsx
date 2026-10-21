import { makeAutoObservable } from 'mobx';
import type { CatalogProduct } from '../../entities/product/types';

export class ProductSelection {
  variantId = '';
  quantitySets = 1;

  constructor() { makeAutoObservable(this); }

  initialize(product: CatalogProduct) {
    const available = product.variants.filter((variant) => variant.availableSets > 0);
    const variant = available.find((item) => item.isDefault) ?? available[0]
      ?? product.variants.find((item) => item.isDefault) ?? product.variants[0];
    this.variantId = variant?.productVariantId ?? '';
    this.quantitySets = 1;
  }

  selectVariant(variantId: string) { this.variantId = variantId; }
  setQuantity(quantity: number) { this.quantitySets = quantity; }
}
