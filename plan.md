# Credential-free feature preparation

## Scope

Prepare ContentFlow features that do not require live provider workers or credentials. Do not connect Meta, request secrets, or deploy provider functions. The saved-view dialog and global workspace search are complete. The next outcome is a first-time user's full content workflow, exercised only against the app's seeded mock backend.

## Workflow-test design

Add a Playwright end-to-end test using only `VITE_DATA_BACKEND=mock` and isolated browser local storage. The test signs in as a demo editor, creates a draft, selects Facebook, adds platform-specific caption and hashtags, assigns a campaign and owner, chooses a future publish date/time, and submits the content for review. It then signs out, signs in as a demo manager, approves the item, and moves it through the app's schedule and “Mark as published” actions. The final action records the app's internal demo status only; it must not call a provider API, create a real post, or use credentials. The test verifies each intermediate state and saved platform copy, runs against an isolated local server, and documents how to install/run its browser dependency.

## Relevant project structure

- `src/features/content/ContentFormPage.tsx` creates the draft, saves the platform copy, and exposes the schedule time picker.
- `src/features/content/ContentDetailPage.tsx` exposes review, schedule, and mock “Mark as published” status transitions.
- `src/features/operations/OperationsPage.tsx` exposes manager approval.
- `src/lib/mock/seed.ts` supplies demo editor/manager users and a seeded workspace.
- `src/lib/backend.ts` selects the mock backend when `VITE_DATA_BACKEND=mock`.
- `playwright.config.ts` starts a dedicated Vite mock-mode server; `e2e/content-lifecycle.e2e.ts` exercises the user flow.
- `package.json`, `package-lock.json`, `TODO.md`, and `docs/UX_AUDIT_FINAL.md` record the test command and outcome.

## Outcome

As of 2026-10-15, all four Playwright tests pass: one full lifecycle test plus desktop, tablet, and mobile responsive checks. The lifecycle test records zero requests to social-provider APIs. Visual inspection at 1440×960, 820×1024, and 390×844 found an oversized shared dialog on mobile; `DialogContent` now constrains its width and height to the viewport, and the saved-view dialog fits at all three sizes. A dedicated platform editor remains deferred because current per-platform configuration is limited to caption and hashtags.
