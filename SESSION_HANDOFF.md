# FitTrack Pro 세션 인수인계

마지막 업데이트: 2026-06-08

## 현재 저장소 상태

- 작업 디렉터리: `C:\Users\Hyeonil-Choi\Desktop\fittrack-pro`
- 기본 브랜치: `master`
- 최근 푸시 커밋: `4710d89 Fix coaching notification scopes`
- 검증 규칙은 `AGENTS.md`에 정리되어 있음.
- `pnpm`은 PATH에 없을 수 있으므로 Windows에서는 `.\node_modules\.bin\pnpm.CMD`로 실행.

## 최근 완료 작업

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

1. Vercel 배포가 최신 커밋 `4710d89`를 반영했는지 확인.
2. 사용자 화면 `코칭`에서 실제 코칭 내용이 없을 때 알림 배지가 사라지는지 확인.
3. 트레이너 화면 `회원 요청`에서는 트레이너 요청 알림만 표시되는지 확인.
4. 관리자/트레이너/사용자 홈 전환 후 사이드바가 중복 생성되지 않는지 확인.
5. 모바일에서 사이드바, 홈 전환 UI, 코칭 화면이 잘리지 않는지 확인.

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

