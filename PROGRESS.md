# FitTrack Pro 작업 진행 기록

## 날짜/시간

2026-06-25 16:05:52 +09:00

## 작업 요약

- 사이드바와 역할 전환은 유지하고 사용자 메뉴 8개 본문 블록만 재배치
- 홈에서 중복된 트레이너·관리자·AI 코치 전환 버튼 제거
- 운동 탐색에서 중복 플랜/운동 탭 제거, 기능 제목·검색·필터·목록 계층 정리
- 루틴에서 중복 탭과 임의 진행률 제거, 실제 루틴 수·평균 주간 계획·목표 수 요약으로 교체
- 기록에서 같은 최근 운동 목록이 두 번 표시되던 중복 블록 제거
- 체중 요약을 현재값·증감·최저/최고 구조로 정리하고 차트 높이 확대
- 의견 화면을 작성/처리 내역 2열 구조로 변경
- AI 코치 탭을 상단 고정형으로 변경하고 콘텐츠 폭 확대
- 코칭과 프로필의 데스크톱 콘텐츠 폭·헤더 계층 개선
- 프로필에 연결·운동 요약·체중·목표 설정 빠른 이동 추가
- 기존 기능, 메뉴, 라우팅, 저장 처리 유지
- 공통 기본 버튼의 고정 오렌지 그라데이션 제거
- 버튼·선택 메뉴·진행률·주요 CTA·카드 광원을 현재 테마 `--primary` 색상에 연동
- 홈 상세 통계와 추가 기능을 접이식 블록으로 분리해 초기 정보량 축소
- 코칭 타임라인·과제·피드백·PT 기록을 데스크톱 2열 블록으로 재배치
- 기록 화면에 최근 운동·달력·수행 추이·체중 빠른 이동 추가
- 기록 화면의 운동 로그를 최하단으로 이동하고 기본 접힘 상태로 변경
- 운동 로그를 클릭해 축소·확대할 수 있게 하고 최대 10개 최근 기록 표시
- 기록 화면의 불필요한 달력·수행 추이·체중·운동 로그 빠른 이동 바 제거

## 현재 상태

- TypeScript 검사, 69개 Unit 테스트, Production build 통과
- 데스크톱 및 390x844 모바일 운동 탐색 브라우저 QA 통과
- 기존 사용자 변경 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*` 유지

## 변경 파일

- `client/src/components/BodyWeightTracker.tsx`
- `client/src/components/AppLayout.tsx`
- `client/src/components/ui/button.tsx`
- `client/src/index.css`
- `client/src/pages/AICoach.tsx`
- `client/src/pages/BodyWeight.tsx`
- `client/src/pages/Coaching.tsx`
- `client/src/pages/Exercises.tsx`
- `client/src/pages/Feedback.tsx`
- `client/src/pages/History.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Profile.tsx`
- `client/src/pages/Routines.tsx`
- `PROGRESS.md`
- `TEST_RESULT.md`

## 남은 문제

- 로그인 사용자 데이터가 포함된 홈·루틴·기록·체중·코칭·AI·프로필 운영 화면 시각 QA 필요

## 다음 세션

1. 운영 로그인 계정으로 각 화면의 실제 데이터 밀도 확인
2. 화면별 긴 텍스트와 빈 상태의 모바일 회귀 확인
