import { PRODUCT_MEDIA_BUCKET } from '../contracts/media.contracts.js';
import type { BundlePreviewRepository } from './bundle-preview.repository.js';
import type { StorageService } from '../storage/storage.service.js';

export function createBundlePreviewService(repository: BundlePreviewRepository, storage: StorageService) {
  return { async list(categoryId?: string) {
    const records = await repository.list(categoryId);
    const signedUrls = new Map<string, Promise<string>>();
    const url = (path: string) => {
      let value = signedUrls.get(path);
      if (!value) { value = storage.createSignedUrl(PRODUCT_MEDIA_BUCKET, path).then(result => result.url); signedUrls.set(path, value); }
      return value;
    };
    return {
      bundles: await Promise.all(records.bundles.map(async bundle => ({ ...bundle,
        images: await Promise.all(bundle.images.map(async ({ storagePath, ...image }) => ({ ...image, url: await url(storagePath) }))) }))),
      products: await Promise.all(records.products.map(async ({ image, ...product }) => ({ ...product,
        image: image ? { url: await url(image.storagePath), altText: image.altText } : null }))),
    };
  } };
}
export type BundlePreviewService = ReturnType<typeof createBundlePreviewService>;
