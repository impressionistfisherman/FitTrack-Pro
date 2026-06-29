# PROGRESS

## 2026-06-29 15:54:22 +09:00

### 작업 요약

- 음식 검색이 비어 보이는 문제를 줄이기 위해 검색어 보정과 실제 식품영양성분 DB import 경로를 추가함.

### 변경 사항

- `server/db.ts`
  - `buildFoodSearchTerms` 추가.
  - `컬라면` 같은 오타 입력을 `컵라면`, `라면`으로 재검색.
  - `라면`, `김밥`, `도시락`, `닭가슴살`, `프로틴`, `햇반`, `컵밥`, `버거`, `샐러드`, `샌드위치`, `요거트`, `두유` 등 핵심 키워드 fallback 추가.
  - 로컬 DB 검색 결과가 부족하면 식품안전나라/식약처 식품영양성분 DB API에서 데이터를 가져와 `foods`에 upsert.
  - API 키 환경 변수 후보:
    - `FOODSAFETY_API_KEY`
    - `MFDS_API_KEY`
    - `DATA_GO_KR_FOOD_API_KEY`
  - API 응답의 `DESC_KOR`, `NUTR_CONT1~4`, `SERVING_SIZE`, `MAKER_NAME` 등을 앱의 100g 기준 영양값으로 변환.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 로컬 `컬라면` 검색 결과 반환 확인.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 실제 운영 DB에서 식품영양성분 DB API import가 동작하려면 Vercel API 서버에 식품안전나라 API 키 환경 변수가 설정되어야 함.
- API 키 없이도 seed 검색은 동작하지만, 사용자가 기대하는 대량 실제 데이터 import는 제한됨.
- GitHub Pages는 프론트 배포만 담당하며, 실제 음식 검색은 `https://fit-track-pro-tawny.vercel.app` API 서버 배포/환경 변수 상태에 의존함.

### 다음 작업

- Vercel 환경 변수에 식품영양성분 DB API 키 설정.
- 운영 API 서버에서 `/api/trpc/meals.foods` 검색 호출로 실제 import 확인.
- 필요하면 CSV 대량 import 스크립트도 별도로 추가.
