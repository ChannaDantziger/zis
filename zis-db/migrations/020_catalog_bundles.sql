-- Apply manually after verifying the migration ledger and prior schema.
create table public.catalog_bundles (
  bundle_id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(category_id),
  name text not null check (length(trim(name)) between 1 and 200),
  description text,
  unit_count integer not null check (unit_count > 0),
  status text not null default 'draft' check (status in ('draft','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalog_bundle_images (
  image_id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.catalog_bundles(bundle_id),
  storage_path text not null unique,
  alt_text text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index ux_catalog_bundle_primary on public.catalog_bundle_images(bundle_id) where is_primary and not is_deleted;
create index ix_catalog_bundles_category on public.catalog_bundles(category_id, name, bundle_id);
create trigger set_catalog_bundles_updated_at before update on public.catalog_bundles for each row execute function public.set_updated_at();
create trigger set_catalog_bundle_images_updated_at before update on public.catalog_bundle_images for each row execute function public.set_updated_at();
alter table public.catalog_bundles enable row level security;
alter table public.catalog_bundle_images enable row level security;
