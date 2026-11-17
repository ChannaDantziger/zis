export type ProductStatus = 'draft' | 'active' | 'hidden' | 'sold_out' | 'archived';
export interface ManagedProduct {
  productId: string; categoryId: string; name: string; description: string | null;
  setSize: number; pricePerUnit: string | null; availableItems: number; displayOrder: number; status: ProductStatus; version: string;
  isVisible: boolean; visibilityReasons: string[]; images: ManagedImage[];
}
export interface ManagedImage { imageId: string; productVariantId: string | null; storagePath: string; url?: string; altText: string; imageType: 'primary' | 'gallery'; sortOrder: number; version: string; }
export interface ManagedGalleryImage { imageId: string; storagePath: string; url?: string; isActive: boolean; isFeatured: boolean; sortOrder: number; }
export interface ManagedCatalog {
  data: ManagedProduct[]; categories: ManagedCategory[];
  page: number; pageSize: number; totalItems: number;
}
export interface ManagedCategory { productCount?: number; previewImages?: Array<{ productId: string; productName: string; url?: string; storagePath: string }>; categoryId: string; name: string; sortOrder: number; status: 'active' | 'hidden'; }
export interface UpdateProductInput {
  productId: string; categoryId: string; name: string; description: string | null;
  setSize: number; pricePerUnit: string | null; availableItems: number; displayOrder: number; status: ProductStatus; version: string;
}
export interface AdminCatalogManagement {
  listProducts(page: number, productId?: string, categoryId?: string): Promise<ManagedCatalog>;
  updateProduct(input: UpdateProductInput, actor: string): Promise<{ productId: string }>;
}
