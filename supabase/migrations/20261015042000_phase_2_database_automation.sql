-- Phase 2: tighten integration write permissions and make automation notifications idempotent.
begin;

-- Only workspace administrators and managers may configure Monday board mappings.
drop policy if exists monday_board_mappings_manage on public.monday_board_mappings;
create policy monday_board_mappings_manage
  on public.monday_board_mappings
  for all
  to authenticated
  using (
    workspace_id = (select public.current_workspace_id())
    and (select public.current_role_name()) in ('admin', 'manager')
  )
  with check (
    workspace_id = (select public.current_workspace_id())
    and (select public.current_role_name()) in ('admin', 'manager')
  );

-- A mapping must reference a connection in the same workspace.
create unique index if not exists social_connections_workspace_id_id_key
  on public.social_connections (workspace_id, id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monday_board_mappings_connection_same_workspace_fk'
      and conrelid = 'public.monday_board_mappings'::regclass
  ) then
    alter table public.monday_board_mappings
      add constraint monday_board_mappings_connection_same_workspace_fk
      foreign key (workspace_id, connection_id)
      references public.social_connections (workspace_id, id)
      on delete cascade
      not valid;
  end if;
end
$$;

-- The mutation ledger is backend-only: no browser role should read or alter it.
alter table public.monday_mutations enable row level security;
revoke all on table public.monday_mutations from public, anon, authenticated;
grant all on table public.monday_mutations to service_role;

-- Notifications emitted by one automation run must not duplicate for a recipient
-- if a worker retries after inserting notifications but before marking the run complete.
alter table public.notifications
  add column if not exists automation_run_id uuid
  references public.automation_runs(id) on delete cascade;

create unique index if not exists notifications_automation_run_recipient_key
  on public.notifications (automation_run_id, user_id);

commit;
