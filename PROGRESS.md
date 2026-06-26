# PROGRESS

## 2026-06-26 10:41:10 +09:00

### 작업 요약

- 일부 운동 예시만 고치는 방식이 아니라, 전체 운동 API 응답과 전체 검색에 공통 적용되는 운동명/별칭 정규화 레이어를 추가함.
- 원본 DB의 `nameKo`가 어색해도 API 응답에서 한국 사용자가 알아보기 쉬운 표시명으로 내려가도록 처리함.

### 변경 사항

- `shared/exerciseSearch.ts`
  - `getReadableKoreanExerciseName()` 추가.
  - 운동 표시명 정리 규칙 추가.
    - `어덕터` → `이너싸이 머신`
    - `어브덕터 머신` → `아웃싸이 머신`
    - `얼터네이트/얼터네이팅` → `교대`
    - `원암/투암` → `한손/양손`
    - `비하인드 더 백` → `등 뒤`
    - `Tap/Touch`, `Jumps`, `Sitted`, `Twisting`, `Raised`, `Support`, `Male/Female` 등 영어 혼입 표현 정리
  - 영어명 기반 fallback 변환 추가.
  - 검색 동의어에 `탭/터치/tap/touch`, `점프/jump/jumps` 추가.
  - `curl`처럼 과도하게 넓은 변환은 제거하고 구체 규칙으로 제한함.

- `server/db.ts`
  - `normalizeExercise()`에서 모든 운동 응답의 `nameKo`를 `getReadableKoreanExerciseName()` 결과로 정규화함.
  - 기존 DB 스키마와 원본 row는 변경하지 않고 API 표시 레이어에서 처리함.

- `server/exerciseSearch.test.ts`
  - 운동명 표시 정규화 테스트 추가.
  - 과도한 축약 방지 케이스 포함.

- `server/fittrack.test.ts`
  - 실제 `exercises.list` API 응답에서 정규화된 `nameKo`가 내려오는지 테스트 추가.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 운동 ID, DB 스키마, 라우팅, 메뉴 구조는 변경하지 않음.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제 및 다음 작업

- 이번 작업은 규칙 기반 정규화라 전체 품질이 크게 나아지지만, 2,000개 이상 운동명 전체를 사람이 검수한 수준은 아님.
- 다음 단계는 실제 전체 운동 목록을 export해서 어색한 표시명을 샘플링하고, 누락 규칙을 계속 추가하는 방식이 적절함.
