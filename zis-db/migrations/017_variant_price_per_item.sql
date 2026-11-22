-- Forward-only conversion. Review the schema/ledger and run MANUALLY through
-- the approved database workflow. Requires the verified schema through 016.
-- Existing per-Set variant prices are converted only when the unit price is
-- exactly representable in whole agorot; otherwise the migration stops.
-- This migration has NOT been executed by the coding agent.
begin;

do $$
declare
  invalid_variants text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='product_variants' and column_name='price_per_set'
  ) or not exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='products' and column_name='set_size'
  ) then
    raise exception 'Expected product_variants.price_per_set and products.set_size; inspect schema and migration ledger before continuing';
  end if;

  select string_agg(format('%s (old set price %s, set size %s)', product_variant_id, price_per_set, set_size), ', ')
    into invalid_variants
    from (
      select v.product_variant_id, v.price_per_set, p.set_size
        from public.product_variants v
        join public.products p on p.product_id=v.product_id
       where p.set_size < 1 or mod(v.price_per_set * 100, p.set_size::numeric) <> 0
       order by v.product_variant_id
       limit 20
    ) unresolved;

  if invalid_variants is not null then
    raise exception 'Variant set prices cannot all be converted to a two-decimal unit price without changing totals. Resolve these variants through the approved workflow, then retry: %', invalid_variants;
  end if;
end $$;

alter table public.product_variants rename column price_per_set to price_per_item;
alter table public.product_variants
  rename constraint product_variants_price_per_set_check to product_variants_price_per_item_check;

update public.product_variants v
   set price_per_item = v.price_per_item / p.set_size
  from public.products p
 where p.product_id=v.product_id;

comment on column public.products.price_per_item is 'Physical-unit price in ILS. Multiply by products.set_size for a Set price.';
comment on column public.product_variants.price_per_item is 'Physical-unit price in ILS. Multiply by the parent product set_size for a Set price.';

commit;
