-- ZIS business decisions update
-- This migration is a draft for review. Apply only after the ERD decisions are approved.

alter table public.products
  add column if not exists is_deleted boolean not null default false;

alter table public.product_variants
  add column if not exists is_deleted boolean not null default false;

alter table public.product_variants rename column sku to product_code;
alter table public.product_variants rename column stock_sets to available_sets;
alter table public.product_variants
  add column if not exists low_stock_threshold_sets integer not null default 1
    check (low_stock_threshold_sets >= 0);

alter table public.product_variants
  add column if not exists default_production_quantity_sets integer not null default 1
    check (default_production_quantity_sets >= 1);

alter table public.order_items rename column sku_snapshot to product_code_snapshot;
alter table public.order_items
  add column if not exists shortage_sets integer not null default 0
    check (shortage_sets >= 0),
  add column if not exists customer_accepted_shortage boolean not null default false,
  add column if not exists availability_status text not null default 'available'
    check (availability_status in ('available', 'shortage_risk', 'shortage_accepted')),
  add column if not exists inventory_priority text not null default 'normal'
    check (inventory_priority in ('normal', 'deferred'));

alter table public.inventory_movements
  add column if not exists stock_before integer;

alter table public.inventory_movements
  drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements
  add constraint inventory_movements_movement_type_check
  check (movement_type in ('sale', 'sale_reversal', 'restock', 'adjustment', 'reservation', 'release'));

alter table public.product_images
  add column if not exists is_deleted boolean not null default false;

alter table public.categories
  add column if not exists is_deleted boolean not null default false;

alter table public.orders
  add column if not exists tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  add column if not exists tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0),
  add column if not exists courier_notes text,
  add column if not exists dedication_text text,
  add column if not exists is_urgent boolean not null default false;

alter table public.payments
  add column if not exists provider_event_id text;

create unique index if not exists ux_payment_provider_event
  on public.payments(provider, provider_event_id)
  where provider_event_id is not null;

create table if not exists public.system_defaults (
  system_default_id uuid primary key default gen_random_uuid(),
  default_key text not null unique,
  default_value jsonb not null,
  description text,
  updated_by uuid references public.admin_users(admin_user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_defaults (default_key, default_value, description)
values (
  'max_advance_days',
  '7'::jsonb,
  'Maximum number of days ahead a customer can select for delivery'
)
on conflict (default_key) do nothing;

insert into public.system_defaults (default_key, default_value, description)
values
  ('working_days', '["sunday", "monday", "tuesday", "wednesday", "thursday"]'::jsonb,
   'Days on which delivery orders may be placed'),
  ('same_day_cutoff_time', '"09:00"'::jsonb,
   'Latest local time for a same-day order'),
  ('business_timezone', '"Asia/Jerusalem"'::jsonb,
   'Timezone used for ordering and delivery rules'),
  ('invoice_and_pdf_timing', '"after_successful_payment"'::jsonb,
   'Create invoice/receipt and order PDF immediately after successful payment')
on conflict (default_key) do nothing;

insert into public.system_defaults (default_key, default_value, description)
values
  ('low_stock_threshold_sets', '1'::jsonb,
   'Default low-stock threshold when a variant has no override')
on conflict (default_key) do nothing;

insert into public.system_defaults (default_key, default_value, description)
values (
  'order_preparation_status',
  '"ordered"'::jsonb,
  'Order status that permits preparation after successful payment'
)
on conflict (default_key) do nothing;

create table if not exists public.variant_weekly_capacity (
  variant_weekly_capacity_id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(product_variant_id) on delete restrict,
  week_start_date date not null,
  capacity_sets integer not null check (capacity_sets >= 0),
  is_active boolean not null default true,
  updated_by uuid references public.admin_users(admin_user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_variant_id, week_start_date)
);

create table if not exists public.production_allocations (
  production_allocation_id uuid primary key default gen_random_uuid(),
  product_variant_id uuid not null references public.product_variants(product_variant_id) on delete restrict,
  order_id uuid not null references public.orders(order_id) on delete restrict,
  delivery_date date not null,
  quantity_sets integer not null check (quantity_sets >= 1),
  status text not null default 'allocated' check (status in ('allocated', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_variant_id, order_id)
);

create table if not exists public.admin_push_devices (
  admin_push_device_id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(admin_user_id) on delete restrict,
  push_provider text not null,
  push_token text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (push_provider, push_token)
);

create table if not exists public.admin_notifications (
  admin_notification_id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(admin_user_id) on delete restrict,
  notification_type text not null check (notification_type in ('low_stock', 'inventory_risk', 'system')),
  title text not null,
  body text not null,
  order_id uuid references public.orders(order_id) on delete restrict,
  product_variant_id uuid references public.product_variants(product_variant_id) on delete restrict,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_system_defaults_updated_at
  before update on public.system_defaults
  for each row execute function public.set_updated_at();

create trigger trg_variant_weekly_capacity_updated_at
  before update on public.variant_weekly_capacity
  for each row execute function public.set_updated_at();

create trigger trg_production_allocations_updated_at
  before update on public.production_allocations
  for each row execute function public.set_updated_at();

create trigger trg_admin_push_devices_updated_at
  before update on public.admin_push_devices
  for each row execute function public.set_updated_at();

create trigger trg_admin_notifications_updated_at
  before update on public.admin_notifications
  for each row execute function public.set_updated_at();

create index if not exists idx_variant_weekly_capacity_lookup
  on public.variant_weekly_capacity(product_variant_id, week_start_date, is_active);

create index if not exists idx_production_allocations_week
  on public.production_allocations(product_variant_id, delivery_date, status);

alter table public.system_defaults enable row level security;
alter table public.variant_weekly_capacity enable row level security;
alter table public.production_allocations enable row level security;
alter table public.admin_push_devices enable row level security;
alter table public.admin_notifications enable row level security;

create policy admin_system_defaults on public.system_defaults
  for all to authenticated using (public.is_active_admin())
  with check (public.is_active_admin());

create policy admin_variant_weekly_capacity on public.variant_weekly_capacity
  for all to authenticated using (public.is_active_admin())
  with check (public.is_active_admin());

create policy admin_production_allocations on public.production_allocations
  for all to authenticated using (public.is_active_admin())
  with check (public.is_active_admin());

create policy admin_push_devices on public.admin_push_devices
  for all to authenticated using (public.is_active_admin())
  with check (public.is_active_admin());

create policy admin_notifications on public.admin_notifications
  for all to authenticated using (public.is_active_admin())
  with check (public.is_active_admin());

-- Public catalog policies must exclude logically deleted records.
drop policy if exists public_catalog_categories on public.categories;
create policy public_catalog_categories on public.categories for select using (
  status = 'active' and is_deleted = false
);

drop policy if exists public_catalog_products on public.products;
create policy public_catalog_products on public.products for select using (
  status = 'active' and is_deleted = false
);

drop policy if exists public_catalog_variants on public.product_variants;
create policy public_catalog_variants on public.product_variants for select using (
  status = 'active' and is_deleted = false
);

drop policy if exists public_catalog_images on public.product_images;
create policy public_catalog_images on public.product_images for select using (
  is_deleted = false
  and exists (
    select 1 from public.products p
    where p.product_id = product_images.product_id
      and p.status = 'active' and p.is_deleted = false
  )
  and (
    product_images.product_variant_id is null
    or exists (
      select 1 from public.product_variants v
      where v.product_variant_id = product_images.product_variant_id
        and v.status = 'active' and v.is_deleted = false
    )
  )
);

drop index if exists public.ux_product_primary_image;
drop index if exists public.ux_variant_primary_image;
create unique index ux_product_one_live_primary_image
  on public.product_images(product_id)
  where product_variant_id is null and image_type = 'primary' and is_deleted = false;
create unique index ux_variant_one_live_primary_image
  on public.product_images(product_variant_id)
  where product_variant_id is not null and image_type = 'primary' and is_deleted = false;

create or replace function public.validate_product_image_relationship()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.product_variant_id is not null and not exists (
    select 1
    from public.product_variants variant
    where variant.product_variant_id = new.product_variant_id
      and variant.product_id = new.product_id
  ) then
    raise exception 'product image variant must belong to product';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_product_image_relationship on public.product_images;
create trigger trg_validate_product_image_relationship
  before insert or update on public.product_images
  for each row execute function public.validate_product_image_relationship();

create or replace function public.validate_published_product()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'active' and (
    new.is_deleted
    or not exists (
      select 1 from public.categories category
      where category.category_id = new.category_id
        and category.status = 'active'
        and category.is_deleted = false
    )
    or not exists (
      select 1 from public.product_variants variant
      where variant.product_id = new.product_id
        and variant.status = 'active'
        and variant.is_deleted = false
    )
  ) then
    raise exception 'active product requires an active category and active variant';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_published_product on public.products;
create trigger trg_validate_published_product
  before insert or update on public.products
  for each row execute function public.validate_published_product();

-- Future tables intentionally not created yet:
-- faq_entries, integration_jobs, inventory_reservations,
-- notification_deliveries, product_translations.
