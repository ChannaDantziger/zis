-- P7/P5 forward migration: editable store, delivery and shipping configuration.
-- Requires the verified 001-007 migration chain. Do not run on an unknown database.

alter table public.shipping_zones
  add column if not exists dispatch_time time;

insert into public.system_defaults (default_key, default_value, description)
values
  ('dispatch_time', 'null'::jsonb,
   'Global daily dispatch time shown to customers and used by operations'),
  ('block_holiday_eves', 'true'::jsonb,
   'Prevent delivery-date selection on an Israeli holiday eve'),
  ('delivery_calendar_country', '"il"'::jsonb,
   'Holiday calendar country used for delivery-date eligibility')
on conflict (default_key) do nothing;

create index if not exists idx_shipping_zones_active_city
  on public.shipping_zones(is_active, city, neighborhood);

create policy admin_shipping_zones_manage on public.shipping_zones
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_shipping_methods_manage on public.shipping_methods
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_shipping_rules_manage on public.shipping_rules
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_store_settings_manage on public.store_settings
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_store_closures_manage on public.store_closures
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

comment on table public.shipping_rules is
  'Admin-managed delivery pricing. The highest matching total rule is selected; no free shipping is assumed.';

comment on column public.store_settings.minimum_order_total is
  'Minimum order total in ILS. Editable by Admin and enforced by quote/order services.';

comment on column public.system_defaults.default_key is
  'Editable business configuration key. Changes are audited by the Admin settings service.';
