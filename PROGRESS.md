# PROGRESS

- Date: 2026-06-16 13:12:17 +09:00
- Summary: Consolidated home screen detail data loading.
- Current Status: Home cards now use one summary API instead of separate card-level queries, and repeated session statistics are calculated from one volume result.

## Changed Structure

- `client/src/pages/Home.tsx`: Replaced card-level home queries with `trpc.home.summary`.
- `client/src/components/WeeklyGoalDashboard.tsx`: Accepts weekly stats from the parent instead of fetching independently.
- `server/routers.ts`: Added `home.summary` and home-specific aggregate builders for stats, monthly stats, weekly stats, and streak.
- `server/db.ts`: Added `getWorkoutSessionVolumeRows` for one-pass home statistics.
- `TEST_RESULT.md`: Recorded validation and browser smoke results.

## Remaining Issues

- Production speed still depends on Supabase latency and row counts; if this remains slow after deployment, the next step is adding DB indexes for workout session date/user filters and measuring query timings in production logs.
- Local SQLite files and `SESSION_HANDOFF.md` have unrelated working-tree changes and were intentionally not staged.

## Next Session

- Verify deployed home data cards against Supabase and inspect the `home.summary` response time in Vercel or server logs.
