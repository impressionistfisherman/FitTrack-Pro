# TEST_RESULT

## 2026-06-29 10:59:29 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- 음식 별칭 검색 smoke
  - `닭찌`
  - `햇반`
  - `아아`
  - `프로틴`
  - `제로펩시`

### 결과

- TypeScript 정적 검사: 통과
- Vitest: 통과
  - 6개 테스트 파일
  - 73개 테스트 통과
- Production build: 통과
- 음식 별칭 검색 smoke: 통과
  - `닭찌` → `닭가슴살`
  - `햇반` → `백미밥`, `잡곡밥`, `현미밥`
  - `아아` → `아메리카노`
  - `프로틴` → `프로틴 바`, `프로틴 쉐이크`
  - `제로펩시` → `제로콜라`

### 확인한 변경 범위

- 기본 음식 seed를 한국 사용자가 자주 쓰는 식품/식사/음료 중심으로 확장함.
- 기존 기본 음식 row도 새 영양값/별칭으로 갱신되도록 seed를 upsert 방식으로 변경함.
- 음식 검색에서 공백 유무 차이를 줄이기 위해 compact query 조건을 추가함.

### 실패 원인 및 조치

- 첫 smoke 명령은 `tsx -e` top-level await 제약으로 실패함.
- IIFE 방식으로 재실행하여 통과함.

### 미실행 또는 제한 사항

- 영양값은 일반적인 100g 기준 참고값이며, 브랜드별 정확도 차이는 사용자가 직접 등록해 보정해야 함.
- 운영 DB 반영은 배포 후 앱이 식단 API를 호출할 때 seed upsert가 수행되는 구조임.
- 로컬 DB 파일과 `SESSION_HANDOFF.md`는 기존 dirty 상태로 유지하고 이번 변경 범위에서 제외함.
