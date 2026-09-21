-- monday.com foundation: OAuth state, vault-backed tokens and explicit board mappings.
alter table public.social_connections drop constraint if exists social_connections_provider_check;
alter table public.social_connections add constraint social_connections_provider_check
  check (provider in ('facebook','instagram','telegram','tiktok','youtube','monday'));
alter table public.social_connections drop constraint if exists social_connections_account_type_check;
alter table public.social_connections add constraint social_connections_account_type_check
  check (account_type in ('page','profile','channel','group','bot','board'));

create table if not exists public.monday_oauth_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  code_challenge text not null,
  verifier_ref text not null,
  return_url text not null check (length(return_url) between 1 and 2048),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists monday_oauth_states_expiry_idx on public.monday_oauth_states(expires_at);
alter table public.monday_oauth_states enable row level security;
revoke all on public.monday_oauth_states from public, anon, authenticated;

create table if not exists public.monday_board_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  board_id text not null,
  board_name text not null,
  columns jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (workspace_id, connection_id, board_id)
);
alter table public.monday_board_mappings enable row level security;
create policy monday_board_mappings_select on public.monday_board_mappings
  for select to authenticated using (workspace_id = public.current_workspace_id());
create policy monday_board_mappings_manage on public.monday_board_mappings
  for all to authenticated using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- Token values are only stored in Supabase Vault. credentials_ref is an opaque vault id.
comment on column public.social_connections.credentials_ref is
  'Opaque Supabase Vault secret id; never return or expose the token to browser/VITE code.';

create table if not exists public.monday_mutations (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  request_id text not null,
  operation text not null,
  status text not null default 'pending' check (status in ('pending','succeeded','failed')),
  response jsonb,
  created_at timestamptz not null default now(),
  unique (connection_id, request_id)
);
comment on table public.monday_mutations is
  'Server-side idempotency ledger. Do not retry a mutation without reusing request_id.';
