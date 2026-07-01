# PROGRESS

## 2026-07-01 11:40:15 +09:00

### 작업 요약

- 식단 기록 수량 입력을 `그램` 또는 `인분` 중 하나로 선택하는 방식으로 수정함.
- 기존 `수량`, `단위`, `실제 g` 3칸 구조에서 `실제 g` 입력을 제거함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - 섭취 단위 입력을 자유 텍스트에서 `그램`/`인분` 선택으로 변경.
  - `portionAmount`, `portionUnit` 변경 시 내부 `amount` gram 값을 자동 계산.
  - `인분`은 선택 음식의 `servingSizeGrams` 기준으로 gram 환산.
  - 단위 전환 시 기존 실제 gram 값이 최대한 유지되도록 수량을 보정.
  - 빠른 gram 버튼 선택 시 단위를 `그램`으로 전환.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`

### 남은 문제

- 실제 모바일 화면에서 단위 선택 드롭다운 위치와 저장 흐름은 미확인.

### 다음 세션에서 할 일

- 모바일 `/meals`에서 음식 선택 후 `그램`/`인분` 전환과 저장 결과 표시 확인.
