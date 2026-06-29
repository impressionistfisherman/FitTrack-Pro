# PROGRESS

## 2026-06-29 15:29:16 +09:00

### 작업 요약

- 식단 목표 초기 렌더 깜빡임을 줄이고, 7일 리포트 기본 상태를 접힘으로 변경함.
- 기본 음식 DB seed를 기성품/편의점/프랜차이즈 중심으로 확장함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - `isWeeklyReportCollapsed` 기본값을 `true`로 변경.
  - `targetsQuery`와 `recommendedTargetsQuery`가 모두 준비되기 전에는 식단 목표 카드에 로딩 안내만 표시.
  - 저장된 목표가 없으면 자동 계산 목표를 입력 폼 초기값으로 사용.
  - 저장된 목표가 있으면 기존 저장값을 우선 사용.

- `server/routers.ts`
  - `meals.targets` 응답에 `saved` 플래그 추가.

- `server/db.ts`
  - 기본 `foods` seed에 편의점 도시락/삼각김밥/컵밥/컵라면, 닭가슴살 기성품, 프랜차이즈 메뉴, 프로틴/두유/간식류를 추가.
  - 이름, 브랜드, 별칭 기반 검색에 걸리도록 한국식 검색어와 브랜드명을 aliases에 포함.

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

- seed는 아직 자체 DB 테이블 기준이며, 외부 식품영양 DB 연동은 아님.
- 칼로리/영양값은 100g 기준 일반값/대표값이므로 실제 제품 포장 기준과 차이가 날 수 있음.
- 운영 반영은 배포 후 식단 API 호출 시 seed upsert가 실행되어야 완료됨.

### 다음 작업

- 식품의약품안전처/공공데이터 또는 별도 CSV 기반 대량 음식 DB import 경로 추가.
- 음식 검색 결과에 `기본/내 음식/편의점/브랜드` 필터 추가.
- 이미지 인식 결과를 기본 음식 DB와 자동 매칭해 영양값을 보정.
