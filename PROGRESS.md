# PROGRESS

## 2026-06-29 16:02:37 +09:00

### 작업 요약

- 식단 목표 카드가 자동 계산값을 기다리며 너무 오래 로딩되는 UX 문제를 수정함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - `isTargetSectionReady` 전체 차단 조건 제거.
  - 목표 저장 위치 안내와 목표 입력 폼을 즉시 렌더링하도록 변경.
  - `recommendedTargetsQuery`가 로딩 중일 때는 `칼로리 자동 계산` 블록 내부에만 `계산 중` 상태 표시.
  - 목표 저장 버튼은 `targetsQuery` 로딩 중에만 비활성화.

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

- 자동 계산 자체가 느릴 경우 계산 블록은 잠시 `계산 중`으로 남을 수 있음.
- 실제 브라우저 네트워크 지연 환경 확인은 별도 필요.

### 다음 작업

- `recommendedTargets` 서버 계산 쿼리 자체가 느린지 측정.
- 필요하면 추천 목표 API를 목표/체중 변경 시에만 갱신하고 캐시 시간을 늘림.
