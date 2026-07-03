# PROGRESS

## 2026-07-03 09:36:43 +09:00

### 작업 요약

- 운동 기록 추가 모달의 검색 입력 렉 완화
- 운동 검색과 운동 교체 검색에 `useDebouncedValue` 적용
- 이미지 캡처 인식 후 DB 매칭에서 장비 단어를 보존하고, 다른 장비 후보를 감점하도록 보정

### 현재 상태

- `pnpm run check`, `pnpm run test`, `pnpm run build`, `git diff --check` 통과

### 변경 파일

- `client/src/components/FreeWorkoutDialog.tsx`
- `server/routers.ts`
- `TEST_RESULT.md`
- `PROGRESS.md`

### 남은 문제

- 실제 캡처 이미지에서 바벨 로우, 케이블 로우 등 장비명 포함 운동 재확인 필요

### 다음 세션에서 할 일

- 필요 시 캡처 매칭 결과에 원본 OCR 운동명을 함께 표시해 사용자가 오분류를 더 빨리 확인하게 개선
