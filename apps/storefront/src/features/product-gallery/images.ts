import type { CatalogProduct } from '../../entities/product/types';

export function getProductImages(product: CatalogProduct) {
  const primary = product.primaryImage;
  return primary ? [primary, ...product.gallery.filter((image) => image.imageId !== primary.imageId)] : product.gallery;
}
