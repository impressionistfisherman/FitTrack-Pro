# TEST_RESULT

## 2026-06-30 13:39:19 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD exec vitest run server/fittrack.test.ts server/exerciseSearch.test.ts`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- 운동 검색/시드 관련 Vitest: 통과
  - 2개 테스트 파일
  - 44개 테스트 통과
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 76개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- 기본 운동 catalog를 별도 set으로 분리.
- 검색 결과 랭킹에 기본 운동 boost 적용.
- 짧은 표준 기본명에 추가 boost 적용.
- 기존 DB에 남은 의미 번역 운동명 일부를 발음형으로 갱신하는 규칙 추가.
  - `손목 컬` → `리스트 컬`
  - `이두 컬` → `바이셉 컬`
  - `삼두 푸시다운` → `트라이셉 푸시다운`
- broad 검색 검증 추가.
  - `프레스`
  - `로우`
  - `컬`

### 실패 원인 및 조치

- 관련 테스트 작성 중 특정 운동명 강제 기대값이 실제 broad 검색 의도와 맞지 않아 조정.
- 기존 DB의 `손목 컬` 의미 번역 잔재가 발견되어 update 규칙 추가.

### 미실행 또는 제한 사항

- 운영 DB에 수동 SQL을 직접 실행하지 않음.
- 새 랭킹/갱신 규칙은 앱의 기존 `ensureSupplementalExercises()` 경로로 운영 DB에 반영되도록 코드에 포함함.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외함.
