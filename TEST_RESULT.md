# TEST_RESULT

## 2026-06-30 17:21:37 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD exec tsx scripts/import-food-db-xlsx.mjs --limit=3 --dry-run`
- `.\node_modules\.bin\pnpm.CMD exec tsx scripts/import-food-db-xlsx.mjs --limit=3 --batch-size=50`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- XLSX 스트리밍 파서 dry-run: 통과
  - 음식 DB 19,495건 파일 샘플 파싱 확인
  - 건강기능식품 DB 5,556건 파일 샘플 파싱 확인
  - 가공식품 DB 298,288건 파일 샘플 파싱 확인
- 로컬 SQLite 제한 import: 통과
  - 9건 파싱
  - 9건 insert
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- `foods` 공공 음식 대량 import용 bulk insert 경로 추가.
- 대용량 XLSX를 행 단위로 읽는 `scripts/import-food-db-xlsx.mjs` 추가.
- 기본 import 명령 `meals:import-food-db-xlsx` 추가.
- XLSX 파싱 전 DB 연결 preflight를 수행하도록 구성.

### 실패 원인 및 조치

- Supabase direct DB 호스트가 `AAAA`만 반환하고 현재 환경에서 IPv6 5432 연결이 타임아웃됨.
- 추정 pooler URL은 TCP 연결은 가능했으나 Supabase에서 tenant/user를 찾지 못해 거부됨.
- 따라서 운영 DB 전체 import는 올바른 Supabase pooler connection string 확보 후 재실행 필요.

### 미실행 또는 제한 사항

- 운영 Supabase DB 전체 import는 연결 문자열 문제로 완료하지 못함.
- 로컬 DB에는 제한 샘플 9건만 검증용으로 삽입됨.
- 전체 323,339건 XLSX 파싱 자체는 성공 확인됨.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외 대상임.
