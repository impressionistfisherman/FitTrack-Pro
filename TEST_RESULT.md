# TEST_RESULT

- Date: 2026-06-16 11:44:49 +09:00
- Scope: Workout record quality diagnostics for weighted, bodyweight, abs, and mobile home views

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 68 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |
| `git diff --check` | Pass | No whitespace errors. Git reported CRLF conversion warnings only. |
| Browser home desktop smoke | Pass | Workout quality card rendered at 1280px without horizontal overflow. |
| Browser home mobile smoke | Pass | Workout quality card rendered at 390px without horizontal overflow. |

## Failure Cause

- None.

## Action / Next Action

- Added session, exercise, and set-level detail to workout record quality warnings.
- Excluded bodyweight, abs, cardio, stretching, flexibility, and timed logs from missing-weight diagnostics.
- Added regression coverage so bodyweight abs logs with 0kg are not counted as missing weight.
