# TEST_RESULT

- Date: 2026-06-16 13:04:33 +09:00
- Scope: Home loading performance reduction for recent workout data

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 68 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| Browser home desktop smoke | Pass | Quality, recent workout, and body-part balance cards rendered at 1280px without horizontal overflow. |
| Browser home mobile smoke | Pass | Quality, recent workout, and body-part balance cards rendered at 390px without horizontal overflow. |

## Failure Cause

- None.

## Action / Next Action

- Reduced duplicate home `history.recentWorkouts` requests from three calls to one shared call.
- Replaced per-session workout log loading in `history.recentWorkouts` with a batched log query.
- Run `git diff --check` before commit.
