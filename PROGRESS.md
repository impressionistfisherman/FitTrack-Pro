# PROGRESS

## 2026-06-29 09:27:24 +09:00

### 작업 요약

- 식단 기록 1차 기능을 구현함.
- 사용자가 직접 음식을 등록하고, 날짜별로 식사와 섭취량을 기록할 수 있게 함.
- 기록된 식단을 기준으로 하루 총 칼로리와 단백질, 탄수화물, 지방 합계를 확인할 수 있게 함.

### 변경 사항

- `client/src/pages/Meals.tsx`
  - 식단 기록 신규 페이지 추가.
  - 날짜 선택, 오늘 요약, 음식 등록, 음식 검색, 식사 추가, 기록 목록, 삭제 기능 구성.
  - 기본 음식과 사용자 등록 음식을 함께 검색하도록 UI 구성.

- `client/src/App.tsx`
  - `/meals` 라우트 추가.
  - 식단 페이지를 lazy route로 분리함.

- `client/src/components/AppLayout.tsx`
  - 사용자 사이드바에 `식단` 메뉴 추가.
  - 모바일 하단 내비게이션에 `식단` 메뉴 추가.

- `server/db.ts`
  - `foods`, `meal_logs`, `meal_log_items` 테이블 생성 로직 추가.
  - 기본 음식 데이터 시드 추가.
  - 음식 검색, 음식 등록, 즐겨찾기 토글, 날짜별 식단 조회, 식단 생성, 식단 삭제 DB 함수 추가.
  - Postgres 운영 DB 경로를 위해 신규 camelCase 컬럼 quoting 목록 추가.

- `server/routers.ts`
  - `meals` tRPC router 추가.
  - 음식 목록, 음식 등록, 즐겨찾기, 날짜별 조회, 식단 저장, 식단 삭제 API 추가.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 이미지 기반 AI 음식 인식은 아직 구현하지 않음.
- 음식 데이터베이스는 기본 음식 + 사용자 직접 등록 수준임.
- 실제 브라우저에서 모바일/데스크톱 식단 입력 흐름 수동 QA가 필요함.

### 다음 작업

- 2차: 음식 별칭/검색어 보강, 최근 사용/자주 먹는 음식 UX 개선.
- 3차: 이미지 업로드 또는 카메라 촬영 기반 AI 음식 인식 플로우 추가.
- 4차: 목표 칼로리, 매크로 목표, 주간 식단 리포트 추가.
