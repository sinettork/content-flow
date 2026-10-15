alter table public.social_connections
  add column if not exists last_insights_synced_at timestamptz,
  add column if not exists last_insights_sync_started_at timestamptz;

comment on column public.social_connections.last_insights_sync_started_at is
  'Atomic Facebook Insights sync claim/cooldown timestamp; includes failed attempts.';

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

create or replace function public.claim_facebook_insights_sync(
  p_workspace_id uuid,
  p_connection_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  update public.social_connections
  set last_insights_sync_started_at = now()
  where id = p_connection_id
    and workspace_id = p_workspace_id
    and provider = 'facebook'
    and account_type = 'page'
    and status = 'active'
    and (
      last_insights_sync_started_at is null
      or last_insights_sync_started_at <= now() - interval '5 minutes'
    )
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_facebook_insights_sync(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_facebook_insights_sync(uuid, uuid) to service_role;

create or replace function public.upsert_facebook_page_insights(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  insert into public.facebook_page_insights_daily as stored (
    workspace_id,
    connection_id,
    metric_date,
    unique_viewers,
    daily_follows,
    daily_unfollows,
    total_followers,
    updated_at
  )
  select
    row_data.workspace_id,
    row_data.connection_id,
    row_data.metric_date,
    row_data.unique_viewers,
    row_data.daily_follows,
    row_data.daily_unfollows,
    row_data.total_followers,
    row_data.updated_at
  from jsonb_to_recordset(p_rows) as row_data(
    workspace_id uuid,
    connection_id uuid,
    metric_date date,
    unique_viewers bigint,
    daily_follows bigint,
    daily_unfollows bigint,
    total_followers bigint,
    updated_at timestamptz
  )
  on conflict (workspace_id, connection_id, metric_date) do update set
    unique_viewers = coalesce(excluded.unique_viewers, stored.unique_viewers),
    daily_follows = coalesce(excluded.daily_follows, stored.daily_follows),
    daily_unfollows = coalesce(excluded.daily_unfollows, stored.daily_unfollows),
    total_followers = coalesce(excluded.total_followers, stored.total_followers),
    updated_at = excluded.updated_at;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.upsert_facebook_page_insights(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_facebook_page_insights(jsonb) to service_role;
