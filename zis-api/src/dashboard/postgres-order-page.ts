import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderPage, AdminOrderPageQuery } from './dashboard.types.js';
import { listOrdersWithClient, orderFilters } from './postgres-order-list.js';

export async function readOrderPage(factory: SqlClientFactory, query: AdminOrderPageQuery): Promise<AdminOrderPage> {
  const client = await factory();
  try {
    await client.query('begin isolation level repeatable read read only');
    const { values, filters } = orderFilters(query);
    const count = await client.query<{ count: number }>(`select count(*)::int as count from public.orders o
      where ${filters.join(' and ')} and exists (select 1 from public.order_items item where item.order_id = o.order_id)`, values);
    const data = await listOrdersWithClient(client, query, query.pageSize, (query.page - 1) * query.pageSize);
    const variants = await client.query<{ value: string; label: string }>(`select oi.product_variant_id::text as value,
      min(oi.product_name_snapshot || ' · ' || oi.variant_name_snapshot) as label
      from public.order_items oi join public.orders o on o.order_id = oi.order_id
      where o.delivery_date = $1 and oi.product_variant_id is not null
      group by oi.product_variant_id order by label, value`, [query.deliveryDate]);
    const totalItems = Number(count.rows[0]?.count ?? 0);
    await client.query('commit');
    return { data, variants: variants.rows, page: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}
