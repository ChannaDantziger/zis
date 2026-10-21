import type { CatalogCategory, CatalogProduct, CatalogQuery } from '../contracts/catalog.contracts.js';

export interface CatalogImageRecord {
  imageId: string;
  productId: string;
  productVariantId: string | null;
  storagePath: string;
  altText: string;
  imageType: 'primary' | 'gallery';
  sortOrder: number;
}

export interface CatalogVariantRecord {
  productVariantId: string;
  productId: string;
  name: string;
  productCode: string;
  pricePerSet: string;
  availableSets: number;
  isDefault: boolean;
  attributes: Record<string, unknown> | null;
  images: CatalogImageRecord[];
}

export interface CatalogProductRecord {
  productId: string;
  category: CatalogCategory;
  name: string;
  description: string | null;
  setSize: number;
  pricePerSet: string;
  availableSets: number;
  displayOrder: number;
  images: CatalogImageRecord[];
  variants: CatalogVariantRecord[];
}

export interface CatalogPage {
  products: CatalogProductRecord[];
  totalItems: number;
}

export interface CatalogRepository {
  listCategories(): Promise<CatalogCategory[]>;
  listProducts(query: CatalogQuery): Promise<CatalogPage>;
  getProduct(productId: string): Promise<CatalogProductRecord | null>;
}

export interface CatalogService {
  listCategories(): Promise<CatalogCategory[]>;
  listProducts(query: CatalogQuery): Promise<{ data: CatalogProduct[]; totalItems: number }>;
  getProduct(productId: string): Promise<CatalogProduct | null>;
}
