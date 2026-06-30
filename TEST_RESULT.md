# TEST_RESULT

## 2026-06-30 18:41:21 +09:00

### 테스트 항목

- 운영 Supabase DB 연결 확인
- `.\node_modules\.bin\pnpm.CMD run meals:import-food-db-xlsx -- --batch-size=500`
- 운영 Supabase 음식 DB 상태 확인
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- 운영 Supabase DB 연결: 통과
- 운영 Supabase 음식 DB 전체 import: 통과
  - import 대상 파싱: 323,339건
  - 신규 insert: 290,243건
  - 중복 skip: 33,096건
  - 최종 `foods`: 328,967건
  - 최종 공공 음식: 328,967건
  - 최종 MFDS 계열 음식: 328,829건
  - 최종 검색 가능 음식: 328,967건
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- `servingSizeGrams` Postgres quoting 누락 수정.
- 운영 DB의 `foods.name`, `foods.brand` 길이 제한을 `text`로 완화하도록 보강.
- 식약처 음식/건강기능식품/가공식품 XLSX 3종을 운영 Supabase DB에 반영.

### 실패 원인 및 조치

- 첫 운영 import 시 `servingSizeGrams`가 Postgres에서 `servingsizegrams`로 해석되어 실패.
  - `pgQuotedIdentifiers`에 `servingSizeGrams` 추가.
- 두 번째 운영 import 시 일부 제품명/업체명이 기존 `varchar(160)`, `varchar(120)` 길이를 초과해 실패.
  - Postgres에서 `foods.name`, `foods.brand`를 `text`로 완화하도록 `ensureFoodSearchTextColumn()`에 보강.
- 운영 `DATABASE_URL`을 유지한 같은 PowerShell 프로세스에서 테스트를 실행해 원격 DB 기준 테스트 실패가 1회 발생.
  - `DATABASE_URL` 제거 후 로컬 SQLite 기준 전체 테스트 재실행하여 통과 확인.

### 미실행 또는 제한 사항

- 실제 브라우저에서 `/meals` 검색 체감 속도는 아직 별도 측정하지 않음.
- 30만 건 이상 데이터가 들어갔으므로 음식 검색 쿼리 최적화가 다음 우선순위임.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외 대상임.
