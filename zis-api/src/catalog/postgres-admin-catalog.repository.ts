import { ApiError } from '../http/api-error.js';
import { createCatalogManagementRepository } from './postgres-catalog-management.repository.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type {
  AdminCatalogRepository,
  CreateImageInput,
  CreateProductInput,
  CreateVariantInput,
  UpdateImageInput,
  SaveCategoryInput,
} from './admin-catalog.types.js';

interface IdRow {
  [key: string]: unknown;
  id: string;
}

export function createPostgresAdminCatalogRepository(factory: SqlClientFactory): AdminCatalogRepository {
  return {
    reorderGallery: (ids, actor) => withTransaction(factory, async (client) => {
      const current = await client.query<{ id: string }>('select event_gallery_image_id as id from public.event_gallery_images where not is_deleted order by event_gallery_image_id for update');
      if (ids.length !== current.rows.length || new Set(ids).size !== ids.length || current.rows.some((row) => !ids.includes(row.id))) throw new ApiError(409, 'GALLERY_CHANGED', 'הגלריה השתנתה. רעננו ונסו שוב');
      await client.query(`update public.event_gallery_images g set sort_order=o.position::integer
        from unnest($1::uuid[]) with ordinality as o(id, position) where g.event_gallery_image_id=o.id`, [ids]);
      for (const [index, id] of ids.entries()) await insertAudit(client, actor, 'event_gallery_image.reordered', 'event_gallery_images', id, null, { sortOrder: index + 1 });
    }),
    ...createCatalogManagementRepository(factory),
    saveCategory: (input, adminUserId) => saveCategory(factory, input, adminUserId),
    createProduct: (input, adminUserId) => createProduct(factory, input, adminUserId),
    createVariant: (input, adminUserId) => createVariant(factory, input, adminUserId),
    createImage: (input, adminUserId) => createImage(factory, input, adminUserId),
    updateImage: (input, adminUserId) => updateImage(factory, input, adminUserId),
    listGallery: () => listGallery(factory),
    addGalleryImage: (path, order, actor) => addGalleryImage(factory, path, order, actor),
    setGalleryActive: (id, active, actor) => setGalleryActive(factory, id, active, actor),
    setGalleryFeatured: (id, actor) => setGalleryFeatured(factory, id, actor),
    deleteImage: (id, actor) => deleteImage(factory, id, actor),
    completeImageDelete: (id, actor) => completeImageDelete(factory, id, actor),
  };
}

async function saveCategory(factory: SqlClientFactory, input: SaveCategoryInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    if (input.categoryId) {
      const before = await client.query<Record<string, unknown>>(
        `select category_id, name, slug, sort_order, status from public.categories where category_id=$1 for update`, [input.categoryId],
      );
      if (!before.rows[0]) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'הקטגוריה לא נמצאה');
      await client.query(`update public.categories set name=$2, sort_order=$3, status=$4, updated_at=clock_timestamp() where category_id=$1`,
        [input.categoryId, input.name, input.sortOrder, input.status]);
      await insertAudit(client, adminUserId, 'category.updated', 'categories', input.categoryId, before.rows[0], input);
      return { categoryId: input.categoryId };
    }
    const slugBase = input.name.normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category';
    const result = await client.query<IdRow>(
      `insert into public.categories (name, slug, sort_order, status) values ($1, $2 || '-' || substr(gen_random_uuid()::text, 1, 8), $3, $4) returning category_id as id`,
      [input.name, slugBase, input.sortOrder, input.status],
    );
    const categoryId = result.rows[0]?.id;
    if (!categoryId) throw new Error('Category creation failed');
    await insertAudit(client, adminUserId, 'category.created', 'categories', categoryId, null, input);
    return { categoryId };
  });
}

async function createProduct(factory: SqlClientFactory, input: CreateProductInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(
      `insert into public.products
        (category_id, name, description, set_size, price_per_item, available_items, display_order, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'draft')
       returning product_id as id`,
      [input.categoryId, input.name, input.description, input.setSize, input.pricePerUnit, input.availableItems, input.displayOrder],
    );
    const productId = result.rows[0]?.id;
    if (!productId) throw new Error('Product creation failed');
    await insertAudit(client, adminUserId, 'product.created', 'products', productId, null, input);
    return { productId };
  });
}

async function assertProductImageCoverage(client: SqlClient, productId: string) {
  const result = await client.query<{ valid: boolean }>(`select
    exists(select 1 from public.product_images where product_id=$1 and product_variant_id is null and image_type='primary' and not is_deleted)
    and not exists(select 1 from public.product_variants v where v.product_id=$1 and not v.is_deleted
      and not exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)) as valid`, [productId]);
  if (!result.rows[0]?.valid) throw new ApiError(422, 'PRODUCT_IMAGES_REQUIRED', 'יש להוסיף תמונת מוצר ראשית ותמונה לכל וריאציה לפני הפרסום');
}

async function createVariant(factory: SqlClientFactory, input: CreateVariantInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(
      `insert into public.product_variants
        (product_id, name, product_code, price_per_item, available_sets,
         low_stock_threshold_sets, default_production_quantity_sets, attributes, is_default, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning product_variant_id as id`,
      [input.productId, input.name, input.productCode, input.pricePerUnit, input.availableSets,
        input.lowStockThresholdSets, input.defaultProductionQuantitySets, input.attributes, input.isDefault, input.status],
    );
    const productVariantId = result.rows[0]?.id;
    if (!productVariantId) throw new Error('Product variant creation failed');
    await insertAudit(client, adminUserId, 'product_variant.created', 'product_variants', productVariantId, null, input);
    return { productVariantId };
  });
}

async function createImage(factory: SqlClientFactory, input: CreateImageInput, adminUserId: string) {
  if (!input.storagePath.startsWith('zis-product-media/') || input.storagePath.includes('..')) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid product image path');
  return withTransaction(factory, async (client) => {
    const product = await client.query('select product_id from public.products where product_id=$1 for update', [input.productId]);
    if (!product.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Product not found');
    if (input.productVariantId) {
      const variant = await client.query('select product_variant_id from public.product_variants where product_variant_id=$1 and product_id=$2', [input.productVariantId, input.productId]);
      if (!variant.rows[0]) throw new ApiError(400, 'VALIDATION_ERROR', 'Variant does not belong to product');
    }
    const primary = await client.query<{ imageId: string }>(
      `select product_image_id as "imageId" from public.product_images
       where product_id=$1 and product_variant_id is not distinct from $2::uuid
         and image_type='primary' and not is_deleted for update`,
      [input.productId, input.productVariantId],
    );
    const imageType = input.isPrimary || primary.rows.length === 0 ? 'primary' : 'gallery';
    if (imageType === 'primary' && primary.rows.length) {
      await client.query(`update public.product_images set image_type='gallery', updated_at=clock_timestamp()
        where product_image_id=$1`, [primary.rows[0]!.imageId]);
    }
    const result = await client.query<IdRow>(
      `insert into public.product_images
        (product_id, product_variant_id, storage_path, alt_text, image_type, sort_order)
       values ($1, $2, $3, $4, $5, $6)
       returning product_image_id as id`,
      [input.productId, input.productVariantId, input.storagePath, input.altText, imageType, input.sortOrder],
    );
    const imageId = result.rows[0]?.id;
    if (!imageId) throw new Error('Product image creation failed');
    await insertAudit(client, adminUserId, 'product_image.created', 'product_images', imageId, null, input);
    await publishIfReady(client, input.productId);
    return { imageId };
  });
}

async function updateImage(factory: SqlClientFactory, input: UpdateImageInput, adminUserId: string) {
  return withTransaction(factory, async (client) => {
    const owner = await client.query<{ productId: string }>(
      'select product_id as "productId" from public.product_images where product_image_id=$1 and not is_deleted', [input.imageId]);
    if (!owner.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Product image not found');
    await client.query('select product_id from public.products where product_id=$1 for update', [owner.rows[0].productId]);
    const beforeResult = await client.query<Record<string, unknown>>(
      `select product_image_id, product_id, product_variant_id, storage_path,
              alt_text, image_type, sort_order, is_deleted, extract(epoch from updated_at)::text as version
       from public.product_images
        where product_image_id = $1
        for update`,
      [input.imageId],
    );
    const before = beforeResult.rows[0];
    if (!before) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Product image not found');
    if (before.version !== input.version) throw new ApiError(409, 'CATALOG_VERSION_CONFLICT', 'התמונה השתנתה. רעננו לפני שמירה');
    if (input.isPrimary && before.image_type !== 'primary') {
      await client.query(`update public.product_images set image_type='gallery', updated_at=clock_timestamp()
        where product_id=$1 and product_variant_id is not distinct from $2::uuid
          and image_type='primary' and not is_deleted`, [before.product_id, before.product_variant_id]);
    }
    const afterResult = await client.query<IdRow>(
      `update public.product_images
          set alt_text = coalesce($2, alt_text),
              sort_order = coalesce($3, sort_order),
              image_type = case when $4 then 'primary' else image_type end,
              updated_at = clock_timestamp()
        where product_image_id = $1
        returning product_image_id as id`,
      [input.imageId, input.altText ?? null, input.sortOrder ?? null, input.isPrimary ?? false],
    );
    const imageId = afterResult.rows[0]?.id;
    if (!imageId) throw new Error('Product image update failed');
    await insertAudit(client, adminUserId, 'product_image.updated', 'product_images', imageId, before, input);
    return { imageId };
  });
}

async function listGallery(factory: SqlClientFactory) {
  const client = await factory();
  try {
    const result = await client.query<{ imageId: string; storagePath: string; isActive: boolean; isFeatured: boolean; sortOrder: number }>(
      `select event_gallery_image_id as "imageId", storage_path as "storagePath", is_published as "isActive",
              is_featured as "isFeatured", sort_order as "sortOrder"
       from public.event_gallery_images where not is_deleted order by sort_order,event_gallery_image_id`);
    return result.rows;
  } finally { client.release?.(); }
}

async function addGalleryImage(factory: SqlClientFactory, path: string, order: number, actor: string) {
  if (!path.startsWith('zis-event-gallery/') || path.includes('..')) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid gallery image path');
  return withTransaction(factory, async (client) => {
    const result = await client.query<IdRow>(`insert into public.event_gallery_images(storage_path,sort_order,is_published)
      values($1,$2, true) returning event_gallery_image_id as id`, [path, order]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Gallery image creation failed');
    await insertAudit(client, actor, 'event_gallery_image.created', 'event_gallery_images', id, null, { storagePath: path, sortOrder: order });
    return { imageId: id };
  });
}

async function setGalleryActive(factory: SqlClientFactory, id: string, active: boolean, actor: string) {
  return withTransaction(factory, async (client) => {
    const before = await client.query<Record<string, unknown>>('select * from public.event_gallery_images where event_gallery_image_id=$1 for update', [id]);
    if (!before.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Gallery image not found');
    await client.query(`update public.event_gallery_images
      set is_published=$2, is_featured=case when $2 then is_featured else false end
      where event_gallery_image_id=$1`, [id, active]);
    await insertAudit(client, actor, 'event_gallery_image.updated', 'event_gallery_images', id, before.rows[0], { isActive: active });
  });
}

async function setGalleryFeatured(factory: SqlClientFactory, id: string, actor: string) {
  return withTransaction(factory, async (client) => {
    const target = await client.query<Record<string, unknown>>(
      `select * from public.event_gallery_images
        where event_gallery_image_id=$1 and not is_deleted for update`, [id]);
    if (!target.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Gallery image not found');
    if (target.rows[0].is_published !== true) throw new ApiError(409, 'GALLERY_IMAGE_HIDDEN', 'יש להציג את התמונה באתר לפני בחירתה כתמונה הגדולה');
    await client.query(`select event_gallery_image_id from public.event_gallery_images
      where is_featured=true and not is_deleted for update`);
    await client.query(`update public.event_gallery_images set is_featured=false
      where is_featured=true and not is_deleted and event_gallery_image_id<>$1`, [id]);
    await client.query(`update public.event_gallery_images
      set is_featured=true where event_gallery_image_id=$1`, [id]);
    await insertAudit(client, actor, 'event_gallery_image.featured', 'event_gallery_images', id,
      target.rows[0], { isFeatured: true });
  });
}

async function deleteImage(factory: SqlClientFactory, id: string, actor: string) {
  return withTransaction(factory, async (client) => {
    const product = await client.query<{ storage_path: string; is_deleted: boolean }>('select storage_path,is_deleted from public.product_images where product_image_id=$1 for update', [id]);
    if (product.rows[0]) {
      const path = product.rows[0].storage_path;
      if (product.rows[0].is_deleted) return { bucket: 'zis-product-media' as const, storagePath: path };
      const refs = await client.query<{ count: string }>('select count(*)::text as count from public.product_images where storage_path=$1 and not is_deleted', [path]);
      if (Number(refs.rows[0]?.count) > 1) throw new ApiError(409, 'MEDIA_SHARED', 'The image file is shared and cannot be deleted');
      await client.query('update public.product_images set is_deleted=true where product_image_id=$1', [id]);
      return { bucket: 'zis-product-media' as const, storagePath: path };
    }
    const gallery = await client.query<{ storage_path: string; is_deleted: boolean }>('select storage_path,is_deleted from public.event_gallery_images where event_gallery_image_id=$1 for update', [id]);
    if (!gallery.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Image not found');
    const path = gallery.rows[0].storage_path;
    if (gallery.rows[0].is_deleted) return { bucket: 'zis-event-gallery' as const, storagePath: path };
    await client.query('update public.event_gallery_images set is_deleted=true where event_gallery_image_id=$1', [id]);
    return { bucket: 'zis-event-gallery' as const, storagePath: path };
  });
}

async function completeImageDelete(factory: SqlClientFactory, id: string, actor: string) {
  await withTransaction(factory, async (client) => {
    const product = await client.query<{ storage_path: string }>('delete from public.product_images where product_image_id=$1 and is_deleted=true returning storage_path', [id]);
    if (product.rows[0]) {
      await insertAudit(client, actor, 'product_image.deleted', 'product_images', id, { storagePath: product.rows[0].storage_path }, null);
      await insertAudit(client, actor, 'media.storage_deleted', 'media', id, null, { removed: true });
      return;
    }
    const gallery = await client.query<{ storage_path: string }>('delete from public.event_gallery_images where event_gallery_image_id=$1 and is_deleted=true returning storage_path', [id]);
    if (!gallery.rows[0]) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'Image not found');
    await insertAudit(client, actor, 'event_gallery_image.deleted', 'event_gallery_images', id, { storagePath: gallery.rows[0].storage_path }, null);
    await insertAudit(client, actor, 'media.storage_deleted', 'media', id, null, { removed: true });
  });
}

async function publishIfReady(client: SqlClient, productId: string) {
  await client.query(`update public.products p set status='active', updated_at=clock_timestamp()
    where p.product_id=$1 and p.status='draft'
      and exists(select 1 from public.categories c where c.category_id=p.category_id and c.status='active' and not c.is_deleted)
      and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
      and (not exists(select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
        and p.price_per_item is not null and p.available_items is not null
        or exists(select 1 from public.product_variants v where v.product_id=p.product_id and v.status='active' and not v.is_deleted)
          and not exists(select 1 from public.product_variants v where v.product_id=p.product_id and v.status='active' and not v.is_deleted
            and not exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)))`, [productId]);
}

export async function withTransaction<T>(factory: SqlClientFactory, work: (client: SqlClient) => Promise<T>): Promise<T> {
  const client = await factory();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new ApiError(409, 'CATALOG_DUPLICATE', 'קוד מוצר או תמונה ראשית כבר קיימים. יש לבחור ערך אחר');
    throw error;
  } finally {
    client.release?.();
  }
}

export async function insertAudit(
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
