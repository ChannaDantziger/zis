-- Rename the existing monetary threshold to match its enforced business meaning.
-- The amount and default are preserved; shipping is not part of the threshold.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings'
      and column_name = 'minimum_order_total'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings'
      and column_name = 'minimum_product_subtotal'
  ) then
    alter table public.store_settings
      rename column minimum_order_total to minimum_product_subtotal;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'store_settings'
      and column_name = 'minimum_product_subtotal'
  ) then
    raise exception 'store_settings has no recognized minimum threshold column';
  end if;
end $$;

comment on column public.store_settings.minimum_product_subtotal is
  'Minimum product subtotal in ILS, excluding shipping. Editable by Admin and enforced by quote/order services.';
