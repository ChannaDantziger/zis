import type { ApiListResponse, PaginationQuery, SortDirection } from './common.contracts.js';

export interface CatalogQuery extends PaginationQuery {
  categorySlug?: string;
  search?: string;
  sort?: 'display' | 'name' | 'price';
  direction?: SortDirection;
}

export interface CatalogCategory {
  categoryId: string;
  name: string;
  slug: string;
}

export interface CatalogImage {
  imageId: string;
  url: string;
  altText: string;
  imageType: 'primary' | 'gallery';
  sortOrder: number;
}

export interface CatalogVariant {
  productVariantId: string;
  name: string;
  productCode: string;
  pricePerUnit: string;
  availableSets: number;
  isDefault: boolean;
  attributes: Record<string, unknown> | null;
  primaryImage: CatalogImage | null;
  gallery: CatalogImage[];
}

export interface CatalogProduct {
  productId: string;
  category: CatalogCategory;
  name: string;
  description: string | null;
  setSize: number;
  pricePerUnit: string;
  availableSets: number;
  displayOrder: number;
  primaryImage: CatalogImage | null;
  gallery: CatalogImage[];
  variants: CatalogVariant[];
}

export type CatalogResponse = ApiListResponse<CatalogProduct>;

export interface CategoryListResponse {
  data: CatalogCategory[];
}
