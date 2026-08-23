# ContentFlow

Social media content operations platform for small teams. Manage creation, review, scheduling, and platform-by-platform posting status in one place.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Radix UI** primitives (shadcn-style components)
- **React Router v6**, **TanStack Query**, **React Hook Form** + **Zod**, **Zustand**
- **date-fns** for date formatting
- Mock data layer (localStorage) — swappable to SQLite / Supabase later

## Getting started

```powershell
npm install
npm run dev
```

Dev server: http://localhost:5173

### Demo accounts

Password for all: `password`

| Email | Role |
|---|---|
| `admin@demo.com` | Admin |
| `manager@demo.com` | Manager |
| `editor@demo.com` | Editor |
| `viewer@demo.com` | Viewer |

### Data layer

This app uses a **mock data store** (in-memory + `localStorage`). No backend is required.

- Seed data: `src/lib/mock/seed.ts`
- CRUD helpers: `src/lib/mock/db.ts`
- Mock auth: `src/lib/mock/auth.ts`
- Reset the DB: go to **Settings → Danger zone → Reset database**, or run in DevTools:  
  `localStorage.removeItem('contentflow.mockdb.v1'); localStorage.removeItem('contentflow.session.v1'); location.reload()`

The SQL blueprint in `supabase/migrations/0001_init.sql` is kept as the target schema for a future swap to **SQLite** or **Supabase**. Feature code depends on the service layer — not directly on `localStorage` — so the implementation can be replaced without touching UI.

## Features

### Pages (16 routes, zero stubs)

| Page | Route | Description |
|---|---|---|
| **Dashboard** | `/app/dashboard` | 7 metric cards, upcoming posts, recent activity, platform summary, status distribution |
| **Content List** | `/app/content` | Full table with 5 filter dropdowns (search, status, campaign, member, platform) |
| **Content Detail** | `/app/content/:id` | Info card, platform statuses, comments section, activity timeline, delete |
| **Content Form** | `/app/content/new`, `/:id/edit` | Create/edit with React Hook Form + Zod validation |
| **Board** | `/app/board` | Kanban with 6 status columns, content cards with platforms, priority, assignee |
| **Calendar** | `/app/calendar` | Month grid with prev/next/today, scheduled items per day, platform legend |
| **Campaigns** | `/app/campaigns` | Card grid with item counts, create/edit dialog, color picker, delete |
| **Campaign Detail** | `/app/campaigns/:id` | Campaign info bar + filtered content table |
| **Assets** | `/app/assets` | Upload grid with image preview, file type icons, size, delete |
| **Team** | `/app/team` | Member table with avatar, job title, role dropdown (admin/manager can change) |
| **Reports** | `/app/reports` | 3 metric cards + tabbed table (Scheduled / Posted / Overdue) |
| **Settings** | `/app/settings` | Workspace name, platform/status lists, danger zone with DB reset |
| **Profile** | `/app/profile` | Avatar card + editable name/job title form |
| **Notifications** | `/app/notifications` | List with read/unread state, mark all read |
| **Sign In** | `/auth/sign-in` | Email/password + demo credentials hint |
| **Forgot Password** | `/auth/forgot-password` | Email form (mock: always succeeds) |

### UI / UX

- **Collapsible sidebar** with icons, active states, persisted collapse state
- **Sticky topbar** with user dropdown, notification bell (unread badge), search trigger
- **Mobile responsive** — hamburger menu opens slide-in drawer
- **Global search** (Cmd+K / Ctrl+K) — searches content items with keyboard navigation
- **Dark / light / system theme** toggle with localStorage persistence
- **Toast notifications** on all CRUD actions (create, update, delete)
- **Confirm dialogs** for destructive actions
- **Loading, empty, and error states** on all pages
- **Code-split routes** — lazy-loaded pages for smaller initial bundle

### Services layer (9 modules)

All data access is abstracted through typed async services:

- `contentService` — CRUD + filtering + status updates
- `campaignService` — CRUD
- `platformService` — CRUD + per-item platform management
- `commentService` — list, create, update, remove
- `activityService` — list + log actions
- `assetService` — upload (blob URL mock), list, remove
- `notificationService` — list, unread count, mark read
- `profileService` — list, get, batch get, update, set role
- `reportService` — dashboard metrics, scheduled/posted/overdue queries

## Project structure

```
src/
  app/              # providers, router, layouts (auth + dashboard)
  components/
    ui/             # Badge, Button, Card, Dialog, Dropdown, Input, Select, etc.
    common/         # PageHeader, EmptyState, ConfirmDialog, SearchCommand, Toaster
    cards/          # MetricCard, ContentCard, PlatformSummaryCard
    board/          # BoardColumn, BoardCard
    calendar/       # CalendarToolbar, ScheduleItemCard, PlatformLegend
    charts/         # StatusDistribution
    content/        # ContentStatusBadge, PlatformBadge, PlatformStatusList
    forms/          # CommentComposer
    tables/         # ActivityTimeline, CommentList
  features/
    auth/           # SignInPage, ForgotPasswordPage, useAuth
    dashboard/      # DashboardPage
    content/        # ContentListPage, ContentDetailPage, ContentFormPage
    board/          # BoardPage
    calendar/       # CalendarPage
    campaigns/      # CampaignsPage, CampaignDetailPage
    assets/         # AssetsPage
    team/           # TeamPage
    reports/        # ReportsPage
    settings/       # SettingsPage
    profile/        # ProfilePage
    notifications/  # NotificationsPage
    comments/       # CommentsSection
  hooks/            # useDebounce, useMediaQuery, useWorkspaceId
  lib/
    mock/           # db.ts (CRUD), seed.ts (data), auth.ts (session)
    constants.ts    # roles, statuses, platforms, colors
    dates.ts        # formatDate, formatDateTime, fromNow
    utils.ts        # cn() (tailwind-merge)
  services/         # 9 service modules (barrel export)
  stores/           # auth-store, ui-store, theme-store, toast-store
  types/            # domain interfaces
supabase/
  migrations/       # SQL schema + RLS (target for backend swap)
  seed.sql
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |

## Next steps

- Drag-and-drop on Board page (e.g. `@dnd-kit/core`)
- Real file upload with Supabase Storage or local backend
- Swap mock data layer to SQLite / Supabase (services stay the same)
- Role-based permissions enforcement (middleware + UI guards)
- Email notifications integration
- Analytics and engagement metrics
