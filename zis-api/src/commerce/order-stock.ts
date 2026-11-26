import { ApiError } from '../http/api-error.js';
import type { SqlClient } from '../inventory/postgres-inventory.repository.js';

export interface OrderStockLine {
  product_id: string | null;
  product_variant_id: string | null;
  quantity_sets: number;
  set_size_snapshot: number | null;
}
export interface OrderStockTotal { product_id: string; product_variant_id: string | null; quantity: number }
const MAX_STOCK = 2_147_483_647;

/** Read bundle components if the optional schema is installed; legacy orders keep working before migration. */
export async function readBundleStockLines(client: SqlClient, orderId: string): Promise<OrderStockLine[]> {
  const schema = await client.query<{ present: boolean }>(`select to_regclass('public.order_bundles') is not null as present`);
  if (!schema.rows[0]?.present) return [];
  const result = await client.query<{ order_bundle_id: string; product_id: string | null; quantity: string | null; per_bundle: number | null; unit_count: number }>(`select b.order_bundle_id,c.product_id,
      c.quantity_per_bundle as per_bundle,b.unit_count_snapshot as unit_count,
      (c.quantity_per_bundle::bigint*b.quantity::bigint)::text as quantity
    from public.order_bundles b left join public.order_bundle_components c on c.order_bundle_id=b.order_bundle_id
    where b.order_id=$1 order by c.product_id,b.order_bundle_id`, [orderId]);
  const totals = new Map<string, { units: number; expected: number }>();
  const lines = result.rows.map(row => {
    if (!row.product_id || !Number.isSafeInteger(row.per_bundle) || Number(row.per_bundle) < 1) {
      throw new ApiError(409, 'ORDER_ITEM_UNITS_MISSING', 'Bundle components require review');
    }
    const previous = totals.get(row.order_bundle_id);
    totals.set(row.order_bundle_id, { units: (previous?.units ?? 0) + Number(row.per_bundle), expected: row.unit_count });
    return { product_id: row.product_id, product_variant_id: null, quantity_sets: Number(row.quantity), set_size_snapshot: 1 };
  });
  if ([...totals.values()].some(total => total.units !== total.expected)) {
    throw new ApiError(409, 'ORDER_ITEM_UNITS_MISSING', 'Bundle composition requires review');
  }
  return lines;
}

/** Group physical demand so multiple order lines share one stock check and one movement. */
export function aggregateOrderStock(lines: OrderStockLine[]): OrderStockTotal[] {
  const totals = new Map<string, OrderStockTotal>();
  for (const line of lines) {
    if (!line.product_id || !Number.isSafeInteger(line.quantity_sets) || line.quantity_sets < 1
      || (!line.product_variant_id && (!Number.isSafeInteger(line.set_size_snapshot) || Number(line.set_size_snapshot) < 1))) {
      throw new ApiError(409, 'ORDER_ITEM_UNITS_MISSING', 'Order item cannot be applied to stock');
    }
    const amount = line.product_variant_id ? line.quantity_sets : line.quantity_sets * Number(line.set_size_snapshot);
    const key = `${line.product_id}:${line.product_variant_id ?? ''}`;
    const quantity = (totals.get(key)?.quantity ?? 0) + amount;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_STOCK) {
      throw new ApiError(409, 'ORDER_ITEM_UNITS_MISSING', 'Order item cannot be applied to stock');
    }
    totals.set(key, { product_id: line.product_id, product_variant_id: line.product_variant_id, quantity });
  }
  return [...totals.values()].sort((a, b) => a.product_id.localeCompare(b.product_id)
    || (a.product_variant_id ?? '').localeCompare(b.product_variant_id ?? ''));
}
