# ContentFlow

Content operations platform for teams to plan, review, schedule, and track multi-platform publishing.

## What is included

- React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, React Hook Form, and Zod
- Dual backend adapter: self-contained mock mode or Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- Workspace-scoped RLS with server-enforced roles and content workflow transitions
- Content, campaigns, Kanban board, calendar, assets, comments, team roles, notifications, reports, settings, approvals, version history, and publishing job monitoring
- Workspace onboarding, My Work queues, calendar agenda view, board filters, approval triage, publishing retry, readiness checks, team workload, campaign risk, platform validation, and automation dry-run safety checks
- Facebook/TikTok publishing readiness, bulk content actions, saved views, operational analytics, daily digest previews, and session recovery hardening
- Private signed asset URLs, durable publishing queue records, and secure server-side member invitations
- CI checks for lint, tests, type safety, and production build

## Local demo

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Keep `VITE_DATA_BACKEND=mock`. Demo accounts use password `password`:

| Email | Role |
|---|---|
| `admin@demo.com` | Admin |
| `manager@demo.com` | Manager |
| `editor@demo.com` | Editor |
| `viewer@demo.com` | Viewer |

When using Supabase locally, the checked-in `supabase/seed.sql` creates the same
four accounts plus a complete ContentFlow Demo Studio workspace with campaigns,
50 content items, platform variants, approvals, comments, notifications,
publishing jobs, social connection examples, and automation rules. Run
`supabase db reset` after starting Supabase to load it. The seed is intended for
local/demo environments only and must not be applied to production data.

Mock data is stored in browser `localStorage`; Settings includes a mock-only reset control.

## Supabase production setup

1. Install Docker Desktop and the Supabase CLI.
2. Run `supabase start`, then `supabase db reset` to validate both migrations locally.
3. Link the remote project with `supabase link --project-ref <project-ref>`.
4. Apply migrations with `supabase db push`.
5. Set `APP_URL` to the production origin and deploy the invitation function:

```powershell
supabase secrets set APP_URL=https://your-app.example
supabase functions deploy invite-member
```

6. Configure the frontend environment:

```dotenv
VITE_DATA_BACKEND=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_BROWSER_SAFE_PUBLISHABLE_KEY
```

Never put a secret/service-role key in a `VITE_*` variable. Authenticated users without a workspace can create their first workspace from `/app/onboarding`; later members can be invited from Team.

### monday.com integration foundation

The monday integration is server-only: deploy `monday-oauth-start` and
`monday-oauth-callback`, then configure `MONDAY_CLIENT_ID`,
`MONDAY_CLIENT_SECRET`, and `MONDAY_REDIRECT_URI` as Edge Function secrets.
OAuth state and the PKCE verifier are short-lived; access tokens are stored
only in Supabase Vault and referenced by an opaque `credentials_ref`.
The provider pins monday API version `2026-07`, sends a request id for
idempotency, and classifies GraphQL/rate-limit failures for safe retries.
Board/column mappings are persisted in `monday_board_mappings`. Do not add
the client secret or access token to frontend code or any `VITE_*` variable.

The database migration creates private Storage buckets, workspace policies, approval RPCs, version snapshots, role-management RPCs, invitation tracking, workspace onboarding, and publishing job synchronization. A workspace owns the team and content operation; Facebook and TikTok are connected channels inside that workspace rather than separate workspaces. Actual social-network publishing still requires provider credentials and worker/provider adapters; failed and queued jobs are visible under Operations.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run Vitest |
| `npm run build` | Typecheck and create a production bundle |

## Main routes

- `/app/dashboard`, `/app/content`, `/app/board`, `/app/calendar`
- `/app/my-work`, `/app/campaigns`, `/app/assets`, `/app/team`, `/app/team/workload`, `/app/operations`
- `/app/reports`, `/app/settings`, `/app/notifications`, `/app/profile`

## UX and operations updates

### Workspace onboarding

- Added self-serve workspace creation for authenticated users without an active workspace.
- The workspace is the business/team container for content, campaigns, approvals, reports, and connected social channels.
- Facebook and TikTok accounts are managed as channels inside the workspace.

### Daily work center

- Added `/app/my-work` with overdue, due-today, and upcoming work queues.
- Dashboard metrics now link directly to useful filtered work views.
- Added board search, status, and assignee filters.
- Added calendar agenda view alongside the month view.

### Approval and publishing operations

- Added approval search and additional content context.
- Added optional notes when requesting changes.
- Added publishing status and failure filters.
- Added inline publishing failure details and retry actions.

### Content production

- Added duplicate-as-draft for faster content creation.
- Duplicated platform captions and hashtags while resetting publishing state.
- Added live readiness checks for title, brief, campaign, owner, platforms, and platform checklists.

### Team accountability

- Added `/app/team/workload` with per-member active workload, due-soon work, overdue work, and capacity signals.
- Added campaign risk summaries based on incomplete, overdue, and deadline-sensitive content.

### Platform intelligence and automation safety

- Added platform-specific caption validation and length limits.
- Added hashtag warnings and platform previews.
- Added connected-account health indicators.
- Added non-executing automation dry-run safety checks.

The current test suite covers workspace creation, readiness checks, workload calculations, platform validation, and automation dry-run behavior.

## Next-phase updates

### Facebook and TikTok publishing readiness

- Added connection health classification for healthy, stale, and action-required accounts.
- Added provider-specific publishing readiness checks.
- Added setup and recovery guidance when a social account is missing, disconnected, or lacks a configured publishing worker.
- Publishing readiness does not claim that a provider worker exists when only OAuth connection is configured.

### Bulk workflows and saved views

- Added multi-select content actions for status and assignee updates.
- Added permission-aware bulk status transitions.
- Added persisted saved content views for repeated operational queues.

### Analytics and daily digest

- Added approval turnaround and publishing success/failure metrics.
- Added publishing success-rate reporting.
- Added actionable daily digest previews for unread notifications, approvals, failures, and overdue work.

### Reliability and security hardening

- Supabase sessions are verified with `auth.getUser()` before use.
- Invalid or mismatched sessions are cleared safely.
- Mock sessions use strict persisted-data validation.
- Authentication/profile initialization failures now show a user-facing recovery screen with retry.

## Production checklist

- Apply and lint migrations against a local or linked Supabase database.
- Configure SMTP and Supabase Auth redirect URLs.
- Deploy `invite-member` and restrict `APP_URL` to the deployed origin.
- Add provider-specific publishing workers and credentials before automatic posting.
- Enable monitoring, backups, rate limiting/WAF, and error reporting.
