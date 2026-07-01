# PROGRESS

## 2026-07-01 09:40:08 +09:00

### 작업 요약

- AI 오늘 운동 추천 화면에서 `추가 구성` 섹션을 제거함.
- `유산소`를 별도 추가 옵션이 아니라 `오늘 타겟 부위` 선택지로 이동함.
- `복근`은 이미 타겟 부위에 있으므로 별도 `복근 포함` 토글 없이 타겟 선택으로만 처리하도록 정리함.

### 변경 사항

- `client/src/pages/AICoach.tsx`
  - `targetBodyPartOptions`에 `유산소` 포함.
  - 오늘 운동 추천의 `includeCardio`, `includeCore` 별도 state 제거.
  - `targetBodyParts`에 `cardio`가 있으면 유산소 포함으로 처리.
  - `targetBodyParts`에 `abs`가 있으면 복근/코어 포함으로 처리.
  - `추가 구성`, `유산소 포함`, `복근 포함` UI 제거.
  - 주간 추천 화면에서도 `추가 구성` 섹션을 제거해 같은 혼선을 줄임.

- `server/routers.ts`
  - `dailyWorkoutRecommendation.targetBodyParts` 스키마에 `cardio` 추가.
  - 유산소/복근 관련 프롬프트 문구를 `포함 여부`가 아니라 `타겟 여부` 기준으로 정리.

### 현재 상태

- 필수 검증 통과
  - `.\node_modules\.bin\pnpm.CMD run check`
  - `.\node_modules\.bin\pnpm.CMD run test`
  - `.\node_modules\.bin\pnpm.CMD run build`
  - `git diff --check`

### 남은 문제

- 실제 브라우저 화면에서 버튼 배열 확인은 미실행.
- AI 모델 실제 응답 품질은 배포 후 사용 흐름에서 확인 필요.

### 다음 세션에서 할 일

- 모바일에서 `오늘 타겟 부위` 칩 줄바꿈과 `유산소 시간` 활성/비활성 상태 확인.
