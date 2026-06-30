# PROGRESS

## 2026-06-30 14:20:11 +09:00

### 작업 요약

- bulk 운동 데이터 원본을 발음형 한글 매핑 기준으로 재생성함.
- 운동명 audit 기준에서 의미 번역 잔재와 영어 잔여 토큰을 모두 0개로 맞춤.
- 성별 표기처럼 운동 선택에 불필요한 꼬리표는 표시명에서 제거함.

### 변경 사항

- `server/data/bulk-exercises.json`
  - `scripts/build-bulk-exercise-seed.mjs` 기준으로 재생성.
  - 재생성 후 bulk 운동 1,959개.
  - audit 기준 영어 잔여 토큰 0개.

- `scripts/build-bulk-exercise-seed.mjs`
  - 남은 영어 토큰을 발음형 한글로 변환하는 mapping 확장.
  - `male`, `female` 기반 성별 표기는 최종 표시명에서 제거.

- `shared/exerciseSearch.ts`
  - 런타임 표시명 정리 규칙 확장.
  - 기존 데이터나 DB에 남아 있는 영어 토큰도 화면 표시 시 발음형 한글로 정리.
  - 성별 꼬리표는 제거.

- `scripts/audit-exercise-names.mjs`
  - `POV`, `JM`, `L`, `Y`, `W`, `SZ` 등 운동명에서 허용 가능한 약어를 audit 예외로 명시.

- `TEST_RESULT.md`
  - 이번 검증 결과로 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`
- 추가 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run exercises:audit-names -- --fail-on-findings`
  - `.\node_modules\.bin\pnpm.CMD exec vitest run server/exerciseSearch.test.ts server/fittrack.test.ts`

### 남은 문제

- 실제 모바일/웹 브라우저에서 운동 검색 체감 동작은 아직 수동 확인하지 않음.
- `.gitignore`, `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 기존 dirty 상태로 남아 있으며 이번 작업 범위에서 제외함.

### 다음 작업

- 모바일 운동 검색 모달에서 긴 결과 목록의 스크롤/포커스 동작을 실제 브라우저 기준으로 재검증.
- 기초 운동/기구명 중심 검색어를 추가로 보강할지 사용자 검색 로그 기준으로 판단.
