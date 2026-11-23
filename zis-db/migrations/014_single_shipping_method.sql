-- Forward-only migration: the store offers one delivery service, so method selection is not data.
-- Requires the verified shipping schema from migrations 001-013. Never run automatically.

begin;

do $migration$
begin
  if to_regclass('public.shipping_methods') is null
     or to_regclass('public.shipping_rules') is null
     or to_regclass('public.orders') is null then
    raise exception 'Required shipping tables are missing; inspect the migration history before continuing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'shipping_method_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipping_rules' and column_name = 'shipping_method_id'
  ) then
    raise exception 'Expected shipping_method_id columns are missing; inspect the schema before continuing';
  end if;

  if (select count(*) from public.shipping_methods where is_active and code <> 'urgent') > 1 then
    raise exception 'Multiple active customer-facing shipping methods exist; choose one before continuing';
  end if;

  if exists (select 1 from public.shipping_methods where is_active and code = 'urgent') then
    raise exception 'An active urgent shipping method exists; deactivate or reconcile it before continuing';
  end if;

  if exists (
    select 1
    from public.shipping_rules r
    join public.shipping_methods m using (shipping_method_id)
    where m.code = 'urgent' or not m.is_active
  ) then
    raise exception 'Shipping rules exist for urgent or inactive methods; reconcile those prices before continuing';
  end if;

  if exists (
    select 1 from public.shipping_rules r
    left join public.shipping_methods m using (shipping_method_id)
    where m.shipping_method_id is null
  ) then
    raise exception 'Orphaned shipping rules exist; reconcile them before continuing';
  end if;

  if exists (
    select 1 from public.orders o
    left join public.shipping_methods m using (shipping_method_id)
    where o.shipping_method_id is not null and m.shipping_method_id is null
  ) then
    raise exception 'Orders reference missing shipping methods; reconcile them before continuing';
  end if;
end;
$migration$;

-- Keep a readable snapshot on old orders before dropping their method UUID.
alter table public.orders add column if not exists shipping_method_snapshot text;
update public.orders o
set shipping_method_snapshot = coalesce(m.name, 'משלוח')
from public.shipping_methods m
where o.shipping_method_id = m.shipping_method_id
  and o.shipping_method_snapshot is null;
update public.orders set shipping_method_snapshot = 'משלוח' where shipping_method_snapshot is null;
alter table public.orders alter column shipping_method_snapshot set default 'משלוח';
alter table public.orders alter column shipping_method_snapshot set not null;

-- Drop only foreign keys that point at shipping_methods; fail closed on other dependencies.
do $migration$
declare
  constraint_row record;
begin
  for constraint_row in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f' and confrelid = 'public.shipping_methods'::regclass
  loop
    execute format('alter table %s drop constraint %I', constraint_row.table_name, constraint_row.conname);
  end loop;
end;
$migration$;

drop index if exists public.idx_shipping_rules_calculation;
alter table public.shipping_rules drop column shipping_method_id;
alter table public.orders drop column shipping_method_id;
drop table public.shipping_methods;

create index idx_shipping_rules_calculation
  on public.shipping_rules(shipping_zone_id, is_active, size_from_sets, size_to_sets);

comment on column public.orders.shipping_method_snapshot is
  'Readable historical delivery service label; new orders use the single configured delivery service.';

commit;
