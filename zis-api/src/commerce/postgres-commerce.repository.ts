import type {
  AvailabilityRequest,
  AvailabilityResponse,
  ShippingQuoteInput,
  ShippingZoneResponse,
  StoreStatusResponse,
} from '../contracts/commerce.contracts.js';
import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type { CommerceRepository } from './commerce.types.js';
import type { DeliveryPolicy } from './delivery-policy.js';
import type { QuoteContext, QuoteVariantContext, ShippingRuleContext } from './quote.service.js';

export interface HolidayCalendar {
  listHolidayDates(from: string, to: string): Promise<ReadonlySet<string>>;
}

interface DefaultRow { [key: string]: unknown; default_key: string; default_value: unknown; }
interface ZoneRow { [key: string]: unknown; shipping_zone_id: string; name: string; city: string; neighborhood: string | null; }
interface VariantRow { [key: string]: unknown; product_variant_id: string; product_minimum_sets: number; price_per_set: string; available_sets: number; }
interface RuleRow { [key: string]: unknown; base_price: string; size_from_sets: number; size_to_sets: number | null; size_surcharge: string; time_surcharge: string; urgency_surcharge: string; }

export function createPostgresCommerceRepository(factory: SqlClientFactory, calendar: HolidayCalendar): CommerceRepository {
  return {
    getStoreStatus: () => getStoreStatus(factory),
    listShippingZones: () => listShippingZones(factory),
    getAvailability: (input) => getAvailability(factory, input),
    getContext: (input) => getQuoteContext(factory, calendar, input),
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
    const ids = input.items.map((item) => item.productVariantId);
    const result = await client.query<VariantRow>(
      `select v.product_variant_id, p.default_min_sets as product_minimum_sets,
              v.available_sets, v.price_per_set
         from public.product_variants v
         join public.products p on p.product_id = v.product_id
        where v.product_variant_id = any($1::uuid[])
          and v.status = 'active' and v.is_deleted = false
          and p.status = 'active' and p.is_deleted = false`,
      [ids],
    );
    const byId = new Map(result.rows.map((row) => [row.product_variant_id, row]));
    const items = input.items.map((item) => {
      const row = byId.get(item.productVariantId);
      const availableSets = row?.available_sets ?? 0;
      return { ...item, availableSets, requestedSets: item.quantitySets, shortageSets: Math.max(item.quantitySets - availableSets, 0) };
    });
    return { deliveryDate: input.deliveryDate, available: items.every((item) => item.shortageSets === 0), items };
  } finally {
    client.release?.();
  }
}

async function getQuoteContext(factory: SqlClientFactory, calendar: HolidayCalendar, input: ShippingQuoteInput): Promise<QuoteContext> {
  const client = await factory();
  try {
    const settings = await readSettings(client);
    const closureResult = await client.query<{ is_closed: boolean }>(
      `select exists (
         select 1 from public.store_closures
          where is_active = true and starts_at <= $1::date + interval '1 day'
            and ends_at >= $1::date
       ) as is_closed`,
      [input.deliveryDate],
    );
    const holidayDates = await calendar.listHolidayDates(input.deliveryDate, input.deliveryDate);
    const deliveryPolicy: DeliveryPolicy = {
      timezone: settings.timezone,
      sameDayCutoffTime: settings.sameDayCutoffTime,
      maxAdvanceDays: settings.maxAdvanceDays,
      workingDays: settings.workingDays,
      holidayDates,
      storeOpen: settings.storeOpen && settings.lockMode === 'open' && !closureResult.rows[0]?.is_closed,
    };
    const zoneResult = await client.query<{ is_active: boolean }>(
      `select is_active from public.shipping_zones where shipping_zone_id = $1`,
      [input.shippingZoneId],
    );
    if (!zoneResult.rows[0]?.is_active) throw new ApiError(422, 'BUSINESS_RULE_VIOLATION', 'Shipping zone is unavailable');
    const variantResult = await client.query<VariantRow>(
      `select v.product_variant_id, p.default_min_sets as product_minimum_sets,
              v.price_per_set, v.available_sets
         from public.product_variants v
         join public.products p on p.product_id = v.product_id
        where v.product_variant_id = any($1::uuid[])
          and v.status = 'active' and v.is_deleted = false
          and p.status = 'active' and p.is_deleted = false`,
      [input.items.map((item) => item.productVariantId)],
    );
    const ruleResult = await client.query<RuleRow>(
      `select base_price, size_from_sets, size_to_sets, size_surcharge,
              time_surcharge, urgency_surcharge
         from public.shipping_rules
        where shipping_zone_id = $1 and shipping_method_id = $2 and is_active = true`,
      [input.shippingZoneId, input.shippingMethodId],
    );
    return {
      deliveryPolicy,
      minimumOrderTotal: settings.minimumOrderTotal,
      currency: 'ILS',
      variants: variantResult.rows.map(mapVariant),
      shippingRules: ruleResult.rows.map(mapRule),
    };
  } finally {
    client.release?.();
  }
}

async function readSettings(client: SqlClient) {
  const store = await client.query<{ store_open: boolean; lock_mode: 'open' | 'closed' | 'scheduled'; lock_message: string | null; minimum_order_total: string }>(
    `select store_open, lock_mode, lock_message, minimum_order_total from public.store_settings where store_setting_id = 1`,
  );
  const defaults = await client.query<DefaultRow>(
    `select default_key, default_value from public.system_defaults
      where default_key in ('business_timezone', 'same_day_cutoff_time', 'max_advance_days', 'working_days')`,
  );
  const row = store.rows[0];
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Store settings are not configured');
  const values = new Map(defaults.rows.map((item) => [item.default_key, parseJsonValue(item.default_value)]));
  return {
    storeOpen: row.store_open,
    lockMode: row.lock_mode,
    lockMessage: row.lock_message,
    minimumOrderTotal: row.minimum_order_total,
    timezone: readDefault(values, 'business_timezone', 'Asia/Jerusalem'),
    sameDayCutoffTime: readDefault(values, 'same_day_cutoff_time', '09:00'),
    maxAdvanceDays: Number(readDefault(values, 'max_advance_days', '7')),
    workingDays: readWorkingDays(readDefault(values, 'working_days', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'])),
  };
}

function mapVariant(row: VariantRow): QuoteVariantContext {
  return { productVariantId: row.product_variant_id, productMinimumSets: row.product_minimum_sets, pricePerSet: row.price_per_set, availableSets: row.available_sets, active: true };
}

function mapRule(row: RuleRow): ShippingRuleContext {
  return { basePrice: row.base_price, sizeFromSets: row.size_from_sets, sizeToSets: row.size_to_sets, sizeSurcharge: row.size_surcharge, timeSurcharge: row.time_surcharge, urgencySurcharge: row.urgency_surcharge, active: true };
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!/^(?:["\[{]|-?\d|true$|false$|null$)/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new ApiError(500, 'INTERNAL_ERROR', 'System default configuration is invalid');
  }
}

function readDefault<T>(values: Map<string, unknown>, key: string, fallback: T): T {
  return (values.get(key) as T | undefined) ?? fallback;
}

function readWorkingDays(value: unknown): number[] {
  if (!Array.isArray(value)) throw new ApiError(500, 'INTERNAL_ERROR', 'Working-days configuration is invalid');
  const dayNumbers: Record<string, number> = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  return value.filter((day): day is string => typeof day === 'string' && day in dayNumbers).map((day) => dayNumbers[day]);
}
