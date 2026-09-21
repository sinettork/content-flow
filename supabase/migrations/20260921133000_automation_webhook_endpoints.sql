create extension if not exists pgcrypto;

create table if not exists public.automation_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete cascade,
  provider text not null,
  external_account_id text not null,
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists automation_webhook_endpoints_lookup_idx
  on public.automation_webhook_endpoints(provider, external_account_id, active);

alter table public.automation_webhook_endpoints enable row level security;

create policy automation_webhook_endpoints_select on public.automation_webhook_endpoints
for select to authenticated
using (workspace_id = (select public.current_workspace_id()));

create policy automation_webhook_endpoints_manage on public.automation_webhook_endpoints
for all to authenticated
using (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager')
)
with check (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager')
);

revoke all on public.automation_webhook_endpoints from anon;