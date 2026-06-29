# PROGRESS

## 2026-06-29 16:50:19 +09:00

### 작업 요약

- 식단 화면 강력 새로고침 후에도 API급으로 느리게 느껴지는 초기 로딩을 줄이기 위해 불필요한 초기 쿼리를 지연 실행하도록 수정함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - 검색어가 없을 때 `meals.foods` 쿼리 실행 중단.
  - 7일 리포트가 접힌 상태일 때 `meals.weeklyReport` 쿼리 실행 중단.
  - 7일 리포트가 접힌 상태에서는 식단/목표 변경 후 리포트 invalidate 생략.
  - 최근 음식, 자주 먹는 음식, 최근 식사 템플릿 쿼리에 60초 `staleTime` 적용.
  - 음식 검색 쿼리에 5분 `staleTime` 적용.
  - 검색어가 없을 때 빈 검색 결과 영역 렌더링 제거.

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

- 배포 환경에서 아직 체감 로딩이 길면 다음 병목은 `meals.byDate`, `meals.targets`, 최근/자주 먹은 음식 쿼리 중 하나일 가능성이 높음.
- 운영 DB에 음식 DB 전체 import가 안 되어 있으면 검색 결과 품질은 여전히 제한됨.

### 다음 작업

- 브라우저 Network 기준으로 식단 화면 진입 시 실제 느린 tRPC procedure를 측정.
- 필요하면 식단 첫 화면용 `meals.dashboard` 단일 쿼리를 만들어 `byDate`, `targets`, recent/frequent/recentMeals를 한 번에 가져오도록 통합.
