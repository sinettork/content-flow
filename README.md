# ContentFlow

Content operations platform for teams to plan, review, schedule, and track multi-platform publishing.

## What is included

- React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, React Hook Form, and Zod
- Dual backend adapter: self-contained mock mode or Supabase Auth, Postgres, Realtime, Storage, and Edge Functions
- Workspace-scoped RLS with server-enforced roles and content workflow transitions
- Content, campaigns, Kanban board, calendar, assets, comments, team roles, notifications, reports, settings, approvals, version history, and publishing job monitoring
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

Never put a secret/service-role key in a `VITE_*` variable. Create the initial workspace and admin profile using a trusted server/admin process; later members can be invited from Team.

The database migration creates private Storage buckets, workspace policies, approval RPCs, version snapshots, role-management RPCs, invitation tracking, and publishing job synchronization. Actual social-network publishing still requires provider credentials and worker/provider adapters; failed and queued jobs are visible under Operations.

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
- `/app/campaigns`, `/app/assets`, `/app/team`, `/app/operations`
- `/app/reports`, `/app/settings`, `/app/notifications`, `/app/profile`

## Production checklist

- Apply and lint migrations against a local or linked Supabase database.
- Configure SMTP and Supabase Auth redirect URLs.
- Deploy `invite-member` and restrict `APP_URL` to the deployed origin.
- Add provider-specific publishing workers and credentials before automatic posting.
- Enable monitoring, backups, rate limiting/WAF, and error reporting.
