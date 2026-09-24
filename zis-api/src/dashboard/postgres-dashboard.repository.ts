import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderRow, AdminOrdersQuery, DashboardData, DashboardRepository, ProductionSummary } from './dashboard.types.js';

interface CountRow { [key: string]: unknown; status: AdminOrderRow['status']; count: number; }
interface TaskRow { [key: string]: unknown; task_id: string; title: string; priority: string; order_id: string | null; }

export function createPostgresDashboardRepository(factory: SqlClientFactory): DashboardRepository {
  return {
    getDashboard: (date) => getDashboard(factory, date),
    listOrders: (query) => listOrders(factory, query),
    getProduction: (date) => getProduction(factory, date),
  };
}

async function getDashboard(factory: SqlClientFactory, date: string): Promise<DashboardData> {
  const client = await factory();
  try {
    const [counts, total, cancelled, unread, tasks, nextOrders, production] = await Promise.all([
      client.query<CountRow>(`select status, count(*)::int as count from public.orders where delivery_date = $1 and status <> 'cancelled' group by status`, [date]),
      client.query<{ count: number }>(`select count(*)::int as count from public.orders where delivery_date = $1 and status <> 'cancelled'`, [date]),
      client.query<{ count: number }>(`select count(*)::int as count from public.orders where delivery_date = $1 and status = 'cancelled'`, [date]),
      client.query<{ [key: string]: unknown; count: number }>(`select count(*)::int as count from public.admin_notifications where read_at is null`),
      client.query<TaskRow>(`select admin_task_id as task_id, title, priority, order_id from public.admin_tasks where status = 'open' order by case priority when 'critical' then 0 when 'high' then 1 else 2 end, created_at limit 20`),
      listOrdersWithClient(client, { deliveryDate: date, sortBy: 'status', sortDirection: 'asc' }, 5),
      getProductionWithClient(client, date),
    ]);
    return {
      date,
      todayOrderCount: Number(total.rows[0]?.count ?? 0),
      cancelledOrderCount: Number(cancelled.rows[0]?.count ?? 0),
      unreadNotificationCount: Number(unread.rows[0]?.count ?? 0),
      statusCounts: counts.rows,
      openTasks: tasks.rows.map((task) => ({ taskId: task.task_id, title: task.title, priority: task.priority, orderId: task.order_id })),
      nextOrders: nextOrders,
      production: production,
    };
  } finally { client.release?.(); }
}

async function listOrders(factory: SqlClientFactory, query: AdminOrdersQuery): Promise<AdminOrderRow[]> {
  const client = await factory();
  try { return await listOrdersWithClient(client, query); } finally { client.release?.(); }
}

async function listOrdersWithClient(client: SqlClient, query: AdminOrdersQuery, limit?: number): Promise<AdminOrderRow[]> {
  const values: unknown[] = [query.deliveryDate];
  const filters = [`o.delivery_date = $1`];
  if (query.status) { values.push(query.status); filters.push(`o.status = $${values.length}`); }
  if (query.productVariantId) { values.push(query.productVariantId); filters.push(`exists (select 1 from public.order_items filter_item where filter_item.order_id = o.order_id and filter_item.product_variant_id = $${values.length})`); }
  if (query.location) { values.push(`%${query.location}%`); filters.push(`coalesce(o.delivery_address->>'city', '') ilike $${values.length}`); }
  const limitSql = limit ? ` limit ${limit}` : '';
  const result = await client.query<AdminOrderRow & { [key: string]: unknown }>(
    `select o.order_id as "orderId", o.order_number as "orderNumber", o.status, o.total::text,
            coalesce(o.delivery_address->>'city', '') as location, coalesce(o.delivery_address->>'city', '') as city,
            o.delivery_date as "deliveryDate", min(oi.product_variant_id) as "productVariantId",
            string_agg(distinct oi.product_name_snapshot || ' · ' || oi.variant_name_snapshot, ', ' order by (oi.product_name_snapshot || ' · ' || oi.variant_name_snapshot)) as "itemSummary",
            exists (select 1 from public.admin_tasks task where task.order_id = o.order_id and task.status = 'open') as "hasOpenTask",
            extract(epoch from o.updated_at)::text as version
       from public.orders o join public.order_items oi on oi.order_id = o.order_id
      where ${filters.join(' and ')}
      group by o.order_id
      order by ${sortSql(query)}${limitSql}`,
    values,
  );
  return result.rows.map((row) => ({ ...row, allowedNextStatuses: allowedNextStatuses(row.status) }));
}

async function getProduction(factory: SqlClientFactory, date: string): Promise<ProductionSummary[]> {
  const client = await factory();
  try { return await getProductionWithClient(client, date); } finally { client.release?.(); }
}

async function getProductionWithClient(client: SqlClient, date: string): Promise<ProductionSummary[]> {
  const result = await client.query<ProductionSummary & { [key: string]: unknown }>(
    `select oi.product_variant_id as "productVariantId", oi.product_name_snapshot as "productName",
            oi.variant_name_snapshot as "variantName", null::text as "imagePath",
            sum(oi.quantity_sets)::int as "requiredSets", count(distinct o.order_id)::int as "orderCount",
            bool_or(exists (select 1 from public.admin_tasks task where task.order_id = o.order_id and task.status = 'open')) as "hasOpenTask"
       from public.orders o join public.order_items oi on oi.order_id = o.order_id
      where o.delivery_date = $1 and o.payment_status = 'paid' and o.status in ('ordered', 'in_preparation')
      group by oi.product_variant_id, oi.product_name_snapshot, oi.variant_name_snapshot
      order by oi.product_name_snapshot, oi.variant_name_snapshot`, [date]);
  return result.rows;
}

function sortSql(query: AdminOrdersQuery): string {
  const fields = { status: 'o.status', product: 'min(oi.product_name_snapshot)', location: "coalesce(o.delivery_address->>'city', '')", orderNumber: 'o.order_number', total: 'o.total' };
  return `${fields[query.sortBy]} ${query.sortDirection}, o.order_number asc`;
}

function allowedNextStatuses(status: AdminOrderRow['status']): AdminOrderRow['status'][] {
  const next: Partial<Record<AdminOrderRow['status'], AdminOrderRow['status']>> = { ordered: 'in_preparation', in_preparation: 'packed', packed: 'in_transit', in_transit: 'delivered', delivered: 'approved' };
  return next[status] ? [next[status] as AdminOrderRow['status']] : [];
}
