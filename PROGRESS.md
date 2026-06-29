# PROGRESS

## 2026-06-29 11:50:23 +09:00

### 작업 요약

- 식단 목표 저장 위치와 수정 가능성을 명확히 표시함.
- 운동 목표 기반 식단 목표 추천 기능을 추가함.
- 사용자가 추천값을 적용하거나 직접 수정해 저장할 수 있게 함.

### 변경 사항

- `server/routers.ts`
  - `meals.recommendedTargets` 추가.
  - 현재 운동 목표, 주간 운동 횟수, 최근 체중 기록을 기반으로 권장 칼로리와 탄단지를 계산함.
  - 기존 `buildNutritionStrategy`를 재사용해 다이어트, 근비대, 근력, 지구력 목표별 전략을 반영함.

- `client/src/pages/Meals.tsx`
  - 식단 목표 저장 위치를 `user_preferences.mealTargets`라고 UI에 명시함.
  - 운동 목표 요약과 추천 전략을 표시함.
  - 추천 칼로리/단백질/탄수화물/지방 카드 추가.
  - 추천값 적용 버튼 추가.
  - 직접 수정 후 저장 UX 유지.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 실제 계정에서 추천 적용/저장 흐름 확인 필요.
- 추천 계산은 현재 목표/체중 기반 규칙식이며 AI 설명형 추천은 아님.
- 체중 기록이 없으면 기본값 기반 추천이 됨.

### 다음 작업

- 6차: AI 이미지 후보를 기존 음식 DB와 자동 매칭.
- 후속: 추천 목표의 산출 근거를 더 자세히 표시.
- 후속: 편의점/프랜차이즈/브랜드 음식 preset 확장.
