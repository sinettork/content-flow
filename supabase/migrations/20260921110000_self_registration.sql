-- ContentFlow self-registration
-- Creates a personal workspace and profile for every newly registered user.
-- This runs as a security-definer trigger because browser clients cannot create
-- workspaces directly under the tenant RLS policies.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_uuid uuid;
  display_name text;
  workspace_name text;
  workspace_slug text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  workspace_name := display_name || '''s Workspace';
  workspace_slug := lower(regexp_replace(workspace_name, '[^a-zA-Z0-9]+', '-', 'g'));
  workspace_slug := trim(both '-' from workspace_slug) || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug, created_by)
  values (workspace_name, workspace_slug, new.id)
  returning id into workspace_uuid;

  insert into public.profiles (id, workspace_id, full_name, email, role)
  values (new.id, workspace_uuid, display_name, coalesce(new.email, ''), 'admin');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
