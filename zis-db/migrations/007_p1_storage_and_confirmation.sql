-- P1 forward migration: media buckets, public-safe confirmation access and DB integrity.
-- Run only after the actual migration ledger for 001-006 has been verified.

create table if not exists public.order_confirmation_tokens (
  order_confirmation_token_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  token_hash text not null unique check (btrim(token_hash) <> ''),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (revoked_at is null or revoked_at <= expires_at)
);

create index if not exists idx_order_confirmation_tokens_lookup
  on public.order_confirmation_tokens(token_hash, expires_at)
  where revoked_at is null;

alter table public.order_confirmation_tokens enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('zis-product-media', 'zis-product-media', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('zis-event-gallery', 'zis-event-gallery', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy admin_zis_media_read
  on storage.objects for select to authenticated
  using (
    bucket_id in ('zis-product-media', 'zis-event-gallery')
    and public.is_active_admin()
  );

create policy admin_zis_media_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('zis-product-media', 'zis-event-gallery')
    and public.is_active_admin()
  );

create policy admin_zis_media_update
  on storage.objects for update to authenticated
  using (
    bucket_id in ('zis-product-media', 'zis-event-gallery')
    and public.is_active_admin()
  )
  with check (
    bucket_id in ('zis-product-media', 'zis-event-gallery')
    and public.is_active_admin()
  );

create policy admin_zis_media_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('zis-product-media', 'zis-event-gallery')
    and public.is_active_admin()
  );

comment on table public.order_confirmation_tokens is
  'Opaque, expiring guest confirmation credentials. Store only a hash; never expose order data by order number alone.';
