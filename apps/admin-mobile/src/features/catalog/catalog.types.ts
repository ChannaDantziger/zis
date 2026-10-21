export type ProductStatus = 'draft' | 'active' | 'hidden' | 'sold_out' | 'archived';
export type VariantStatus = Exclude<ProductStatus, 'draft'>;
export interface ManagedVariant {
  productVariantId: string; name: string; productCode: string; pricePerSet: string;
  availableSets: number; lowStockThresholdSets: number; defaultProductionQuantitySets: number;
  isDefault: boolean; status: VariantStatus; version: string;
}
export interface ManagedProduct {
  productId: string; categoryId: string; name: string; description: string | null;
  setSize: number; pricePerSet: string; availableSets: number; displayOrder: number; status: ProductStatus; version: string;
  isVisible: boolean; visibilityReasons: string[]; variants: ManagedVariant[]; images: ManagedImage[];
}
export interface ManagedImage { imageId: string; productVariantId: string | null; storagePath: string; url?: string; altText: string; imageType: 'primary' | 'gallery'; sortOrder: number; version: string; }
export interface ManagedGalleryImage { imageId: string; storagePath: string; url?: string; isActive: boolean; isFeatured: boolean; sortOrder: number; }
export interface ManagedCatalog {
  data: ManagedProduct[]; categories: ManagedCategory[];
  page: number; pageSize: number; totalItems: number;
}
export interface ManagedCategory { categoryId: string; name: string; sortOrder: number; status: 'active' | 'hidden'; }
export interface UpdateProductInput {
  productId: string; categoryId: string; name: string; description: string | null;
  setSize: number; pricePerSet: string; availableSets: number; displayOrder: number; status: ProductStatus; version: string;
}
export interface UpdateVariantInput {
  productVariantId: string; name: string; pricePerSet: string; lowStockThresholdSets: number;
  defaultProductionQuantitySets: number; status: VariantStatus; version: string;
}
export interface AdminCatalogManagement {
  listProducts(page: number, productId?: string): Promise<ManagedCatalog>;
  updateProduct(input: UpdateProductInput, actor: string): Promise<{ productId: string }>;
  updateVariant(input: UpdateVariantInput, actor: string): Promise<{ productVariantId: string }>;
}
