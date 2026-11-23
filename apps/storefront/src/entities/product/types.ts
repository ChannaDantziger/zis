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
  variants: unknown[];
}

export interface CatalogQuery {
  categorySlug?: string;
  search?: string;
  sort: 'display' | 'name' | 'price';
  direction: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface CatalogResponse {
  data: CatalogProduct[];
  page: { page: number; pageSize: number; totalItems: number; totalPages: number };
}
