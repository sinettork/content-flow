-- Allow an authenticated user whose profile is missing to create their first
-- business workspace without weakening tenant RLS policies.
create or replace function public.create_workspace_for_current_user(
  workspace_name text,
  display_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_uuid uuid;
  clean_name text;
  clean_display_name text;
  workspace_slug text;
  result_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'User already belongs to a workspace';
  end if;

  clean_name := nullif(trim(workspace_name), '');
  if clean_name is null then
    raise exception 'Workspace name is required';
  end if;

  clean_display_name := coalesce(
    nullif(trim(display_name), ''),
    split_part(coalesce((select email from auth.users where id = auth.uid()), ''), '@', 1),
    'Workspace admin'
  );
  workspace_slug := trim(both '-' from lower(regexp_replace(clean_name, '[^a-zA-Z0-9]+', '-', 'g')));
  workspace_slug := coalesce(nullif(workspace_slug, ''), 'workspace') || '-' || substr(auth.uid()::text, 1, 8);

  insert into public.workspaces (name, slug, created_by)
  values (clean_name, workspace_slug, auth.uid())
  returning id into workspace_uuid;

  insert into public.profiles (id, workspace_id, full_name, email, role)
  select auth.uid(), workspace_uuid, clean_display_name, coalesce(email, ''), 'admin'
  from auth.users
  where id = auth.uid()
  returning * into result_profile;

  return result_profile;
end;
$$;

revoke execute on function public.create_workspace_for_current_user(text, text) from public, anon;
grant execute on function public.create_workspace_for_current_user(text, text) to authenticated;
