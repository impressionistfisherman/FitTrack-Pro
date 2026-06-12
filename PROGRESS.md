# PROGRESS

- Date: 2026-06-12 15:03:00 +09:00
- Summary: Fixed the home monthly chart tooltip that mislabeled volume as workout count.
- Current Status: Tooltip now separates workout count and volume units correctly.

## Changed Structure

- `client/src/pages/Home.tsx`: Updated Recharts tooltip formatter to identify the volume series by visible name or data key.
- `TEST_RESULT.md`: Recorded validation and browser smoke results.

## Remaining Issues

- None identified for this tooltip display bug.

## Next Session

- Review other Recharts tooltips if additional unit mismatches are reported.
