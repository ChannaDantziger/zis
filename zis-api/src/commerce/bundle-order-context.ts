import type { BundleOrderInput, CartItemInput } from '../contracts/commerce.contracts.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { BundleForSale, BundleProductForSale } from './bundle-calculation.js';

interface BundleRow extends Record<string, unknown> {
  bundle_id: string; category_id: string; name: string; category_name: string; image_path: string | null; unit_count: number;
}
interface ProductRow extends Record<string, unknown> {
  product_id: string; category_id: string; name: string; image_path: string | null; price_per_item: string; available_items: number;
}

/** Read only published bundles and sellable simple products; the server controls every price and quantity. */
export async function readBundleOrderContext(client: SqlClient, bundles: BundleOrderInput[], items: CartItemInput[]): Promise<{
  bundles: BundleForSale[]; products: BundleProductForSale[];
}> {
  if (!bundles.length) return { bundles: [], products: [] };
  const bundleIds = [...new Set(bundles.map(bundle => bundle.bundleId))];
  const productIds = [...new Set([
    ...bundles.flatMap(bundle => bundle.components.map(component => component.productId)),
    ...items.filter(item => !item.productVariantId).map(item => item.productId),
  ])];
  const bundleRows = await client.query<BundleRow>(`select b.bundle_id,b.category_id,b.name,c.name as category_name,b.unit_count,
      (select i.storage_path from public.catalog_bundle_images i where i.bundle_id=b.bundle_id and i.is_primary and not i.is_deleted order by i.sort_order,i.image_id limit 1) as image_path
    from public.catalog_bundles b join public.categories c on c.category_id=b.category_id
    where b.bundle_id=any($1::uuid[]) and b.status='active' and c.status='active' and not c.is_deleted
      and exists(select 1 from public.catalog_bundle_images i where i.bundle_id=b.bundle_id and i.is_primary and not i.is_deleted)
    for share of b,c`, [bundleIds]);
  const productRows = await client.query<ProductRow>(`select p.product_id,p.category_id,p.name,p.price_per_item::text,p.available_items,
      (select i.storage_path from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted order by i.sort_order,i.product_image_id limit 1) as image_path
    from public.products p join public.categories c on c.category_id=p.category_id
    where p.product_id=any($1::uuid[]) and p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
      and p.price_per_item is not null and p.available_items is not null and p.available_items>=0
      and not exists(select 1 from public.product_variants v where v.product_id=p.product_id and not v.is_deleted)
      and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
    for share of p,c`, [productIds]);
  return {
    bundles: bundleRows.rows.map(row => ({ bundleId: row.bundle_id, categoryId: row.category_id, categoryName: row.category_name, imagePath: row.image_path, name: row.name, unitCount: row.unit_count, active: true })),
    products: productRows.rows.map(row => ({ productId: row.product_id, categoryId: row.category_id, imagePath: row.image_path, name: row.name, pricePerUnit: row.price_per_item, availableItems: row.available_items, active: true })),
  };
}
