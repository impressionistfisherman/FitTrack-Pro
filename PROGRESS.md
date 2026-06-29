# PROGRESS

## 2026-06-29 17:17:39 +09:00

### 작업 요약

- 식약처 음식 DB가 실제 운영 DB에 import되었는지 확인하기 위한 공개 진단 procedure를 추가함.

### 변경 사항

- `server/db.ts`
  - `getFoodDataStatus()` 추가.
  - 전체 음식 수, 공공 음식 수, 사용자 음식 수, 식약처 import 추정 수, 검색 가능 음식 수, 샘플 음식을 반환.

- `server/_core/systemRouter.ts`
  - `system.foodDataStatus` 공개 query 추가.
  - 개인 정보와 사용자 식단 기록은 노출하지 않음.

- `TEST_RESULT.md`
  - 검증 결과 갱신.

- `PROGRESS.md`
  - 작업 상태 갱신.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
- 로컬 DB 기준 식약처 import는 20건 샘플만 확인됨.
- 기존 dirty 파일인 `SESSION_HANDOFF.md`, `local-db/fittrack_local.sqlite*`는 작업 범위에서 제외해야 함.

### 남은 문제

- 운영 DB의 실제 import 상태는 배포 후 공개 진단 procedure 호출로 확인 필요.

### 다음 작업

- 배포 완료 후 `https://fit-track-pro-tawny.vercel.app/api/trpc/system.foodDataStatus` 호출.
- 식약처 import 수가 19,495건에 못 미치면 운영 DB import를 별도로 실행해야 함.
