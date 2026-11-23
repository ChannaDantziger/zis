-- Sequential human-readable order numbers. Apply only through the approved DB workflow.
-- Existing order_number values are retained; numeric values are respected when positioning the sequence.
begin;

create sequence public.order_number_seq as bigint start with 1000;

do $$
declare
  highest_existing bigint;
begin
  select max(order_number::bigint)
    into highest_existing
    from public.orders
   where order_number ~ '^[0-9]{1,18}$';

  if highest_existing is not null then
    perform setval('public.order_number_seq', greatest(highest_existing, 999), true);
  end if;
end;
$$;

revoke all on sequence public.order_number_seq from public, anon, authenticated;
grant usage, select on sequence public.order_number_seq to service_role;

comment on sequence public.order_number_seq is
  'Human-readable order numbers; starts at 1000 and advances atomically. Existing order numbers are unchanged.';

commit;
