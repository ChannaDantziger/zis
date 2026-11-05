import { ApiError } from '../http/api-error.js';
import type { SqlClient, SqlClientFactory } from '../inventory/postgres-inventory.repository.js';
import type {
  AdminBusinessSettings,
  AdminCommerceSettings,
  AdminShippingRule,
  AdminShippingZone,
  AdminStoreClosure,
  CommerceSettingsRepository,
  CreateShippingRuleInput,
  CreateShippingZoneInput,
  CreateStoreClosureInput,
  UpdateBusinessSettingsInput,
  UpdateShippingRuleInput,
  UpdateShippingZoneInput,
  UpdateStoreClosureInput,
} from './commerce-settings.types.js';

interface DefaultRow { [key: string]: unknown; default_key: string; default_value: unknown; }
interface StoreRow { [key: string]: unknown; store_open: boolean; lock_mode: AdminBusinessSettings['lockMode']; lock_message: string | null; minimum_product_subtotal: string; max_advance_days: number | null; }
interface ZoneRow { [key: string]: unknown; shipping_zone_id: string; name: string; city: string; neighborhood: string | null; dispatch_time: string | null; is_active: boolean; }
interface RuleRow { [key: string]: unknown; shipping_rule_id: string; shipping_zone_id: string; base_price: string; size_from_sets: number; size_to_sets: number | null; size_surcharge: string; time_surcharge: string; urgency_surcharge: string; is_active: boolean; }
interface ClosureRow { [key: string]: unknown; store_closure_id: string; starts_at: string; ends_at: string; reason: string | null; is_active: boolean; }

const SETTING_KEYS = [
  'dispatch_time', 'same_day_cutoff_time', 'max_advance_days', 'working_days',
  'business_timezone', 'block_holiday_eves', 'delivery_calendar_country', 'order_preparation_status',
] as const;

export function createPostgresCommerceSettingsRepository(factory: SqlClientFactory): CommerceSettingsRepository {
  return {
    getSettings: () => getSettings(factory),
    updateBusinessSettings: (input, adminUserId) => updateBusinessSettings(factory, input, adminUserId),
    createShippingZone: (input, adminUserId) => createShippingZone(factory, input, adminUserId),
    updateShippingZone: (input, adminUserId) => updateShippingZone(factory, input, adminUserId),
    createShippingRule: (input, adminUserId) => createShippingRule(factory, input, adminUserId),
    updateShippingRule: (input, adminUserId) => updateShippingRule(factory, input, adminUserId),
    createClosure: (input, adminUserId) => createClosure(factory, input, adminUserId),
    updateClosure: (input, adminUserId) => updateClosure(factory, input, adminUserId),
  };
}

async function getSettings(factory: SqlClientFactory): Promise<AdminCommerceSettings> {
  const client = await factory();
  try {
    const [store, defaults, zones, rules, closures] = await Promise.all([
      client.query<StoreRow>(`select store_open, lock_mode, lock_message, minimum_product_subtotal::text, max_advance_days from public.store_settings where store_setting_id = 1`),
      client.query<DefaultRow>(`select default_key, default_value from public.system_defaults where default_key = any($1::text[])`, [SETTING_KEYS]),
      client.query<ZoneRow>(`select shipping_zone_id, name, city, neighborhood, dispatch_time::text, is_active from public.shipping_zones order by city, neighborhood nulls first, shipping_zone_id`),
      client.query<RuleRow>(`select shipping_rule_id, shipping_zone_id, base_price::text, size_from_sets, size_to_sets, size_surcharge::text, time_surcharge::text, urgency_surcharge::text, is_active from public.shipping_rules order by shipping_zone_id, size_from_sets`),
      client.query<ClosureRow>(`select store_closure_id, starts_at::text, ends_at::text, reason, is_active from public.store_closures order by starts_at desc`),
    ]);
    const storeRow = store.rows[0];
    if (!storeRow) throw new ApiError(503, 'STORE_SETTINGS_NOT_CONFIGURED', 'חסרה רשומת הגדרות החנות במסד. יש להשלים את ההגדרה לפני שימוש במסך.');
    // node-postgres already decodes JSONB; preserve scalar strings such as "09:00".
    const values = new Map(defaults.rows.map((row) => [row.default_key, row.default_value]));
    return {
      business: {
        storeOpen: storeRow.store_open,
        lockMode: storeRow.lock_mode,
        lockMessage: storeRow.lock_message,
        minimumProductSubtotal: storeRow.minimum_product_subtotal,
        maxAdvanceDays: Number(readDefault(values, 'max_advance_days', storeRow.max_advance_days ?? 7)),
        dispatchTime: readNullableDefault(values, 'dispatch_time'),
        sameDayCutoffTime: readDefault(values, 'same_day_cutoff_time', '09:00'),
        workingDays: readDefault(values, 'working_days', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']),
        businessTimezone: readDefault(values, 'business_timezone', 'Asia/Jerusalem'),
        blockHolidayEves: readDefault(values, 'block_holiday_eves', true),
        deliveryCalendarCountry: readDefault(values, 'delivery_calendar_country', 'il'),
        orderPreparationStatus: readDefault(values, 'order_preparation_status', 'ordered'),
      },
      shippingZones: zones.rows.map(mapZone),
      shippingRules: rules.rows.map(mapRule),
      closures: closures.rows.map(mapClosure),
    };
  } finally { client.release?.(); }
}

async function updateBusinessSettings(factory: SqlClientFactory, input: UpdateBusinessSettingsInput, adminUserId: string): Promise<AdminBusinessSettings> {
  return withTransaction(factory, async (client) => {
    const before = await getBusinessSettings(client);
    const store = await client.query<StoreRow>(`update public.store_settings set
      store_open = coalesce($1, store_open), lock_mode = coalesce($2, lock_mode), lock_message = $3,
      minimum_product_subtotal = coalesce($4::numeric, minimum_product_subtotal), max_advance_days = coalesce($5, max_advance_days),
      updated_by = $6 where store_setting_id = 1
      returning store_open, lock_mode, lock_message, minimum_product_subtotal::text, max_advance_days`,
      [input.storeOpen ?? null, input.lockMode ?? null, input.lockMessage === undefined ? before.lockMessage : input.lockMessage,
        input.minimumProductSubtotal ?? null, input.maxAdvanceDays ?? null, adminUserId]);
    if (!store.rows[0]) throw new ApiError(503, 'STORE_SETTINGS_NOT_CONFIGURED', 'חסרה רשומת הגדרות החנות במסד. יש להשלים את ההגדרה לפני שימוש במסך.');
    for (const [key, value] of Object.entries(toDefaultUpdates(input))) {
      await upsertDefault(client, key, value, adminUserId);
    }
    const after = await getBusinessSettings(client);
    await audit(client, adminUserId, 'update', 'business_settings', null, before, after);
    return after;
  });
}

async function createShippingZone(factory: SqlClientFactory, input: CreateShippingZoneInput, adminUserId: string): Promise<AdminShippingZone> {
  return withTransaction(factory, async (client) => {
    const result = await client.query<ZoneRow>(`insert into public.shipping_zones (name, city, neighborhood, dispatch_time, is_active) values ($1, $2, $3, $4, $5) returning shipping_zone_id, name, city, neighborhood, dispatch_time::text, is_active`, [input.name, input.city, input.neighborhood, input.dispatchTime, input.isActive]);
    const row = result.rows[0];
    if (!row) throw new Error('Shipping zone was not created');
    const after = mapZone(row);
    await audit(client, adminUserId, 'create', 'shipping_zone', after.shippingZoneId, null, after);
    return after;
  });
}

async function updateShippingZone(factory: SqlClientFactory, input: UpdateShippingZoneInput, adminUserId: string): Promise<AdminShippingZone> {
  return withTransaction(factory, async (client) => {
    const before = await readZone(client, input.shippingZoneId);
    const result = await client.query<ZoneRow>(`update public.shipping_zones set name = coalesce($1, name), city = coalesce($2, city), neighborhood = $3, dispatch_time = $4, is_active = coalesce($5, is_active) where shipping_zone_id = $6 returning shipping_zone_id, name, city, neighborhood, dispatch_time::text, is_active`, [input.name ?? null, input.city ?? null, input.neighborhood === undefined ? before.neighborhood : input.neighborhood, input.dispatchTime === undefined ? before.dispatchTime : input.dispatchTime, input.isActive ?? null, input.shippingZoneId]);
    const row = result.rows[0];
    if (!row) throw new Error('Shipping zone was not found');
    const after = mapZone(row);
    await audit(client, adminUserId, 'update', 'shipping_zone', after.shippingZoneId, before, after);
    return after;
  });
}

async function createShippingRule(factory: SqlClientFactory, input: CreateShippingRuleInput, adminUserId: string): Promise<AdminShippingRule> {
  return withTransaction(factory, async (client) => {
    const result = await client.query<RuleRow>(`insert into public.shipping_rules (shipping_zone_id, base_price, size_from_sets, size_to_sets, size_surcharge, time_surcharge, urgency_surcharge, is_active) values ($1, $2, $3, $4, $5, $6, $7, $8) returning shipping_rule_id, shipping_zone_id, base_price::text, size_from_sets, size_to_sets, size_surcharge::text, time_surcharge::text, urgency_surcharge::text, is_active`, [input.shippingZoneId, input.basePrice, input.sizeFromSets, input.sizeToSets, input.sizeSurcharge, input.timeSurcharge, input.urgencySurcharge, input.isActive]);
    const row = result.rows[0];
    if (!row) throw new Error('Shipping rule was not created');
    const after = mapRule(row);
    await audit(client, adminUserId, 'create', 'shipping_rule', after.shippingRuleId, null, after);
    return after;
  });
}

async function updateShippingRule(factory: SqlClientFactory, input: UpdateShippingRuleInput, adminUserId: string): Promise<AdminShippingRule> {
  return withTransaction(factory, async (client) => {
    const before = await readRule(client, input.shippingRuleId);
    const result = await client.query<RuleRow>(`update public.shipping_rules set shipping_zone_id = coalesce($1, shipping_zone_id), base_price = coalesce($2::numeric, base_price), size_from_sets = coalesce($3, size_from_sets), size_to_sets = $4, size_surcharge = coalesce($5::numeric, size_surcharge), time_surcharge = coalesce($6::numeric, time_surcharge), urgency_surcharge = coalesce($7::numeric, urgency_surcharge), is_active = coalesce($8, is_active) where shipping_rule_id = $9 returning shipping_rule_id, shipping_zone_id, base_price::text, size_from_sets, size_to_sets, size_surcharge::text, time_surcharge::text, urgency_surcharge::text, is_active`, [input.shippingZoneId ?? null, input.basePrice ?? null, input.sizeFromSets ?? null, input.sizeToSets === undefined ? before.sizeToSets : input.sizeToSets, input.sizeSurcharge ?? null, input.timeSurcharge ?? null, input.urgencySurcharge ?? null, input.isActive ?? null, input.shippingRuleId]);
    const row = result.rows[0];
    if (!row) throw new Error('Shipping rule was not found');
    const after = mapRule(row);
    await audit(client, adminUserId, 'update', 'shipping_rule', after.shippingRuleId, before, after);
    return after;
  });
}

async function createClosure(factory: SqlClientFactory, input: CreateStoreClosureInput, adminUserId: string): Promise<AdminStoreClosure> {
  return withTransaction(factory, async (client) => {
    const result = await client.query<ClosureRow>(`insert into public.store_closures (starts_at, ends_at, reason, is_active, created_by) values ($1, $2, $3, $4, $5) returning store_closure_id, starts_at::text, ends_at::text, reason, is_active`, [input.startsAt, input.endsAt, input.reason, input.isActive, adminUserId]);
    const row = result.rows[0];
    if (!row) throw new Error('Store closure was not created');
    const after = mapClosure(row);
    await audit(client, adminUserId, 'create', 'store_closure', after.storeClosureId, null, after);
    return after;
  });
}

async function updateClosure(factory: SqlClientFactory, input: UpdateStoreClosureInput, adminUserId: string): Promise<AdminStoreClosure> {
  return withTransaction(factory, async (client) => {
    const before = await readClosure(client, input.storeClosureId);
    const result = await client.query<ClosureRow>(`update public.store_closures set starts_at = coalesce($1::timestamptz, starts_at), ends_at = coalesce($2::timestamptz, ends_at), reason = $3, is_active = coalesce($4, is_active) where store_closure_id = $5 returning store_closure_id, starts_at::text, ends_at::text, reason, is_active`, [input.startsAt ?? null, input.endsAt ?? null, input.reason === undefined ? before.reason : input.reason, input.isActive ?? null, input.storeClosureId]);
    const row = result.rows[0];
    if (!row) throw new Error('Store closure was not found');
    const after = mapClosure(row);
    await audit(client, adminUserId, 'update', 'store_closure', after.storeClosureId, before, after);
    return after;
  });
}

async function getBusinessSettings(client: SqlClient): Promise<AdminBusinessSettings> {
  const store = await client.query<StoreRow>(`select store_open, lock_mode, lock_message, minimum_product_subtotal::text, max_advance_days from public.store_settings where store_setting_id = 1`);
  const defaults = await client.query<DefaultRow>(`select default_key, default_value from public.system_defaults where default_key = any($1::text[])`, [SETTING_KEYS]);
  const row = store.rows[0];
  if (!row) throw new ApiError(503, 'STORE_SETTINGS_NOT_CONFIGURED', 'חסרה רשומת הגדרות החנות במסד. יש להשלים את ההגדרה לפני שימוש במסך.');
  const values = new Map(defaults.rows.map((item) => [item.default_key, item.default_value]));
  return {
    storeOpen: row.store_open, lockMode: row.lock_mode, lockMessage: row.lock_message, minimumProductSubtotal: row.minimum_product_subtotal,
    maxAdvanceDays: Number(readDefault(values, 'max_advance_days', row.max_advance_days ?? 7)), dispatchTime: readNullableDefault(values, 'dispatch_time'),
    sameDayCutoffTime: readDefault(values, 'same_day_cutoff_time', '09:00'), workingDays: readDefault(values, 'working_days', []),
    businessTimezone: readDefault(values, 'business_timezone', 'Asia/Jerusalem'), blockHolidayEves: readDefault(values, 'block_holiday_eves', true),
    deliveryCalendarCountry: readDefault(values, 'delivery_calendar_country', 'il'), orderPreparationStatus: readDefault(values, 'order_preparation_status', 'ordered'),
  };
}

function toDefaultUpdates(input: UpdateBusinessSettingsInput): Record<string, unknown> {
  return Object.fromEntries([
    ['dispatch_time', input.dispatchTime], ['same_day_cutoff_time', input.sameDayCutoffTime], ['max_advance_days', input.maxAdvanceDays],
    ['working_days', input.workingDays], ['business_timezone', input.businessTimezone], ['block_holiday_eves', input.blockHolidayEves],
    ['delivery_calendar_country', input.deliveryCalendarCountry], ['order_preparation_status', input.orderPreparationStatus],
  ].filter(([, value]) => value !== undefined));
}

async function upsertDefault(client: SqlClient, key: string, value: unknown, adminUserId: string): Promise<void> {
  await client.query(`insert into public.system_defaults (default_key, default_value) values ($1, $2::jsonb) on conflict (default_key) do update set default_value = excluded.default_value`, [key, JSON.stringify(value)]);
}

async function withTransaction<T>(factory: SqlClientFactory, operation: (client: SqlClient) => Promise<T>): Promise<T> {
  const client = await factory();
  try { await client.query('begin'); const result = await operation(client); await client.query('commit'); return result; }
  catch (error) { await client.query('rollback'); throw error; }
  finally { client.release?.(); }
}

async function audit(client: SqlClient, adminUserId: string, action: string, entityType: string, entityId: string | null, before: unknown, after: unknown): Promise<void> {
  await client.query(`insert into public.admin_audit_log (admin_user_id, action, entity_type, entity_id, before_data, after_data) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`, [adminUserId, action, entityType, entityId, JSON.stringify(before), JSON.stringify(after)]);
}

async function readZone(client: SqlClient, id: string): Promise<AdminShippingZone> { const result = await client.query<ZoneRow>(`select shipping_zone_id, name, city, neighborhood, dispatch_time::text, is_active from public.shipping_zones where shipping_zone_id = $1`, [id]); if (!result.rows[0]) throw new Error('Shipping zone was not found'); return mapZone(result.rows[0]); }
async function readRule(client: SqlClient, id: string): Promise<AdminShippingRule> { const result = await client.query<RuleRow>(`select shipping_rule_id, shipping_zone_id, base_price::text, size_from_sets, size_to_sets, size_surcharge::text, time_surcharge::text, urgency_surcharge::text, is_active from public.shipping_rules where shipping_rule_id = $1`, [id]); if (!result.rows[0]) throw new Error('Shipping rule was not found'); return mapRule(result.rows[0]); }
async function readClosure(client: SqlClient, id: string): Promise<AdminStoreClosure> { const result = await client.query<ClosureRow>(`select store_closure_id, starts_at::text, ends_at::text, reason, is_active from public.store_closures where store_closure_id = $1`, [id]); if (!result.rows[0]) throw new Error('Store closure was not found'); return mapClosure(result.rows[0]); }

function mapZone(row: ZoneRow): AdminShippingZone { return { shippingZoneId: row.shipping_zone_id, name: row.name, city: row.city, neighborhood: row.neighborhood, dispatchTime: row.dispatch_time, isActive: row.is_active }; }
function mapRule(row: RuleRow): AdminShippingRule { return { shippingRuleId: row.shipping_rule_id, shippingZoneId: row.shipping_zone_id, basePrice: row.base_price, sizeFromSets: row.size_from_sets, sizeToSets: row.size_to_sets, sizeSurcharge: row.size_surcharge, timeSurcharge: row.time_surcharge, urgencySurcharge: row.urgency_surcharge, isActive: row.is_active }; }
function mapClosure(row: ClosureRow): AdminStoreClosure { return { storeClosureId: row.store_closure_id, startsAt: row.starts_at, endsAt: row.ends_at, reason: row.reason, isActive: row.is_active }; }
function readDefault<T>(values: Map<string, unknown>, key: string, fallback: T): T { const value = values.get(key); return (value === undefined ? fallback : value) as T; }
function readNullableDefault(values: Map<string, unknown>, key: string): string | null { const value = values.get(key); return value === null || value === undefined ? null : String(value); }
