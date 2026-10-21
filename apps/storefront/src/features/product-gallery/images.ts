import type { CatalogProduct, CatalogVariant } from '../../entities/product/types';

export function getProductImages(product: CatalogProduct, variant?: CatalogVariant) {
  const gallery = variant ? variant.gallery : product.gallery;
  const primary = variant ? variant.primaryImage : product.primaryImage;
  return primary ? [primary, ...gallery.filter((image) => image.imageId !== primary.imageId)] : gallery;
}
