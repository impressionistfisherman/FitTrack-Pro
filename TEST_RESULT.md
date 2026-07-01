# TEST_RESULT

## 2026-07-01 09:07:14 +09:00

### 테스트 항목

- 운영 Supabase 음식 검색 성능 측정
- 운영 Supabase `pg_trgm` GIN 인덱스 적용
- 운영 Supabase `foods.name` btree 인덱스 적용
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- 운영 Supabase 음식 검색 최적화: 통과
  - `foods.searchText` trigram GIN 인덱스 생성
  - `foods.name` btree 인덱스 생성
  - cold 첫 검색: 약 1.1초
  - warm 검색:
    - `육개장`: 약 128ms
    - `컬라면`: 약 225ms
    - `닭가슴살`: 약 90ms
    - `프로틴`: 약 85ms
    - `김밥`: 약 45ms
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- Postgres `pg_trgm` 확장 및 `searchText` GIN trigram 인덱스 보강.
- `name = ?` exact 검색 최적화를 위한 `foods.name` 단독 인덱스 보강.
- `searchText` backfill을 컬럼 신규 생성 시에만 수행하도록 변경해 cold start 비용 감소.
- Postgres에서는 인덱스 존재 여부를 먼저 확인해 불필요한 DDL 호출을 줄임.

### 실패 원인 및 조치

- 초기 측정에서 `육개장` 검색이 약 7.4초, `컬라면` 검색이 약 4.2초 소요됨.
- 원인 1: `%검색어%` LIKE가 30만 건 전체를 훑는 구조.
  - 조치: `pg_trgm` GIN 인덱스 적용.
- 원인 2: `name = '육개장'` exact 검색이 `(userId, name)` 복합 인덱스를 비효율적으로 사용.
  - 조치: `foods.name` 단독 인덱스 적용.
- 원인 3: 첫 호출마다 `searchText` backfill 스캔이 실행될 수 있음.
  - 조치: 컬럼 신규 생성 시에만 backfill 실행.

### 미실행 또는 제한 사항

- 실제 브라우저 UI 입력 체감은 별도 자동화로 측정하지 않음.
- 첫 검색에는 DB 연결 및 초기 카탈로그 확인 비용이 포함되어 warm 검색보다 느림.
