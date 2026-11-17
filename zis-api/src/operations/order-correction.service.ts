import { ApiError } from '../http/api-error.js';
import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { ORDER_STATUSES, type OrderStatus } from '../domain/order-status.js';

interface OrderRow { status: OrderStatus; payment_status: string; version: string; [key: string]: unknown; }
interface CorrectionInput { orderId: string; targetStatus: OrderStatus; version: string; note: string | null; adminUserId: string; }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createOrderCorrectionService(factory: SqlClientFactory) {
  return { correct: (input: CorrectionInput) => correct(factory, input) };
}
export type OrderCorrectionService = ReturnType<typeof createOrderCorrectionService>;

async function correct(factory: SqlClientFactory, input: CorrectionInput) {
  if (!UUID.test(input.orderId) || !UUID.test(input.adminUserId) || !/^\d+(?:\.\d+)?$/.test(input.version)
    || !(ORDER_STATUSES as readonly string[]).includes(input.targetStatus) || input.targetStatus === 'cancelled'
    || (input.note !== null && (typeof input.note !== 'string' || input.note.length > 5000)))
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid correction input');
  const client = await factory();
  try {
    await client.query('begin');
    const result = await client.query<OrderRow>(`select status, payment_status, extract(epoch from updated_at)::text as version
      from public.orders where order_id = $1 for update`, [input.orderId]);
    const before = result.rows[0];
    if (!before) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (before.version !== input.version) throw new ApiError(409, 'ORDER_CHANGED', 'Order changed; refresh before continuing');
    if (before.status === 'cancelled') throw new ApiError(409, 'CANCELLED_ORDER', 'Cancellation has a separate workflow');
    if (before.status === input.targetStatus) throw new ApiError(409, 'NO_STATUS_CHANGE', 'Order is already in this status');
    if (input.targetStatus !== 'ordered' && before.payment_status !== 'paid') throw new ApiError(409, 'PAYMENT_NOT_CONFIRMED', 'Payment must be confirmed before preparation');
    const updated = await client.query<{ version: string }>(`update public.orders set status = $2, updated_at = clock_timestamp()
      where order_id = $1 returning extract(epoch from updated_at)::text as version`, [input.orderId, input.targetStatus]);
    const note = input.note?.trim() || 'תיקון סטטוס שנבחר בטעות';
    await client.query(`insert into public.order_status_history(order_id, from_status, to_status, changed_by, note)
      values($1, $2, $3, $4, $5)`, [input.orderId, before.status, input.targetStatus, input.adminUserId, note]);
    await client.query(`insert into public.admin_audit_log(admin_user_id, action, entity_type, entity_id, before_data, after_data)
      values($1, 'correct_order_status', 'order', $2, $3::jsonb, $4::jsonb)`,
      [input.adminUserId, input.orderId, JSON.stringify({ status: before.status, version: before.version }),
        JSON.stringify({ status: input.targetStatus, version: updated.rows[0]?.version, note })]);
    await client.query('commit');
    return { orderId: input.orderId, status: input.targetStatus, version: updated.rows[0]?.version };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}
