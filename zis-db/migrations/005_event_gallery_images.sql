-- Event photos are managed separately from product_images.
-- Draft: apply only after 001-004 and the actual development migration history are verified.

create table public.event_gallery_images (
  event_gallery_image_id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (btrim(storage_path) <> ''),
  alt_text text not null check (btrim(alt_text) <> ''),
  caption text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_published boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_event_gallery_public_order
  on public.event_gallery_images (sort_order, event_gallery_image_id)
  where is_published = true and is_deleted = false;

create trigger trg_event_gallery_updated_at
  before update on public.event_gallery_images
  for each row execute function public.set_updated_at();

alter table public.event_gallery_images enable row level security;

create policy public_event_gallery_read
  on public.event_gallery_images for select to anon, authenticated
  using (is_published = true and is_deleted = false);

create policy admin_event_gallery_write
  on public.event_gallery_images for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

comment on table public.event_gallery_images is
  'Curated event gallery metadata. Image files remain in Storage. Writes go through authenticated Admin API.';
