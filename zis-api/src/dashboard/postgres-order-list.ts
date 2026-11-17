import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderRow, AdminOrdersQuery } from './dashboard.types.js';
import { allowedNextStatuses } from './order-transitions.js';

export async function listOrdersWithClient(client: SqlClient, query: AdminOrdersQuery, limit?: number, offset = 0): Promise<AdminOrderRow[]> {
  const { values, filters } = orderFilters(query);
  const limitSql = limit ? ` limit $${values.push(limit)} offset $${values.push(offset)}` : '';
  const result = await client.query<AdminOrderRow & { [key: string]: unknown }>(
    `select o.order_id as "orderId", o.order_number as "orderNumber", o.status, o.payment_status as "paymentStatus", o.is_test as "isTest", o.total::text,
            coalesce(o.delivery_address->>'city', '') as location, coalesce(o.delivery_address->>'city', '') as city,
            to_char(o.delivery_date, 'YYYY-MM-DD') as "deliveryDate", min(oi.product_variant_id::text) as "productVariantId",
            string_agg(distinct oi.product_name_snapshot, ', ' order by oi.product_name_snapshot) as "itemSummary",
            exists (select 1 from public.admin_tasks task where task.order_id = o.order_id and task.status = 'open') as "hasOpenTask",
            extract(epoch from o.updated_at)::text as version
       from public.orders o join public.order_items oi on oi.order_id = o.order_id
      where ${filters.join(' and ')}
      group by o.order_id
      order by ${sortSql(query)}${limitSql}`,
    values,
  );
  return result.rows.map((row) => ({ ...row, allowedNextStatuses: allowedNextStatuses(row.status, row.paymentStatus) }));
}


function sortSql(query: AdminOrdersQuery): string {
  const fields = { status: "case o.status when 'ordered' then 0 when 'in_preparation' then 1 when 'packed' then 2 when 'in_transit' then 3 when 'delivered' then 4 when 'approved' then 5 else 6 end", product: 'min(oi.product_name_snapshot)', location: "coalesce(o.delivery_address->>'city', '')", orderNumber: 'o.order_number', total: 'o.total' };
  return `${fields[query.sortBy]} ${query.sortDirection}, o.order_number asc, o.order_id asc`;
}

export function orderFilters(query: AdminOrdersQuery) {
  const values: unknown[] = [query.deliveryDate];
  const filters = [`o.delivery_date = $1`];
  if (query.status) { values.push(query.status); filters.push(`o.status = $${values.length}`); }
  if (query.productVariantId) { values.push(query.productVariantId); filters.push(`exists (select 1 from public.order_items filter_item where filter_item.order_id = o.order_id and filter_item.product_variant_id = $${values.length})`); }
  if (query.location) { values.push(`%${query.location}%`); filters.push(`coalesce(o.delivery_address->>'city', '') ilike $${values.length}`); }
  return { values, filters };
}
