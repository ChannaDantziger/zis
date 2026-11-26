import { ApiError } from '../http/api-error.js';
import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';

export interface PreviewImageRecord { imageId: string; storagePath: string; altText: string; isPrimary: boolean; sortOrder: number }
export interface PreviewBundleRecord {
  bundleId: string; categoryId: string; categoryName: string; categorySlug: string;
  name: string; description: string | null; unitCount: number; images: PreviewImageRecord[];
}
export interface PreviewProductRecord {
  productId: string; categoryId: string; name: string; pricePerUnit: string;
  availableItems: number; image: { storagePath: string; altText: string } | null;
}
export interface BundlePreviewRecords { bundles: PreviewBundleRecord[]; products: PreviewProductRecord[] }
export interface BundlePreviewRepository { list(categoryId?: string): Promise<BundlePreviewRecords> }

const MAX_BUNDLES = 1000;
const MAX_PRODUCTS = 5000;

export function createBundlePreviewRepository(factory: SqlClientFactory): BundlePreviewRepository {
  return { async list(categoryId) {
    const client = await factory();
    try {
      await client.query('begin isolation level repeatable read read only');
      const bundles = await client.query<{ bundle: PreviewBundleRecord }>(`select jsonb_build_object(
        'bundleId',b.bundle_id,'categoryId',b.category_id,'categoryName',c.name,'categorySlug',c.slug,
        'name',b.name,'description',b.description,'unitCount',b.unit_count,
        'images',coalesce((select jsonb_agg(jsonb_build_object(
          'imageId',i.image_id,'storagePath',i.storage_path,'altText',i.alt_text,
          'isPrimary',i.is_primary,'sortOrder',i.sort_order)
          order by i.is_primary desc,i.sort_order,i.image_id)
          from public.catalog_bundle_images i where i.bundle_id=b.bundle_id and not i.is_deleted),'[]'::jsonb))
        as bundle
        from public.catalog_bundles b join public.categories c on c.category_id=b.category_id
        where b.status='active' and c.status='active' and not c.is_deleted
          and ($1::uuid is null or b.category_id=$1)
          and exists(select 1 from public.catalog_bundle_images i where i.bundle_id=b.bundle_id and i.is_primary and not i.is_deleted)
        order by c.sort_order,c.name,b.name,b.bundle_id limit $2`, [categoryId ?? null, MAX_BUNDLES + 1]);
      if (bundles.rows.length > MAX_BUNDLES) throw new ApiError(503, 'BUNDLE_PREVIEW_TOO_LARGE', 'יש לצמצם את התצוגה לקטגוריה אחת');
      const categoryIds = [...new Set(bundles.rows.map(row => row.bundle.categoryId))];
      const products = categoryIds.length ? await client.query<{ product: PreviewProductRecord }>(`select jsonb_build_object(
        'productId',p.product_id,'categoryId',p.category_id,'name',p.name,
        'pricePerUnit',p.price_per_item::text,'availableItems',p.available_items,
        'image',jsonb_build_object('storagePath',i.storage_path,'altText',i.alt_text)) as product
        from public.products p
        join lateral (select storage_path,alt_text from public.product_images i
          where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted
          order by i.sort_order,i.product_image_id limit 1) i on true
        where p.category_id=any($1::uuid[]) and p.status='active' and not p.is_deleted
          and p.price_per_item is not null and p.available_items is not null and p.available_items >= 0
          and not exists(select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
        order by p.category_id,p.display_order,p.name,p.product_id limit $2`, [categoryIds, MAX_PRODUCTS + 1]) : { rows: [] };
      if (products.rows.length > MAX_PRODUCTS) throw new ApiError(503, 'BUNDLE_PREVIEW_TOO_LARGE', 'יש לצמצם את התצוגה לקטגוריה אחת');
      await client.query('commit');
      return { bundles: bundles.rows.map(row => row.bundle), products: products.rows.map(row => row.product) };
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release?.(); }
  } };
}
