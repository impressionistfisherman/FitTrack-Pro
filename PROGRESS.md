# PROGRESS

## 2026-07-02 15:26:23 +09:00

### 작업 요약

- 홈 진입 후 사전 로딩하는 라우트를 `Exercises`, `Routines`로 축소
- 사전 로딩 대기 시간을 늘려 초기 렌더 직후 네트워크와 JS 실행 부담 완화
- 식단 화면을 `기록`, `목표·도구` 탭으로 분리
- 식단의 최근 음식, 자주 먹는 음식, 최근 식사 쿼리를 `기록` 탭에서만 실행하도록 변경
- 식단의 추천 목표와 7일 리포트 쿼리를 `목표·도구` 탭에서만 실행하도록 변경
- 프로필 화면을 `연결`, `신체·기록`, `목표·설정` 탭으로 분리
- 프로필의 운동 통계, 체중 목록, 트레이너 상태 쿼리를 관련 탭에서만 실행하도록 변경

### 현재 상태

- `pnpm run check`, `pnpm run test`, `pnpm run build`, `git diff --check` 통과
- 로컬 OAuth 환경변수는 없어 직접 OAuth 로그인 검증은 불가
- 검증용 로컬 서버는 인증 화면까지만 확인됨

### 변경 파일

- `client/src/App.tsx`
- `client/src/pages/Meals.tsx`
- `client/src/pages/Profile.tsx`
- `TEST_RESULT.md`
- `PROGRESS.md`

### 남은 문제

- 배포 후 실제 로그인 상태에서 모바일 화면 길이와 탭 전환 체감 확인 필요
- 프로필 차트 라이브러리 지연 로딩은 다음 성능 개선 후보

### 다음 세션에서 할 일

- 배포 URL에서 `/meals`, `/profile` 모바일 스크롤 높이 재측정
- 필요 시 `Profile`의 Recharts 영역을 별도 lazy 컴포넌트로 분리
