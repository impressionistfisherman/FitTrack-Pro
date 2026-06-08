# FitTrack Pro 세션 인수인계

마지막 업데이트: 2026-06-08

## 현재 저장소 상태

- 작업 디렉터리: `C:\Users\Hyeonil-Choi\Desktop\fittrack-pro`
- 기본 브랜치: `master`
- 최근 작업 커밋: `852b064 Update session handoff for exercise catalog expansion`
- 검증 규칙은 `AGENTS.md`에 정리되어 있음.
- `pnpm`은 PATH에 없을 수 있으므로 Windows에서는 `.\node_modules\.bin\pnpm.CMD`로 실행.

## 최근 완료 작업

### 운동 검색 연관어 일반화

요청:

- 특정 몇 개 검색어만 하드코딩하는 것이 아니라, 모든 운동이 사용자가 다르게 부르는 이름/순서/표현으로도 연관 조회되어야 함.
- 예: `원암 케이블 로우`, `트라이셉스 원암`, `삼두 한팔`, `플레이트 풀다운`, `machine pulldown`.

수정:

- `shared/exerciseSearch.ts`
  - 운동 검색을 문구 별칭 + 토큰 동의어 매칭 조합으로 확장.
  - `원암/한팔/one arm`, `트라이셉스/삼두/triceps`, `플레이트/레버리지/machine/leverage`, `로우/row`, `풀다운/pulldown` 등 단어 단위 연관어 그룹 추가.
  - 단어 순서가 달라도 입력 토큰의 각 연관 그룹이 운동명에 포함되면 매칭되도록 변경.
- `server/db.ts`
  - `exercises.list` 검색 SQL을 단일 문구 `LIKE`에서 토큰 그룹 기반 후보 조회로 변경.
  - DB 후보 조회 후 공통 매칭 유틸로 한 번 더 필터링해 서버 결과 정합성 보강.
- `client/src/pages/Exercises.tsx`
- `client/src/pages/RoutineDetail.tsx`
- `client/src/pages/WorkoutSession.tsx`
  - 화면 내부 재필터도 단순 문자열 포함이 아니라 공통 운동 검색 매칭 로직을 사용하도록 변경.
- `server/exerciseSearch.test.ts`, `server/fittrack.test.ts`
  - `삼두 한팔`, `one arm cable row`, `machine pulldown` 등 다른 명칭 조합 테스트 추가.

현재 검증:

- 타깃 테스트 통과:
  - `.\node_modules\.bin\pnpm.CMD exec vitest run server/exerciseSearch.test.ts server/fittrack.test.ts`
  - `21 passed`
- 전체 검증은 이어서 실행 예정.

커밋/푸시:

- 현재 세션에서 전체 검증 후 커밋/푸시 예정.

### 운동 DB 확장 및 검색 별칭 보강

요청:

- `원암 케이블 로우`, `플레이트 풀다운`, `트라이셉스 원암` 같은 운동이 없거나 검색 연관이 약함.
- `hasaneyldrm/exercises-dataset`에서 운동 데이터를 가져와 DB에 더 추가.

수정:

- `scripts/build-bulk-exercise-seed.mjs`
  - `https://github.com/hasaneyldrm/exercises-dataset`의 `data/exercises.json` 로더 추가.
  - 기존 `free-exercise-db` 기반 seed 생성 후 Hasan 데이터셋을 중복 제거해서 추가하도록 변경.
  - 외부 데이터셋 README에 미디어가 교육/비상업 용도 제한으로 명시되어 있어, 이미지/GIF URL은 seed에 넣지 않고 운동명/분류/근육/수행 단계만 추가.
  - 케이블/레버리지/원암 트라이셉스 주요 운동 한글명 override 추가.
- `server/data/bulk-exercises.json`
  - bulk seed 운동 수가 `821`개에서 `1968`개로 증가.
  - 예: `Cable One Arm Bent Over Row`, `Cable Standing One Arm Triceps Extension`, `Lever Front Pulldown`, `Cable Seated Row`, `Cable One Arm Pulldown` 등 추가.
- `shared/exerciseSearch.ts`
  - `원암 케이블 로우`, `트라이셉스 원암`, `플레이트 풀다운` 검색어를 실제 DB 이름과 연결하는 별칭 그룹 추가.
- `server/exerciseSearch.test.ts`
  - 순서가 바뀐 한국어 검색어와 플레이트/레버리지 풀다운 별칭 테스트 추가.
- `server/fittrack.test.ts`
  - 라우터 `exercises.list`에서 새 seed 운동이 실제 검색 결과로 나오는지 검증 추가.

검증:

- `.\node_modules\.bin\pnpm.CMD run check` 통과
- `.\node_modules\.bin\pnpm.CMD run test` 통과
- `.\node_modules\.bin\pnpm.CMD run build` 통과
- `git diff --check` 통과
- 테스트 수: `50 passed`

커밋/푸시:

- 커밋 완료: `25ed29a Expand exercise catalog from hasaneyldrm dataset`
- 푸시는 현재 세션에서 이어서 진행.

### 트레이너 회원 상세 메뉴 화면 분리

요청:

- 트레이너 홈 > 회원 상세/회원 운동 기록 화면에서 운동 기록, 코칭 타임라인, 회원 과제, 비공개 메모, 진행 리포트, AI 코칭 보조, PT 기록이 한 화면에 몰려 있어 보기 어렵다는 문제.

수정:

- `client/src/App.tsx`
  - `/trainer/clients/:id/:view` 라우트 추가.
- `client/src/components/AppLayout.tsx`
  - 트레이너 회원 상세 사이드바에 `운동 기록` 기본 메뉴 추가.
  - `#timeline` 같은 hash anchor 대신 `/trainer/clients/:id/timeline`, `/tasks`, `/notes`, `/report`, `/ai-helper`, `/pt-sessions` 실제 하위 경로로 이동하도록 변경.
  - 기본 `운동 기록` 메뉴가 하위 화면에서도 계속 활성화되지 않도록 상세 기본 경로는 exact match 처리.
- `client/src/pages/TrainerClientDetail.tsx`
  - URL 하위 경로를 `TrainerClientView`로 해석하도록 변경.
  - 기본 경로는 `운동 기록`, `/timeline`, `/tasks`, `/notes`, `/report`, `/ai-helper`, `/pt-sessions`는 각각 별도 화면으로 렌더링.
  - 각 메뉴 선택 시 페이지 제목/설명이 해당 화면에 맞게 바뀜.
  - `PT 기록 추가` 버튼과 PT 입력 폼은 `운동 기록`, `PT 기록` 화면에서만 표시.
  - `비공개 메모`, `회원 과제`, `진행 리포트`, `AI 코칭 보조` 화면에서는 해당 화면 본문만 표시.

검증:

- `.\node_modules\.bin\pnpm.CMD run check` 통과
- `.\node_modules\.bin\pnpm.CMD run test` 통과
- `.\node_modules\.bin\pnpm.CMD run build` 통과
- `git diff --check` 통과
- 로컬 서버 응답 확인:
  - `http://localhost:3001/trainer/clients/1` 200 응답
  - `http://localhost:3001/trainer/clients/1/notes` 200 응답
  - `http://localhost:3001/trainer/clients/1/tasks` 200 응답
  - `http://localhost:3001/trainer/clients/1/pt-sessions` 200 응답
- 화면 자동 확인 제한:
  - 인앱 Browser가 `iab` 세션을 사용할 수 없다고 반환.
  - 로컬 `playwright` 패키지도 설치되어 있지 않아 브라우저 자동 QA는 미완료.

커밋/푸시:

- 이전 커밋/푸시 완료: `937b5e0 Split trainer client detail views`, `ec081f4 Update session handoff after trainer detail split`
- 하위 경로 분리 보강 커밋/푸시 완료: `98fcc65 Use routed trainer client detail tabs`
- 관련 작업 파일: `client/src/App.tsx`, `client/src/components/AppLayout.tsx`, `client/src/pages/TrainerClientDetail.tsx`, `SESSION_HANDOFF.md`

### PT 기록 날짜 달력 선택

요청:

- 트레이너 회원 상세 > PT 기록 추가 폼의 `진행 날짜`에서 달력이 뜨면 좋겠다는 요청.

수정:

- `client/src/pages/TrainerClientDetail.tsx`
  - 기존 브라우저 기본 `type="date"` 입력을 앱 UI `Calendar` + `Popover` 조합으로 변경.
  - 날짜 버튼 클릭 시 달력 팝오버가 열리고, 날짜 선택 시 `YYYY-MM-DD` 값으로 저장 후 팝오버 닫힘.
  - 버튼에는 `2026년 6월 1일 월` 같은 한국어 날짜 라벨 표시.
  - 달력 헤더를 네이티브 드롭다운이 아닌 기존 운동 기록 추가 달력과 같은 이전/다음 버튼형 헤더로 맞춤.
  - 트리거 버튼도 기존 운동 날짜 선택 UI처럼 좌측 캘린더 아이콘, 날짜 라벨, 우측 chevron 구조로 맞춤.

검증:

- `.\node_modules\.bin\pnpm.CMD run check` 통과
- `.\node_modules\.bin\pnpm.CMD run test` 통과
- `.\node_modules\.bin\pnpm.CMD run build` 통과
- `git diff --check` 통과

커밋/푸시:

- 달력 추가 커밋/푸시 완료: `96b6135 Add trainer PT date calendar picker`
- 달력 스타일 보정은 현재 세션에서 커밋/푸시 예정.

### 코칭 알림 스코프 분리

문제:

- 사용자 화면의 `코칭` 메뉴에서 실제 사용자 코칭 내용은 없는데 알림 배지 `1`이 표시됨.
- 원인은 `getCoachingNotificationSummary`가 사용자 코칭 알림과 트레이너 업무 알림을 같은 `unreadCount`로 합산하던 것.

수정:

- `server/db.ts`
  - `client_coaching`, `trainer_work`, legacy `coaching` 스코프 추가.
  - `getCoachingLastReadAt`, `markCoachingRead`가 스코프를 지원하도록 변경.
  - `getCoachingNotificationSummary`가 다음 값을 분리 반환:
    - `coachingUnreadCount`: 사용자 코칭 피드/피드백/PT/과제/댓글 알림
    - `trainerUnreadCount`: 트레이너 업무 요청 알림
    - `unreadCount`: 기존 호환용 합산값
- `client/src/components/AppLayout.tsx`
  - 사용자 사이드바 `코칭` 배지는 `coachingUnreadCount`만 사용.
  - 트레이너 사이드바 `회원 요청` 배지는 `trainerUnreadCount` 사용.
- `client/src/pages/Coaching.tsx`
  - 상단 `새 코칭 N건 확인됨` 배지는 `coachingUnreadCount`만 사용.
- `server/fittrack.test.ts`
  - 코칭/트레이너 알림 분리 검증 추가.

검증:

- `.\node_modules\.bin\pnpm.CMD run check` 통과
- `.\node_modules\.bin\pnpm.CMD run test` 통과
- `.\node_modules\.bin\pnpm.CMD run build` 통과
- `git diff --check` 통과
- 커밋/푸시 완료: `4710d89`

## 직전 완료 작업

### 운동 기록 개선

커밋: `5a3c5ac Improve workout history editing`

내용:

- 운동 기록 달력에서 날짜 선택 후 `운동 기록 추가`를 누르면 선택한 날짜가 기본값으로 들어가게 수정.
- 운동 검색 별칭 지원 추가.
  - 예: `머신컬`, `머신 프리처 컬`, `이너타이`, `아웃타이`, `어덕터`, `랫풀다운` 등.
  - 공통 검색 유틸: `shared/exerciseSearch.ts`
  - 서버/클라이언트 검색 모두 같은 별칭 로직 사용.
- 이미 저장된 자유 운동 세션 수정 기능 추가.
  - `server/db.ts`: `updateWorkoutSession`
  - `server/routers.ts`: `workout.updateSession`
  - `History`, `FreeWorkoutDialog`에서 수정 모드 지원.
- 검색 테스트 추가: `server/exerciseSearch.test.ts`

## 현재 남아 있는 로컬 미추적/수정 파일

아래 파일은 의도적으로 커밋하지 않음.

- `local-db/fittrack_local.sqlite`
- `local-db/fittrack_local.sqlite-shm`
- `local-db/fittrack_local.sqlite-wal`
- `logo.png`
- `render-openapi.json`
- `scripts/render_create_service.py`
- `scripts/render_create_service_minimal.py`
- `scripts/render_service_payload.json`

주의:

- 로컬 DB 파일과 Render 실험 파일은 작업과 직접 관련이 없으면 스테이징하지 않는다.
- `logo.png`는 로컬 원본 이미지일 수 있으므로, 필요할 때만 명시적으로 포함한다.

## 다음 세션에서 우선 확인할 것

1. 실제 로그인된 트레이너 계정으로 `/trainer/clients/:id` 기본 운동 기록 화면 확인.
2. 트레이너 회원 상세 사이드바에서 `운동 기록`, `코칭 타임라인`, `회원 과제`, `비공개 메모`, `진행 리포트`, `AI 코칭 보조`, `PT 기록` 클릭 시 URL이 각각 실제 하위 경로로 바뀌고 한 화면에 하나의 메뉴만 표시되는지 확인.
3. 운동 검색에서 `원암 케이블 로우`, `트라이셉스 원암`, `플레이트 풀다운`, `케이블 시티드 로우`가 기대한 결과를 보여주는지 실제 UI로 확인.
4. 모바일/좁은 화면에서 회원 카드, PT 기록 추가 버튼, 각 메뉴 카드가 잘리지 않는지 확인.
5. PT 기록 추가, 과제 등록, 메모 저장, 일반/세션 피드백 저장 후 목록 갱신 확인.
6. Vercel 배포가 최신 커밋을 반영했는지 확인.

## 작업 시 항상 지킬 검증 순서

푸시 전 반드시 실행:

```powershell
.\node_modules\.bin\pnpm.CMD run check
.\node_modules\.bin\pnpm.CMD run test
.\node_modules\.bin\pnpm.CMD run build
git diff --check
```

검증 실패 시:

1. 실패 원인 수정
2. 같은 검증 명령 재실행
3. 통과 후에만 커밋/푸시

## 배포/운영 참고

- 프론트/백엔드 모두 Vercel 배포 흐름을 사용 중.
- DB는 Supabase Postgres 연결.
- OAuth, Gemini, DB 관련 환경변수는 Vercel Project Settings에 설정되어 있어야 함.
- 앱 로딩 중 예전 화면이나 잘못된 메뉴가 잠깐 뜨는 문제는 이전에 여러 차례 수정했으므로, 새 기능 추가 시 다시 재발하지 않는지 확인 필요.
