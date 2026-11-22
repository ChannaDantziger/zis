import type { AdminCatalogManagement } from './admin-catalog-management.types.js';
import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description: string | null;
  setSize: number;
  pricePerUnit: string;
  availableItems: number;
  displayOrder: number;
}

export interface CreateVariantInput {
  productId: string;
  name: string;
  productCode: string;
  pricePerUnit: string;
  availableSets: number;
  lowStockThresholdSets: number;
  defaultProductionQuantitySets: number;
  attributes: Record<string, unknown> | null;
  isDefault: boolean;
  status: 'active' | 'hidden';
}

export interface CreateImageInput {
  productId: string;
  productVariantId: string | null;
  storagePath: string;
  altText: string;
  sortOrder: number;
  isPrimary?: boolean;
}

export interface SaveCategoryInput { categoryId?: string; name: string; sortOrder: number; status: 'active' | 'hidden'; }

export interface UpdateImageInput { imageId: string; version: string; altText?: string; sortOrder?: number; isPrimary?: boolean; }

export interface AdminCatalogRepository extends AdminCatalogManagement {
  reorderGallery(imageIds: string[], actor: string): Promise<void>;
  saveCategory(input: SaveCategoryInput, adminUserId: string): Promise<{ categoryId: string }>;
  createProduct(input: CreateProductInput, adminUserId: string): Promise<{ productId: string }>;
  createVariant(input: CreateVariantInput, adminUserId: string): Promise<{ productVariantId: string }>;
  createImage(input: CreateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  updateImage(input: UpdateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  listGallery(): Promise<import('./admin-catalog-management.types.js').ManagedGalleryImage[]>;
  addGalleryImage(storagePath: string, sortOrder: number, adminUserId: string): Promise<{ imageId: string }>;
  setGalleryActive(imageId: string, isActive: boolean, adminUserId: string): Promise<void>;
  setGalleryFeatured(imageId: string, adminUserId: string): Promise<void>;
  deleteImage(imageId: string, adminUserId: string): Promise<{ bucket: 'zis-product-media' | 'zis-event-gallery'; storagePath: string }>;
  completeImageDelete(imageId: string, adminUserId: string): Promise<void>;
}

export interface AdminCatalogService extends AdminCatalogManagement {
  reorderGallery(imageIds: string[], actor: string): Promise<void>;
  saveCategory(input: SaveCategoryInput, adminUserId: string): Promise<{ categoryId: string }>;
  createProduct(input: CreateProductInput, adminUserId: string): Promise<{ productId: string }>;
  createVariant(input: CreateVariantInput, adminUserId: string): Promise<{ productVariantId: string }>;
  createImage(input: CreateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  updateImage(input: UpdateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  listGallery(): Promise<import('./admin-catalog-management.types.js').ManagedGalleryImage[]>;
  deleteImage(imageId: string, adminUserId: string): Promise<{ bucket: 'zis-product-media' | 'zis-event-gallery'; storagePath: string }>;
  completeImageDelete(imageId: string, adminUserId: string): Promise<void>;
  addGalleryImage(storagePath: string, sortOrder: number, adminUserId: string): Promise<{ imageId: string }>;
  setGalleryActive(imageId: string, isActive: boolean, adminUserId: string): Promise<void>;
  setGalleryFeatured(imageId: string, adminUserId: string): Promise<void>;
}

export type AdminCatalogRepositoryFactory = SqlClientFactory;
