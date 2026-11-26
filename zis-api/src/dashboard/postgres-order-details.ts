import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { AdminOrderDetails } from './dashboard.types.js';
import { allowedNextStatuses } from './order-transitions.js';
import { readOrderBundles } from '../commerce/bundle-order-repository.js';

export async function readOrderDetails(client: SqlClient, orderId: string): Promise<AdminOrderDetails | null> {
  const orderResult = await client.query<AdminOrderDetails & Record<string, unknown>>(
    `select order_id as "orderId", order_number as "orderNumber", status, payment_status as "paymentStatus",
            to_char(o.delivery_date, 'YYYY-MM-DD') as "deliveryDate", o.total::text,
            extract(epoch from o.updated_at)::text as version,
            o.customer_name as "customerName", o.customer_phone as "customerPhone", coalesce(o.delivery_phone,o.customer_phone) as "deliveryPhone", o.is_test as "isTest", o.customer_email as "customerEmail",
            jsonb_build_object('city', o.delivery_address->>'city', 'neighborhood', o.delivery_address->>'neighborhood',
              'street', o.delivery_address->>'street', 'houseNumber', o.delivery_address->>'houseNumber',
              'apartment', o.delivery_address->>'apartment', 'postalCode', o.delivery_address->>'postalCode') as "deliveryAddress",
            o.delivery_venue_name as "venueName", o.dedication_text as "dedicationText", o.customer_notes as "customerNotes",
            o.subtotal::text, o.shipping_total::text as "shippingTotal", o.discount_total::text as "discountTotal",
            o.tax_total::text as "taxTotal", o.tax_rate::text as "taxRate", o.package_count as "packageCount",
            o.courier_notes as "courierNotes", o.internal_notes as "internalNotes", o.is_urgent as "isUrgent",
            o.delivery_time_window as "deliveryTimeWindow", o.shipping_method_snapshot as "shippingMethod",
            o.payment_confirmed_at as "paymentConfirmedAt",
            z.name as "shippingZoneName", o.created_at as "createdAt", o.updated_at as "updatedAt"
       from public.orders o left join public.shipping_zones z on z.shipping_zone_id = o.shipping_zone_id
      where o.order_id = $1`, [orderId]);
  const order = orderResult.rows[0];
  if (!order) return null;
  const [items, history, tasks, payments, bundles] = await Promise.all([
    client.query<AdminOrderDetails['items'][number] & Record<string, unknown>>(
      `select order_item_id as "orderItemId", product_name_snapshot as "productName", variant_name_snapshot as "variantName",
              quantity_sets as "quantitySets", unit_set_price_snapshot::text as "unitSetPrice", line_total::text as "lineTotal",
              product_code_snapshot as "productCode", set_size_snapshot as "setSize"
         from public.order_items where order_id = $1 order by product_name_snapshot, variant_name_snapshot, order_item_id`, [orderId]),
    client.query<AdminOrderDetails['history'][number] & Record<string, unknown>>(
      `select order_status_history_id as "historyId", from_status as "fromStatus", to_status as "toStatus", created_at as "createdAt", note
         from public.order_status_history where order_id = $1 order by created_at, order_status_history_id`, [orderId]),
    client.query<AdminOrderDetails['tasks'][number] & Record<string, unknown>>(
      `select admin_task_id as "taskId", title, description, priority from public.admin_tasks
        where order_id = $1 and status = 'open' order by created_at, admin_task_id`, [orderId]),
    client.query<NonNullable<AdminOrderDetails['payments']>[number] & Record<string, unknown>>(
      `select provider, provider_transaction_id as "providerTransactionId", amount::text, currency,
              status, is_simulated as "isSimulated", created_at as "createdAt",
              case when provider='manual_external' then provider_payload->>'method' end as "manualMethod"
         from public.payments where order_id = $1 order by created_at, payment_id`, [orderId]),
    readOrderBundles(client, orderId),
  ]);
  return { ...order, items: items.rows, bundles, history: history.rows, tasks: tasks.rows, payments: payments.rows,
    allowedNextStatuses: allowedNextStatuses(order.status, order.paymentStatus) };
}
