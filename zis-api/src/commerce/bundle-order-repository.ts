import type { BundleOrderInput, CartItemInput, OrderBundleSnapshot } from '../contracts/commerce.contracts.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import { calculateBundleOrder } from './bundle-calculation.js';
import { readBundleOrderContext } from './bundle-order-context.js';

/** Write priced parent rows and uncharged component snapshots inside the order transaction. */
export async function saveOrderBundles(client: SqlClient, orderId: string, bundles: BundleOrderInput[], items: CartItemInput[], snapshots: OrderBundleSnapshot[] = []): Promise<void> {
  if (!bundles.length) return;
  const context = await readBundleOrderContext(client, bundles, items);
  const calculation = calculateBundleOrder(bundles, context.bundles, context.products, [], snapshots);
  for (const [index, line] of calculation.bundles.entries()) {
    const row = await client.query<{ order_bundle_id: string }>(`insert into public.order_bundles
      (order_id,bundle_id,category_id,bundle_name_snapshot,category_name_snapshot,image_path_snapshot,unit_count_snapshot,quantity,unit_price_snapshot,line_total,order_bundle_id)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9::numeric,$10::numeric,coalesce($11::uuid,gen_random_uuid())) returning order_bundle_id`,
    [orderId, line.bundle.bundleId, line.bundle.categoryId, line.bundle.name, line.bundle.categoryName ?? '', line.bundle.imagePath ?? null,
      line.bundle.unitCount, line.quantity, money(line.unitPriceAgorot), money(line.unitPriceAgorot * line.quantity), bundles[index].orderBundleId ?? null]);
    const orderBundleId = row.rows[0]?.order_bundle_id;
    if (!orderBundleId) throw new Error('Bundle snapshot could not be saved');
    for (const component of line.components) {
      await client.query(`insert into public.order_bundle_components
        (order_bundle_id,product_id,product_name_snapshot,image_path_snapshot,quantity_per_bundle,unit_price_snapshot)
        values($1,$2,$3,$4,$5,$6::numeric)`,
      [orderBundleId, component.product.productId, component.product.name, component.product.imagePath ?? null,
        component.quantity, money(component.unitPriceAgorot)]);
    }
  }
}

function money(agorot: number): string { return (agorot / 100).toFixed(2); }

export async function readOrderBundles(client: SqlClient, orderId: string): Promise<OrderBundleSnapshot[]> {
  const schema = await client.query<{ present: boolean }>(`select to_regclass('public.order_bundles') is not null as present`);
  if (!schema.rows[0]?.present) return [];
  const result = await client.query<{ bundle: OrderBundleSnapshot }>(`select jsonb_build_object(
      'orderBundleId',b.order_bundle_id,'bundleId',b.bundle_id,'categoryId',b.category_id,
      'bundleName',b.bundle_name_snapshot,'categoryName',b.category_name_snapshot,'imagePath',b.image_path_snapshot,
      'unitCount',b.unit_count_snapshot,'quantity',b.quantity,'unitPrice',b.unit_price_snapshot::text,'lineTotal',b.line_total::text,
      'components',coalesce((select jsonb_agg(jsonb_build_object('productId',c.product_id,'productName',c.product_name_snapshot,'imagePath',c.image_path_snapshot,
        'quantity',c.quantity_per_bundle,'unitPrice',c.unit_price_snapshot::text) order by c.product_id)
        from public.order_bundle_components c where c.order_bundle_id=b.order_bundle_id),'[]'::jsonb)) as bundle
    from public.order_bundles b where b.order_id=$1 order by b.created_at,b.order_bundle_id`, [orderId]);
  return result.rows.map(row => row.bundle);
}
