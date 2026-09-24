import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { OrderStatus } from '../domain/order-status.js';
import type { BulkStatusRequest, BulkStatusResultItem, OrderStatusRepository } from './order-status.types.js';

interface CurrentOrder { [key: string]: unknown; order_number: string; status: OrderStatus; payment_status: string; version: string; }

export function createPostgresOrderStatusRepository(factory: SqlClientFactory): OrderStatusRepository {
  return { applyBulkStatus: (request) => applyBulkStatus(factory, request) };
}

async function applyBulkStatus(factory: SqlClientFactory, request: BulkStatusRequest): Promise<BulkStatusResultItem[]> {
  const client = await factory();
  const results: BulkStatusResultItem[] = [];
  try {
    await client.query('begin');
    for (const item of request.items) results.push(await applyOne(client, item.orderId, item.version, request.targetStatus, request.adminUserId, request.adminRole));
    await client.query('commit');
    return results;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release?.(); }
}

async function applyOne(client: SqlClient, orderId: string, version: string, targetStatus: OrderStatus, adminUserId: string, adminRole?: BulkStatusRequest['adminRole']): Promise<BulkStatusResultItem> {
  const current = await client.query<CurrentOrder>(`select order_number, status, payment_status, extract(epoch from updated_at)::text as version from public.orders where order_id = $1 for update`, [orderId]);
  const order = current.rows[0];
  if (!order) return { orderId, ok: false, reason: 'ORDER_NOT_FOUND' };
  if (order.version !== version) return { orderId, ok: false, orderNumber: order.order_number, fromStatus: order.status, reason: 'ORDER_CHANGED' };
  const reason = transitionError(order.status, order.payment_status, targetStatus, adminRole);
  if (reason) return { orderId, ok: false, orderNumber: order.order_number, fromStatus: order.status, reason };
  await client.query(`update public.orders set status = $1, updated_at = now() where order_id = $2`, [targetStatus, orderId]);
  await client.query(`insert into public.order_status_history (order_id, from_status, to_status, changed_by) values ($1, $2, $3, $4)`, [orderId, order.status, targetStatus, adminUserId]);
  return { orderId, ok: true, orderNumber: order.order_number, fromStatus: order.status, toStatus: targetStatus };
}

function transitionError(current: OrderStatus, paymentStatus: string, target: OrderStatus, role?: BulkStatusRequest['adminRole']): string | undefined {
  if (role === 'delivery_driver' && !(current === 'in_transit' && target === 'delivered')) return 'ROLE_NOT_ALLOWED';
  if (current === 'ordered' && target === 'in_preparation' && paymentStatus !== 'paid') return 'PAYMENT_NOT_CONFIRMED';
  const next: Partial<Record<OrderStatus, OrderStatus>> = { ordered: 'in_preparation', in_preparation: 'packed', packed: 'in_transit', in_transit: 'delivered', delivered: 'approved' };
  return next[current] === target ? undefined : 'INVALID_TRANSITION';
}
