# PROGRESS

## 2026-06-26 10:28:36 +09:00

### 작업 요약

- 운동명이 어렵고 한국에서 흔히 쓰는 이름으로 검색되지 않는 문제를 개선함.
- DB 스키마나 기존 운동 ID를 변경하지 않고, 공통 검색 유틸에 한국식 별칭/약칭을 추가해 기존 기능과 기록 호환성을 유지함.

### 변경 사항

- `shared/exerciseSearch.ts`
  - 한국 헬스장에서 흔히 쓰는 운동 별칭과 약칭을 `aliasGroups`에 추가함.
  - `사레레`, `밀프`, `불스스`, `롱풀`, `루마데`, `케푸다`, `런닝머신`, `펙덱` 등으로 검색 가능하게 함.
  - 별칭 묶음을 token synonym에도 연결해 서버 검색 조건에 실제 반영되도록 수정함.
  - `getPopularExerciseAliases()`를 추가해 화면에서 보통 부르는 이름을 표시할 수 있게 함.

- `client/src/pages/Exercises.tsx`
  - 운동 탐색 목록의 정식명/영문명 아래에 대표 별칭을 표시함.

- `client/src/pages/WorkoutSession.tsx`
  - 운동 추가 모달의 운동 선택 목록에도 대표 별칭을 표시함.

- `client/src/index.css`
  - 운동 목록 별칭 텍스트 스타일 추가.

- `server/fittrack.test.ts`
  - 한국식 운동 약칭 검색 회귀 테스트 추가.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 운동 데이터와 라우팅, 메뉴 구조는 변경하지 않음.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제 및 다음 작업

- 전체 2,000개 이상 운동명에 대해 별칭 품질을 더 넓게 보강할 필요가 있음.
- 다음 단계로는 운동 상세 화면과 루틴 운동 추가/변경 모달에도 별칭 표시를 확대할 수 있음.
- 운영 DB에 저장된 `nameKo` 자체가 지나치게 어색한 항목은 별칭 검색과 별개로 정식 한국어 이름 정리 작업이 필요함.
