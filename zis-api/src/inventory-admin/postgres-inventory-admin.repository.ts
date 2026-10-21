import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import { DEFAULT_PAGE_SIZE } from '../contracts/common.contracts.js';
import type { InventoryAdminMovement, InventoryAdminRepository, InventoryAdminVariant } from './inventory-admin.types.js';

const WEEK_DAYS = 7;

export function createPostgresInventoryAdminRepository(factory: SqlClientFactory): InventoryAdminRepository {
  return {
    list: (page, weekStartDate) => snapshot(factory, async (client) => {
      const count = await client.query<{ total: string }>(`select count(*)::text as total from public.product_variants v
        join public.products p on p.product_id = v.product_id where v.is_deleted = false and p.is_deleted = false`);
      const result = await client.query<InventoryAdminVariant & Record<string, unknown>>(`${VARIANT_SELECT}
        where v.is_deleted = false and p.is_deleted = false
        order by p.name, v.name, v.product_variant_id limit $2 offset $3`, [weekStartDate, DEFAULT_PAGE_SIZE, (page - 1) * DEFAULT_PAGE_SIZE]);
      return { data: result.rows, page: pageInfo(page, count.rows[0].total), weekStartDate };
    }),
    details: (id, page, weekStartDate) => snapshot(factory, async (client) => {
      const result = await client.query<InventoryAdminVariant & Record<string, unknown>>(`${VARIANT_SELECT}
        where v.product_variant_id = $2 and v.is_deleted = false and p.is_deleted = false`, [weekStartDate, id]);
      const variant = result.rows[0];
      if (!variant) return null;
      const count = await client.query<{ total: string }>(`select count(*)::text as total from public.inventory_movements where product_variant_id = $1`, [id]);
      const movements = await client.query<InventoryAdminMovement & Record<string, unknown>>(
        `select inventory_movement_id as "movementId", movement_type as "movementType", stock_before as "stockBefore",
          stock_after as "stockAfter", reason, created_by as "createdBy", order_id as "orderId", created_at as "createdAt"
          from public.inventory_movements where product_variant_id = $1
          order by created_at desc, inventory_movement_id desc limit $2 offset $3`, [id, DEFAULT_PAGE_SIZE, (page - 1) * DEFAULT_PAGE_SIZE]);
      return { variant, movements: movements.rows, page: pageInfo(page, count.rows[0].total), weekStartDate };
    }),
  };
}
const VARIANT_SELECT = `select v.product_variant_id as "productVariantId", p.name as "productName", v.name as "variantName",
  v.product_code as "productCode", v.available_sets as "availableSets", v.low_stock_threshold_sets as "lowStockThresholdSets",
  v.default_production_quantity_sets as "defaultProductionQuantitySets", v.status,
  extract(epoch from v.updated_at)::text as version,
  case when c.variant_weekly_capacity_id is null then null else jsonb_build_object(
    'weekStartDate', to_char(c.week_start_date, 'YYYY-MM-DD'), 'capacitySets', c.capacity_sets, 'isActive', c.is_active) end as "weeklyCapacity",
  coalesce((select sum(a.quantity_sets)::integer from public.production_allocations a
    where a.product_variant_id = v.product_variant_id and a.status = 'allocated'
      and a.delivery_date >= $1::date and a.delivery_date < $1::date + ${WEEK_DAYS}), 0) as "allocatedSets"
  from public.product_variants v join public.products p on p.product_id = v.product_id
  left join public.variant_weekly_capacity c on c.product_variant_id = v.product_variant_id and c.week_start_date = $1::date`;

async function snapshot<T>(factory: SqlClientFactory, work: (client: SqlClient) => Promise<T>): Promise<T> {
  const client = await factory();
  try {
    await client.query('begin transaction isolation level repeatable read read only');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release?.(); }
}
function pageInfo(page: number, rawTotal: string) {
  const totalItems = Number(rawTotal);
  return { page, pageSize: DEFAULT_PAGE_SIZE, totalItems, totalPages: Math.ceil(totalItems / DEFAULT_PAGE_SIZE) };
}