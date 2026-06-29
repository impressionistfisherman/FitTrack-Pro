# PROGRESS

## 2026-06-29 16:32:00 +09:00

### 작업 요약

- 식단 목표를 저장했는데도 매번 칼로리 자동 계산값을 다시 불러오는 UX 문제를 수정함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - `targetsQuery.data.saved` 기반 `hasSavedMealTargets` 상태 추가.
  - 저장된 식단 목표가 있으면 `recommendedTargetsQuery` 자동 실행 비활성화.
  - 저장된 목표가 있는 경우 자동 계산 블록 대신 `저장된 목표 사용 중` 안내 표시.
  - 필요 시 `계산값 불러오기` 버튼으로만 추천 목표를 수동 refetch.
  - 저장된 목표가 없으면 기존처럼 자동 계산값을 불러와 초기 추천으로 사용.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 실제 브라우저 end-to-end 확인은 별도 필요.

### 다음 작업

- 필요하면 식단 목표 저장 직후 React Query 캐시를 직접 갱신해 재조회도 줄임.
- 목표 카드에서 `자동 계산` 영역을 접기/펼치기 형태로 더 축소.
