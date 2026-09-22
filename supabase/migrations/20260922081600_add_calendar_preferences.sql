alter table public.workspace_settings
  add column if not exists working_days smallint[] not null default array[1,2,3,4,5]::smallint[],
  add column if not exists khmer_lunar_enabled boolean not null default true;

alter table public.workspace_settings
  drop constraint if exists workspace_settings_working_days_check;

alter table public.workspace_settings
  add constraint workspace_settings_working_days_check
  check (
    cardinality(working_days) between 1 and 7
    and working_days <@ array[0,1,2,3,4,5,6]::smallint[]
  );
