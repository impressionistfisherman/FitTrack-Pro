# FitTrack Pro 작업 진행 기록

## 날짜/시간

2026-06-25 14:41:20 +09:00

## 작업 요약

- Figma Fitness UI Kit의 화면 계층을 기준으로 색상 변경 수준이 아닌 구조 재설계 수행
- 홈을 진행률, 다음 운동, 주요 CTA, 최근 운동, 상세 지표 순서로 재배치
- 루틴과 운동 탐색에 `플랜 / 운동` 분할 탭과 Figma형 카드·진행률 구조 적용
- 운동 기록에서 최근 운동 카드 목록을 최상단으로 이동하고 달력·차트를 상세 분석 영역으로 분리
- 프로필을 커버 이미지, 중앙 원형 아바타, 상태 배지 구조로 변경
- 운동 실행 화면을 중앙 세션 헤더, 대형 완료 세트 카드, 현재 세션 목록 구조로 변경
- 체중 화면 포함 주요 페이지의 중앙 헤더와 모바일 간격 통일
- 기존 기능, API 호출, 라우팅, 저장 처리 유지
- 홈 권한 전환 아이콘에 `트레이너`, `관리자`, `AI 코치` 텍스트를 표시해 기능 오인 방지
- 홈 본문에 잘못 중복 배치한 트레이너·관리자·AI 코치 버튼 제거
- 상단 역할 전환 바를 제거하고 사이드바의 독립된 `화면 전환` 영역으로 이동
- 사용자 메뉴를 `운동 관리`와 `지원` 그룹으로 분리
- 트레이너·관리자 화면에서 모바일 하단 메뉴가 각 역할 전용 메뉴로 바뀌도록 수정
- 운동/루틴 페이지 내부의 중복 `플랜 / 운동` 왕복 탭 제거
- 운동과 루틴의 페이지 제목·설명을 각각 독립된 기능 기준으로 복구
- 데스크톱 콘텐츠 폭 확대 및 페이지 제목 좌측 정렬

## 현재 상태

- TypeScript 검사, 69개 Unit 테스트, Production build 통과
- 390x844 모바일 운동 탐색 화면 브라우저 QA 통과
- 기존 사용자 변경 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*` 유지

## 변경 파일

- `client/src/components/profile/ProfileSummaryCard.tsx`
- `client/src/components/AppLayout.tsx`
- `client/src/index.css`
- `client/src/pages/BodyWeight.tsx`
- `client/src/pages/Exercises.tsx`
- `client/src/pages/History.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Profile.tsx`
- `client/src/pages/Routines.tsx`
- `client/src/pages/WorkoutSession.tsx`
- `PROGRESS.md`
- `TEST_RESULT.md`

## 남은 문제

- 로그인 사용자 데이터가 필요한 홈·루틴·기록·프로필의 실제 데이터 시각 QA 필요
- 로그인 사용자 데이터가 필요한 운동 실행 화면의 실제 세션 시각 QA 필요
- 역할별 메뉴는 로그인 권한 계정으로 운영 배포 후 최종 시각 확인 필요

## 다음 세션

1. 로그인 상태 모바일 화면 전체 회귀 확인
2. 실제 세션 데이터로 세트·반복·휴식 컨트롤 터치 QA
