-- Production security, collaboration, publishing and operational foundation.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p from public.profiles p where p.id = (select auth.uid())
$$;
revoke execute on function private.current_profile() from public, anon;
grant execute on function private.current_profile() to authenticated;

create or replace function public.current_workspace_id()
returns uuid language sql stable security invoker set search_path = ''
as $$ select (private.current_profile()).workspace_id $$;

create or replace function public.current_role_name()
returns public.role language sql stable security invoker set search_path = ''
as $$ select (private.current_profile()).role $$;

revoke execute on function public.current_workspace_id(), public.current_role_name() from public, anon;
grant execute on function public.current_workspace_id(), public.current_role_name() to authenticated;

create or replace function private.protect_profile_security_fields()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if (new.role, new.workspace_id) is distinct from (old.role, old.workspace_id)
     and public.current_role_name() <> 'admin'::public.role then
    raise exception 'Only workspace admins can change roles or workspace membership';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update on public.profiles for each row
execute function private.protect_profile_security_fields();

create table if not exists public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  timezone text not null default 'UTC',
  default_content_type public.content_type not null default 'image',
  default_priority public.priority not null default 'medium',
  approval_required boolean not null default true,
  checklist_required boolean not null default true,
  brand_notes text not null default '',
  notification_preferences jsonb not null default '{}'::jsonb,
  automation_rules jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.content_assets alter column content_item_id drop not null;
alter table public.content_assets
  add column if not exists category text not null default 'uncategorized'
  check (category in ('design','video','document','source','posted','uncategorized'));

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.role not null default 'viewer',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (content_item_id, version_number)
);

create table if not exists public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_platform_id uuid not null references public.content_platforms(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  run_at timestamptz not null,
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, provider_event_id)
);

create index if not exists invitations_workspace_idx on public.workspace_invitations(workspace_id, expires_at);
create index if not exists versions_item_idx on public.content_versions(content_item_id, version_number desc);
create index if not exists publishing_jobs_due_idx on public.publishing_jobs(run_at) where status = 'queued';
create index if not exists publishing_jobs_workspace_idx on public.publishing_jobs(workspace_id, status);
create unique index if not exists publishing_one_active_idx on public.publishing_jobs(content_platform_id)
where status in ('queued','processing');
create index if not exists content_workspace_updated_idx on public.content_items(workspace_id, updated_at desc, id);
create index if not exists comments_user_idx on public.comments(user_id);
create index if not exists logs_user_idx on public.activity_logs(user_id);
create index if not exists approvals_requester_idx on public.approval_requests(requested_by);
create unique index if not exists approvals_one_pending_idx on public.approval_requests(content_item_id) where decision is null;

create or replace function private.capture_content_version()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare next_version integer;
begin
  if to_jsonb(new) - array['updated_at'] is distinct from to_jsonb(old) - array['updated_at'] then
    select coalesce(max(v.version_number), 0) + 1 into next_version
    from public.content_versions v where v.content_item_id = new.id;
    insert into public.content_versions (workspace_id, content_item_id, version_number, snapshot, created_by)
    values (new.workspace_id, new.id, next_version, to_jsonb(old), coalesce((select auth.uid()), new.created_by));
  end if;
  return new;
end $$;

drop trigger if exists capture_content_version on public.content_items;
create trigger capture_content_version before update on public.content_items
for each row execute function private.capture_content_version();

create or replace function private.sync_publishing_job()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.platform_status = 'scheduled' and new.scheduled_at is not null then
    if not exists (
      select 1 from public.publishing_jobs j
      where j.content_platform_id = new.id and j.status in ('queued','processing')
    ) then
      insert into public.publishing_jobs (workspace_id, content_platform_id, run_at)
      values (new.workspace_id, new.id, new.scheduled_at);
    else
      update public.publishing_jobs set run_at = new.scheduled_at, updated_at = now()
      where content_platform_id = new.id and status = 'queued';
    end if;
  elsif tg_op = 'UPDATE' then
    update public.publishing_jobs set status = 'cancelled', completed_at = now(), updated_at = now()
    where content_platform_id = new.id and status = 'queued';
  end if;
  return new;
end $$;
drop trigger if exists sync_publishing_job on public.content_platforms;
create trigger sync_publishing_job after insert or update of platform_status, scheduled_at on public.content_platforms
for each row execute function private.sync_publishing_job();

create or replace function public.request_content_approval(target_content_id uuid)
returns public.approval_requests language plpgsql security invoker set search_path = ''
as $$
declare result public.approval_requests;
begin
  update public.content_items set master_status = 'in_review'
  where id = target_content_id and master_status in ('draft','changes_requested');
  if not found then raise exception 'Content is not ready to submit for approval'; end if;
  insert into public.approval_requests (workspace_id, content_item_id, requested_by)
  select c.workspace_id, c.id, (select auth.uid()) from public.content_items c where c.id = target_content_id
  returning * into result;
  return result;
end $$;

create or replace function public.decide_content_approval(target_request_id uuid, target_decision public.approval_decision, note text default null)
returns public.approval_requests language plpgsql security invoker set search_path = ''
as $$
declare result public.approval_requests;
begin
  if public.current_role_name() not in ('admin','manager') then raise exception 'Insufficient permission'; end if;
  update public.approval_requests
  set decision = target_decision, decision_note = note, reviewed_by = (select auth.uid()), decided_at = now()
  where id = target_request_id and decision is null returning * into result;
  if result.id is null then raise exception 'Approval request is unavailable'; end if;
  update public.content_items
  set master_status = case when target_decision = 'approved' then 'approved'::public.master_status else 'changes_requested'::public.master_status end,
      approved_by = case when target_decision = 'approved' then (select auth.uid()) else null end,
      approved_at = case when target_decision = 'approved' then now() else null end
  where id = result.content_item_id;
  return result;
end $$;

revoke execute on function public.request_content_approval(uuid), public.decide_content_approval(uuid, public.approval_decision, text) from public, anon;
grant execute on function public.request_content_approval(uuid), public.decide_content_approval(uuid, public.approval_decision, text) to authenticated;

create or replace function private.set_member_role_impl(target_profile_id uuid, target_role public.role)
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare actor_role public.role;
declare existing_role public.role;
declare actor_workspace uuid;
declare result public.profiles;
begin
  select p.role, p.workspace_id into actor_role, actor_workspace from public.profiles p where p.id = (select auth.uid());
  select p.role into existing_role from public.profiles p where p.id = target_profile_id and p.workspace_id = actor_workspace;
  if existing_role is null then raise exception 'Team member not found'; end if;
  if actor_role = 'admin' or (actor_role = 'manager' and existing_role in ('editor','viewer') and target_role in ('editor','viewer')) then
    update public.profiles set role = target_role where id = target_profile_id returning * into result;
    return result;
  end if;
  raise exception 'Insufficient permission';
end $$;
revoke execute on function private.set_member_role_impl(uuid, public.role) from public, anon;
grant execute on function private.set_member_role_impl(uuid, public.role) to authenticated;

create or replace function public.set_member_role(target_profile_id uuid, target_role public.role)
returns public.profiles language sql security invoker set search_path = ''
as $$ select private.set_member_role_impl(target_profile_id, target_role) $$;
revoke execute on function public.set_member_role(uuid, public.role) from public, anon;
grant execute on function public.set_member_role(uuid, public.role) to authenticated;

create or replace function private.accept_my_invitation_impl()
returns void language sql security definer set search_path = ''
as $$
  update public.workspace_invitations
  set accepted_by = (select auth.uid()), accepted_at = coalesce(accepted_at, now())
  where lower(email) = lower((select auth.jwt() ->> 'email'))
    and accepted_at is null and revoked_at is null and expires_at > now()
$$;
revoke execute on function private.accept_my_invitation_impl() from public, anon;
grant execute on function private.accept_my_invitation_impl() to authenticated;

create or replace function public.accept_my_invitation()
returns void language sql security invoker set search_path = ''
as $$ select private.accept_my_invitation_impl() $$;
revoke execute on function public.accept_my_invitation() from public, anon;
grant execute on function public.accept_my_invitation() to authenticated;

alter table public.workspace_settings enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.content_versions enable row level security;
alter table public.publishing_jobs enable row level security;
alter table public.webhook_events enable row level security;

create policy settings_read on public.workspace_settings for select to authenticated
using (workspace_id = public.current_workspace_id());
create policy settings_admin_write on public.workspace_settings for all to authenticated
using (workspace_id = public.current_workspace_id() and public.current_role_name() = 'admin')
with check (workspace_id = public.current_workspace_id() and public.current_role_name() = 'admin');

create policy invitations_manage on public.workspace_invitations for all to authenticated
using (workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager'))
with check (workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager'));

create policy versions_read on public.content_versions for select to authenticated
using (workspace_id = public.current_workspace_id());
create policy versions_insert on public.content_versions for insert to authenticated
with check (
  workspace_id = public.current_workspace_id()
  and created_by = (select auth.uid())
  and public.current_role_name() in ('admin','manager','editor')
);

create policy publishing_jobs_read on public.publishing_jobs for select to authenticated
using (workspace_id = public.current_workspace_id());
create policy publishing_jobs_manage on public.publishing_jobs for all to authenticated
using (workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager'))
with check (workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager'));

-- Webhook events are server-only.
revoke all on public.webhook_events from anon, authenticated;

-- Replace the overly broad approval policies from the initial migration.
drop policy if exists approval_requests_ins on public.approval_requests;
drop policy if exists approval_requests_upd on public.approval_requests;
drop policy if exists approval_requests_del on public.approval_requests;
drop policy if exists approvals_decide on public.approval_requests;
create policy approvals_request on public.approval_requests for insert to authenticated
with check (
  workspace_id = public.current_workspace_id()
  and requested_by = (select auth.uid())
  and public.current_role_name() in ('admin','manager','editor')
);
create policy approvals_decide on public.approval_requests for update to authenticated
using (workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager'))
with check (
  workspace_id = public.current_workspace_id()
  and reviewed_by = (select auth.uid())
  and public.current_role_name() in ('admin','manager')
);

-- Limit self-service profile updates to non-security fields.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, job_title) on public.profiles to authenticated;

-- Explicit Data API grants for the 2026 opt-in exposure model.
grant usage on schema public to authenticated;
grant select on public.workspace_settings, public.workspace_invitations,
  public.content_versions, public.publishing_jobs to authenticated;
grant insert, update, delete on public.workspace_settings, public.workspace_invitations,
  public.publishing_jobs to authenticated;
grant insert on public.content_versions to authenticated;

revoke all on public.workspaces, public.profiles, public.campaigns, public.content_items,
  public.content_assets, public.content_platforms, public.comments, public.activity_logs,
  public.tags, public.content_item_tags, public.notifications, public.approval_requests from anon;
grant select on public.workspaces, public.profiles, public.campaigns, public.content_items,
  public.content_assets, public.content_platforms, public.comments, public.activity_logs,
  public.tags, public.content_item_tags, public.notifications, public.approval_requests to authenticated;
grant insert, update, delete on public.campaigns, public.content_items, public.content_assets,
  public.content_platforms, public.comments, public.tags, public.content_item_tags to authenticated;
grant insert on public.activity_logs, public.notifications, public.approval_requests to authenticated;
grant update on public.notifications, public.approval_requests to authenticated;

drop policy if exists content_assets_ins on public.content_assets;
drop policy if exists content_assets_upd on public.content_assets;
drop policy if exists content_assets_del on public.content_assets;
create policy content_assets_ins on public.content_assets for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and uploaded_by = (select auth.uid())
  and public.current_role_name() in ('admin','manager','editor')
);
create policy content_assets_upd on public.content_assets for update to authenticated using (
  workspace_id = public.current_workspace_id() and uploaded_by = (select auth.uid())
) with check (workspace_id = public.current_workspace_id());
create policy content_assets_del on public.content_assets for delete to authenticated using (
  workspace_id = public.current_workspace_id()
  and (uploaded_by = (select auth.uid()) or public.current_role_name() in ('admin','manager'))
);

drop policy if exists content_platforms_ins on public.content_platforms;
drop policy if exists content_platforms_upd on public.content_platforms;
drop policy if exists content_platforms_del on public.content_platforms;
create policy content_platforms_ins on public.content_platforms for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager','editor')
);
create policy content_platforms_upd on public.content_platforms for update to authenticated using (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager','editor')
) with check (workspace_id = public.current_workspace_id());
create policy content_platforms_del on public.content_platforms for delete to authenticated using (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager','editor')
);

drop policy if exists comments_ins on public.comments;
drop policy if exists comments_upd on public.comments;
drop policy if exists comments_del on public.comments;
create policy comments_ins on public.comments for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and user_id = (select auth.uid())
);
create policy comments_upd on public.comments for update to authenticated using (
  workspace_id = public.current_workspace_id() and user_id = (select auth.uid())
) with check (workspace_id = public.current_workspace_id() and user_id = (select auth.uid()));
create policy comments_del on public.comments for delete to authenticated using (
  workspace_id = public.current_workspace_id()
  and (user_id = (select auth.uid()) or public.current_role_name() in ('admin','manager'))
);

drop policy if exists activity_logs_ins on public.activity_logs;
drop policy if exists activity_logs_upd on public.activity_logs;
drop policy if exists activity_logs_del on public.activity_logs;
create policy activity_logs_ins on public.activity_logs for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and user_id = (select auth.uid())
);

drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_ins on public.notifications;
drop policy if exists notifications_upd on public.notifications;
drop policy if exists notifications_del on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_ins on public.notifications for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and user_id = (select auth.uid())
);
create policy notifications_upd on public.notifications for update to authenticated using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists tags_ins on public.tags;
drop policy if exists tags_upd on public.tags;
drop policy if exists tags_del on public.tags;
create policy tags_ins on public.tags for insert to authenticated with check (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager','editor')
);
create policy tags_upd on public.tags for update to authenticated using (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager','editor')
) with check (workspace_id = public.current_workspace_id());
create policy tags_del on public.tags for delete to authenticated using (
  workspace_id = public.current_workspace_id() and public.current_role_name() in ('admin','manager')
);

create or replace function private.enforce_content_workflow()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.master_status <> 'draft' then raise exception 'New content must start as draft'; end if;
  if tg_op = 'UPDATE' and new.master_status is distinct from old.master_status then
    if public.current_role_name() not in ('admin','manager','editor') then raise exception 'Insufficient permission'; end if;
    if new.master_status = 'approved' and public.current_role_name() not in ('admin','manager') then raise exception 'Only managers can approve'; end if;
    if not case old.master_status
      when 'draft' then new.master_status in ('in_review','archived')
      when 'in_review' then new.master_status in ('changes_requested','approved','draft')
      when 'changes_requested' then new.master_status in ('in_review','draft','archived')
      when 'approved' then new.master_status in ('scheduled','changes_requested','draft')
      when 'scheduled' then new.master_status in ('posted','approved','draft')
      when 'posted' then new.master_status = 'archived'
      when 'archived' then new.master_status = 'draft'
      else false end then raise exception 'Invalid workflow transition'; end if;
  end if;
  return new;
end $$;
drop trigger if exists enforce_content_workflow on public.content_items;
create trigger enforce_content_workflow before insert or update on public.content_items
for each row execute function private.enforce_content_workflow();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'content_items','content_platforms','content_assets','campaigns','comments',
    'notifications','approval_requests','publishing_jobs'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('content-assets', 'content-assets', false, 104857600, array['image/jpeg','image/png','image/webp','video/mp4','application/pdf']),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists workspace_assets_read on storage.objects;
drop policy if exists workspace_assets_insert on storage.objects;
drop policy if exists workspace_assets_update on storage.objects;
drop policy if exists workspace_assets_delete on storage.objects;
create policy workspace_assets_read on storage.objects for select to authenticated
using (bucket_id in ('content-assets','avatars') and (storage.foldername(name))[1] = public.current_workspace_id()::text);
create policy workspace_assets_insert on storage.objects for insert to authenticated
with check (
  bucket_id in ('content-assets','avatars')
  and (storage.foldername(name))[1] = public.current_workspace_id()::text
  and public.current_role_name() in ('admin','manager','editor')
);
create policy workspace_assets_update on storage.objects for update to authenticated
using (
  bucket_id in ('content-assets','avatars')
  and (storage.foldername(name))[1] = public.current_workspace_id()::text
  and owner_id = (select auth.uid()::text)
)
with check ((storage.foldername(name))[1] = public.current_workspace_id()::text);
create policy workspace_assets_delete on storage.objects for delete to authenticated
using (
  bucket_id in ('content-assets','avatars')
  and (storage.foldername(name))[1] = public.current_workspace_id()::text
  and (owner_id = (select auth.uid()::text) or public.current_role_name() in ('admin','manager'))
);
