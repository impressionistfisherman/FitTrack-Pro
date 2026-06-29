# PROGRESS

## 2026-06-29 11:35:18 +09:00

### 작업 요약

- 식단 기록 4차 작업을 진행함.
- 사용자가 하루 목표 칼로리와 탄단지 목표를 저장할 수 있게 함.
- 오늘 섭취량과 최근 7일 식단 흐름을 목표 기준으로 볼 수 있게 함.

### 변경 사항

- `server/db.ts`
  - 최근 N일 일별 식단 합계를 계산하는 `getMealDailyTotals` 추가.
  - 날짜 범위 내 식단 기록을 정규화하고 일별 칼로리/탄단지/식사 수를 집계함.

- `server/routers.ts`
  - `meals.targets` 추가.
  - `meals.saveTargets` 추가.
  - `meals.weeklyReport` 추가.
  - 식단 목표는 `user_preferences`의 `mealTargets`에 JSON으로 저장함.

- `client/src/pages/Meals.tsx`
  - 오늘 요약에 목표 칼로리 대비 달성률 표시 추가.
  - 단백질/탄수화물/지방 목표 대비 진행률 표시 추가.
  - 식단 목표 설정 카드 추가.
  - 7일 평균 칼로리, 평균 단백질, 목표 근접 일수, 일별 칼로리 바 리포트 추가.
  - 식단 저장/삭제 후 7일 리포트도 갱신되도록 변경함.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- `/meals` 로그아웃 상태 브라우저 렌더링 확인 완료.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 로그인 후 목표 저장, 식단 저장, 주간 리포트 갱신 end-to-end 흐름은 실제 계정으로 추가 확인 필요.
- 식단 목표 자동 추천은 아직 없음.
- 이미지 기반 AI 음식 인식은 아직 구현하지 않음.

### 다음 작업

- 5차: 이미지 업로드 또는 카메라 촬영 기반 AI 음식 인식.
- 후속: 목표 칼로리/탄단지 자동 추천.
- 후속: 편의점/프랜차이즈/브랜드 음식 preset 확장.
