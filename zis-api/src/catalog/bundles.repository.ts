import { ApiError } from '../http/api-error.js';
import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { insertAudit, withTransaction } from './postgres-admin-catalog.repository.js';

export interface BundleInput { categoryId: string; name: string; description: string | null; unitCount: number; status: 'draft' | 'hidden' | 'active'; version?: string }
export type BundlesRepository = ReturnType<typeof createBundlesRepository>;
export function createBundlesRepository(factory: SqlClientFactory) {
  return {
    async list(categoryId: string) {
      const client = await factory();
      try {
        const result = await client.query<{ bundle: Record<string, unknown> }>(`select jsonb_build_object(
          'bundleId',b.bundle_id,'categoryId',b.category_id,'name',b.name,'description',b.description,
          'unitCount',b.unit_count,'status',b.status,'version',extract(epoch from b.updated_at)::text,
          'categoryActive', exists(select 1 from public.categories c where c.category_id=b.category_id and c.status='active' and not c.is_deleted),
          'images',coalesce((select jsonb_agg(jsonb_build_object(
            'imageId',i.image_id,'storagePath',i.storage_path,'altText',i.alt_text,
            'sortOrder',i.sort_order,'isPrimary',i.is_primary,'isDeleted',i.is_deleted,'version',extract(epoch from i.updated_at)::text)
            order by i.sort_order,i.created_at,i.image_id)
            from public.catalog_bundle_images i where i.bundle_id=b.bundle_id),'[]'::jsonb))
          as bundle from public.catalog_bundles b where b.category_id=$1 order by b.created_at,b.bundle_id`, [categoryId]);
        return result.rows.map(row => row.bundle);
      } finally { client.release?.(); }
    },
    async save(id: string | undefined, input: BundleInput, actor: string) {
      return withTransaction(factory, async client => {
        const category = await client.query<{ status: string }>('select category_id,status from public.categories where category_id=$1 and not is_deleted for share', [input.categoryId]);
        if (!category.rows[0]) throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'הקטגוריה לא נמצאה');
        if (!id) {
          if (input.status !== 'draft') throw new ApiError(422, 'BUNDLE_DRAFT_REQUIRED', 'יש ליצור מארז כטיוטה ולהוסיף תמונה לפני הפרסום');
          const created = await client.query<{ bundle_id: string }>(`insert into public.catalog_bundles(category_id,name,description,unit_count,status)
            values($1,$2,$3,$4,'draft') returning bundle_id`, [input.categoryId,input.name,input.description,input.unitCount]);
          const bundleId = created.rows[0]!.bundle_id;
          await insertAudit(client, actor, 'bundle.created', 'catalog_bundles', bundleId, null, input);
          return { bundleId };
        }
        const before = await client.query<Record<string, unknown>>('select *,extract(epoch from updated_at)::text as version from public.catalog_bundles where bundle_id=$1 for update', [id]);
        if (!before.rows[0]) throw new ApiError(404, 'BUNDLE_NOT_FOUND', 'המארז לא נמצא');
        if (before.rows[0].version !== input.version) throw new ApiError(409, 'CATALOG_VERSION_CONFLICT', 'המארז השתנה. יש לרענן ולנסות שוב');
        if (before.rows[0].category_id !== input.categoryId) throw new ApiError(409, 'CATEGORY_CHANGE_NOT_ALLOWED', 'לא ניתן להעביר מארז לקטגוריה אחרת');
        if (input.status === 'active') {
          if (category.rows[0].status !== 'active') throw new ApiError(422, 'BUNDLE_CATEGORY_INACTIVE', 'לא ניתן לפרסם מארז בקטגוריה מוסתרת');
          const primary = await client.query('select image_id from public.catalog_bundle_images where bundle_id=$1 and is_primary and not is_deleted for share', [id]);
          if (!primary.rows[0]) throw new ApiError(422, 'BUNDLE_IMAGE_REQUIRED', 'יש להוסיף תמונה ראשית לפני פרסום המארז');
        }
        await client.query('update public.catalog_bundles set category_id=$2,name=$3,description=$4,unit_count=$5,status=$6 where bundle_id=$1', [id,input.categoryId,input.name,input.description,input.unitCount,input.status]);
        await insertAudit(client, actor, 'bundle.updated', 'catalog_bundles', id, before.rows[0], input);
        return { bundleId: id };
      });
    },
    async addImage(bundleId: string, storagePath: string, altText: string, actor: string) {
      return withTransaction(factory, async client => {
        const bundle = await client.query('select bundle_id from public.catalog_bundles where bundle_id=$1 for update', [bundleId]);
        if (!bundle.rows[0]) throw new ApiError(404, 'BUNDLE_NOT_FOUND', 'המארז לא נמצא');
        const existingBundleImage = await client.query<{ image_id: string; bundle_id: string; is_deleted: boolean }>('select image_id,bundle_id,is_deleted from public.catalog_bundle_images where storage_path=$1', [storagePath]);
        if (existingBundleImage.rows[0]) {
          const image = existingBundleImage.rows[0];
          if (image.bundle_id === bundleId && !image.is_deleted) return { imageId: image.image_id };
          throw new ApiError(409, 'MEDIA_SHARED', 'התמונה כבר משויכת למארז');
        }
        const existing = await client.query('select product_image_id from public.product_images where storage_path=$1 and not is_deleted limit 1', [storagePath]);
        if (existing.rows[0]) throw new ApiError(409, 'MEDIA_SHARED', 'התמונה כבר משויכת למוצר');
        const image = await client.query<{ image_id: string }>(`insert into public.catalog_bundle_images(bundle_id,storage_path,alt_text,sort_order,is_primary)
          values($1,$2,$3,coalesce((select max(sort_order)+10 from public.catalog_bundle_images where bundle_id=$1 and not is_deleted),0),
            not exists(select 1 from public.catalog_bundle_images where bundle_id=$1 and not is_deleted and is_primary)) returning image_id`, [bundleId,storagePath,altText]);
        const imageId = image.rows[0]!.image_id;
        await insertAudit(client, actor, 'bundle_image.created', 'catalog_bundle_images', imageId, null, { bundleId, storagePath });
        return { imageId };
      });
    },
    async updateImage(id: string, version: string, altText: string, sortOrder: number, actor: string) {
      return withTransaction(factory, async client => {
        const before = await client.query<Record<string, unknown>>('select *,extract(epoch from updated_at)::text as version from public.catalog_bundle_images where image_id=$1 and not is_deleted for update', [id]);
        if (!before.rows[0]) throw new ApiError(404, 'IMAGE_NOT_FOUND', 'התמונה לא נמצאה');
        if (before.rows[0].version !== version) throw new ApiError(409, 'CATALOG_VERSION_CONFLICT', 'התמונה השתנתה. יש לרענן');
        await client.query('update public.catalog_bundle_images set alt_text=$2,sort_order=$3 where image_id=$1', [id,altText,sortOrder]);
        await insertAudit(client, actor, 'bundle_image.updated', 'catalog_bundle_images', id, before.rows[0], { altText, sortOrder });
      });
    },
    async markImageDeleted(id: string, actor: string) {
      return withTransaction(factory, async client => {
        const result = await client.query<{ storage_path: string; bundle_id: string; is_deleted: boolean }>('select storage_path,bundle_id,is_deleted from public.catalog_bundle_images where image_id=$1 for update', [id]);
        const row = result.rows[0];
        if (!row) throw new ApiError(404, 'IMAGE_NOT_FOUND', 'התמונה לא נמצאה');
        const refs = await client.query<{ count: string }>('select count(*)::text as count from public.product_images where storage_path=$1 and not is_deleted', [row.storage_path]);
        if (Number(refs.rows[0]?.count) > 0) throw new ApiError(409, 'MEDIA_SHARED', 'התמונה משותפת ולא ניתן למחוק אותה');
        await client.query('update public.catalog_bundle_images set is_deleted=true where image_id=$1', [id]);
        await client.query(`update public.catalog_bundle_images set is_primary=true where image_id=(
          select image_id from public.catalog_bundle_images where bundle_id=$1 and not is_deleted
          and not exists(select 1 from public.catalog_bundle_images where bundle_id=$1 and not is_deleted and is_primary)
          order by sort_order,created_at,image_id limit 1)`, [row.bundle_id]);
        await insertAudit(client, actor, 'bundle_image.delete_requested', 'catalog_bundle_images', id, row, null);
        return row.storage_path;
      });
    },
    async finishImageDelete(id: string, actor: string) {
      return withTransaction(factory, async client => {
        const row = await client.query('delete from public.catalog_bundle_images where image_id=$1 and is_deleted returning storage_path', [id]);
        if (!row.rows[0]) throw new ApiError(404, 'IMAGE_NOT_FOUND', 'התמונה לא נמצאה');
        await insertAudit(client, actor, 'bundle_image.deleted', 'catalog_bundle_images', id, row.rows[0], null);
      });
    },
  };
}
