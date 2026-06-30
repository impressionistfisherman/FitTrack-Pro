# TEST_RESULT

## 2026-06-30 13:48:36 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD exec vitest run server/exerciseSearch.test.ts server/fittrack.test.ts`
- `.\node_modules\.bin\pnpm.CMD run exercises:audit-names -- --fail-on-findings`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- 운동 검색/표시명 관련 Vitest: 통과
  - 2개 테스트 파일
  - 45개 테스트 통과
- 운동명 audit: 통과
  - 검사 대상 2,093개
  - 의미 번역 잔재 0개
  - 영어 잔여 토큰 raw report 생성
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- `scripts/audit-exercise-names.mjs` 추가.
- `package.json`에 `exercises:audit-names` 추가.
- 런타임 운동 표시명 정리 규칙 확장.
- bulk 운동 생성 스크립트 발음형 변환표 확장.
- 영어 잔여 토큰 표시명 정리 테스트 추가.

### 실패 원인 및 조치

- 없음.

### 미실행 또는 제한 사항

- `server/data/bulk-exercises.json` 원본 파일 자체는 재생성하지 않음.
- 현재 영어 잔여 토큰은 raw bulk 기준으로 report되며, 주요 토큰은 런타임 표시명 정리와 다음 재생성 변환표에 반영함.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외함.
