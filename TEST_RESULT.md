# TEST_RESULT

- Date: 2026-06-17 09:46:29 +09:00
- Scope: Mobile Home responsiveness improvement

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 68 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| Mobile Home browser QA | Pass | Chrome headless at 390x844 had no horizontal overflow. |
| Mobile monthly summary render | Pass | Monthly summary used the lightweight mobile layout and did not render Recharts nodes. |
| Browser console errors | Pass | No runtime errors captured during mobile Home QA. |

## Failure Cause

- Mobile Home still paid part of the desktop chart cost because the monthly chart implementation and Recharts import lived in the Home page path.
- `useIsMobile` initially returned `false` until the effect ran, so mobile could briefly take the desktop render branch on first paint.

## Action / Next Action

- Moved the desktop Recharts monthly chart into a lazy-loaded component.
- Added a mobile-only monthly summary layout using compact text and CSS bars.
- Initialized mobile detection from `window.innerWidth` so the first mobile render chooses the mobile branch.
- Continue profiling API latency separately if detailed in-page data still arrives slowly after the shell renders.
