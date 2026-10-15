# Credential-free feature preparation

## Scope

Prepare ContentFlow features that do not require live provider workers or credentials. Do not connect Meta, request secrets, or deploy provider functions in this phase. Follow the next credential-free UX outcomes from `docs/UX_AUDIT_FINAL.md`: replace the remaining browser-native prompt, then expand the command palette into global workspace search.

## Implementation approach

The saved-view flow reuses the existing Radix-based application Dialog, Input, Label, Button, and `useUiStore.saveContentView` behavior. Global search reuses the existing command-palette shell and keyboard controls, gathers content, campaigns, workspace members, and workspace assets through existing services, and combines these with a static navigation/action command catalog. Result construction and matching live in a small pure helper with unit tests. Search results navigate to the corresponding content/campaign detail or to the assets/team pages with a prefilled search query. The current visual system and dependencies remain unchanged.

## Relevant project structure

- `src/features/content/ContentListPage.tsx` owns filter controls and the Save current view action; `src/stores/ui-store.ts` persists saved views.
- `src/components/common/SearchCommand.tsx` owns the existing command palette and keyboard navigation.
- `src/lib/global-search.ts` builds typed, query-matched results from the existing workspace data models.
- `src/services/` provides content, campaign, profile, and asset data through the current mock or Supabase adapter.
- `src/features/assets/AssetsPage.tsx` and `src/features/team/TeamPage.tsx` consume search query parameters so global results open at the matching record.
- `docs/UX_AUDIT_FINAL.md` is the source for the remaining credential-free follow-up backlog.
