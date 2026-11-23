-- Forward-only. Review and run MANUALLY through the approved database workflow.
-- Requires migrations 001-014. This file has not been executed by the coding agent.
begin;
alter table public.orders
  add column delivery_phone text,
  add column is_test boolean not null default false,
  add column test_created_by uuid references public.admin_users(admin_user_id);
alter table public.orders add constraint orders_test_identity check (
  not is_test or (test_created_by is not null and customer_name like 'ניסוי %'
    and delivery_address->>'street' like 'ניסוי %'));
create table public.test_payment_approvals (
  order_id uuid primary key references public.orders(order_id),
  admin_user_id uuid not null references public.admin_users(admin_user_id),
  reason text not null check(length(trim(reason)) between 1 and 1000),
  created_at timestamptz not null default now()
);
alter table public.test_payment_approvals enable row level security;
-- Explicit zero-charge payment evidence; simulated approvals must never enter revenue totals.
alter table public.payments add column is_simulated boolean not null default false;
alter table public.payments add constraint payments_simulated_zero_charge check (not is_simulated or (provider='admin_test' and amount=0));
-- Simple products need the same stock audit as variant products.
alter table public.inventory_movements alter column product_variant_id drop not null;
alter table public.inventory_movements add column product_id uuid references public.products(product_id);
alter table public.inventory_movements add constraint inventory_stock_subject check (product_variant_id is not null or product_id is not null);
-- FAQ already exists in migration 006 (draft/active/archived).
-- API maps published to the existing active storage value; retain existing content.
comment on column public.orders.is_test is 'Explicit admin-created simulation. Test name/street retain the ניסוי prefix. Exclude from actual sales revenue.';
commit;
