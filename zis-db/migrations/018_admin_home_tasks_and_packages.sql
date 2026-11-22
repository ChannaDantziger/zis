-- Prepared for manual application through the approved database workflow.
-- Do not execute from application startup or automated tooling.

alter table public.orders
  add column if not exists package_count integer check (package_count > 0);

alter table public.admin_tasks
  add column if not exists workflow_status text not null default 'open'
    check (workflow_status in ('open', 'in_progress', 'closed'));

update public.admin_tasks
   set workflow_status = 'closed'
 where status in ('done', 'dismissed') and workflow_status = 'open';

create table if not exists public.admin_task_history (
  admin_task_history_id uuid primary key default gen_random_uuid(),
  admin_task_id uuid not null references public.admin_tasks(admin_task_id) on delete restrict,
  from_status text check (from_status in ('open', 'in_progress', 'closed')),
  to_status text not null check (to_status in ('open', 'in_progress', 'closed')),
  note text,
  changed_by uuid references public.admin_users(admin_user_id),
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_task_history_task_time
  on public.admin_task_history(admin_task_id, created_at, admin_task_history_id);

insert into public.admin_task_history(admin_task_id, from_status, to_status, note, changed_by, created_at)
select t.admin_task_id, null, t.workflow_status, t.description, t.created_by, t.created_at
  from public.admin_tasks t
 where not exists (select 1 from public.admin_task_history h where h.admin_task_id = t.admin_task_id);

alter table public.admin_task_history enable row level security;
revoke all on public.admin_task_history from anon, authenticated;
