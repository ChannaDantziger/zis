-- Prepare only. Apply manually after reviewing the ledger and migrations 020/021.
-- An order bundle is a priced parent; component rows describe physical contents,
-- not additional charges. Server transactions must validate the composition.
begin;

create table public.order_bundles (
  order_bundle_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  bundle_id uuid not null references public.catalog_bundles(bundle_id) on delete restrict,
  category_id uuid not null references public.categories(category_id) on delete restrict,
  bundle_name_snapshot text not null,
  category_name_snapshot text not null,
  image_path_snapshot text,
  unit_count_snapshot integer not null check (unit_count_snapshot > 0),
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_bundle_components (
  order_bundle_id uuid not null references public.order_bundles(order_bundle_id) on delete cascade,
  product_id uuid not null references public.products(product_id) on delete restrict,
  product_name_snapshot text not null,
  image_path_snapshot text,
  quantity_per_bundle integer not null check (quantity_per_bundle > 0),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  primary key (order_bundle_id, product_id)
);

create index ix_order_bundles_order on public.order_bundles(order_id, order_bundle_id);
alter table public.order_bundles enable row level security;
alter table public.order_bundle_components enable row level security;
commit;
