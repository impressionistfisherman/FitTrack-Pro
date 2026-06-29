# PROGRESS

## 2026-06-29 16:57:57 +09:00

### 작업 요약

- 전체 렌더링과 DB 로딩 속도 개선을 위해 운동 탐색 payload 축소, 쿼리 캐시 강화, DB 인덱스 추가를 적용함.

### 변경 사항

- `client/src/pages/Exercises.tsx`
  - 일반 운동 목록을 `exercises.page` 서버 페이지 조회로 전환.
  - 첫 화면에서 전체 2,088건을 받지 않고 24건만 받도록 변경.
  - 난이도 필터를 서버 요청 조건으로 포함.
  - 즐겨찾기 필터는 사용자별 정확도 보존을 위해 기존 조회 경로 유지.
  - 페이지 초과 상태 보정 로직 추가.

- `server/routers.ts`
  - `exercises.page` procedure 추가.
  - `exercises.list` 입력에 `difficulty`, `limit`, `offset` 옵션 추가.

- `server/db.ts`
  - `getExercises()`에 난이도, limit, offset 지원 추가.
  - `getExercisesPage()` 추가.
  - 운동 필터/정렬용 인덱스 추가.
  - 식단 음식/로그 반복 조회용 인덱스 추가.

- `client/src/main.tsx`
  - React Query 기본 `staleTime`을 5분으로 확대.
  - `gcTime`을 30분으로 확대.
  - `refetchOnReconnect` 비활성화.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- `getExercisesPage({ limit: 24, offset: 0 })` 직접 확인 완료.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 식단 첫 화면은 아직 여러 procedure가 병렬로 나뉘어 호출됨.
- 즐겨찾기 운동 필터는 아직 서버 페이지네이션 최적화가 적용되지 않음.

### 다음 작업

- 식단 첫 화면용 `meals.dashboard` 단일 쿼리 추가.
- 즐겨찾기 운동 필터를 서버에서 userId 기반으로 페이지 조회하도록 별도 protected procedure 추가.
- 브라우저 Network/Performance 측정값으로 실제 병목 재확인.
