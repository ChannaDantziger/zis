import type { SqlClientFactory, SqlClient } from '../inventory/postgres-inventory.repository.js';
import { ApiError } from '../http/api-error.js';
import type { AdminCatalogManagement, ManagedCatalog, ManagedProduct, ProductStatus, UpdateProductInput, UpdateVariantInput } from './admin-catalog-management.types.js';
import { withTransaction, insertAudit } from './postgres-admin-catalog.repository.js';
const PAGE_SIZE = 25;

async function assertProductPublishable(client: SqlClient, productId: string, status: ProductStatus) {
  if (status !== 'active') return;
  const result = await client.query<{ valid: boolean }>(`select
    exists(select 1 from public.product_images where product_id=$1 and product_variant_id is null and image_type='primary' and not is_deleted)
    and not exists(select 1 from public.product_variants v where v.product_id=$1 and not v.is_deleted
      and not exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted))
    and (exists(select 1 from public.product_variants where product_id=$1 and status='active' and not is_deleted)
      or (exists(select 1 from public.products where product_id=$1 and price_per_item is not null and available_items is not null))) as valid`, [productId]);
  if (!result.rows[0]?.valid) throw new ApiError(422, 'PRODUCT_NOT_PUBLISHABLE', 'מוצר פעיל חייב תמונה ראשית ומחיר ומלאי תקינים');
}

async function assertProductImageCoverage(client: SqlClient, productId: string) {
  const result = await client.query<{ valid: boolean }>(`select
    exists(select 1 from public.product_images where product_id=$1 and product_variant_id is null and image_type='primary' and not is_deleted)
    and not exists(select 1 from public.product_variants v where v.product_id=$1 and v.status='active' and not v.is_deleted
      and not exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)) as valid`, [productId]);
  if (!result.rows[0]?.valid) throw new ApiError(422, 'PRODUCT_IMAGES_REQUIRED', 'יש להוסיף תמונת מוצר ראשית ותמונה לכל וריאציה פעילה לפני הפרסום');
}

export function createCatalogManagementRepository(factory: SqlClientFactory): AdminCatalogManagement {
  return {
    listProducts: (page, productId, categoryId) => list(factory, page, productId, categoryId),
    updateProduct: (input, actor) => withTransaction(factory, async (client) => {
      const before = await lock(client, 'products', 'product_id', input.productId, input.version);
      if (before.category_id !== input.categoryId) throw new ApiError(409, 'CATEGORY_CHANGE_NOT_ALLOWED', 'לא ניתן להעביר מוצר לקטגוריה אחרת');
      await client.query(`update public.products set category_id=$2, name=$3, description=$4,
        set_size=$5, price_per_item=$6, available_items=$7, display_order=$8, status=$9,
        archived_at=case when $9='archived' then coalesce(archived_at, now()) else null end,
        updated_at=clock_timestamp() where product_id=$1`,
      [input.productId, input.categoryId, input.name, input.description, input.setSize, input.pricePerUnit, input.availableItems, input.displayOrder, input.status]);
      if (input.status === 'active') await assertProductImageCoverage(client, input.productId);
      await assertProductPublishable(client, input.productId, input.status);
      await insertAudit(client, actor, 'product.updated', 'products', input.productId, before, input);
      return { productId: input.productId };
    }),
    updateVariant: (input, actor) => withTransaction(factory, async (client) => {
      const before = await lock(client, 'product_variants', 'product_variant_id', input.productVariantId, input.version);
      await client.query(`update public.product_variants set name=$2, price_per_item=$3,
        low_stock_threshold_sets=$4, default_production_quantity_sets=$5, status=$6,
        updated_at=clock_timestamp() where product_variant_id=$1`,
      [input.productVariantId, input.name, input.pricePerUnit, input.lowStockThresholdSets, input.defaultProductionQuantitySets, input.status]);
      await insertAudit(client, actor, 'product_variant.updated', 'product_variants', input.productVariantId, before, input);
      return { productVariantId: input.productVariantId };
    }),
  };
}

async function list(factory: SqlClientFactory, page: number, productId?: string, categoryId?: string): Promise<ManagedCatalog> {
  const client = await factory();
  try {
    await client.query('begin isolation level repeatable read read only');
    const count = await client.query<{ total: string }>('select count(*)::text as total from public.products where ($1::uuid is null or product_id=$1) and ($2::uuid is null or category_id=$2)', [productId ?? null, categoryId ?? null]);
    const categories = await client.query<{ categoryId: string; name: string; sortOrder: number; status: 'active' | 'hidden' }>(`select c.category_id as "categoryId", c.name, c.sort_order as "sortOrder", c.status,
      (select count(*)::int from public.products p where p.category_id=c.category_id and not p.is_deleted) as "productCount",
      coalesce((select jsonb_agg(preview) from (
        select p.product_id as "productId",p.name as "productName",image.storage_path as "storagePath"
        from public.products p join lateral (select i.storage_path from public.product_images i
          where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted
          order by i.sort_order,i.product_image_id limit 1) image on true
        where p.category_id=c.category_id and not p.is_deleted order by p.display_order,p.name,p.product_id limit 8
      ) preview),'[]'::jsonb) as "previewImages"
      from public.categories c order by c.sort_order,c.name`);
    const products = await client.query<{ product: ManagedProduct }>(`select jsonb_build_object(
      'productId',p.product_id,'categoryId',p.category_id,'name',p.name,'description',p.description,
      'setSize',p.set_size,'pricePerUnit',p.price_per_item::text,'availableItems',p.available_items,'displayOrder',p.display_order,'status',p.status,
      'isVisible', (p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
        and exists(select 1 from public.product_images pi where pi.product_id=p.product_id and pi.product_variant_id is null and pi.image_type='primary' and not pi.is_deleted)
        and (not exists(select 1 from public.product_variants any_v where any_v.product_id=p.product_id and not any_v.is_deleted)
          or (exists(select 1 from public.product_variants active_v where active_v.product_id=p.product_id and active_v.status='active' and not active_v.is_deleted)
            and not exists(select 1 from public.product_variants active_v where active_v.product_id=p.product_id and active_v.status='active' and not active_v.is_deleted
              and not exists(select 1 from public.product_images vi where vi.product_variant_id=active_v.product_variant_id and vi.image_type='primary' and not vi.is_deleted))))),
      'visibilityReasons', array_remove(array[
        case when p.is_deleted then 'המוצר נמחק' end,
        case when p.status <> 'active' then 'סטטוס המוצר אינו פעיל (' || p.status || ')' end,
        case when c.status <> 'active' or c.is_deleted then 'הקטגוריה אינה פעילה או נמחקה' end,
        case when not exists(select 1 from public.product_images pi where pi.product_id=p.product_id and pi.product_variant_id is null and pi.image_type='primary' and not pi.is_deleted) then 'חסרה תמונת מוצר ראשית' end,
        case when exists(select 1 from public.product_variants any_v where any_v.product_id=p.product_id and not any_v.is_deleted)
          and not exists(select 1 from public.product_variants active_v where active_v.product_id=p.product_id and active_v.status='active' and not active_v.is_deleted) then 'אין וריאציה פעילה' end,
        case when exists(select 1 from public.product_variants active_v where active_v.product_id=p.product_id and active_v.status='active' and not active_v.is_deleted
          and not exists(select 1 from public.product_images vi where vi.product_variant_id=active_v.product_variant_id and vi.image_type='primary' and not vi.is_deleted)) then 'חסרה תמונה לווריאציה פעילה' end
      ]::text[], null),
      'version',extract(epoch from p.updated_at)::text,'variants',coalesce((
        select jsonb_agg(jsonb_build_object('productVariantId',v.product_variant_id,'name',v.name,
          'productCode',v.product_code,'pricePerUnit',v.price_per_item::text,'availableSets',v.available_sets,
          'lowStockThresholdSets',v.low_stock_threshold_sets,'defaultProductionQuantitySets',v.default_production_quantity_sets,
          'isDefault',v.is_default,'status',v.status,'version',extract(epoch from v.updated_at)::text)
          order by v.is_default desc,v.name,v.product_variant_id)
        from public.product_variants v where v.product_id=p.product_id),'[]'::jsonb), 'images',coalesce((select jsonb_agg(jsonb_build_object('imageId',i.product_image_id, 'productVariantId',i.product_variant_id, 'storagePath',i.storage_path, 'altText',i.alt_text, 'imageType',i.image_type, 'sortOrder',i.sort_order,'version',extract(epoch from i.updated_at)::text) order by i.sort_order,i.product_image_id) from public.product_images i where i.product_id=p.product_id and not i.is_deleted),'[]'::jsonb)) as product
      from public.products p left join public.categories c on c.category_id=p.category_id
      where ($3::uuid is null or p.product_id=$3) and ($4::uuid is null or p.category_id=$4)
      order by p.display_order,p.name,p.product_id limit $1 offset $2`, [PAGE_SIZE, (page-1)*PAGE_SIZE, productId ?? null, categoryId ?? null]);
    await client.query('commit');
    return { data: products.rows.map((row) => row.product), categories: categories.rows, page, pageSize: PAGE_SIZE, totalItems: Number(count.rows[0]?.total ?? 0) };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}

async function lock(client: SqlClient, table: 'products' | 'product_variants', idColumn: 'product_id' | 'product_variant_id', id: string, version: string) {
  const result = await client.query<Record<string, unknown>>(`select *, extract(epoch from updated_at)::text as version from public.${table} where ${idColumn}=$1 for update`, [id]);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'CATALOG_ITEM_NOT_FOUND', 'המוצר או הווריאציה לא נמצאו');
  if (row.version !== version) throw new ApiError(409, 'CATALOG_VERSION_CONFLICT', 'הנתונים השתנו. רעננו לפני שמירה חוזרת');
  return row;
}
