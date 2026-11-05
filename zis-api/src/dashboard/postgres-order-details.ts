import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderDetails } from './dashboard.types.js';
import { allowedNextStatuses } from './order-transitions.js';

export async function readOrderDetails(client: SqlClient, orderId: string): Promise<AdminOrderDetails | null> {
  const orderResult = await client.query<AdminOrderDetails & Record<string, unknown>>(
    `select order_id as "orderId", order_number as "orderNumber", status, payment_status as "paymentStatus",
            to_char(delivery_date, 'YYYY-MM-DD') as "deliveryDate", total::text,
            extract(epoch from updated_at)::text as version,
            customer_name as "customerName", customer_phone as "customerPhone", coalesce(delivery_phone,customer_phone) as "deliveryPhone", is_test as "isTest", customer_email as "customerEmail",
            jsonb_build_object('city', delivery_address->>'city', 'neighborhood', delivery_address->>'neighborhood',
              'street', delivery_address->>'street', 'houseNumber', delivery_address->>'houseNumber',
              'apartment', delivery_address->>'apartment', 'postalCode', delivery_address->>'postalCode') as "deliveryAddress",
            delivery_venue_name as "venueName", dedication_text as "dedicationText", customer_notes as "customerNotes"
       from public.orders where order_id = $1`, [orderId]);
  const order = orderResult.rows[0];
  if (!order) return null;
  const [items, history, tasks] = await Promise.all([
    client.query<AdminOrderDetails['items'][number] & Record<string, unknown>>(
      `select order_item_id as "orderItemId", product_name_snapshot as "productName", variant_name_snapshot as "variantName",
              quantity_sets as "quantitySets", unit_set_price_snapshot::text as "unitSetPrice", line_total::text as "lineTotal"
         from public.order_items where order_id = $1 order by product_name_snapshot, variant_name_snapshot, order_item_id`, [orderId]),
    client.query<AdminOrderDetails['history'][number] & Record<string, unknown>>(
      `select order_status_history_id as "historyId", from_status as "fromStatus", to_status as "toStatus", created_at as "createdAt", note
         from public.order_status_history where order_id = $1 order by created_at, order_status_history_id`, [orderId]),
    client.query<AdminOrderDetails['tasks'][number] & Record<string, unknown>>(
      `select admin_task_id as "taskId", title, description, priority from public.admin_tasks
        where order_id = $1 and status = 'open' order by created_at, admin_task_id`, [orderId]),
  ]);
  return { ...order, items: items.rows, history: history.rows, tasks: tasks.rows, allowedNextStatuses: allowedNextStatuses(order.status, order.paymentStatus) };
}
