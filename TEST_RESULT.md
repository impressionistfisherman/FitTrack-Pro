# TEST_RESULT

- Date: 2026-06-12 15:14:31 +09:00
- Scope: Supabase-safe monthly volume alias fix

## Results

| Test | Result | Notes |
| --- | --- | --- |
| `pnpm run check` | Pass | TypeScript compile check completed. |
| `pnpm run test` | Pass | 6 files, 66 tests passed. |
| `pnpm run build` | Pass | Vite and server bundle build completed. |

## Failure Cause

- Monthly volume rows used camelCase SQL aliases such as `sessionDate`.
- PostgreSQL can return unquoted aliases lowercased, so `row.sessionDate` may be missing in Supabase and the volume row is not added to the monthly bucket.

## Action / Next Action

- Changed monthly volume query aliases to `session_date` and `total_volume`.
- Read aliases through `aliasValue` for SQLite/Postgres compatibility.
- Added regression coverage for avoiding camelCase aliases in monthly volume rows.
- Run `git diff --check` before commit.
