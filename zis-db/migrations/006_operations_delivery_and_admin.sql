-- Operations, delivery-date and Admin corrections.
-- Forward-only draft: do not apply until the live migration ledger is verified.
-- Requires 001_initial_zis_schema.sql through 005_event_gallery_images.sql.

alter table public.admin_users
  add column if not exists role text not null default 'operations_manager'
    check (role in ('operations_manager', 'delivery_driver'));

alter table public.shipping_zones
  add column if not exists dispatch_time time;

alter table public.orders
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists delivery_venue_name text,
  add column if not exists delivery_date_updated_by uuid
    references public.admin_users(admin_user_id),
  add column if not exists delivery_date_updated_at timestamptz;

create table if not exists public.order_delivery_date_overrides (
  order_delivery_date_override_id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  previous_delivery_date date not null,
  new_delivery_date date not null,
  reason text not null check (btrim(reason) <> ''),
  changed_by uuid not null references public.admin_users(admin_user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_cancellations (
  order_cancellation_id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(order_id) on delete restrict,
  reason text not null check (btrim(reason) <> ''),
  package_in_hand boolean,
  restock_decision text check (restock_decision in ('return_to_inventory', 'do_not_restock')),
  approved_by uuid references public.admin_users(admin_user_id),
  refund_status text not null default 'not_required'
    check (refund_status in ('not_required', 'full_refund_pending', 'full_refunded', 'external_settlement')),
  full_refund_amount numeric(12,2) check (full_refund_amount is null or full_refund_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_tasks (
  admin_task_id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('system', 'manual')),
  source_event_key text,
  title text not null check (btrim(title) <> ''),
  description text,
  priority text not null default 'normal'
    check (priority in ('critical', 'high', 'normal')),
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  order_id uuid references public.orders(order_id) on delete restrict,
  created_by uuid references public.admin_users(admin_user_id),
  resolved_by uuid references public.admin_users(admin_user_id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ux_admin_tasks_open_system_event
  on public.admin_tasks(source_event_key)
  where source = 'system' and status = 'open' and source_event_key is not null;

create index if not exists idx_admin_tasks_open_priority
  on public.admin_tasks(status, priority, created_at);

create index if not exists idx_admin_tasks_order
  on public.admin_tasks(order_id);

create table if not exists public.admin_notification_preferences (
  admin_user_id uuid primary key references public.admin_users(admin_user_id) on delete restrict,
  push_new_order_enabled boolean not null default true,
  push_action_required_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.admin_notification_preferences (admin_user_id)
select admin_user_id from public.admin_users
on conflict (admin_user_id) do nothing;

alter table public.admin_notifications
  drop constraint if exists admin_notifications_notification_type_check;

alter table public.admin_notifications
  add constraint admin_notifications_notification_type_check
  check (notification_type in (
    'low_stock', 'inventory_risk', 'late_paid_order', 'new_order', 'system'
  ));

create table if not exists public.faq_entries (
  faq_entry_id uuid primary key default gen_random_uuid(),
  question text not null check (btrim(question) <> ''),
  answer text not null check (btrim(answer) <> ''),
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faq_entries_public_order
  on public.faq_entries(status, sort_order)
  where status = 'active';

insert into public.system_defaults (default_key, default_value, description)
values
  ('delivery_calendar_country', '"il"'::jsonb,
   'Israeli Jewish calendar for delivery-date eligibility'),
  ('block_holiday_eves', 'true'::jsonb,
   'Prevent delivery-date selection on an Israeli holiday eve')
on conflict (default_key) do nothing;

create index if not exists idx_orders_paid_delivery_date
  on public.orders(delivery_date, payment_confirmed_at)
  where payment_status = 'paid' and status <> 'cancelled';

create index if not exists idx_order_delivery_date_overrides_order
  on public.order_delivery_date_overrides(order_id, created_at desc);

create index if not exists idx_order_status_history_delivery
  on public.order_status_history(to_status, created_at desc);

drop trigger if exists trg_order_cancellations_updated_at on public.order_cancellations;
create trigger trg_order_cancellations_updated_at
  before update on public.order_cancellations
  for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_tasks_updated_at on public.admin_tasks;
create trigger trg_admin_tasks_updated_at
  before update on public.admin_tasks
  for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_notification_preferences_updated_at on public.admin_notification_preferences;
create trigger trg_admin_notification_preferences_updated_at
  before update on public.admin_notification_preferences
  for each row execute function public.set_updated_at();

drop trigger if exists trg_faq_entries_updated_at on public.faq_entries;
create trigger trg_faq_entries_updated_at
  before update on public.faq_entries
  for each row execute function public.set_updated_at();

alter table public.order_delivery_date_overrides enable row level security;
alter table public.order_cancellations enable row level security;
alter table public.admin_tasks enable row level security;
alter table public.admin_notification_preferences enable row level security;
alter table public.faq_entries enable row level security;
alter table public.variant_weekly_capacity enable row level security;
alter table public.production_allocations enable row level security;
alter table public.admin_push_devices enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists public_faq_entries_read on public.faq_entries;
create policy public_faq_entries_read on public.faq_entries
  for select to anon, authenticated using (status = 'active');

create policy admin_order_delivery_date_overrides on public.order_delivery_date_overrides
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_order_cancellations on public.order_cancellations
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_tasks on public.admin_tasks
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_notification_preferences on public.admin_notification_preferences
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

create policy admin_faq_entries on public.faq_entries
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

comment on column public.shipping_zones.dispatch_time is
  'Reserved for future per-zone dispatch times; not required or used in the current release.';
comment on column public.orders.delivery_venue_name is
  'Optional hall or venue name; appears in Admin, packing labels and delivery manifests.';
comment on column public.orders.payment_confirmed_at is
  'Server-confirmed payment time used to detect a paid same-day order after cutoff.';
comment on table public.admin_tasks is
  'Manual and system action-required tasks. A system event has only one open task.';
