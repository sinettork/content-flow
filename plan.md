# ContentFlow UX follow-up

## Scope

Continue on the existing feature branch and reuse its implementation and design. Apply the user's copy-style preference throughout the interface: do not render labels in forced uppercase; use normal mixed-case text, especially for sidebar section names, and remove uppercase text-transform styling elsewhere in the app. Preserve functional content such as entered color values and avatar initials rather than changing their data; this phase concerns display styling of labels and copy.

## Implementation approach

Remove Tailwind `uppercase` transformations from the dashboard sidebar section labels, content table header row, content history labels, MetricCard labels, color-picker value/input, and global-search result group labels. Remove the tracking treatment that was coupled to all-caps microcopy where it would make normal-case labels look artificially spaced. Keep existing words and sentence casing; do not replace the rule with another forced-case style. Add a regression assertion for normal-case sidebar labels in the responsive browser test and check the remaining UI for CSS uppercase transforms.

## Relevant project structure

- `src/app/layouts/dashboard-layout.tsx` renders sidebar section labels.
- `src/features/content/ContentListPage.tsx` renders the content table header.
- `src/features/content/ContentDetailPage.tsx` renders Activity and Versions labels.
- `src/components/cards/MetricCard.tsx` renders dashboard metric labels.
- `src/components/ui/color-picker.tsx` renders editable color values.
- `src/components/common/SearchCommand.tsx` renders result-category labels.
- `e2e/responsive-layout.e2e.ts` covers the desktop/tablet/mobile sidebar and content layout.

The branch already contains the mock-only workflow tests and global-search work. Run the existing app, unit, build, and E2E commands without introducing provider credentials or external publishing.


## Normal-case UI outcome

Forced uppercase styling has been removed from sidebar section headings, content table headers, content history labels, metric labels, color picker values, and global-search result categories. The source copy renders in normal case without CSS uppercase transforms. Responsive browser coverage confirms the sidebar section label uses `text-transform: none`; desktop, tablet, and mobile screenshots were reviewed.
