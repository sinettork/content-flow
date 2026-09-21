-- ContentFlow automation engine foundation.
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('facebook','instagram','telegram','tiktok','youtube')),
  account_type text not null default 'page' check (account_type in ('page','profile','channel','group','bot')),
  external_account_id text not null,
  name text not null,
  username text,
  avatar_url text,
  status text not null default 'active' check (status in ('active','paused','error','disconnected')),
  credentials_ref text,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, external_account_id)
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  enabled boolean not null default true,
  priority integer not null default 100 check (priority >= 0),
  trigger_type text not null check (trigger_type in ('incoming_comment','incoming_message','content_posted','schedule','manual')),
  trigger_config jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  cooldown_seconds integer not null default 0 check (cooldown_seconds >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete set null,
  event_type text not null,
  external_event_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (workspace_id, connection_id, external_event_id)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  event_id uuid references public.automation_events(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','skipped','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  idempotency_key text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, idempotency_key)
);

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  level text not null default 'info' check (level in ('debug','info','warn','error')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_connections_workspace_idx on public.social_connections(workspace_id, provider, status);
create index if not exists automation_rules_workspace_idx on public.automation_rules(workspace_id, enabled, priority);
create index if not exists automation_events_pending_idx on public.automation_events(status, received_at);
create index if not exists automation_runs_queue_idx on public.automation_runs(status, created_at);
create index if not exists automation_logs_run_idx on public.automation_logs(run_id, created_at);

drop trigger if exists social_connections_set_updated_at on public.social_connections;
create trigger social_connections_set_updated_at before update on public.social_connections
for each row execute function public.set_updated_at();

drop trigger if exists automation_rules_set_updated_at on public.automation_rules;
create trigger automation_rules_set_updated_at before update on public.automation_rules
for each row execute function public.set_updated_at();

alter table public.social_connections enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_events enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_logs enable row level security;

create policy social_connections_select on public.social_connections
for select to authenticated using (workspace_id = (select public.current_workspace_id()));

create policy social_connections_manage on public.social_connections
for all to authenticated
using (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager')
)
with check (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager')
);

create policy automation_rules_select on public.automation_rules
for select to authenticated using (workspace_id = (select public.current_workspace_id()));

create policy automation_rules_manage on public.automation_rules
for all to authenticated
using (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager','editor')
)
with check (
  workspace_id = (select public.current_workspace_id())
  and (select public.current_role_name()) in ('admin','manager','editor')
);

create policy automation_events_select on public.automation_events
for select to authenticated using (workspace_id = (select public.current_workspace_id()));

create policy automation_runs_select on public.automation_runs
for select to authenticated using (workspace_id = (select public.current_workspace_id()));

create policy automation_logs_select on public.automation_logs
for select to authenticated using (workspace_id = (select public.current_workspace_id()));

revoke all on public.automation_events, public.automation_runs, public.automation_logs from anon, authenticated;
grant select on public.automation_events, public.automation_runs, public.automation_logs to authenticated;
