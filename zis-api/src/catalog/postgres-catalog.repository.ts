import type { CatalogCategory, CatalogQuery } from '../contracts/catalog.contracts.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type {
  CatalogImageRecord,
  CatalogPage,
  CatalogProductRecord,
  CatalogRepository,
  CatalogVariantRecord,
} from './catalog.types.js';

interface CategoryRow {
  [key: string]: unknown;
  category_id: string;
  name: string;
  slug: string;
}

interface ProductRow {
  [key: string]: unknown;
  product_id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  name: string;
  description: string | null;
  set_size: number;
  default_min_sets: number;
}

interface VariantRow {
  [key: string]: unknown;
  product_variant_id: string;
  product_id: string;
  name: string;
  product_code: string;
  price_per_set: string;
  available_sets: number;
  is_default: boolean;
  attributes: Record<string, unknown> | null;
}

interface ImageRow {
  [key: string]: unknown;
  product_image_id: string;
  product_id: string;
  product_variant_id: string | null;
  storage_path: string;
  alt_text: string;
  image_type: 'primary' | 'gallery';
  sort_order: number;
}

const SORT_SQL: Record<NonNullable<CatalogQuery['sort']>, string> = {
  display: 'c.sort_order, p.name, p.product_id',
  name: 'p.name, p.product_id',
  price: 'min(v.price_per_set), p.name, p.product_id',
};

export function createPostgresCatalogRepository(factory: SqlClientFactory): CatalogRepository {
  return {
    listCategories: () => listCategories(factory),
    listProducts: (query) => listProducts(factory, query),
    getProduct: (productId) => getProduct(factory, productId),
  };
}

async function listCategories(factory: SqlClientFactory): Promise<CatalogCategory[]> {
  const client = await factory();
  try {
    const result = await client.query<CategoryRow>(
      `select category_id, name, slug
         from public.categories
        where status = 'active' and is_deleted = false
        order by sort_order, name, category_id`,
    );
    return result.rows.map(mapCategory);
  } finally {
    client.release?.();
  }
}

async function listProducts(factory: SqlClientFactory, query: CatalogQuery): Promise<CatalogPage> {
  const client = await factory();
  try {
    const { whereSql, values } = buildFilters(query);
    const countResult = await client.query<{ total_items: number }>(
      `select count(distinct p.product_id)::int as total_items
         from public.products p
         join public.categories c on c.category_id = p.category_id
         left join public.product_variants v
           on v.product_id = p.product_id and v.status = 'active' and v.is_deleted = false
        where ${whereSql}`,
      values,
    );
    const offset = (query.page - 1) * query.pageSize;
    const productsResult = await client.query<ProductRow>(
      `select p.product_id, p.category_id, c.name as category_name, c.slug as category_slug,
              p.name, p.description, p.set_size, p.default_min_sets
         from public.products p
         join public.categories c on c.category_id = p.category_id
         left join public.product_variants v
           on v.product_id = p.product_id and v.status = 'active' and v.is_deleted = false
        where ${whereSql}
        group by p.product_id, p.category_id, c.name, c.slug, p.name, p.description,
                 p.set_size, p.default_min_sets, c.sort_order
        order by ${SORT_SQL[query.sort ?? 'display']} ${query.direction === 'desc' ? 'desc' : 'asc'}
        limit $${values.length + 1} offset $${values.length + 2}`,
      [...values, query.pageSize, offset],
    );

    return attachDetails(client, productsResult.rows, Number(countResult.rows[0]?.total_items ?? 0));
  } finally {
    client.release?.();
  }
}

async function getProduct(factory: SqlClientFactory, productId: string): Promise<CatalogProductRecord | null> {
  const client = await factory();
  try {
    const result = await client.query<ProductRow>(
      `select p.product_id, p.category_id, c.name as category_name, c.slug as category_slug,
              p.name, p.description, p.set_size, p.default_min_sets
         from public.products p
         join public.categories c on c.category_id = p.category_id
        where p.product_id = $1
          and p.status = 'active' and p.is_deleted = false
          and c.status = 'active' and c.is_deleted = false`,
      [productId],
    );
    const records = await attachDetails(client, result.rows, result.rowCount ?? 0);
    return records.products[0] ?? null;
  } finally {
    client.release?.();
  }
}

async function attachDetails(client: SqlClient, productRows: ProductRow[], totalItems: number): Promise<CatalogPage> {
  if (productRows.length === 0) {
    return { products: [], totalItems };
  }

  const productIds = productRows.map((row) => row.product_id);
  const variantsResult = await client.query<VariantRow>(
    `select product_variant_id, product_id, name, product_code, price_per_set,
            available_sets, is_default, attributes
       from public.product_variants
      where product_id = any($1::uuid[])
        and status = 'active' and is_deleted = false
      order by product_id, is_default desc, name, product_variant_id`,
    [productIds],
  );
  const imagesResult = await client.query<ImageRow>(
    `select product_image_id, product_id, product_variant_id, storage_path,
            alt_text, image_type, sort_order
       from public.product_images
      where product_id = any($1::uuid[])
        and is_deleted = false
      order by product_id, product_variant_id nulls first, sort_order, product_image_id`,
    [productIds],
  );

  return {
    products: productRows.map((row) => mapProduct(row, variantsResult.rows, imagesResult.rows)),
    totalItems,
  };
}

function mapProduct(row: ProductRow, variants: VariantRow[], images: ImageRow[]): CatalogProductRecord {
  const productImages = images.filter((image) => image.product_id === row.product_id && image.product_variant_id === null).map(mapImage);
  const productVariants = variants
    .filter((variant) => variant.product_id === row.product_id)
    .map((variant) => ({ ...mapVariant(variant), images: images
      .filter((image) => image.product_variant_id === variant.product_variant_id)
      .map(mapImage) }));

  return {
    productId: row.product_id,
    category: { categoryId: row.category_id, name: row.category_name, slug: row.category_slug },
    name: row.name,
    description: row.description,
    setSize: row.set_size,
    minimumSets: row.default_min_sets,
    images: productImages,
    variants: productVariants,
  };
}

function buildFilters(query: CatalogQuery): { whereSql: string; values: unknown[] } {
  const values: unknown[] = [];
  const filters = ["p.status = 'active'", 'p.is_deleted = false', "c.status = 'active'", 'c.is_deleted = false'];
  if (query.categorySlug) {
    values.push(query.categorySlug);
    filters.push(`c.slug = $${values.length}`);
  }
  if (query.search) {
    values.push(`%${query.search}%`);
    filters.push(`p.name ilike $${values.length}`);
  }
  return { whereSql: filters.join(' and '), values };
}

function mapCategory(row: CategoryRow): CatalogCategory {
  return { categoryId: row.category_id, name: row.name, slug: row.slug };
}

function mapVariant(row: VariantRow): Omit<CatalogVariantRecord, 'images'> {
  return {
    productVariantId: row.product_variant_id,
    productId: row.product_id,
    name: row.name,
    productCode: row.product_code,
    pricePerSet: row.price_per_set,
    availableSets: row.available_sets,
    isDefault: row.is_default,
    attributes: row.attributes,
  };
}

function mapImage(row: ImageRow): CatalogImageRecord {
  return {
    imageId: row.product_image_id,
    productId: row.product_id,
    productVariantId: row.product_variant_id,
    storagePath: row.storage_path,
    altText: row.alt_text,
    imageType: row.image_type,
    sortOrder: row.sort_order,
  };
}
