-- P5 forward migration. Review and apply through the approved database change process.
-- Depends on 001-009; never replay previous manually applied migrations.
-- This file has not been executed by the development agent.
begin;

create table public.order_creation_requests (
  idempotency_key text primary key check (length(idempotency_key) between 16 and 128),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid references public.orders(order_id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index idx_order_creation_requests_order
  on public.order_creation_requests(order_id) where order_id is not null;

alter table public.order_creation_requests enable row level security;
revoke all on public.order_creation_requests from anon, authenticated;

comment on table public.order_creation_requests is
  'Server-only atomic order creation claims. A null order_id is allowed only inside the creating transaction; no plaintext confirmation credentials or customer data.';

commit;