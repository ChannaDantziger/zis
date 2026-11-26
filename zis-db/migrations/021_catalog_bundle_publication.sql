-- Apply manually only after verifying the migration ledger and migration 020.
begin;
alter table public.catalog_bundles
  drop constraint catalog_bundles_status_check;
alter table public.catalog_bundles
  add constraint catalog_bundles_status_check check (status in ('draft', 'hidden', 'active'));
commit;
