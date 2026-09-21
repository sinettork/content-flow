# ContentFlow UX Hard Audit — Phase 1

## Product DNA

ContentFlow should feel like one operational control center for:

**Plan → Create → Review → Schedule → Publish → Analyze**

The UI should reduce hunting, expose the current workflow state, and make the next useful action obvious.

## Findings

### P0 — Workflow clarity

- New content showed a Status selector even though create always forces draft. The UI implied an action that the backend ignores. Phase 1 replaces it with an explicit “Starts as draft” explanation.
- Operations was too generic for the actual job. The screen contains approval triage and publishing-job recovery. Phase 1 identifies that directly as **Approvals & Publishing**.

### P1 — Information architecture

- The primary navigation was a flat list of 11 destinations. Content, Board, Calendar and Campaigns are all views around the same content operation, while Operations, Automation and Reports are operational follow-up tools. Phase 1 groups the sidebar into Workspace, Library, Operations, and Team.
- The navigation labels did not explain the user's mental model. The new grouping gives the user a place to orient before reading individual labels.

### P1 — Search expectation

- The top-bar search looked global but currently searches content only. Phase 1 changes the trigger/empty-state language to make that scope explicit instead of creating a false expectation.
- Future phase: expand search to campaigns, people, assets and navigation commands, then rename it back to global Search.

### P1 — My Work clarity

- Work items without a due date were previously placed under Next 7 days, which was semantically incorrect. Phase 1 separates them into No due date.

## Next UX audit targets

1. Dashboard attention hierarchy and metric click behavior.
2. Content creation flow: reduce fields shown at once and expose one recommended next action.
3. Content detail: replace all possible transitions with a status-aware primary action.
4. Operations: replace browser prompts with structured dialogs for approval changes.
5. Campaign cards: make the campaign object clearly navigable to Campaign Detail.
6. Saved views: replace destructive matching-view behavior with an explicit managed-view interaction.
7. Automation: separate setup, rule building, connection health, and run history into clearer jobs.
8. Responsive/mobile navigation and dense tables.
9. Loading, empty, error, and recovery states across every primary route.

## Phase 1 success criteria

- A first-time user can identify where to work before choosing a feature.
- A user creating content is never offered a control that the system silently ignores.
- Every operational screen names its real job.
- Labels describe the current feature scope instead of promising capabilities that do not exist yet.
