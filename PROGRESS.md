# PROGRESS

## 2026-06-30 14:32:11 +09:00

### 작업 요약

- 모바일에서 운동/음식 검색 결과 목록이 아래로 스크롤되지 않거나, 운동 기록 중 매번 위로 올라가 다시 찾아야 하는 UX를 개선함.
- 운동 선택 다이얼로그는 검색/필터 영역을 고정하고 결과 목록만 스크롤되도록 구조를 분리함.
- 음식 검색 결과도 모바일 viewport 기준으로 스크롤 가능한 높이를 확보함.

### 변경 사항

- `client/src/pages/WorkoutSession.tsx`
  - 운동 추가 다이얼로그에 `mobile-exercise-picker` 적용.
  - 검색창, 필터, 결과 개수, 휴식 시간 설정을 `mobile-picker-sticky` 영역으로 묶음.
  - 결과 목록에 `exercise-results-list`, `min-h-0`, `flex-1`, `overflow-y-auto`, `overscroll-contain` 적용.

- `client/src/pages/RoutineDetail.tsx`
  - 루틴 운동 추가 다이얼로그도 같은 모바일 picker 구조로 정리.
  - 검색/필터 영역과 결과 목록 스크롤 영역을 분리.

- `client/src/pages/Meals.tsx`
  - 음식 검색 결과 영역에 `mobile-food-search-results` 적용.

- `client/src/index.css`
  - 모바일 다이얼로그 높이를 `100dvh` 기준으로 보정.
  - 모바일 picker sticky 영역 추가.
  - 결과 목록 스크롤 컨테이너의 `min-height`, `overflow`, `touch-action`, `-webkit-overflow-scrolling` 정리.
  - 음식 검색 결과 목록의 모바일 높이 보정.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`
- 모바일 viewport `390x844`로 공개 운동 라이브러리 화면 확인.

### 남은 문제

- 로그인 상태가 없어 실제 운동 기록/식단 기록 내부 검색 흐름은 브라우저에서 끝까지 수동 확인하지 못함.
- 사용자 로그인 세션에서 운동 기록 다이얼로그와 식단 기록 검색을 한 번 더 눈으로 확인하는 것이 안전함.

### 다음 작업

- 실제 로그인 상태에서 모바일 운동 추가/변경, 식단 검색 선택 흐름을 재확인.
- 이후 모바일 기록 화면의 카드 간격/버튼 터치 영역을 추가로 정리.
