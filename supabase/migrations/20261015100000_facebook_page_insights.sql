alter table public.social_connections
  add column if not exists last_insights_synced_at timestamptz;

create unique index if not exists social_connections_workspace_id_id_uidx
  on public.social_connections (workspace_id, id);

create table if not exists public.facebook_page_insights_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null,
  metric_date date not null,
  unique_viewers bigint check (unique_viewers is null or unique_viewers >= 0),
  daily_follows bigint check (daily_follows is null or daily_follows >= 0),
  daily_unfollows bigint check (daily_unfollows is null or daily_unfollows >= 0),
  total_followers bigint check (total_followers is null or total_followers >= 0),
  updated_at timestamptz not null default now(),
  constraint facebook_page_insights_connection_workspace_fk
    foreign key (workspace_id, connection_id)
    references public.social_connections (workspace_id, id)
    on delete cascade,
  unique (workspace_id, connection_id, metric_date)
);

create index if not exists facebook_page_insights_workspace_date_idx
  on public.facebook_page_insights_daily (workspace_id, connection_id, metric_date desc);

alter table public.facebook_page_insights_daily enable row level security;

create policy facebook_page_insights_read_workspace
  on public.facebook_page_insights_daily
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

revoke all on public.facebook_page_insights_daily from anon;
revoke insert, update, delete on public.facebook_page_insights_daily from anon, authenticated;
grant select on public.facebook_page_insights_daily to authenticated;
grant all on public.facebook_page_insights_daily to service_role;
