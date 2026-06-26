# PROGRESS

## 2026-06-26 10:22:36 +09:00

### 작업 요약

- 전체 반응속도와 로딩 체감 개선 요청에 대해, 전역 메뉴와 기존 라우팅은 유지하고 병목 가능성이 큰 사용자 흐름부터 수정함.
- 외부 fitness/workout 앱 UX 레퍼런스에서 공통적으로 확인되는 방향인 빠른 진입, 낮은 조작 비용, 명확한 진행 상태를 기준으로 운동 탐색과 운동 세션 일부를 개선함.

### 변경 사항

- `client/src/App.tsx`
  - 라우트 lazy import를 재사용 가능한 loader 함수로 분리함.
  - 앱 초기 렌더 이후 브라우저 유휴 시간에 주요 페이지 chunk를 백그라운드 사전 로드하도록 추가함.
  - 초기 로딩을 막지 않고 이후 메뉴 이동 체감을 줄이는 방식으로 적용함.

- `client/src/pages/Exercises.tsx`
  - 운동 목록 페이지 크기를 50개에서 24개로 축소함.
  - GIF 썸네일 자동 렌더를 기본 비활성화하고 `빠른 목록` / `이미지 켜짐` 토글로 전환함.
  - 검색창과 부위 필터를 sticky 컨트롤 패널로 묶어 스크롤 중에도 조작하기 쉽게 변경함.
  - 기존 상세 필터, 즐겨찾기, 페이지네이션, 상세 이동 기능은 유지함.

- `client/src/pages/WorkoutSession.tsx`
  - 운동 추가 모달 검색 결과 렌더링을 최대 40개로 제한함.
  - 검색 결과 필터링을 `useMemo`로 감싸 입력 중 불필요한 계산을 줄임.
  - 기존 운동 추가, 휴식 시간 설정, AI 피드백 호출 기능은 유지함.

- `client/src/index.css`
  - 운동 탐색 컨트롤 패널, 빠른 목록 토글, 더 조밀한 운동 목록 카드 스타일을 추가함.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 이번 작업에서 전역 사이드바, 역할 전환 UI, 기존 페이지 구분은 변경하지 않음.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제 및 다음 작업

- 실제 브라우저 기준으로 모바일/웹 스크롤, 검색 입력, 페이지 이동 체감 QA 필요.
- 다음 우선순위는 `History`, `Home`, `Routines`, `WorkoutSession`의 세부 블록 재배치와 모바일 조작 흐름 정리임.
- 빌드 결과상 `charts`, `History`, `WorkoutSession`, `Profile`, `AICoach` chunk가 여전히 크므로 추가 분할 또는 지연 로딩 후보임.
