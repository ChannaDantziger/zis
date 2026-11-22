import type { SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { OperationReportOrder, OperationsReportsRepository } from './operations-reports.types.js';
import { MAX_REPORT_ORDERS } from './operations-reports.service.js';

const BUSINESS_TIMEZONE = 'Asia/Jerusalem';

export function createPostgresOperationsReportsRepository(factory: SqlClientFactory): OperationsReportsRepository {
  return {
    async read(kind, query) {
      const client = await factory();
      try {
        await client.query('begin transaction isolation level repeatable read read only');
        const generated = await client.query<{ generatedAt: string }>('select transaction_timestamp()::text as "generatedAt"');
        const condition = kind === 'packing'
          ? `o.delivery_date = $1::date and o.payment_status = 'paid' and o.status <> 'cancelled' and h.to_status = 'packed'`
          : `h.to_status = 'in_transit' and h.created_at >= ($1::date::timestamp at time zone $2)
             and h.created_at < (($1::date + 1)::timestamp at time zone $2)`;
        const cityParameter = kind === 'packing' ? '$2' : '$3';
        const idsParameter = kind === 'packing' ? '$3' : '$4';
        const limitParameter = kind === 'packing' ? '$4' : '$5';
        const values = kind === 'packing'
          ? [query.date, query.city ?? null, query.orderIds ?? null, MAX_REPORT_ORDERS + 1]
          : [query.date, BUSINESS_TIMEZONE, query.city ?? null, query.orderIds ?? null, MAX_REPORT_ORDERS + 1];
        const rows = await client.query<OperationReportOrder & Record<string, unknown>>(
          `with selected as (
             select o.order_id, max(h.created_at) as transitioned_at
               from public.orders o join public.order_status_history h on h.order_id = o.order_id
              where ${condition}
                and (${cityParameter}::text is null or o.delivery_address->>'city' = ${cityParameter})
                and (${idsParameter}::uuid[] is null or o.order_id = any(${idsParameter}::uuid[]))
              group by o.order_id
           )
           select o.order_id as "orderId", o.order_number as "orderNumber", o.status,
                  extract(epoch from o.updated_at)::text as version,
                  to_char(o.delivery_date, 'YYYY-MM-DD') as "deliveryDate",
                  o.customer_name as "customerName", o.customer_phone as "customerPhone", coalesce(o.delivery_phone,o.customer_phone) as "deliveryPhone", o.package_count as "packageCount", o.is_test as "isTest",
                  jsonb_build_object('city', o.delivery_address->>'city', 'neighborhood', o.delivery_address->>'neighborhood',
                    'street', o.delivery_address->>'street', 'houseNumber', o.delivery_address->>'houseNumber',
                    'apartment', o.delivery_address->>'apartment', 'postalCode', o.delivery_address->>'postalCode') as address,
                  o.delivery_venue_name as "venueName", o.dedication_text as "dedicationText",
                  o.customer_notes as "customerNotes", s.transitioned_at::text as "transitionedAt",
                  coalesce((select jsonb_agg(jsonb_build_object('categoryName', coalesce(c.name, 'ללא קטגוריה'), 'productName', i.product_name_snapshot,
                    'variantName', i.variant_name_snapshot, 'quantitySets', i.quantity_sets, 'setSize', i.set_size_snapshot)
                    order by i.product_name_snapshot, i.variant_name_snapshot, i.order_item_id)
                    from public.order_items i left join public.products p on p.product_id=i.product_id
                    left join public.categories c on c.category_id=p.category_id where i.order_id = o.order_id), '[]'::jsonb) as items
             from selected s join public.orders o on o.order_id = s.order_id
            order by o.delivery_address->>'city', o.delivery_address->>'street',
                     o.delivery_address->>'houseNumber', s.transitioned_at, o.order_number, o.order_id
            limit ${limitParameter}`, values);
        await client.query('commit');
        return { kind, date: query.date, generatedAt: generated.rows[0].generatedAt, orders: rows.rows };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release?.();
      }
    },
  };
}
