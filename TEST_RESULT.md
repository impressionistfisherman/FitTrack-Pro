# TEST_RESULT

- Date: 2026-06-12 15:03:00 +09:00
- Scope: Home monthly summary chart tooltip label fix

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 64 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| Browser desktop smoke | Pass | Tooltip displayed `운동횟수 : 28회` and `볼륨 : 44,800kg`. |
| Browser mobile smoke | Pass | `월별 요약` chart rendered at 390px without horizontal overflow. |

## Failure Cause

- The tooltip formatter compared the visible series name against the internal volume data key, so the volume series was labeled as workout count.

## Action / Next Action

- Detect the volume series by visible name or data key and format it as `kg`.
- Run `git diff --check` before commit.
