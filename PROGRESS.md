# PROGRESS

## 2026-07-01 11:49:09 +09:00

### 작업 요약

- 음식 검색 드롭다운이 화면 높이를 크게 늘리는 느낌을 줄이도록 floating 레이어 동작과 높이를 조정함.
- 수량 입력 시 브라우저 기본 숫자 스피너가 보이지 않도록 입력 방식을 수정함.
- 작은 화면에서 수량/단위 입력이 카드 오른쪽으로 밀리지 않도록 폭 제약을 정리함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - 음식 검색 결과 목록의 불필요한 오른쪽 여백 클래스를 제거.
  - 음식 검색 입력 wrapper를 `.food-search-anchor`로 변경해 CSS에서 레이어 우선순위를 제어.
  - 선택 음식 제목 영역에 `min-w-0`을 추가해 긴 음식명에서도 입력 영역을 밀지 않도록 조정.
  - 수량 입력을 `type="number"`에서 `type="text"`와 `inputMode="decimal"` 조합으로 변경.
- `client/src/index.css`
  - `.food-search-anchor`와 `:focus-within` z-index를 추가해 드롭다운이 주변 카드 위에 뜨도록 조정.
  - `.food-search-dropdown` 높이와 containment를 조정해 레이아웃 확장감을 줄임.
  - `.meal-amount-controls` grid를 추가해 수량/단위 입력 폭을 모바일에 맞게 제한.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`

### 남은 문제

- 로그인 후 실제 모바일 `/meals` 화면에서 드롭다운 선택과 수량 입력 터치감은 수동 확인 필요.

### 다음 세션에서 할 일

- 로그인 상태에서 모바일 `/meals` 음식 검색 드롭다운, 음식 선택, 수량 입력, 저장 흐름을 직접 확인.
