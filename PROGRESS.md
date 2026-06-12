# PROGRESS

- Date: 2026-06-12 14:39:46 +09:00
- Summary: Fixed missing monthly volume numbers in the home summary chart.
- Current Status: The chart now displays actual kg volume values instead of rounded tons.

## Changed Structure

- `client/src/pages/Home.tsx`: Changed monthly chart data from rounded tons to kg.
- `client/src/pages/Home.tsx`: Added a right-side volume axis and tooltip formatting for `kg` / workout count units.
- `TEST_RESULT.md`: Recorded validation and browser smoke results.

## Remaining Issues

- None identified for this display bug.

## Next Session

- If chart readability becomes crowded with very large volumes, consider compact tick formatting such as `30k`.
