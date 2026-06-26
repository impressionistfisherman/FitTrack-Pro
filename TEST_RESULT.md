# TEST_RESULT

## 2026-06-26 10:41:10 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`

### 결과

- TypeScript 정적 검사: 통과
- Vitest: 통과
  - 6개 테스트 파일
  - 73개 테스트 통과
- Production build: 통과

### 확인한 변경 범위

- 모든 운동 API 응답에 공통 한국어 표시명 정규화 적용
- 전체 운동 검색에 적용되는 별칭/동의어 규칙 추가 보강
- 기계 번역식 `nameKo` 정리
  - 예: `어덕터` → `이너싸이 머신`
  - 예: `어브덕터 머신` → `아웃싸이 머신`
  - 예: `얼터네이트 해머 컬` → `교대 해머 컬`
  - 예: `체스트 Tap 푸시업 Male` → `가슴 터치 푸시업`
- `Tap/Touch`, `Jump/Jumps` 등 영어 혼입 검색어도 한국식 입력과 연결
- API 응답 표시명 정규화 회귀 테스트 추가

### 실패 원인 및 조치

- 1차 테스트에서 영어명 fallback이 `Alternate Hammer Curl`을 `컬`로 과도하게 축약함
- `curl` 일반 변환을 제거하고 `hammer curl`, `biceps curl`처럼 구체적인 규칙으로 제한함
- 2차 테스트에서 `교대 해머 컬`이 `해머 컬`로 덮이는 문제 확인
- 정리된 한국어명에 영문이 남아 있을 때만 영어 fallback을 우선하도록 조건을 좁힘
- 재검증 통과

### 미실행 또는 제한 사항

- 실제 브라우저 수동 QA는 이번 기록에 포함하지 않음
- 로컬 DB 파일과 `SESSION_HANDOFF.md`는 기존 dirty 상태로 유지하고 이번 변경 범위에서 제외함
