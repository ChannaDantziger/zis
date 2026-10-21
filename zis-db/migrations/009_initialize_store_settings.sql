-- Forward data repair: initialize the required singleton only if it is missing.
-- Requires public.store_settings from 001; preserves all existing settings.
-- Keep a newly initialized shop closed until the owner configures and opens it.
-- Do not replay 001-008 to repair a missing seed row.
insert into public.store_settings (store_setting_id, store_open, lock_mode)
values (1, false, 'closed')
on conflict (store_setting_id) do nothing;
