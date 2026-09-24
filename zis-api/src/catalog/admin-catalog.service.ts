import type {
  AdminCatalogRepository,
  AdminCatalogService,
  CreateImageInput,
  CreateProductInput,
  CreateVariantInput,
  UpdateImageInput,
} from './admin-catalog.types.js';

export function createAdminCatalogService(repository: AdminCatalogRepository): AdminCatalogService {
  return {
    createProduct: (input, adminUserId) => repository.createProduct(input, adminUserId),
    createVariant: (input, adminUserId) => repository.createVariant(input, adminUserId),
    createImage: (input, adminUserId) => repository.createImage(input, adminUserId),
    updateImage: (input, adminUserId) => repository.updateImage(input, adminUserId),
  };
}
