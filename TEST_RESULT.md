# TEST_RESULT

- Date: 2026-06-16 13:12:17 +09:00
- Scope: Home in-screen data loading consolidation

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 68 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| Browser home desktop smoke | Pass | Weekly, monthly, quality, and recent workout cards rendered at 1280px without horizontal overflow. |
| Browser home mobile smoke | Pass | Weekly, monthly, quality, and recent workout cards rendered at 390px without horizontal overflow. |
| Browser console errors | Pass | No captured browser console errors. |

## Failure Cause

- None.

## Action / Next Action

- Replaced separate home card queries with one `home.summary` query.
- Reused one session-volume result to compute home stats, monthly stats, weekly stats, and streak data.
- Kept existing individual APIs available for other pages.
