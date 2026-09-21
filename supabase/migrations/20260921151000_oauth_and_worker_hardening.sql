-- Keep the OAuth return destination in the database so the callback can
-- complete the flow without trusting client state after the redirect.
alter table public.social_oauth_states
  add column if not exists return_url text;

alter table public.social_oauth_states
  add constraint social_oauth_states_return_url_length
  check (return_url is null or length(return_url) between 1 and 2048);

-- Validate the column and the worker completion timestamp used by the
-- automation runner before deploying the edge functions.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'automation_runs'
      and column_name = 'completed_at'
  ) then
    raise exception 'automation_runs.completed_at is required by automation-runner';
  end if;
end $$;
