-- ZIS base seed data
-- This migration contains only approved, environment-independent defaults.
-- Product/category data should be added only after the real catalog is supplied.

insert into public.store_settings (store_setting_id)
values (1)
on conflict (store_setting_id) do nothing;

insert into public.shipping_methods (name, code)
values ('משלוח', 'delivery')
on conflict (code) do nothing;

insert into public.shipping_zones (name, city)
select city, city
from unnest(array[
  'ירושלים',
  'ביתר',
  'בית שמש'
]) as cities(city)
where btrim(city) <> ''
on conflict do nothing;
