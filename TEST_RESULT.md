# TEST_RESULT

## 2026-06-26 10:34:23 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`

### 결과

- TypeScript 정적 검사: 통과
- Vitest: 통과
  - 6개 테스트 파일
  - 71개 테스트 통과
- Production build: 통과

### 확인한 변경 범위

- 전체 운동 검색에 적용되는 장비/동작/부위/자세 단어별 동의어 규칙 추가
- `이너싸이`, `아웃싸이`, `어덕트머신`, `힙 어덕션`, `앱덕션`, `아웃싸이머신` 등 검색 보강
- 운동 탐색, 운동 세션 운동 추가, 루틴 운동 추가/변경 목록에 대표 별칭 표시
- 운동 검색 유닛 테스트와 서버 검색 회귀 테스트 보강

### 실패 원인 및 조치

- 이번 검증에서 실패 없음

### 미실행 또는 제한 사항

- 실제 브라우저 수동 QA는 이번 기록에 포함하지 않음
- 로컬 DB 파일과 `SESSION_HANDOFF.md`는 기존 dirty 상태로 유지하고 이번 변경 범위에서 제외함
