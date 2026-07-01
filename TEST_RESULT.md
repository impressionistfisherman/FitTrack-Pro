# TEST_RESULT

## 2026-07-01 09:29:40 +09:00

### 테스트 항목

- `.\node_modules\.bin\pnpm.CMD run check`
- `.\node_modules\.bin\pnpm.CMD run test`
- `.\node_modules\.bin\pnpm.CMD run build`
- `git diff --check`
- 로컬 `home.summary` API 응답 확인
- 앱 브라우저 대시보드 확인 시도

### 결과

- TypeScript 정적 검사: 통과
- 전체 Vitest: 통과
  - 6개 테스트 파일
  - 77개 테스트 통과
- Production build: 통과
- 공백 검사: 통과
  - 의미 있는 공백 오류 없음
  - Windows LF/CRLF 경고만 출력됨
- 로컬 `home.summary` API 확인: 통과
  - 검증 서버: `http://localhost:3011/`
  - 응답 코드: 200
  - 응답 시간: 109ms
  - 응답 크기: 27,736 bytes
  - `recentWorkouts`: 8건
  - `routines`: 1건
  - `monthlyStats`: 7건
  - `totalSessions`: 131건

### 확인한 변경 범위

- 대시보드 하단 `상세 분석 보기`, `추가 기능` 패널 진입 버튼을 홈 상단 우측 소형 버튼으로 이동.
- 접힌 상세 분석/추가 기능 패널은 열기 전까지 렌더하지 않도록 변경.
- 일반 사용자 홈에서 불필요한 트레이너/코칭 알림 쿼리를 실행하지 않도록 제한.
- 홈 요약 응답에서 최근 운동은 8건, 루틴은 3건까지만 내려보내도록 제한.

### 실패 원인 및 조치

- 최초 `check` 실패
  - 원인: `getRoutinesByUser(userId, limit?)`의 선택적 `limit` 값 타입 좁히기 부족.
  - 조치: `normalizedLimit`으로 타입을 명확히 분리.
- 앱 브라우저 대시보드 검증 제한
  - 원인: 앱 브라우저 로컬 페이지 이동이 반복 타임아웃됨.
  - 조치: HTTP API 검증과 빌드 검증으로 대체.

### 미실행 또는 제한 사항

- 실제 로그인 대시보드 화면의 브라우저 스크린샷 검증은 앱 브라우저 타임아웃 때문에 완료하지 못함.
- 운영 배포 후 실제 모바일 네트워크 체감 속도는 별도 확인 필요.
