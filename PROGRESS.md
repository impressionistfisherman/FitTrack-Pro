# PROGRESS

## 2026-06-30 13:39:19 +09:00

### 작업 요약

- Harness 100 기준으로 `software QA + data quality` 흐름 적용.
- 운동 검색 결과에서 기본 운동이 혼합/심화 운동보다 먼저 보이도록 랭킹을 개선함.
- 기존 DB에 남은 일부 의미 번역 운동명을 발음형으로 갱신하도록 보강함.

### 변경 사항

- `server/db.ts`
  - `basicGymExercises` set 분리.
  - `isBasicGymExercise()` 추가.
  - `scoreBasicGymExerciseBoost()` 추가.
  - broad 검색에서 기본 운동에 score boost 적용.
  - 짧은 표준 기본명에 추가 boost 적용.
  - 의미 번역 잔재 갱신 map 추가.
    - `손목 컬` → `리스트 컬`
    - `이두 컬` → `바이셉 컬`
    - `덤벨 이두 컬` → `덤벨 바이셉 컬`
    - `삼두 딥` → `트라이셉 딥`
    - `삼두 푸시다운` → `트라이셉 푸시다운`
    - `삼두 익스텐션` → `트라이셉 익스텐션`

- `server/fittrack.test.ts`
  - broad movement 검색에서 기본 운동이 상단에 포함되는지 검증 추가.
  - `손목 컬` 같은 의미 번역 잔재가 상단에 나오지 않는지 검증 추가.

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

- 전체 bulk 운동 데이터의 모든 의미 번역 잔재를 완전 제거한 것은 아님.
- 현재는 검색 체감에 큰 영향을 주는 기본 운동 랭킹과 일부 대표 잔재 갱신을 먼저 처리함.

### 다음 작업

- bulk 운동명 전체 audit 스크립트 작성.
- `가슴`, `한손`, `손목`, `발목`, `어깨`, `엉덩이`, `종아리` 등 의미 번역 잔재를 파일/DB 단위로 리포트.
- 리포트 기반으로 발음형 변환표 확장.
