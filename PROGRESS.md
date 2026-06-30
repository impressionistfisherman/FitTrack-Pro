# PROGRESS

## 2026-06-30 09:49:53 +09:00

### 작업 요약

- 운동명 한글화가 의미 번역으로 표시되어 검색과 인지가 헷갈리는 문제를 수정함.
- 기본 운동명이 부족해 `덤벨프레스` 같은 일반 검색어가 어색하게 동작하는 문제를 보강함.

### 변경 사항

- `shared/exerciseSearch.ts`
  - `체스트 → 가슴`, `원암 → 한손`, `바이셉 → 이두`, `트라이셉 → 삼두`처럼 의미 번역하던 표시명 정규화 규칙 제거.
  - `Tap`, `Basic`, `Modified`, `Twisting`, `Rotate` 등 일부 영어 잔여 단어도 발음형 한글로 정리.
  - `덤벨프레스`, `덤벨 프레스`, `dumbbell press` 검색 별칭 추가.
  - 영어명 fallback에서도 `Dumbbell Press`, `Biceps Curl`, `Treadmill`을 발음형 한글명으로 반환하도록 조정.

- `server/db.ts`
  - 기본 운동 시드에 `덤벨 프레스`, `머신 체스트 프레스` 추가.
  - 기존 데이터베이스에도 앱 시작 후 운동 목록 보강 경로를 통해 삽입되도록 코드에 포함.

- `server/exerciseSearch.test.ts`
  - 표시명이 의미 번역 대신 발음형 한글을 유지하는지 검증 추가.

- `server/fittrack.test.ts`
  - `덤벨프레스` 검색 결과와 `원암`, `체스트` 표시명 유지 검증 추가.

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

### 남은 문제

- 전체 운동 DB의 모든 종목명을 사람이 검수한 수준으로 완전 표준화한 것은 아님.
- 이번 변경은 의미 번역을 막는 정규화 레이어와 대표 기본 운동 누락을 우선 해결한 것임.

### 다음 작업

- 자주 쓰는 기본 운동군을 부위별로 추가 정리.
- `server/data/bulk-exercises.json` 생성 스크립트의 전체 영어 발음 변환표를 확장해 원본 시드 자체도 더 일관되게 재생성.
