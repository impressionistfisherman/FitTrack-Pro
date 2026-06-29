# PROGRESS

## 2026-06-29 18:25:04 +09:00

### 작업 요약

- 식단 음식 삭제 기능을 추가함.
- 기성품/1인분 입력을 위해 표시 단위와 실제 중량(g)을 분리함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - 검색 결과의 직접 등록 음식에 삭제 버튼 추가.
  - 음식 등록 폼에 기본 섭취 단위와 1단위 중량(g) 입력 추가.
  - 식사 추가 영역을 수량, 단위, 실제 g 입력으로 분리.
  - 기록 목록 표시를 `1인분 · 100g` 형식으로 변경.
  - 이전 기록 복사 시 삭제된 음식도 기존 칼로리/매크로 값이 유지되도록 보완.

- `server/db.ts`
  - `foods.servingSizeGrams` 컬럼 자동 추가.
  - 사용자 음식 생성 시 기본 섭취 중량 저장.
  - `deleteFood()` 추가.
  - 음식 삭제 시 기존 식단 기록 보존을 위해 `meal_log_items.foodId`만 해제.

- `server/routers.ts`
  - `meals.deleteFood` mutation 추가.
  - `meals.createFood` 입력에 `servingSizeGrams` 추가.

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

- 실제 브라우저에서 식단 UI 클릭 흐름 검증 필요.
- 공공 음식의 실제 1회 제공량은 MFDS 원본 기준량을 현재 import 데이터에 저장하지 않았으므로 기본 100g으로 표시됨.

### 다음 작업

- MFDS 원본의 `영양성분함량기준량`을 `servingSizeGrams`로 import하도록 import 스크립트 개선.
- 식단 UI에서 자주 쓰는 단위 프리셋(`인분`, `개`, `봉`, `팩`, `컵`) 버튼화 검토.
