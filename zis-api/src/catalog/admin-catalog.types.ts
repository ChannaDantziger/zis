import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';

export interface CreateProductInput {
  categoryId: string;
  name: string;
  description: string | null;
  setSize: number;
  minimumSets: number;
}

export interface CreateVariantInput {
  productId: string;
  name: string;
  productCode: string;
  pricePerSet: string;
  availableSets: number;
  lowStockThresholdSets: number;
  defaultProductionQuantitySets: number;
  attributes: Record<string, unknown> | null;
  isDefault: boolean;
}

export interface CreateImageInput {
  productId: string;
  productVariantId: string | null;
  storagePath: string;
  altText: string;
  imageType: 'primary' | 'gallery';
  sortOrder: number;
}

export interface UpdateImageInput {
  imageId: string;
  altText?: string;
  imageType?: 'primary' | 'gallery';
  sortOrder?: number;
  isDeleted?: boolean;
}

export interface AdminCatalogRepository {
  createProduct(input: CreateProductInput, adminUserId: string): Promise<{ productId: string }>;
  createVariant(input: CreateVariantInput, adminUserId: string): Promise<{ productVariantId: string }>;
  createImage(input: CreateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  updateImage(input: UpdateImageInput, adminUserId: string): Promise<{ imageId: string }>;
}

export interface AdminCatalogService {
  createProduct(input: CreateProductInput, adminUserId: string): Promise<{ productId: string }>;
  createVariant(input: CreateVariantInput, adminUserId: string): Promise<{ productVariantId: string }>;
  createImage(input: CreateImageInput, adminUserId: string): Promise<{ imageId: string }>;
  updateImage(input: UpdateImageInput, adminUserId: string): Promise<{ imageId: string }>;
}

export type AdminCatalogRepositoryFactory = SqlClientFactory;
