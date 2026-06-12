# PROGRESS

- Date: 2026-06-12 13:28:53 +09:00
- Summary: Improved loading responsiveness by removing per-request authenticated user write amplification.
- Current Status: Authenticated requests now update `users.lastSignedIn` only when the previous timestamp is stale by 15 minutes or more.

## Changed Structure

- `server/_core/sdk.ts`: Added `shouldTouchLastSignedIn` and throttled activity touch calls in `authenticateRequest`.
- `server/db.ts`: Added `touchUserLastSignedIn` for a narrow timestamp-only update.
- `server/fittrack.test.ts`: Added coverage for activity timestamp updates and throttling decisions.
- `TEST_RESULT.md`: Recorded verification results.

## Remaining Issues

- This reduces Supabase write latency during normal page/API loading, but it does not prove every production route is below the desired threshold.
- If a deployed page still exceeds 7 seconds, production route timing should be collected next.

## Next Session

- Profile production API calls and identify slow read queries if the deployed app remains slow.
