import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { HomeOrder, HomeOrderRepository } from './home.types.js';

interface HomeRow {
  orderId: string; orderNumber: string; status: HomeOrder['status']; paymentStatus: string; isTest: boolean;
  deliveryDate: string; city: string; address: string; zoneName: string | null; version: string; packageCount: number | null;
  orderItemId: string | null; productName: string | null; variantName: string | null;
  quantitySets: number | null; categoryName: string | null; productId: string | null;
  productVariantId: string | null; imagePath: string | null;
  [key: string]: unknown;
}

export function createPostgresHomeRepository(factory: SqlClientFactory): HomeOrderRepository {
  return { list: (from, to) => listHomeOrders(factory, from, to) };
}

async function listHomeOrders(factory: SqlClientFactory, from: string, to: string): Promise<HomeOrder[]> {
  const client = await factory();
  try {
    const result = await client.query<HomeRow>(`
      select o.order_id as "orderId", o.order_number as "orderNumber", o.status,
             o.payment_status as "paymentStatus", o.is_test as "isTest", to_char(o.delivery_date, 'YYYY-MM-DD') as "deliveryDate",
             coalesce(o.delivery_address->>'city', '') as city,
             concat_ws(' ', o.delivery_address->>'street', o.delivery_address->>'houseNumber') as address,
             z.name as "zoneName", o.package_count as "packageCount", extract(epoch from o.updated_at)::text as version,
             oi.order_item_id as "orderItemId",
             oi.product_name_snapshot as "productName", oi.variant_name_snapshot as "variantName",
             oi.quantity_sets as "quantitySets", coalesce(c.name, 'ללא קטגוריה') as "categoryName",
             oi.product_id as "productId", oi.product_variant_id as "productVariantId",
             image.storage_path as "imagePath"
        from public.orders o
        left join public.shipping_zones z on z.shipping_zone_id = o.shipping_zone_id
        left join public.order_items oi on oi.order_id = o.order_id
        left join public.products p on p.product_id = oi.product_id
        left join public.categories c on c.category_id = p.category_id
        left join lateral (
          select i.storage_path from public.product_images i
           where i.product_id = oi.product_id and not i.is_deleted
             and (i.product_variant_id = oi.product_variant_id or i.product_variant_id is null)
           order by case when i.product_variant_id = oi.product_variant_id then 0 else 1 end,
                    case when i.image_type = 'primary' then 0 else 1 end, i.sort_order, i.product_image_id
           limit 1
        ) image on true
       where o.delivery_date between $1 and $2
       order by o.delivery_date, o.order_number, oi.order_item_id`, [from, to]);
    const orders = new Map<string, HomeOrder>();
    for (const row of result.rows) {
      let order = orders.get(row.orderId);
      if (!order) {
        order = { orderId: row.orderId, orderNumber: row.orderNumber, status: row.status,
          paymentStatus: row.paymentStatus, isTest: row.isTest, deliveryDate: row.deliveryDate, city: row.city,
          address: row.address, zoneName: row.zoneName, version: row.version, packageCount: row.packageCount, items: [] };
        orders.set(row.orderId, order);
      }
      if (row.orderItemId) order.items.push({ orderItemId: row.orderItemId, productName: row.productName ?? '',
        variantName: row.variantName ?? '', quantitySets: Number(row.quantitySets ?? 0),
        categoryName: row.categoryName ?? 'ללא קטגוריה', productId: row.productId,
        productVariantId: row.productVariantId, imagePath: row.imagePath, imageUrl: null });
    }
    return [...orders.values()];
  } finally { client.release?.(); }
}
