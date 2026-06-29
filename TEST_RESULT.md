# TEST_RESULT

## 2026-06-29 16:44:46 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run meals:import-mfds-foods -- --source=tmp\mfds-food-db.xlsx --limit=20`
- `tsx` 직접 실행으로 `listFoods(1, query, 5)` 검색 확인
  - `순대국밥`
  - `김밥`
  - `돼지머리국밥`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`

### 결과

- 식약처 음식 DB 엑셀 import 샘플: 통과
  - 입력 파일: `tmp\mfds-food-db.xlsx`
  - 파싱 행 수: 20
  - DB 반영 행 수: 20
- 식단 음식 검색 확인: 통과
  - `순대국밥` 검색 시 `국밥 순대국밥` 반환 확인
  - `김밥` 검색 시 기본 데이터와 식약처 DB 데이터 반환 확인
  - `돼지머리국밥` 검색 시 `국밥 돼지머리` 반환 확인
- TypeScript 정적 검사: 통과
- Vitest: 통과
  - 6개 테스트 파일
  - 73개 테스트 통과
- Production build: 통과

### 확인한 변경 범위

- 공공데이터포털/식품안전나라 식품영양성분 음식 DB 엑셀 파일을 내려받아 내부 음식 DB에 import하는 스크립트를 추가함.
- 식단 음식 검색 시 매번 외부 Open API를 호출하지 않도록 기본 동작을 내부 DB 검색으로 제한함.
- 외부 API 즉시 보강은 `FOOD_SEARCH_LIVE_IMPORT=1` 환경변수를 켠 경우에만 동작하도록 제한함.
- `돼지머리국밥`처럼 실제 DB 명칭이 `국밥_돼지머리` 형태인 항목도 검색되도록 접미어 기반 검색어 보강을 추가함.

### 실패 원인 및 조치

- 없음.

### 미실행 또는 제한 사항

- 전체 19,495건 import는 운영 DB에 직접 실행하지 않음.
- 운영 DB 반영은 배포 후 `DATABASE_URL`이 운영 Postgres를 바라보는 환경에서 `pnpm run meals:import-mfds-foods`를 별도로 실행해야 함.
- `tmp\mfds-food-db.xlsx`는 검증용 임시 파일이며 커밋 대상이 아님.
- 로컬 DB 파일과 `SESSION_HANDOFF.md`는 기존 dirty 상태로 유지하고 이번 변경 범위에서 제외함.
