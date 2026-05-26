# FitTrack Pro

스마트 운동 관리 앱입니다. 운동 DB, 루틴 관리, 자유 운동 기록, 체중 추적, AI 추천을 제공합니다.

## 설치

```bash
pnpm install
```

## 실행

```bash
pnpm dev
```

기본 주소는 `http://localhost:3000`입니다. 포트가 사용 중이면 서버가 다음 포트를 자동으로 사용합니다.

## 빌드/검증

```bash
pnpm run check
pnpm test
pnpm run build
```

## Seed

운동 초기 데이터가 없으면 자동으로 보강합니다. 이미 있는 데이터는 중복 생성하지 않습니다.

```bash
pnpm run seed
pnpm run seed -- --force
```

`--force`는 기존 운동 기록을 삭제하지 않고 운동 카탈로그 동기화만 다시 수행합니다.

## Status

앱 실행 조건, DB 연결, seed 데이터, 주요 환경 변수를 확인합니다.

```bash
pnpm run status
```

## 환경 변수

필수 또는 권장 환경 변수:

```env
DATABASE_URL=postgresql://...
SQLITE_DB_PATH=local-db/fittrack_local.sqlite
JWT_SECRET=change-me
APP_ORIGIN=http://localhost:3000
APP_REDIRECT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GEMINI_API_KEY=
VITE_API_BASE_URL=
```

`DATABASE_URL`이 있으면 원격 DB를 사용하고, 없으면 로컬 SQLite를 사용합니다.

## 주요 기능

- 운동 목록 검색과 필터링
- 루틴 생성/수정/삭제/선택 삭제
- 루틴 기반 운동 세션 기록
- 루틴 없이 자유 운동 기록
- 체중 및 목표 관리
- 헬스장/보유 기구/부상/선호 운동 기반 AI 개인화
- AI 운동/식단 추천과 오늘 운동 추천

## 문제 확인

- 로그인 후 유지가 안 되면 `APP_ORIGIN`, `APP_REDIRECT_URL`, OAuth callback URL을 확인하세요.
- 배포 새로고침 404가 나면 `vercel.json`의 SPA rewrite가 배포에 반영됐는지 확인하세요.
- AI 추천 실패 시 `GEMINI_API_KEY`와 사용 모델명을 확인하세요.
- DB 데이터가 비어 있으면 `pnpm run seed`와 `pnpm run status`를 실행하세요.
