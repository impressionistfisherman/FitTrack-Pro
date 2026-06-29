# TEST_RESULT

## 2026-06-29 18:10:00 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`
- 운영 Supabase DB 직접 확인
- 운영 DB 기준 `listFoods(1, "육계장", 5)` 첫 호출 성능 확인
- 배포 API `system.foodDataStatus` 호출

### 결과

- TypeScript 정적 검사: 통과
- Vitest: 통과
  - 6개 테스트 파일
  - 73개 테스트 통과
- Production build: 통과
- 공백 검사: 통과
- 운영 Supabase 음식 DB 반영: 통과
  - 전체 음식: 15,724건
  - 식약처 import 추정: 15,586건
  - 검색 텍스트 보유: 15,724건
- 운영 DB 기준 음식 검색 확인: 통과
  - `육계장` 검색 결과: `육개장`
  - 첫 호출 시간: 약 927ms
- 배포 API 상태 확인: 통과
  - warm 호출 기준 약 1.8초

### 확인한 변경 범위

- MFDS 음식 DB 파일의 19,495개 원본 row를 운영 Supabase에 bulk 반영함.
- 중복 제거 기준으로 공공 음식 15,586건이 검색 가능한 상태가 됨.
- 음식 검색 첫 호출 지연 원인인 기본 음식 seed 반복 갱신을 제거하고, seed가 이미 있으면 건너뛰도록 변경함.

### 실패 원인 및 조치

- 직접 DB 주소 `db.nwjnliumdqoxsoelukdo.supabase.co:5432`는 현재 환경에서 IPv6 타임아웃 발생.
- Supabase pooler 실제 경로를 확인해 `aws-1-ap-northeast-1.pooler.supabase.com` session 포트로 운영 DB 작업을 수행함.
- 기존 1건 단위 import는 5분 제한에 걸려 bulk staging 방식으로 운영 DB에 반영함.

### 미실행 또는 제한 사항

- 실제 브라우저 로그인 사용자 화면의 음식 검색 UI 클릭 검증은 미실행.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외함.
