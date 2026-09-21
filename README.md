# ContentFlow

Content operations platform for teams to plan, review, schedule, and track multi-platform publishing.

## What is included

- React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, React Hook Form, and Zod
- Dual backend adapter: self-contained mock mode or Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- Workspace-scoped RLS with server-enforced roles and content workflow transitions
- Content, campaigns, Kanban board, calendar, assets, comments, team roles, notifications, reports, settings, approvals, version history, and publishing job monitoring
- Workspace onboarding, My Work queues, calendar agenda view, board filters, approval triage, publishing retry, readiness checks, team workload, campaign risk, platform validation, and automation dry-run safety checks
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

## Production checklist

- Apply and lint migrations against a local or linked Supabase database.
- Configure SMTP and Supabase Auth redirect URLs.
- Deploy `invite-member` and restrict `APP_URL` to the deployed origin.
- Add provider-specific publishing workers and credentials before automatic posting.
- Enable monitoring, backups, rate limiting/WAF, and error reporting.
