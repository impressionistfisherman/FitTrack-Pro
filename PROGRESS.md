# PROGRESS

## 2026-07-03 09:52:32 +09:00

### 작업 요약

- 이미지 운동 캡처 인식 후 DB 매칭 정확도 보강
- 캡처 매칭에서 장비 단어가 보이는 경우 장비 제거 별칭을 사용하지 않도록 수정
- 해머 컬, 크런치, 니업 계열 동작 토큰 감지와 우선 매칭 규칙 추가
- `케이블 해머 컬` 기본 운동 데이터와 검색 별칭 추가
- OCR 프롬프트에 케이블 해머컬, 크런치, 시티드 니업 오분류 방지 문구 추가
- 캡처 매칭 회귀 테스트 추가

### 현재 상태

- `pnpm run check`, `pnpm run test`, `pnpm run build`, `git diff --check` 통과

### 변경 파일

- `server/routers.ts`
- `server/db.ts`
- `server/fittrack.test.ts`
- `shared/exerciseSearch.ts`
- `TEST_RESULT.md`
- `PROGRESS.md`

### 남은 문제

- LLM이 이미지에 없는 운동명을 완전히 임의 생성하는 경우는 서버 매칭만으로 100% 방지할 수 없으므로 실제 이미지 재확인 필요

### 다음 세션에서 할 일

- 추가 오분류 사례가 나오면 `preferredCaptureMatches`에 회귀 케이스를 추가
