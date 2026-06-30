# TEST_RESULT

## 2026-06-30 09:49:53 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD exec vitest run server/exerciseSearch.test.ts server/fittrack.test.ts`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- 운동 검색/표시명 관련 Vitest: 통과
  - 2개 테스트 파일
  - 43개 테스트 통과
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 75개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- 운동 표시명 정규화에서 `체스트`, `원암`, `바이셉`, `트라이셉` 등을 의미 번역하지 않고 발음형 한글로 유지.
- `덤벨프레스` 검색어가 기본 `덤벨 프레스` 항목과 매칭되도록 보강.
- 기본 운동 시드에 `덤벨 프레스`, `머신 체스트 프레스` 추가.
- 기존 의미 기반 검색어는 검색 호환성을 위해 유지.

### 실패 원인 및 조치

- 없음.

### 미실행 또는 제한 사항

- 실제 운영 DB에 직접 수동 SQL을 실행하지 않음.
- 새 기본 운동 시드는 앱의 기존 `ensureSupplementalExercises()` 경로로 운영 DB에도 삽입되도록 코드에 포함함.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외함.
