# PROGRESS

- Date: 2026-06-16 13:04:33 +09:00
- Summary: Investigated and reduced the main home loading bottleneck.
- Current Status: Home recent workout data now loads through one shared query, and server log loading uses a batch query instead of per-session queries.

## Changed Structure

- `client/src/pages/Home.tsx`: Shared one `history.recentWorkouts({ limit: 20 })` result across workout quality, recent workout, and body-part balance cards.
- `server/db.ts`: Added `getWorkoutLogsBySessionIds` to fetch logs for multiple sessions in one query.
- `server/routers.ts`: Updated `history.recentWorkouts` to use the batched log query.
- `TEST_RESULT.md`: Recorded validation and browser smoke results.

## Remaining Issues

- Other home widgets still make separate stats/profile queries; if production still feels slow, the next step is a dedicated `home.summary` endpoint that returns all first-screen data in one optimized response.
- Local SQLite files and `SESSION_HANDOFF.md` have unrelated working-tree changes and were intentionally not staged.

## Next Session

- Measure production request timing after deployment and decide whether to consolidate `history.stats`, `monthlyStats`, `weeklyGoals`, `streak`, goals, and preferences into a single home summary API.
