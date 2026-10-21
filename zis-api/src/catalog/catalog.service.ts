import { PRODUCT_MEDIA_BUCKET } from '../contracts/media.contracts.js';
import type { CatalogImage, CatalogProduct, CatalogVariant, CatalogQuery } from '../contracts/catalog.contracts.js';
import type { CatalogProductRecord, CatalogRepository, CatalogService } from './catalog.types.js';

export type CatalogMediaUrlResolver = (bucket: typeof PRODUCT_MEDIA_BUCKET, storagePath: string) => Promise<string>;

export function createCatalogService(repository: CatalogRepository, resolveMediaUrl: CatalogMediaUrlResolver): CatalogService {
  return {
    async listCategories() {
      return repository.listCategories();
    },
    async listProducts(query: CatalogQuery) {
      const page = await repository.listProducts(query);
      return { data: await Promise.all(page.products.map((product) => mapProduct(product, resolveMediaUrl))), totalItems: page.totalItems };
    },
    async getProduct(productId: string) {
      const product = await repository.getProduct(productId);
      return product ? mapProduct(product, resolveMediaUrl) : null;
    },
  };
}

async function mapProduct(record: CatalogProductRecord, resolveMediaUrl: CatalogMediaUrlResolver): Promise<CatalogProduct> {
  const productImages = await mapImages(record.images, resolveMediaUrl);
  const variants = await Promise.all(record.variants.map(async (variant) => {
    const images = await mapImages(variant.images, resolveMediaUrl);
    return {
      productVariantId: variant.productVariantId,
      name: variant.name,
      productCode: variant.productCode,
      pricePerSet: variant.pricePerSet,
      availableSets: variant.availableSets,
      isDefault: variant.isDefault,
      attributes: variant.attributes,
      primaryImage: images.find((image) => image.imageType === 'primary') ?? null,
      gallery: images,
    } satisfies CatalogVariant;
  }));
  return {
    productId: record.productId,
    category: record.category,
    name: record.name,
    description: record.description,
    setSize: record.setSize,
    pricePerSet: record.pricePerSet,
    availableSets: record.availableSets,
    displayOrder: record.displayOrder,
    primaryImage: productImages.find((image) => image.imageType === 'primary') ?? null,
    gallery: productImages,
    variants,
  };
}

async function mapImages(images: CatalogProductRecord['images'], resolveMediaUrl: CatalogMediaUrlResolver): Promise<CatalogImage[]> {
  return Promise.all(images.map(async (image) => ({
    imageId: image.imageId,
    url: await resolveMediaUrl(PRODUCT_MEDIA_BUCKET, image.storagePath),
    altText: image.altText,
    imageType: image.imageType,
    sortOrder: image.sortOrder,
  })));
}
