-- Synthetic TEST FIXTURE only. No project migrations, credentials or live connection.
-- Reduced table shapes follow the relevant types/constraints in migrations 001,004,015.
create table public.admin_users (
  admin_user_id uuid primary key,
  status text not null,
  role text not null
);
create table public.categories (
  category_id uuid primary key,
  status text not null default 'active',
  is_deleted boolean not null default false
);
create table public.products (
  product_id uuid primary key,
  category_id uuid references public.categories,
  set_size integer not null check (set_size > 0),
  price_per_item numeric(12,2),
  available_items integer not null check (available_items >= 0),
  status text not null default 'active',
  is_deleted boolean not null default false
);
create table public.product_variants (
  product_variant_id uuid primary key,
  product_id uuid not null references public.products,
  price_per_item numeric(12,2) not null,
  available_sets integer not null check (available_sets >= 0),
  low_stock_threshold_sets integer not null default 20,
  status text not null default 'active',
  is_deleted boolean not null default false
);
create table public.product_images (
  product_id uuid not null references public.products,
  product_variant_id uuid references public.product_variants,
  image_type text not null default 'primary',
  is_deleted boolean not null default false
);
create table public.shipping_zones (shipping_zone_id uuid primary key, is_active boolean not null);
create table public.shipping_rules (
  shipping_zone_id uuid references public.shipping_zones,
  is_active boolean not null default true,
  base_price numeric(12,2) not null,
  size_from_sets integer not null default 1,
  size_to_sets integer,
  size_surcharge numeric(12,2) not null default 0,
  time_surcharge numeric(12,2) not null default 0,
  urgency_surcharge numeric(12,2) not null default 0
);
create table public.store_settings (
  store_setting_id smallint primary key,
  store_open boolean not null,
  lock_mode text not null,
  lock_message text,
  minimum_product_subtotal numeric(12,2) not null
);
create table public.system_defaults (default_key text primary key, default_value jsonb);
create table public.store_closures (is_active boolean, starts_at timestamptz, ends_at timestamptz);
create table public.orders (
  order_id uuid primary key,
  is_test boolean not null,
  status text not null default 'ordered',
  payment_status text not null default 'pending',
  delivery_date date not null,
  shipping_zone_id uuid not null references public.shipping_zones,
  total numeric(12,2) not null,
  payment_confirmed_at timestamptz,
  updated_at timestamptz not null default '2026-11-08T10:00:00Z'
);
create table public.order_items (
  order_id uuid not null references public.orders,
  product_id uuid not null references public.products,
  product_variant_id uuid references public.product_variants,
  quantity_sets integer not null check (quantity_sets >= 1),
  set_size_snapshot integer
);
create table public.test_payment_approvals (
  order_id uuid primary key references public.orders,
  admin_user_id uuid not null references public.admin_users,
  reason text not null check (length(trim(reason)) between 1 and 1000)
);
create table public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders,
  provider text not null,
  provider_transaction_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'ILS',
  status text not null check (status in ('pending','authorized','paid','failed')),
  is_simulated boolean not null default false,
  provider_payload jsonb,
  check (not is_simulated or (provider = 'admin_test' and amount = 0)),
  unique (provider, provider_transaction_id)
);
create table public.inventory_movements (
  product_id uuid references public.products,
  product_variant_id uuid references public.product_variants,
  order_id uuid references public.orders,
  movement_type text not null,
  stock_before integer not null,
  stock_after integer not null check (stock_after >= 0),
  reason text,
  created_by uuid references public.admin_users,
  check (product_id is not null or product_variant_id is not null)
);
create table public.order_status_history (
  order_id uuid not null references public.orders,
  from_status text,
  to_status text not null,
  changed_by uuid references public.admin_users,
  note text
);
create table public.admin_audit_log (
  admin_user_id uuid not null references public.admin_users,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb
);
create table public.admin_notifications (
  admin_user_id uuid references public.admin_users,
  notification_type text,
  title text,
  body text,
  order_id uuid references public.orders,
  product_variant_id uuid references public.product_variants
);

insert into public.admin_users values ('00000000-0000-4000-8000-000000000010','active','operations_manager');
insert into public.categories(category_id) values ('00000000-0000-4000-8000-000000000020');
insert into public.products(product_id,category_id,set_size,price_per_item,available_items) values
 ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000020',4,15,100),
 ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000020',4,15,20);
insert into public.product_images(product_id) select product_id from public.products;
insert into public.shipping_zones values ('00000000-0000-4000-8000-000000000030',true);
insert into public.shipping_rules(shipping_zone_id,base_price) values ('00000000-0000-4000-8000-000000000030',30);
insert into public.store_settings values (1,true,'open',null,0);
insert into public.orders(order_id,is_test,delivery_date,shipping_zone_id,total) values
 ('00000000-0000-4000-8000-000000000001',true,'2026-11-09','00000000-0000-4000-8000-000000000030',270);
insert into public.order_items values
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',null,1,4),
 ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',null,3,4);
