# TEST_RESULT

- Date: 2026-06-12 14:39:46 +09:00
- Scope: Home monthly summary chart volume display fix

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 64 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| Browser desktop smoke | Pass | `월별 요약` chart rendered at 1280px without horizontal overflow. |
| Browser mobile smoke | Pass | `월별 요약` chart rendered at 390px without horizontal overflow. |

## Failure Cause

- The home chart divided `totalVolume` by 1000 and rounded it, so sub-ton monthly volume was displayed as `0`.

## Action / Next Action

- Display monthly volume as actual kg and place it on a separate right-side axis so workout count remains readable.
- Run `git diff --check` before commit.
