create or replace function public.claim_automation_runs(p_limit integer default 10)
returns table (
  id uuid,
  workspace_id uuid,
  rule_id uuid,
  event_id uuid,
  attempt_count integer,
  idempotency_key text,
  input jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select ar.id
    from public.automation_runs ar
    where ar.status = 'queued'
      and ar.attempt_count < 5
    order by ar.created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 50))
  ),
  claimed as (
    update public.automation_runs ar
    set status = 'running',
        attempt_count = ar.attempt_count + 1,
        started_at = coalesce(ar.started_at, now())
    from candidates c
    where ar.id = c.id
    returning ar.id, ar.workspace_id, ar.rule_id, ar.event_id,
              ar.attempt_count, ar.idempotency_key, ar.input
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_automation_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_automation_runs(integer) to service_role;
