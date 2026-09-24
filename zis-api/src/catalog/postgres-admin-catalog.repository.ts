import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type {
  AdminCatalogRepository,
  CreateImageInput,
  CreateProductInput,
  CreateVariantInput,
  UpdateImageInput,
} from './admin-catalog.types.js';

interface IdRow {
  [key: string]: unknown;
  id: string;
}

export function createPostgresAdminCatalogRepository(factory: SqlClientFactory): AdminCatalogRepository {
  return {
    createProduct: (input, adminUserId) => createProduct(factory, input, adminUserId),
    createVariant: (input, adminUserId) => createVariant(factory, input, adminUserId),
    createImage: (input, adminUserId) => createImage(factory, input, adminUserId),
    updateImage: (input, adminUserId) => updateImage(factory, input, adminUserId),
  };
}

async function createProduct(factory: SqlClientFactory, input: CreateProductInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(
      `insert into public.products
        (category_id, name, description, set_size, default_min_sets)
       values ($1, $2, $3, $4, $5)
       returning product_id as id`,
      [input.categoryId, input.name, input.description, input.setSize, input.minimumSets],
    );
    const productId = result.rows[0]?.id;
    if (!productId) throw new Error('Product creation failed');
    await insertAudit(client, adminUserId, 'product.created', 'products', productId, null, input);
    return { productId };
  });
}

async function createVariant(factory: SqlClientFactory, input: CreateVariantInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(
      `insert into public.product_variants
        (product_id, name, product_code, price_per_set, available_sets,
         low_stock_threshold_sets, default_production_quantity_sets, attributes, is_default)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning product_variant_id as id`,
      [input.productId, input.name, input.productCode, input.pricePerSet, input.availableSets,
        input.lowStockThresholdSets, input.defaultProductionQuantitySets, input.attributes, input.isDefault],
    );
    const productVariantId = result.rows[0]?.id;
    if (!productVariantId) throw new Error('Product variant creation failed');
    await insertAudit(client, adminUserId, 'product_variant.created', 'product_variants', productVariantId, null, input);
    return { productVariantId };
  });
}

async function createImage(factory: SqlClientFactory, input: CreateImageInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(
      `insert into public.product_images
        (product_id, product_variant_id, storage_path, alt_text, image_type, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       returning product_image_id as id`,
      [input.productId, input.productVariantId, input.storagePath, input.altText, input.imageType, input.sortOrder],
    );
    const imageId = result.rows[0]?.id;
    if (!imageId) throw new Error('Product image creation failed');
    await insertAudit(client, adminUserId, 'product_image.created', 'product_images', imageId, null, input);
    return { imageId };
  });
}

async function updateImage(factory: SqlClientFactory, input: UpdateImageInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const beforeResult = await client.query<Record<string, unknown>>(
      `select product_image_id, product_id, product_variant_id, storage_path,
              alt_text, image_type, sort_order, is_deleted
         from public.product_images
        where product_image_id = $1
        for update`,
      [input.imageId],
    );
    const before = beforeResult.rows[0];
    if (!before) throw new Error('Product image not found');
    const afterResult = await client.query<IdRow>(
      `update public.product_images
          set alt_text = coalesce($2, alt_text),
              image_type = coalesce($3, image_type),
              sort_order = coalesce($4, sort_order),
              is_deleted = coalesce($5, is_deleted)
        where product_image_id = $1
        returning product_image_id as id`,
      [input.imageId, input.altText ?? null, input.imageType ?? null, input.sortOrder ?? null, input.isDeleted ?? null],
    );
    const imageId = afterResult.rows[0]?.id;
    if (!imageId) throw new Error('Product image update failed');
    await insertAudit(client, adminUserId, 'product_image.updated', 'product_images', imageId, before, input);
    return { imageId };
  });
}

async function withTransaction<T>(factory: SqlClientFactory, work: (client: SqlClient) => Promise<T>): Promise<T> {
  const client = await factory();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release?.();
  }
}

async function insertAudit(
  client: SqlClient,
  adminUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  beforeData: unknown,
  afterData: unknown,
): Promise<void> {
  await client.query(
    `insert into public.admin_audit_log
      (admin_user_id, action, entity_type, entity_id, before_data, after_data)
     values ($1, $2, $3, $4, $5, $6)`,
    [adminUserId, action, entityType, entityId, beforeData, afterData],
  );
}
