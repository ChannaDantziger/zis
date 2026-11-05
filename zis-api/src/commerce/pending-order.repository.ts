import type { CreateOrderInput, DeliveryAddress, QuotePreview } from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';
import type { OrderSnapshot, PendingOrder } from './order.types.js';

interface PendingRow extends Record<string, unknown> {
  order_id: string; order_number: string; status: string; payment_status: string; is_test: boolean;
  version: string; total: string; delivery_date: string; shipping_zone_id: string; delivery_address: DeliveryAddress;
  customer_name: string; customer_phone: string; delivery_phone: string; customer_email: string;
  dedication_text: string | null; customer_notes: string | null;
}
interface ItemRow extends Record<string, unknown> {
  product_id: string; product_variant_id: string | null; quantity_sets: number; price_per_set: string;
  product_name: string; variant_name: string; product_code: string; set_size: number;
}

export async function readPendingOrder(client: SqlClient, tokenHash: string, now: Date): Promise<PendingOrder> {
  const result = await client.query<PendingRow>(`select o.order_id,o.order_number,o.status,o.payment_status,o.is_test,
      extract(epoch from o.updated_at)::text as version,o.total::text,to_char(o.delivery_date,'YYYY-MM-DD') as delivery_date,
      o.shipping_zone_id,o.delivery_address,o.customer_name,o.customer_phone,o.delivery_phone,o.customer_email,o.dedication_text,o.customer_notes
    from public.order_confirmation_tokens t join public.orders o on o.order_id=t.order_id
    where t.token_hash=$1 and t.revoked_at is null and t.expires_at>$2 for update of o,t`, [tokenHash, now]);
  const row = result.rows[0];
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Pending order is unavailable');
  if (row.status !== 'ordered' || row.payment_status !== 'pending') throw new ApiError(409, 'ORDER_NOT_EDITABLE', 'Only unpaid pending orders can be edited');
  const payments = await client.query(`select payment_id from public.payments where order_id=$1 and status in ('pending','authorized','paid')`, [row.order_id]);
  if (payments.rows.length) throw new ApiError(409, 'ORDER_NOT_EDITABLE', 'Payment has already started');
  const items = await client.query<ItemRow>(`select product_id,product_variant_id,quantity_sets,unit_set_price_snapshot::text as price_per_set,
      product_name_snapshot as product_name,variant_name_snapshot as variant_name,product_code_snapshot as product_code,set_size_snapshot as set_size
    from public.order_items where order_id=$1 order by product_id,product_variant_id nulls first for update`, [row.order_id]);
  const snapshots: OrderSnapshot[] = items.rows.map(item => ({ productId: item.product_id, productVariantId: item.product_variant_id,
    productName: item.product_name, variantName: item.variant_name, productCode: item.product_code, setSize: item.set_size, pricePerSet: item.price_per_set }));
  return { version: row.version, snapshots,
    response: { orderId: row.order_id, orderNumber: row.order_number, status: row.status, paymentStatus: row.payment_status,
      isTest: row.is_test, version: row.version, total: row.total, currency: 'ILS', confirmationToken: '' },
    input: { customerName: row.customer_name, customerPhone: row.customer_phone, deliveryPhone: row.delivery_phone,
      customerEmail: row.customer_email, deliveryAddress: row.delivery_address, shippingZoneId: row.shipping_zone_id,
      deliveryDate: row.delivery_date, dedicationText: row.dedication_text, customerNotes: row.customer_notes,
      items: items.rows.map(item => ({ productId: item.product_id, productVariantId: item.product_variant_id, quantitySets: item.quantity_sets })) } };
}

export async function updatePendingOrder(client: SqlClient, order: PendingOrder, input: CreateOrderInput, quote: QuotePreview, snapshots: OrderSnapshot[]): Promise<string> {
  for (const original of order.input.items) {
    if (input.items.some(item => item.productId === original.productId && (item.productVariantId ?? null) === (original.productVariantId ?? null))) continue;
    const removed = await client.query(`delete from public.order_items where order_id=$1 and product_id=$2 and product_variant_id is not distinct from $3::uuid`,
      [order.response.orderId, original.productId, original.productVariantId ?? null]);
    if (removed.rowCount !== 1) throw new ApiError(409, 'ORDER_CHANGED', 'Order items changed');
  }
  for (const item of input.items) {
    const existing = order.input.items.some(original => original.productId === item.productId && (original.productVariantId ?? null) === (item.productVariantId ?? null));
    if (!existing) {
      const snapshot = snapshots.find(snapshot => snapshot.productId === item.productId && snapshot.productVariantId === (item.productVariantId ?? null));
      if (!snapshot) throw new ApiError(422, 'STOCK_UNAVAILABLE', 'Product is unavailable');
      await client.query(`insert into public.order_items(order_id,product_id,product_variant_id,product_name_snapshot,variant_name_snapshot,
          product_code_snapshot,set_size_snapshot,unit_set_price_snapshot,quantity_sets,line_total)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$8::numeric*$9::integer)`, [order.response.orderId, snapshot.productId, snapshot.productVariantId,
        snapshot.productName, snapshot.variantName, snapshot.productCode, snapshot.setSize, snapshot.pricePerSet, item.quantitySets]);
      continue;
    }
    const updated = await client.query(`update public.order_items set quantity_sets=$4,line_total=unit_set_price_snapshot*$4::integer
      where order_id=$1 and product_id=$2 and product_variant_id is not distinct from $3::uuid`,
    [order.response.orderId, item.productId, item.productVariantId ?? null, item.quantitySets]);
    if (updated.rowCount !== 1) throw new ApiError(409, 'ORDER_CHANGED', 'Order items changed');
  }
  const updated = await client.query<{ version: string }>(`update public.orders set subtotal=$2,shipping_total=$3,total=$4,
      updated_at=clock_timestamp() where order_id=$1 and payment_status='pending' and status='ordered'
      returning extract(epoch from updated_at)::text as version`, [order.response.orderId, quote.subtotal, quote.shippingTotal, quote.total]);
  if (!updated.rows[0]) throw new ApiError(409, 'ORDER_NOT_EDITABLE', 'Order cannot be edited');
  await client.query(`insert into public.order_status_history(order_id,from_status,to_status,note)
    values($1,'ordered','ordered','Guest updated pending order items; existing unit prices preserved')`, [order.response.orderId]);
  return updated.rows[0].version;
}
