# PROGRESS

## 2026-06-30 13:48:36 +09:00

### 작업 요약

- 운동명 전체 audit 체계를 추가함.
- 의미 번역 잔재와 영어 잔여 토큰을 자동으로 찾을 수 있게 함.
- audit 결과 기반으로 런타임 표시명과 bulk 재생성 변환표를 보강함.

### 변경 사항

- `scripts/audit-exercise-names.mjs`
  - `server/data/bulk-exercises.json`과 `server/db.ts`의 `nameKo` 검사.
  - 의미 번역 토큰 감지.
  - 영어 잔여 토큰 count 및 sample report.
  - `--fail-on-findings` 사용 시 의미 번역 잔재가 있으면 실패.

- `package.json`
  - `exercises:audit-names` script 추가.

- `shared/exerciseSearch.ts`
  - 런타임 표시명 정리 규칙 확장.
  - `Blaster`, `Rollerout`, `Inverse`, `Planche`, `Pov`, `Revers`, `Abduction`, `Archer`, `Scapula`, `Squatting`, `Crossovers`, `Maltese` 등 영어 잔여 토큰을 발음형 한글로 정리.

- `scripts/build-bulk-exercise-seed.mjs`
  - bulk 운동 재생성 시 같은 토큰을 발음형 한글로 변환하도록 mapping 확장.

- `server/exerciseSearch.test.ts`
  - 영어 잔여 토큰이 표시명에서 정리되는지 테스트 추가.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`
- 추가 audit 통과
  - `.\node_modules\.bin\pnpm.CMD run exercises:audit-names -- --fail-on-findings`

### 남은 문제

- `server/data/bulk-exercises.json` 원본 자체는 아직 재생성하지 않음.
- 영어 잔여 토큰 306개는 raw bulk 기준으로 report되며, 이번 작업은 상위 빈도 토큰부터 런타임/재생성표에 반영한 단계임.

### 다음 작업

- `build-bulk-exercise-seed.mjs`로 bulk 데이터 재생성.
- 재생성 후 audit 재실행.
- 영어 잔여 토큰 count 감소 확인.
