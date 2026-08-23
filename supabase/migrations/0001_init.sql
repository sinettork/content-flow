-- ContentFlow initial schema
-- Run with: supabase db push  (or paste into SQL editor)

create extension if not exists "pgcrypto";

-- =====================================================
-- Enums
-- =====================================================
do $$ begin
  create type role as enum ('admin','manager','editor','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type as enum ('image','carousel','video','reel','story','animation','document');
exception when duplicate_object then null; end $$;

do $$ begin
  create type master_status as enum ('draft','in_review','changes_requested','approved','scheduled','posted','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type platform_name as enum ('facebook','instagram','tiktok','telegram','youtube_shorts');
exception when duplicate_object then null; end $$;

do $$ begin
  create type platform_status as enum ('not_planned','draft','scheduled','posted','failed','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('active','completed','paused','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_decision as enum ('approved','changes_requested','rejected');
exception when duplicate_object then null; end $$;

-- =====================================================
-- Tables
-- =====================================================
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_path text,
  role role not null default 'editor',
  job_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_workspace on profiles(workspace_id);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#3b82f6',
  start_date date,
  end_date date,
  owner_id uuid not null references auth.users(id),
  status campaign_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_workspace on campaigns(workspace_id);

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  title text not null,
  slug text not null,
  content_type content_type not null default 'image',
  master_status master_status not null default 'draft',
  priority priority not null default 'medium',
  brief text,
  thumbnail_asset_id uuid,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  due_at timestamptz,
  scheduled_at timestamptz,
  posted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_content_workspace on content_items(workspace_id);
create index if not exists idx_content_campaign on content_items(campaign_id);
create index if not exists idx_content_assigned on content_items(assigned_to);
create index if not exists idx_content_status on content_items(master_status);
create index if not exists idx_content_scheduled on content_items(scheduled_at);
create index if not exists idx_content_posted on content_items(posted_at);

create table if not exists content_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  asset_type text not null,
  storage_bucket text not null default 'content-assets',
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  width int,
  height int,
  duration_seconds int,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_assets_item on content_assets(content_item_id);

alter table content_items
  add constraint content_items_thumbnail_fk
  foreign key (thumbnail_asset_id) references content_assets(id) on delete set null
  deferrable initially deferred;

create table if not exists content_platforms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  platform_name platform_name not null,
  platform_status platform_status not null default 'not_planned',
  caption text not null default '',
  hashtags text not null default '',
  scheduled_at timestamptz,
  posted_at timestamptz,
  post_url text,
  posted_by uuid references auth.users(id),
  checklist_completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_item_id, platform_name)
);
create index if not exists idx_platforms_item on content_platforms(content_item_id);
create index if not exists idx_platforms_status on content_platforms(platform_status);
create index if not exists idx_platforms_name on content_platforms(platform_name);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comments_item on comments(content_item_id);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action_type text not null,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_item on activity_logs(content_item_id);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists content_item_tags (
  content_item_id uuid not null references content_items(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (content_item_id, tag_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifs_user on notifications(user_id, is_read);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  decision approval_decision,
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_approvals_item on approval_requests(content_item_id);

-- =====================================================
-- Helpers
-- =====================================================
create or replace function current_workspace_id()
returns uuid language sql stable as $$
  select workspace_id from profiles where id = auth.uid()
$$;

create or replace function current_role_name()
returns role language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array['profiles','campaigns','content_items','content_platforms','comments']) loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$s', t);
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- =====================================================
-- Row Level Security
-- =====================================================
alter table workspaces enable row level security;
alter table profiles enable row level security;
alter table campaigns enable row level security;
alter table content_items enable row level security;
alter table content_assets enable row level security;
alter table content_platforms enable row level security;
alter table comments enable row level security;
alter table activity_logs enable row level security;
alter table tags enable row level security;
alter table content_item_tags enable row level security;
alter table notifications enable row level security;
alter table approval_requests enable row level security;

-- workspaces: members can read their own; only admin can update
drop policy if exists workspaces_select on workspaces;
create policy workspaces_select on workspaces for select
  using (id = current_workspace_id());
drop policy if exists workspaces_update on workspaces;
create policy workspaces_update on workspaces for update
  using (id = current_workspace_id() and current_role_name() = 'admin');

-- profiles: read same workspace; update own; admin can update all
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (workspace_id = current_workspace_id());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update
  using (id = auth.uid() or (workspace_id = current_workspace_id() and current_role_name() = 'admin'));
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

-- Generic workspace-scoped tables helper macro via repeated policies.
-- campaigns
drop policy if exists campaigns_select on campaigns;
create policy campaigns_select on campaigns for select using (workspace_id = current_workspace_id());
drop policy if exists campaigns_ins on campaigns;
create policy campaigns_ins on campaigns for insert with check (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager')
);
drop policy if exists campaigns_upd on campaigns;
create policy campaigns_upd on campaigns for update using (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager')
);
drop policy if exists campaigns_del on campaigns;
create policy campaigns_del on campaigns for delete using (
  workspace_id = current_workspace_id() and current_role_name() = 'admin'
);

-- content_items
drop policy if exists content_select on content_items;
create policy content_select on content_items for select using (workspace_id = current_workspace_id());
drop policy if exists content_ins on content_items;
create policy content_ins on content_items for insert with check (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager','editor')
);
drop policy if exists content_upd on content_items;
create policy content_upd on content_items for update using (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager','editor')
);
drop policy if exists content_del on content_items;
create policy content_del on content_items for delete using (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager')
);

-- Shared workspace-scoped read/write for the rest
do $$
declare tbl text;
begin
  for tbl in select unnest(array[
    'content_assets','content_platforms','comments','activity_logs','tags','notifications','approval_requests'
  ]) loop
    execute format('drop policy if exists %1$s_select on %1$s', tbl);
    execute format('create policy %1$s_select on %1$s for select using (workspace_id = current_workspace_id())', tbl);
    execute format('drop policy if exists %1$s_ins on %1$s', tbl);
    execute format('create policy %1$s_ins on %1$s for insert with check (workspace_id = current_workspace_id())', tbl);
    execute format('drop policy if exists %1$s_upd on %1$s', tbl);
    execute format('create policy %1$s_upd on %1$s for update using (workspace_id = current_workspace_id())', tbl);
    execute format('drop policy if exists %1$s_del on %1$s', tbl);
    execute format('create policy %1$s_del on %1$s for delete using (workspace_id = current_workspace_id())', tbl);
  end loop;
end $$;

-- content_item_tags: join table, scoped by content item's workspace
drop policy if exists cit_select on content_item_tags;
create policy cit_select on content_item_tags for select using (
  exists (select 1 from content_items ci where ci.id = content_item_id and ci.workspace_id = current_workspace_id())
);
drop policy if exists cit_mod on content_item_tags;
create policy cit_mod on content_item_tags for all using (
  exists (select 1 from content_items ci where ci.id = content_item_id and ci.workspace_id = current_workspace_id())
) with check (
  exists (select 1 from content_items ci where ci.id = content_item_id and ci.workspace_id = current_workspace_id())
);

-- Approvals: only admin/manager can create decisions
drop policy if exists approvals_decide on approval_requests;
create policy approvals_decide on approval_requests for update using (
  workspace_id = current_workspace_id() and current_role_name() in ('admin','manager')
);

-- =====================================================
-- Storage buckets (run manually if not using CLI)
-- =====================================================
-- insert into storage.buckets (id, name, public) values ('content-assets','content-assets', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('avatars','avatars', false) on conflict do nothing;
