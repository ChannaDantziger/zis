import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderRow, AdminOrdersQuery, DashboardData, DashboardRepository, ProductionSummary } from './dashboard.types.js';
import { readOrderDetails } from './postgres-order-details.js';
import { listOrdersWithClient } from './postgres-order-list.js';
import { readOrderPage } from './postgres-order-page.js';

interface CountRow { [key: string]: unknown; status: AdminOrderRow['status']; count: number; }
interface TaskRow { [key: string]: unknown; task_id: string; title: string; priority: string; order_id: string | null; }

export function createPostgresDashboardRepository(factory: SqlClientFactory): DashboardRepository {
  return {
    getOrder: async (orderId) => {
      const client = await factory();
      try { return await readOrderDetails(client, orderId); } finally { client.release?.(); }
    },
    getDashboard: (date, adminUserId) => getDashboard(factory, date, adminUserId),
    listOrders: (query) => listOrders(factory, query),
    listOrderPage: (query) => readOrderPage(factory, query),
    getProduction: (date) => getProduction(factory, date),
  };
}

async function getDashboard(factory: SqlClientFactory, date: string, adminUserId?: string): Promise<DashboardData> {
  const client = await factory();
  try {
    const [counts, total, cancelled, unread, tasks, taskCount, nextOrders, production] = await Promise.all([
      client.query<CountRow>(`select status, count(*)::int as count from public.orders where delivery_date = $1 and status <> 'cancelled' group by status`, [date]),
      client.query<{ count: number }>(`select count(*)::int as count from public.orders where delivery_date = $1 and status <> 'cancelled'`, [date]),
      client.query<{ count: number }>(`select count(*)::int as count from public.orders where delivery_date = $1 and status = 'cancelled'`, [date]),
      client.query<{ [key: string]: unknown; count: number }>(`select count(*)::int as count from public.admin_notifications where read_at is null and admin_user_id = $1`, [adminUserId ?? null]),
      client.query<TaskRow>(`select admin_task_id as task_id, title, priority, order_id from public.admin_tasks where status = 'open' order by case priority when 'critical' then 0 when 'high' then 1 else 2 end, created_at limit 20`),
      client.query<{ count: number }>(`select count(*)::int as count from public.admin_tasks where status = 'open'`),
      listOrdersWithClient(client, { deliveryDate: date, sortBy: 'status', sortDirection: 'asc' }, 5),
      getProductionWithClient(client, date),
    ]);
    return {
      date,
      todayOrderCount: Number(total.rows[0]?.count ?? 0),
      cancelledOrderCount: Number(cancelled.rows[0]?.count ?? 0),
      unreadNotificationCount: Number(unread.rows[0]?.count ?? 0),
      openTaskCount: Number(taskCount.rows[0]?.count ?? 0),
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
