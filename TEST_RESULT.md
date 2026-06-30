# TEST_RESULT

## 2026-06-30 14:20:11 +09:00

### 테스트 항목

- `node scripts/build-bulk-exercise-seed.mjs`
- `.\node_modules\.bin\pnpm.CMD run exercises:audit-names -- --fail-on-findings`
- `.\node_modules\.bin\pnpm.CMD exec vitest run server/exerciseSearch.test.ts server/fittrack.test.ts`
- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`

### 결과

- bulk 운동 데이터 재생성: 통과
  - `server/data/bulk-exercises.json` 재생성
  - 생성 결과 1,959개 bulk 운동
- 운동명 audit: 통과
  - 검사 대상 2,084개
  - 의미 번역 잔재 0개
  - 영어 잔여 토큰 0개
- 운동 검색/표시명 관련 Vitest: 통과
  - 2개 테스트 파일
  - 45개 테스트 통과
- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과

### 확인한 변경 범위

- `server/data/bulk-exercises.json` 원본 bulk 데이터를 새 발음형 한글 매핑 기준으로 재생성함.
- `scripts/build-bulk-exercise-seed.mjs`의 영어 토큰 변환표를 확장함.
- `shared/exerciseSearch.ts` 런타임 표시명 정리 규칙을 같은 방향으로 보강함.
- `scripts/audit-exercise-names.mjs`에서 허용 가능한 운동 약어 예외를 명시함.
- 성별 표기 `(male)`, `(female)`는 운동명 표시에서 제거되도록 정리함.

### 실패 원인 및 조치

- 초기 대상 테스트에서 `Chest Tap Push-Up Male`이 `체스트 탭 푸시업 메일`로 표시되어 실패함.
- 성별 표기는 운동명 구분에 불필요하므로 생성 단계와 런타임 표시 정리 단계에서 제거하도록 수정함.
- 수정 후 대상 테스트와 전체 테스트 모두 통과함.

### 미실행 또는 제한 사항

- 실제 브라우저 수동 UI 확인은 수행하지 않음.
- `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`, `.gitignore`의 기존 dirty 상태는 이번 커밋 범위에서 제외함.
