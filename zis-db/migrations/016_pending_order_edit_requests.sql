-- Forward-only. Review and run MANUALLY through the approved database workflow.
-- Requires migrations 001-015. This file has NOT been executed by the coding agent.
-- Keep 010's unique order_creation_requests(order_id) invariant unchanged.
begin;

create table public.order_pending_edit_requests (
  idempotency_key text primary key check (idempotency_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  order_id uuid not null references public.orders(order_id) on delete restrict,
  response jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pending_edit_completion check (
    (response is null and completed_at is null)
    or (response is not null and completed_at is not null and jsonb_typeof(response) = 'object')
  ),
  constraint pending_edit_response_metadata_only check (
    response is null or response - array['orderId','orderNumber','status','paymentStatus','total','currency','version','isTest'] = '{}'::jsonb
  )
);

-- Multiple edits per order are expected; this index MUST NOT be unique.
create index idx_order_pending_edit_requests_order
  on public.order_pending_edit_requests(order_id, created_at desc);

alter table public.order_pending_edit_requests enable row level security;
revoke all on public.order_pending_edit_requests from public, anon, authenticated;
grant select, insert, update on public.order_pending_edit_requests to service_role;

comment on table public.order_pending_edit_requests is
  'Server-only pending-order edit claims. Claim, order mutation and response completion commit together. No customer data or confirmation credentials; completed metadata is retained for exact retries.';

commit;
