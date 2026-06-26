# PROGRESS

## 2026-06-26 17:36:53 +09:00

### 작업 요약

- 로그아웃 상태에서 체중 기록 페이지가 노출되는 문제를 수정함.
- 비로그인 홈 랜딩 블럭의 세로 배치를 중앙으로 조정함.

### 변경 사항

- `client/src/pages/BodyWeight.tsx`
  - `useAuth` 기반 로그인 보호 추가.
  - 로딩 중에는 `PageLoadingState` 표시.
  - 로그아웃 상태에서는 `AuthRequiredState` 표시.

- `client/src/pages/Home.tsx`
  - 비로그인 랜딩 래퍼를 `flex` + `min-h` + `items-center` 구조로 변경.
  - 큰 화면에서 블럭이 위쪽에 몰리지 않고 중앙에 보이도록 조정.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 다음 작업

- 코칭/프로필 등 남은 화면의 카드 우선순위 재배치 계속.
