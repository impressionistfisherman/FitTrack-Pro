# PROGRESS

## 2026-06-26 10:59:37 +09:00

### 작업 요약

- UI/UX 순차 개선 1차로 운동 검색/선택 결과 카드 UI를 공통화함.
- 전역 메뉴, 역할 전환, 라우팅은 변경하지 않음.

### 변경 사항

- `client/src/components/exercise/ExerciseResultItem.tsx`
  - 공통 운동 결과 카드 추가.
  - 한국식 운동명, 영문명, 대표 별칭, 부위/기구/난이도 배지 표시.
  - 링크형 상세 이동과 버튼형 선택을 모두 지원.
  - GIF 이미지는 기존 빠른 목록 정책대로 선택 렌더 지원.

- `client/src/pages/Exercises.tsx`
  - 기존 페이지 내부 `ExerciseListItem` 중복 제거.
  - 공통 `ExerciseResultItem` 적용.
  - 즐겨찾기 버튼은 기존 기능 유지.

- `client/src/pages/WorkoutSession.tsx`
  - 운동 추가 모달의 운동 선택 카드를 공통 카드로 교체.
  - 기존 운동 추가, 휴식 시간 설정, 검색 기능 유지.

- `client/src/pages/RoutineDetail.tsx`
  - 루틴 운동 추가/변경 모달의 운동 선택 카드를 공통 카드로 교체.
  - 기존 운동 선택, 세트 설정, 운동 변경 기능 유지.

- `client/src/index.css`
  - 버튼형 운동 카드 스타일 추가.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 다음 작업

- 2차: 운동 세션 화면 재배치.
  - 기록 입력 최우선.
  - 보조 기능 접힘/하단 보조 영역.
  - 완료 액션 모바일 sticky 검토.
