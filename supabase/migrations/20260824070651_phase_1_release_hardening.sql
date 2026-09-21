-- Phase 1: release hardening. These rules protect tenant boundaries and prevent
-- browser clients from mutating server-managed records.

-- A slug is only meaningful inside its workspace. This also makes links stable
-- without preventing different workspaces from using the same slug.
create unique index if not exists content_items_workspace_slug_key
  on public.content_items (workspace_id, slug);

-- Composite keys ensure every child points to a record in the same workspace.
-- NOT VALID keeps this migration deployable when repairing existing projects;
-- PostgreSQL still enforces the relationships for all new writes.
create unique index if not exists campaigns_workspace_id_id_key on public.campaigns (workspace_id, id);
create unique index if not exists content_items_workspace_id_id_key on public.content_items (workspace_id, id);

alter table public.content_items
  add constraint content_items_campaign_same_workspace_fk
  foreign key (workspace_id, campaign_id)
  references public.campaigns (workspace_id, id)
  not valid;

alter table public.content_assets
  add constraint content_assets_item_same_workspace_fk
  foreign key (workspace_id, content_item_id)
  references public.content_items (workspace_id, id)
  not valid;

alter table public.content_platforms
  add constraint content_platforms_item_same_workspace_fk
  foreign key (workspace_id, content_item_id)
  references public.content_items (workspace_id, id)
  not valid;

alter table public.comments
  add constraint comments_item_same_workspace_fk
  foreign key (workspace_id, content_item_id)
  references public.content_items (workspace_id, id)
  not valid;

alter table public.approval_requests
  add constraint approval_requests_item_same_workspace_fk
  foreign key (workspace_id, content_item_id)
  references public.content_items (workspace_id, id)
  not valid;

-- A manager can only change editors/viewers. An admin may change any role, but
-- no action may remove or demote the final workspace admin.
create or replace function private.protect_profile_security_fields()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare actor public.profiles;
begin
  select * into actor from public.profiles where id = (select auth.uid());

  if new.workspace_id is distinct from old.workspace_id then
    if actor.role is distinct from 'admin'::public.role then
      raise exception 'Only workspace admins can change workspace membership';
    end if;
  end if;

  if new.role is distinct from old.role then
    if old.role = 'admin'::public.role
       and not exists (
         select 1 from public.profiles p
         where p.workspace_id = old.workspace_id and p.role = 'admin'::public.role and p.id <> old.id
       ) then
      raise exception 'A workspace must retain at least one admin';
    end if;

    if actor.role = 'admin'::public.role then
      return new;
    end if;
    if actor.role = 'manager'::public.role
       and old.role in ('editor'::public.role, 'viewer'::public.role)
       and new.role in ('editor'::public.role, 'viewer'::public.role) then
      return new;
    end if;
    raise exception 'Insufficient permission to change this member role';
  end if;
  return new;
end $$;

-- Content ownership and derived workflow metadata are controlled by the
-- database, not request payloads. The trigger complements RLS because a user
-- could otherwise change system columns in an otherwise permitted UPDATE.
create or replace function private.enforce_content_workflow()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is distinct from (select auth.uid()) then
      raise exception 'created_by must be the authenticated user';
    end if;
    if new.master_status <> 'draft' then
      raise exception 'New content must start as draft';
    end if;
    new.approved_by := null;
    new.approved_at := null;
    new.posted_at := null;
    new.archived_at := null;
    return new;
  end if;

  if new.workspace_id is distinct from old.workspace_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Content workspace and creator cannot be changed';
  end if;

  if new.master_status = old.master_status then
    if (new.approved_by, new.approved_at, new.posted_at, new.archived_at)
       is distinct from (old.approved_by, old.approved_at, old.posted_at, old.archived_at) then
      raise exception 'Workflow metadata is managed by the database';
    end if;
    return new;
  end if;

  if public.current_role_name() not in ('admin','manager','editor') then
    raise exception 'Insufficient permission';
  end if;
  if new.master_status = 'approved' and public.current_role_name() not in ('admin','manager') then
    raise exception 'Only managers can approve';
  end if;
  if not case old.master_status
    when 'draft' then new.master_status in ('in_review','archived')
    when 'in_review' then new.master_status in ('changes_requested','approved','draft')
    when 'changes_requested' then new.master_status in ('in_review','draft','archived')
    when 'approved' then new.master_status in ('scheduled','changes_requested','draft')
    when 'scheduled' then new.master_status in ('posted','approved','draft')
    when 'posted' then new.master_status = 'archived'
    when 'archived' then new.master_status = 'draft'
    else false end then
    raise exception 'Invalid workflow transition';
  end if;

  if new.master_status = 'approved' then
    new.approved_by := (select auth.uid());
    new.approved_at := now();
  else
    new.approved_by := null;
    new.approved_at := null;
  end if;
  new.posted_at := case when new.master_status = 'posted' then now() else null end;
  new.archived_at := case when new.master_status = 'archived' then now() else null end;
  return new;
end $$;

-- Insert policies must bind ownership to the authenticated principal.
drop policy if exists content_ins on public.content_items;
create policy content_ins on public.content_items for insert to authenticated
with check (
  workspace_id = public.current_workspace_id()
  and created_by = (select auth.uid())
  and public.current_role_name() in ('admin','manager','editor')
);

-- Snapshots are created by the version trigger. Clients can read their
-- workspace history but can never add, alter, or remove historical records.
drop policy if exists versions_insert on public.content_versions;
revoke insert, update, delete on public.content_versions from authenticated;

-- Browser clients may read an audit trail, but only database triggers write it.
-- This prevents fabricated actors, timestamps, and change payloads.
create or replace function private.log_content_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.activity_logs (
    workspace_id, content_item_id, user_id, action_type, old_value, new_value
  ) values (
    new.workspace_id,
    new.id,
    coalesce((select auth.uid()), new.created_by),
    case when tg_op = 'INSERT' then 'content.created'
         when new.master_status is distinct from old.master_status then 'content.status_changed'
         else 'content.updated' end,
    case when tg_op = 'INSERT' then null
         else jsonb_build_object('title', old.title, 'slug', old.slug, 'status', old.master_status) end,
    jsonb_build_object('title', new.title, 'slug', new.slug, 'status', new.master_status)
  );
  return new;
end $$;

drop trigger if exists log_content_activity on public.content_items;
create trigger log_content_activity
after insert or update on public.content_items
for each row execute function private.log_content_activity();

drop policy if exists activity_logs_ins on public.activity_logs;
drop policy if exists activity_logs_upd on public.activity_logs;
drop policy if exists activity_logs_del on public.activity_logs;
revoke insert, update, delete on public.activity_logs from authenticated;
