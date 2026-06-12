# TEST_RESULT

- Date: 2026-06-12 15:09:06 +09:00
- Scope: Monthly stats volume source hardening

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 65 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |

## Failure Cause

- Monthly stats depended only on joined workout log aggregation, while session-level `totalVolume` was already stored and should be used when available.
- Small kg values also needed regression coverage so they do not collapse to `0`.

## Action / Next Action

- Monthly stats now prefer `workout_sessions.totalVolume` and fall back to log aggregation.
- Added a regression test verifying a 400kg monthly volume is returned as `400`.
- Run `git diff --check` before commit.
