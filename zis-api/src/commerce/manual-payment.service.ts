import { randomUUID } from 'node:crypto';
import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { insertAudit } from '../catalog/postgres-admin-catalog.repository.js';
import { aggregateOrderStock, readBundleStockLines } from './order-stock.js';

interface OrderRow { status: string; payment_status: string; total: string; version: string; [key: string]: unknown }
interface Item { product_id: string | null; product_variant_id: string | null; quantity_sets: number; set_size_snapshot: number; [key: string]: unknown }
interface Movement { product_id: string | null; product_variant_id: string | null; quantity: number; [key: string]: unknown }
const MAX_STOCK = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createManualPaymentService(factory: SqlClientFactory) {
  return { change: (orderId: string, version: string, action: 'confirm' | 'revert', note: string, actor: string) =>
    change(factory, orderId, version, action, note, actor) };
}
export type ManualPaymentService = ReturnType<typeof createManualPaymentService>;

async function change(factory: SqlClientFactory, orderId: string, version: string, action: 'confirm' | 'revert', note: string, actor: string) {
  if (!UUID.test(orderId) || !UUID.test(actor) || !/^\d+(?:\.\d+)?$/.test(version)
    || !['confirm', 'revert'].includes(action) || typeof note !== 'string' || !note.trim() || note.length > 1000)
    throw new ApiError(400, 'VALIDATION_ERROR', 'Order, version and payment explanation are required');
  const client = await factory();
  try {
    await client.query('begin');
    const identity = await client.query<{ allowed: boolean }>(`select exists(select 1 from public.admin_users where admin_user_id=$1 and status='active' and role='operations_manager') as allowed`, [actor]);
    if (!identity.rows[0]?.allowed) throw new ApiError(403, 'OPERATIONS_MANAGER_REQUIRED', 'Operations manager access required');
    const result = await client.query<OrderRow>(`select status,payment_status,total::text,extract(epoch from updated_at)::text as version from public.orders where order_id=$1 for update`, [orderId]);
    const order = result.rows[0];
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.version !== version) throw new ApiError(409, 'ORDER_CHANGED', 'Refresh the order before continuing');
    if (order.status !== 'ordered') throw new ApiError(409, 'INVALID_PAYMENT_STATE', 'Return the order to received before changing its payment');
    if (action === 'confirm') await confirm(client, orderId, order, note.trim(), actor);
    else await revert(client, orderId, order, note.trim(), actor);
    const updated = await client.query<{ version: string }>(`update public.orders set payment_status=$2,payment_confirmed_at=case when $2='paid' then now() else null end,updated_at=clock_timestamp() where order_id=$1 returning extract(epoch from updated_at)::text as version`, [orderId, action === 'confirm' ? 'paid' : 'pending']);
    await insertAudit(client, actor, `manual_payment.${action}`, 'orders', orderId, { paymentStatus: order.payment_status }, { paymentStatus: action === 'confirm' ? 'paid' : 'pending', note: note.trim() });
    await client.query('commit');
    return { orderId, paymentStatus: action === 'confirm' ? 'paid' : 'pending', version: updated.rows[0].version };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}

async function confirm(client: SqlClient, orderId: string, order: OrderRow, note: string, actor: string) {
  if (order.payment_status !== 'pending') throw new ApiError(409, 'INVALID_PAYMENT_STATE', 'Payment is not pending');
  const paid = await client.query(`select payment_id from public.payments where order_id=$1 and status='paid' limit 1`, [orderId]);
  if (paid.rows.length) throw new ApiError(409, 'PAYMENT_REVIEW_REQUIRED', 'An existing payment needs review');
  const items = await client.query<Item>(`select product_id,product_variant_id,quantity_sets,set_size_snapshot from public.order_items where order_id=$1 order by product_id,product_variant_id nulls first`, [orderId]);
  const bundleItems = await readBundleStockLines(client, orderId);
  if (!items.rows.length && !bundleItems.length) throw new ApiError(409, 'ORDER_ITEMS_MISSING', 'Order has no items');
  const paymentId = randomUUID();
  for (const item of aggregateOrderStock([...items.rows, ...bundleItems])) {
    await adjustStock(client, item.product_id, item.product_variant_id, item.quantity, false, orderId, paymentId, actor);
  }
  await client.query(`insert into public.payments(payment_id,order_id,provider,amount,status,is_simulated,provider_payload) values($1,$2,'manual_external',$3,'paid',false,$4::jsonb)`, [paymentId, orderId, order.total, JSON.stringify({ method: note, confirmedBy: actor })]);
  await history(client, orderId, actor, `אישור תשלום שהתקבל מחוץ לאתר: ${note}`);
}

async function revert(client: SqlClient, orderId: string, order: OrderRow, note: string, actor: string) {
  if (order.payment_status !== 'paid') throw new ApiError(409, 'INVALID_PAYMENT_STATE', 'Payment is not paid');
  const payment = await client.query<{ payment_id: string }>(`select payment_id from public.payments where order_id=$1 and provider='manual_external' and status='paid' order by created_at desc,payment_id desc limit 1 for update`, [orderId]);
  if (!payment.rows[0]) throw new ApiError(409, 'MANUAL_PAYMENT_REQUIRED', 'Only a manually confirmed payment may be reverted here');
  const paymentId = payment.rows[0].payment_id;
  const other = await client.query(`select payment_id from public.payments where order_id=$1 and status='paid' and payment_id<>$2 limit 1`, [orderId, paymentId]);
  if (other.rows.length) throw new ApiError(409, 'PAYMENT_REVIEW_REQUIRED', 'Another payment needs review');
  const movements = await client.query<Movement>(`select product_id,product_variant_id,(stock_before-stock_after) as quantity from public.inventory_movements where order_id=$1 and movement_type='sale' and reason=$2 order by product_id,product_variant_id nulls first`, [orderId, `manual_payment:${paymentId}`]);
  if (!movements.rows.length) throw new ApiError(409, 'STOCK_HISTORY_MISSING', 'Stock movements require manual review');
  const items = await client.query<Item>(`select product_id,product_variant_id,quantity_sets,set_size_snapshot from public.order_items where order_id=$1 order by product_id,product_variant_id nulls first`, [orderId]);
  const totals = aggregateOrderStock([...items.rows, ...await readBundleStockLines(client, orderId)]);
  if (totals.length !== movements.rows.length || totals.some((item, index) => {
    const movement = movements.rows[index];
    return !movement || item.product_id !== movement.product_id || item.product_variant_id !== movement.product_variant_id
      || movement.quantity !== item.quantity;
  })) throw new ApiError(409, 'STOCK_HISTORY_INVALID', 'Stock movements require manual review');
  for (const movement of movements.rows) {
    if (!movement.product_id || !Number.isSafeInteger(movement.quantity) || movement.quantity < 1) throw new ApiError(409, 'STOCK_HISTORY_INVALID', 'Stock movements require manual review');
    await adjustStock(client, movement.product_id, movement.product_variant_id, movement.quantity, true, orderId, paymentId, actor);
  }
  await client.query(`update public.payments set status='failed',updated_at=clock_timestamp(),provider_payload=coalesce(provider_payload,'{}'::jsonb)||jsonb_build_object('reversalReason',$2::text,'reversedBy',$3::text) where payment_id=$1`, [paymentId, note, actor]);
  await history(client, orderId, actor, `החזרה להמתנה לתשלום; אישור ידני בוטל: ${note}`);
}

async function adjustStock(client: SqlClient, productId: string, variantId: string | null, quantity: number, restore: boolean, orderId: string, paymentId: string, actor: string) {
  const table = variantId ? 'public.product_variants' : 'public.products';
  const column = variantId ? 'available_sets' : 'available_items';
  const id = variantId ? 'product_variant_id' : 'product_id';
  const delta = restore ? quantity : -quantity;
  const result = await client.query<{ after: number }>(`update ${table} set ${column}=${column}+$2 where ${id}=$1 and ${column}::bigint+$2 between 0 and $3 returning ${column} as after`, [variantId ?? productId, delta, MAX_STOCK]);
  if (!result.rows[0]) throw new ApiError(409, 'STOCK_UNAVAILABLE', 'Stock cannot be updated; review the order');
  const after = Number(result.rows[0].after);
  await client.query(`insert into public.inventory_movements(product_id,product_variant_id,order_id,movement_type,stock_before,stock_after,reason,created_by) values($1,$2,$3,$4,$5,$6,$7,$8)`, [productId, variantId, orderId, restore ? 'sale_reversal' : 'sale', after - delta, after, `manual_payment:${paymentId}`, actor]);
}

async function history(client: SqlClient, orderId: string, actor: string, note: string) {
  await client.query(`insert into public.order_status_history(order_id,from_status,to_status,changed_by,note) values($1,'ordered','ordered',$2,$3)`, [orderId, actor, note]);
}
