import type {
  AvailabilityRequest,
  AvailabilityResponse,
  ShippingQuoteInput,
  ShippingZoneResponse,
  ShippingMethodResponse,
  StoreStatusResponse,
} from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { CommerceRepository } from './commerce.types.js';
import type { DeliveryPolicy } from './delivery-policy.js';
import type { QuoteContext, QuoteVariantContext, ShippingRuleContext } from './quote.service.js';

interface DefaultRow { [key: string]: unknown; default_key: string; default_value: unknown; }
interface ZoneRow { [key: string]: unknown; shipping_zone_id: string; name: string; city: string; neighborhood: string | null; }
interface VariantRow { [key: string]: unknown; product_variant_id: string | null; product_id: string; price_per_set: string; available_sets: number; }
interface RuleRow { [key: string]: unknown; base_price: string; size_from_sets: number; size_to_sets: number | null; size_surcharge: string; time_surcharge: string; urgency_surcharge: string; }

export function createPostgresCommerceRepository(factory: SqlClientFactory): CommerceRepository {
  return {
    getStoreStatus: () => getStoreStatus(factory),
    listShippingZones: () => listShippingZones(factory),
    listShippingMethods: () => listShippingMethods(factory),
    getAvailability: (input) => getAvailability(factory, input),
    getContext: (input) => getQuoteContext(factory, input),
  };
}

async function getStoreStatus(factory: SqlClientFactory): Promise<StoreStatusResponse> {
  const client = await factory();
  try {
    const settings = await readSettings(client);
    return {
      storeOpen: settings.storeOpen && settings.lockMode === 'open',
      lockMode: settings.lockMode,
      lockMessage: settings.lockMessage,
      timezone: settings.timezone,
      sameDayCutoffTime: settings.sameDayCutoffTime,
      dispatchTime: settings.dispatchTime,
    };
  } finally {
    client.release?.();
  }
}

async function listShippingZones(factory: SqlClientFactory): Promise<ShippingZoneResponse[]> {
  const client = await factory();
  try {
    const result = await client.query<ZoneRow>(
      `select shipping_zone_id, name, city, neighborhood
         from public.shipping_zones
        where is_active = true
        order by city, neighborhood nulls first, shipping_zone_id`,
    );
    return result.rows.map((row) => ({ shippingZoneId: row.shipping_zone_id, name: row.name, city: row.city, neighborhood: row.neighborhood }));
  } finally {
    client.release?.();
  }
}

async function getAvailability(factory: SqlClientFactory, input: AvailabilityRequest): Promise<AvailabilityResponse> {
  const client = await factory();
  try {
    const rows = await loadSellableItems(client, input.items);
  const byId = new Map(rows.map((row) => [itemKey(row.product_id, row.product_variant_id), row]));
    const items = input.items.map((item) => {
      const row = byId.get(itemKey(item.productId, item.productVariantId ?? null));
      const availableSets = row?.available_sets ?? 0;
      return { ...item, availableSets, requestedSets: item.quantitySets, shortageSets: Math.max(item.quantitySets - availableSets, 0) };
    });
    return { deliveryDate: input.deliveryDate, available: items.every((item) => item.shortageSets === 0), items };
  } finally {
    client.release?.();
  }
}

async function getQuoteContext(factory: SqlClientFactory, input: ShippingQuoteInput): Promise<QuoteContext> {
  const client = await factory();
  try { return await readQuoteContext(client, input); } finally { client.release?.(); }
}

export async function readQuoteContext(client: SqlClient, input: ShippingQuoteInput): Promise<QuoteContext> {
    const settings = await readSettings(client);
    const closureResult = await client.query<{ is_closed: boolean }>(
      `select exists (
         select 1 from public.store_closures
          where is_active = true and starts_at < (($1::date + 1)::timestamp at time zone $2)
            and ends_at > ($1::date::timestamp at time zone $2)
       ) as is_closed`,
      [input.deliveryDate, settings.timezone],
    );
    const deliveryPolicy: DeliveryPolicy = {
      timezone: settings.timezone,
      sameDayCutoffTime: settings.sameDayCutoffTime,
      maxAdvanceDays: settings.maxAdvanceDays,
      workingDays: settings.workingDays,
      holidayDates: new Set<string>(),
      storeOpen: settings.storeOpen && settings.lockMode === 'open' && !closureResult.rows[0]?.is_closed,
    };
    const zoneResult = await client.query<{ is_active: boolean }>(
      `select is_active from public.shipping_zones where shipping_zone_id = $1 for share`,
      [input.shippingZoneId],
    );
    if (!zoneResult.rows[0]?.is_active) throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Shipping zone is unavailable');
    const variantResult = { rows: await loadSellableItems(client, input.items) };
    const ruleResult = await client.query<RuleRow>(
      `select r.base_price, r.size_from_sets, r.size_to_sets, r.size_surcharge,
              r.time_surcharge, r.urgency_surcharge
         from public.shipping_rules r join public.shipping_methods m on m.shipping_method_id = r.shipping_method_id
        where r.shipping_zone_id = $1 and r.shipping_method_id = $2 and r.is_active = true and m.is_active = true and m.code <> 'urgent' for share of r,m`,
      [input.shippingZoneId, input.shippingMethodId],
    );
    return {
      deliveryPolicy,
      minimumProductSubtotal: settings.minimumProductSubtotal,
      currency: 'ILS',
      taxRate: readTaxRate(settings.taxRate),
      variants: variantResult.rows.map(mapVariant),
      shippingRules: ruleResult.rows.map(mapRule),
    };
}

async function readSettings(client: SqlClient) {
  const store = await client.query<{ store_open: boolean; lock_mode: 'open' | 'closed' | 'scheduled'; lock_message: string | null; minimum_product_subtotal: string }>(
    `select store_open, lock_mode, lock_message, minimum_product_subtotal from public.store_settings where store_setting_id = 1 for share`,
  );
  const defaults = await client.query<DefaultRow>(
      `select default_key, default_value from public.system_defaults
      where default_key in ('business_timezone', 'same_day_cutoff_time', 'max_advance_days', 'working_days', 'dispatch_time', 'block_holiday_eves', 'tax_rate') for share`,
  );
  const row = store.rows[0];
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Store settings are not configured');
  // node-postgres already decodes JSONB; preserve scalar strings such as "09:00".
  const values = new Map(defaults.rows.map((item) => [item.default_key, item.default_value]));
  return {
    taxRate: values.get('tax_rate'),
    storeOpen: row.store_open,
    lockMode: row.lock_mode,
    lockMessage: row.lock_message,
    minimumProductSubtotal: row.minimum_product_subtotal,
    timezone: readDefault(values, 'business_timezone', 'Asia/Jerusalem'),
    sameDayCutoffTime: readDefault(values, 'same_day_cutoff_time', '09:00'),
    dispatchTime: readNullableDefault(values, 'dispatch_time'),
    blockHolidayEves: readDefault(values, 'block_holiday_eves', true),
    maxAdvanceDays: Number(readDefault(values, 'max_advance_days', '7')),
    workingDays: readWorkingDays(readDefault(values, 'working_days', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])),
  };
}

function mapVariant(row: VariantRow): QuoteVariantContext {
  return { productId: row.product_id, productVariantId: row.product_variant_id, pricePerSet: row.price_per_set, availableSets: row.available_sets, active: true };
}

async function loadSellableItems(client: SqlClient, items: Array<{ productId: string; productVariantId?: string | null }>) {
  const productIds = items.map((item) => item.productId);
  const variantIds = items.flatMap((item) => item.productVariantId ? [item.productVariantId] : []);
  const result = await client.query<VariantRow>(`select p.product_id, null::uuid as product_variant_id,
      p.price_per_item::text as price_per_set, p.available_items as available_sets
    from public.products p join public.categories c on c.category_id=p.category_id
    where p.product_id=any($1::uuid[]) and p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
      and not exists (select 1 from public.product_variants any_variant where any_variant.product_id=p.product_id and not any_variant.is_deleted)
      and p.price_per_item is not null
      and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
    union all
    select p.product_id, v.product_variant_id, v.price_per_set::text, v.available_sets
    from public.product_variants v join public.products p on p.product_id=v.product_id join public.categories c on c.category_id=p.category_id
    where v.product_variant_id=any($2::uuid[]) and v.status='active' and not v.is_deleted
      and p.status='active' and not p.is_deleted and c.status='active' and not c.is_deleted
      and exists(select 1 from public.product_images i where i.product_id=p.product_id and i.product_variant_id is null and i.image_type='primary' and not i.is_deleted)
      and exists(select 1 from public.product_images i where i.product_variant_id=v.product_variant_id and i.image_type='primary' and not i.is_deleted)`, [productIds, variantIds]);
  return result.rows;
}

function itemKey(productId: string, variantId: string | null | undefined) { return `${productId}:${variantId ?? 'simple'}`; }

function mapRule(row: RuleRow): ShippingRuleContext {
  return { basePrice: row.base_price, sizeFromSets: row.size_from_sets, sizeToSets: row.size_to_sets, sizeSurcharge: row.size_surcharge, timeSurcharge: row.time_surcharge, urgencySurcharge: row.urgency_surcharge, active: true };
}

function readDefault<T>(values: Map<string, unknown>, key: string, fallback: T): T {
  return (values.get(key) as T | undefined) ?? fallback;
}

function readNullableDefault(values: Map<string, unknown>, key: string): string | null {
  const value = values.get(key);
  return value === null || value === undefined ? null : String(value);
}

function readWorkingDays(value: unknown): number[] {
  if (!Array.isArray(value)) throw new ApiError(500, 'INTERNAL_ERROR', 'Working-days configuration is invalid');
  const dayNumbers: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  return value.filter((day): day is string => typeof day === 'string' && day in dayNumbers).map((day) => dayNumbers[day]);
}

async function listShippingMethods(factory:SqlClientFactory):Promise<ShippingMethodResponse[]> {
  const client=await factory();
  try {
    const result=await client.query<{shipping_method_id:string;name:string;code:string}>("select shipping_method_id,name,code from public.shipping_methods where is_active=true and code <> 'urgent' order by name,shipping_method_id");
    return result.rows.map(row=>({shippingMethodId:row.shipping_method_id,name:row.name,code:row.code}));
  } finally { client.release?.(); }
}
function readTaxRate(value:unknown):string {
  const rate=typeof value==='number'||typeof value==='string' ? String(value) : '';
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(rate)) throw new ApiError(503,'COMMERCE_TAX_NOT_CONFIGURED','Tax rate is not configured');
  return Number(rate).toFixed(2);
}
