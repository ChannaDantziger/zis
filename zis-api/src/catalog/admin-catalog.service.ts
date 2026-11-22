import type {
  AdminCatalogRepository,
  AdminCatalogService,
  CreateImageInput,
  CreateProductInput,
  CreateVariantInput,
  UpdateImageInput,
  SaveCategoryInput,
} from './admin-catalog.types.js';

export function createAdminCatalogService(repository: AdminCatalogRepository): AdminCatalogService {
  return {
    reorderGallery: (ids, actor) => repository.reorderGallery(ids, actor),
    saveCategory: (input, adminUserId) => repository.saveCategory(input, adminUserId),
    listProducts: (page, productId, categoryId) => repository.listProducts(page, productId, categoryId),
    updateProduct: (input, actor) => repository.updateProduct(input, actor),
    updateVariant: (input, actor) => repository.updateVariant(input, actor),
    createProduct: (input, adminUserId) => repository.createProduct(input, adminUserId),
    createVariant: (input, adminUserId) => repository.createVariant(input, adminUserId),
    createImage: (input, adminUserId) => repository.createImage(input, adminUserId),
    updateImage: (input, adminUserId) => repository.updateImage(input, adminUserId),
    listGallery: () => repository.listGallery(),
    addGalleryImage: (path, order, actor) => repository.addGalleryImage(path, order, actor),
    setGalleryActive: (id, active, actor) => repository.setGalleryActive(id, active, actor),
    setGalleryFeatured: (id, actor) => repository.setGalleryFeatured(id, actor),
    deleteImage: (id, actor) => repository.deleteImage(id, actor),
    completeImageDelete: (id, actor) => repository.completeImageDelete(id, actor),
  };
}
