-- ZIS initial schema
-- Source of truth: ERD_SCHEMA.md
-- PostgreSQL / Supabase. Run through Supabase migrations.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.categories (
  category_id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  product_id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(category_id),
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'hidden', 'sold_out', 'archived')),
  set_size integer not null check (set_size >= 1),
  default_min_sets integer not null default 1 check (default_min_sets >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.product_variants (
  product_variant_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id),
  name text not null,
  sku text not null unique,
  price_per_set numeric(12,2) not null check (price_per_set >= 0),
  stock_sets integer not null default 0 check (stock_sets >= 0),
  attributes jsonb,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden', 'sold_out', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  product_image_id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id),
  product_variant_id uuid references public.product_variants(product_variant_id),
  storage_path text not null,
  alt_text text not null,
  image_type text not null check (image_type in ('primary', 'gallery')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_zones (
  shipping_zone_id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  neighborhood text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(city) <> '')
);

create table public.shipping_methods (
  shipping_method_id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code <> 'pickup'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_rules (
  shipping_rule_id uuid primary key default gen_random_uuid(),
  shipping_zone_id uuid not null references public.shipping_zones(shipping_zone_id),
  shipping_method_id uuid not null references public.shipping_methods(shipping_method_id),
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  size_from_sets integer not null check (size_from_sets >= 1),
  size_to_sets integer check (size_to_sets is null or size_to_sets >= size_from_sets),
  size_surcharge numeric(12,2) not null default 0 check (size_surcharge >= 0),
  time_surcharge numeric(12,2) not null default 0 check (time_surcharge >= 0),
  urgency_surcharge numeric(12,2) not null default 0 check (urgency_surcharge >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  admin_user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  store_setting_id smallint primary key default 1 check (store_setting_id = 1),
  store_open boolean not null default true,
  lock_mode text not null default 'open' check (lock_mode in ('open', 'closed', 'scheduled')),
  lock_message text,
  minimum_order_total numeric(12,2) not null default 0 check (minimum_order_total >= 0),
  max_advance_days integer check (max_advance_days is null or max_advance_days >= 0),
  updated_by uuid references public.admin_users(admin_user_id),
  updated_at timestamptz not null default now()
);

create table public.store_closures (
  store_closure_id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  is_active boolean not null default true,
  created_by uuid not null references public.admin_users(admin_user_id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.orders (
  order_id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status text not null default 'ordered' check (status in ('ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'authorized', 'paid', 'failed')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  delivery_address jsonb not null,
  shipping_zone_id uuid not null references public.shipping_zones(shipping_zone_id),
  shipping_method_id uuid not null references public.shipping_methods(shipping_method_id),
  delivery_date date not null,
  delivery_time_window jsonb,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  customer_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  order_item_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  product_id uuid references public.products(product_id),
  product_variant_id uuid references public.product_variants(product_variant_id),
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  sku_snapshot text not null,
  set_size_snapshot integer not null check (set_size_snapshot >= 1),
  unit_set_price_snapshot numeric(12,2) not null check (unit_set_price_snapshot >= 0),
  quantity_sets integer not null check (quantity_sets >= 1),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table public.order_status_history (
  order_status_history_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  from_status text,
  to_status text not null check (to_status in ('ordered', 'in_preparation', 'packed', 'in_transit', 'delivered', 'approved', 'cancelled')),
  changed_by uuid references public.admin_users(admin_user_id),
  note text,
  created_at timestamptz not null default now()
);

create table public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  provider text not null,
  provider_transaction_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'ILS',
  status text not null default 'pending' check (status in ('pending', 'authorized', 'paid', 'failed')),
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  invoice_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  provider text not null default 'green_invoice',
  provider_document_id text,
  document_number text,
  document_type text not null,
  status text not null default 'pending' check (status in ('pending', 'issued', 'failed', 'cancelled')),
  document_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  inventory_movement_id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(product_variant_id),
  order_id uuid references public.orders(order_id),
  movement_type text not null check (movement_type in ('sale', 'restock', 'adjustment', 'reservation', 'release')),
  quantity_sets_delta integer not null,
  stock_after integer not null check (stock_after >= 0),
  reason text,
  created_by uuid references public.admin_users(admin_user_id),
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  admin_audit_log_id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(admin_user_id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_user_id = auth.uid()
      and status = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

create unique index ux_product_one_default_variant on public.product_variants(product_id) where is_default;
create unique index ux_product_primary_image on public.product_images(product_id) where product_variant_id is null and image_type = 'primary';
create unique index ux_variant_primary_image on public.product_images(product_variant_id) where product_variant_id is not null and image_type = 'primary';
create unique index ux_payment_provider_transaction on public.payments(provider, provider_transaction_id) where provider_transaction_id is not null;
create unique index ux_invoice_provider_document on public.invoices(provider, provider_document_id) where provider_document_id is not null;
create index idx_categories_status_sort on public.categories(status, sort_order);
create index idx_products_category_status on public.products(category_id, status);
create index idx_products_active on public.products(category_id) where status = 'active';
create index idx_variants_product_status on public.product_variants(product_id, status);
create index idx_variants_low_stock on public.product_variants(stock_sets);
create index idx_product_images_display on public.product_images(product_id, product_variant_id, sort_order);
create index idx_shipping_zones_lookup on public.shipping_zones(city, neighborhood, is_active);
create unique index ux_shipping_zone_city_neighborhood
  on public.shipping_zones (city, coalesce(neighborhood, ''));
create index idx_shipping_rules_calculation on public.shipping_rules(shipping_zone_id, shipping_method_id, is_active, size_from_sets, size_to_sets);
create index idx_store_closures_time on public.store_closures(starts_at, ends_at, is_active);
create index idx_orders_status_created on public.orders(status, created_at desc);
create index idx_orders_customer_email on public.orders(customer_email);
create index idx_orders_delivery_date_status on public.orders(delivery_date, status);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_variant on public.order_items(product_variant_id);
create index idx_order_status_history_order_time on public.order_status_history(order_id, created_at desc);
create index idx_payments_order_status on public.payments(order_id, status);
create index idx_invoices_order_status on public.invoices(order_id, status);
create index idx_inventory_variant_time on public.inventory_movements(product_variant_id, created_at desc);
create index idx_inventory_order on public.inventory_movements(order_id);
create index idx_audit_entity_time on public.admin_audit_log(entity_type, entity_id, created_at desc);
create index idx_audit_user_time on public.admin_audit_log(admin_user_id, created_at desc);
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);

create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_product_variants_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger set_product_images_updated_at before update on public.product_images for each row execute function public.set_updated_at();
create trigger set_shipping_zones_updated_at before update on public.shipping_zones for each row execute function public.set_updated_at();
create trigger set_shipping_methods_updated_at before update on public.shipping_methods for each row execute function public.set_updated_at();
create trigger set_shipping_rules_updated_at before update on public.shipping_rules for each row execute function public.set_updated_at();
create trigger set_store_settings_updated_at before update on public.store_settings for each row execute function public.set_updated_at();
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger set_invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
create trigger set_admin_users_updated_at before update on public.admin_users for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_rules enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_closures enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_audit_log enable row level security;

create policy public_catalog_categories on public.categories for select using (status = 'active');
create policy public_catalog_products on public.products for select using (status = 'active');
create policy public_catalog_variants on public.product_variants for select using (status = 'active');
create policy public_catalog_images on public.product_images for select using (
  exists (
    select 1 from public.products p
    where p.product_id = product_images.product_id and p.status = 'active'
  )
  and (
    product_images.product_variant_id is null
    or exists (
      select 1 from public.product_variants v
      where v.product_variant_id = product_images.product_variant_id and v.status = 'active'
    )
  )
);
create policy public_shipping_zones on public.shipping_zones for select using (is_active);
create policy public_shipping_methods on public.shipping_methods for select using (is_active);
create policy public_shipping_rules on public.shipping_rules for select using (is_active);
create policy public_store_settings on public.store_settings for select using (true);

comment on table public.products is 'ZIS products; set_size and default_min_sets are product-level values.';
comment on table public.product_variants is 'Product-specific variant types; price and private-customer inventory are variant-level.';
comment on table public.admin_users is 'Only current admin authorization table; every active user has full admin access.';
