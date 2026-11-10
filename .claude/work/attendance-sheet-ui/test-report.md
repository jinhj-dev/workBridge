RESULT: PASS

# test-report — 出勤簿 UI/UX 수정 (attendance-sheet-ui)

브랜치 `feature/attendance-sheet`(미커밋, 브랜치 전환·커밋 없음). 기준: `test-plan.md`.
실패 1건은 재현되지 않는 간헐 실패로 보이며(아래 "실패 항목" 참조), 나머지는 전부 통과.

## Run 1

### 작성·수정한 테스트 파일
- 추가: `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx` 말미에 describe 1개(C1 보완: 午前半休·午後半休·その他 申請 배지가 `休暇 {상태}` 문구이고 종류명 배지가 없음)
- 보강: `frontend/e2e/attendance-sheet-layout.spec.ts`
  - E6: 구분선 색 `rgb(161, 167, 196)` 확인 추가
  - E2: 1920에서 그래프 영역 내부 스크롤 없음 + 폭 480 이상 확인. 바깥 안전망 검사를 1440에서 1366까지 확대
  - E3: 가로 스크롤 후 구분선 x 불변, 첫 날짜 셀이 화면 안(x ≥ 0)에 남음 추가
  - E1: 월 일수 테스트(E9)·태블릿 테스트(E11)에 페이지 가로 스크롤 없음 검사 추가
  - E10: 신규 `shouldKeepAlignmentAfterResizingWindow`(1920→1366→1920 리사이즈 후 E1·E4)
  - 공용 헬퍼 `pageHorizontalOverflow` 추가
- 변경 없음: `lib/attendance-sheet.test.ts`(L0~L3 기존 케이스가 test-plan을 충족)

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| 프론트 단위·컴포넌트 | `npx vitest run` (frontend) | 33 파일, 498 통과, 0 실패 |
| 프론트 타입 | `npx tsc --noEmit` | 오류 없음 |
| 프론트 린트 | `npm run lint` | 오류 없음 |
| 프론트 포맷 | `prettier --check` (변경 2파일) | 통과 |
| 백엔드 타입 | `npx tsc --noEmit` | 오류 없음 |
| 백엔드 린트 | `npm run lint` | 오류 없음 |
| 백엔드 unit | `npx vitest run` | 20 파일, 294 통과, 0 실패 |
| 백엔드 e2e | `npm run test:e2e` | 14 파일, 385 통과, 0 실패 (env.ts 기본값 6000 변경 영향 없음) |
| Playwright | `E2E_ADMIN_PASSWORD=test0000 E2E_INITIAL_PASSWORD=test0000 npx playwright test e2e/attendance-sheet-layout.spec.ts e2e/attendance.spec.ts e2e/attendance-status.spec.ts e2e/dashboard.spec.ts e2e/approvals.spec.ts e2e/login.spec.ts e2e/password.spec.ts e2e/departments.spec.ts` | 42건 중 41 통과, 1 실패(아래) |

- 출근부 레이아웃 E2E(`attendance-sheet-layout.spec.ts`): 8건 전부 통과. 1920×1080·1440×900·1366×768 데스크톱, 1024·768 태블릿, 월 일수 28·29·30·31, 리사이즈 포함.
- 스크린샷 저장(덮어쓰기): `.claude/work/attendance-sheet-ui/screenshots/sheet-1920x1080.png`, `sheet-1440x900.png`, `sheet-1366x768.png`, `sheet-1024.png`, `sheet-768.png`
- 기존 `attendance-status.spec.ts`, `dashboard`·`approvals`·`login`·`password`·`departments` 전부 통과.

### 실패 항목
1. `e2e/attendance.spec.ts` › `shouldEditTodayClockOutFromAdminAttendanceAndRestoreIt`
   - 에러 요약: 저장 후 `勤怠を修正しました。` 문구가 5초 내 나타나지 않음(수정 다이얼로그가 확인 단계에 머무름)
   - 원인 추정: 간헐적 상태 의존 문제로 보임. 이 테스트는 같은 파일 앞 테스트가 만든 "오늘 근태(勤務中)"에 기대며, 실제 저장 API 응답은 확인하지 못했다. 근태 구현(출근부)은 이 경로를 바꾸지 않았다(관리자 `/admin/attendance` 화면과 해당 API는 이번 변경 목록에 없음).
   - 재현 여부: 같은 명령 재실행 시 `attendance.spec.ts` 파일 단독 실행 4/4 통과. `-g` 단독 실행은 선행 테스트 데이터가 없어 다른 이유로 실패(테스트 설계상 의존성, 이번 변경과 무관).
   - 담당: tester (E2E 상태 의존성·간헐성. 원인이 특정되지 않아 assertion은 손대지 않음. 필요 시 저장 API 응답을 `waitForResponse`로 확인하도록 보강 권장)

### 범위 밖·미실행
- `e2e/leaves.spec.ts`: 지시대로 미실행(main에 없는 `db:e2e-leaves-reset` 호출로 실패하는 기존 결함, 범위 밖)
- `e2e/dashboard-leave-calendar.spec.ts`: 회귀 목록에 없어 미실행
- `npm run build`: 3000번 dev 서버가 `.next`를 사용 중이라 미실행(미검증). 대신 `tsc --noEmit`과 lint로 대체 확인

### §0 테스트 변경 점검 (frontend.md)
- `attendance-sheet.test.ts`: `11/2(月)` → `2日（月）` 기대값 갱신, 테스트명 `shouldFormatDayWithFullWidthWeekday`. 검증 의도 유지. TZ 3종 테스트 포함 통과.
- `AttendanceView.test.tsx`: `findByRole('table')` 7곳을 `{ name: t.sheet.tableTitle }`로 한정. 표가 2개가 되어 기존 쿼리가 모호해진 결과이며 의미는 동일(오히려 더 엄격). 약화 아님. 원본 대조는 파일이 미추적이라 불가, 현재 내용으로 판단.
- `AttendanceSheetView.test.tsx`
  - img 이름에 날짜 접두를 추가한 것은 검증 강화(시각 정보와 날짜가 함께 읽힘)
  - 申請 문구는 `休暇 {상태}`로 바꾸고 종류명 배지 부재를 확인하는 단언 추가. 이전 종류명 검증은 勤務パターン Pill 쪽에서 계속 확인됨(ANNUAL 등). 약화로 보이는 단언 없음
  - 행 수는 왼쪽·오른쪽 표 각각 일수와 일치를 확인하도록 강화
- `AttendanceHistoryView.tsx`(md 미만): `git diff main` 결과 내용 차이 없음(상태 M은 줄바꿈 경고만). test-plan §4 충족.

### 그 외 검사
- 변경 테스트 파일에 `.skip`·`.only`·`TODO` 없음

## Run 2 (재실행 요약)
- `attendance.spec.ts` 파일 단독: 4/4 통과
- 프론트 vitest 전체 재실행: 498 통과(C1 보완 테스트 포함)
- 단위 테스트 C1 보완 1건은 처음 실행에서 `getByRole` 중복 매칭으로 실패 → 테스트 코드 오류(tester 담당)로 `getAllByRole(...)).toHaveLength(2)`로 수정 후 통과

## Run 2 — E2E 간헐 실패(attendance.spec › shouldEditTodayClockOutFromAdminAttendanceAndRestoreIt) 처리

### 원인 확인
- Run 1 실패 아티팩트(test-results trace)는 이미 정리되어 없음. 재현 시도로 같은 8개 spec 묶음을 연속 실행.
- 실행 순서는 Playwright가 파일명 정렬로 정함: attendance-sheet-layout → attendance-status → attendance.spec → dashboard → approvals → login → password → departments. 즉 attendance-status가 attendance.spec보다 먼저 돌며, 그 afterAll이 `db:e2e-attendance-reset`을 실행하고 attendance.spec beforeAll이 다시 초기화하므로 상태 잔존은 없음(로그에서 "0 件削除" 확인).
- 수정 전 묶음 2회(run A, run B): 모두 42/42 통과. 간헐 실패는 재현되지 않음.
- 구현 측 점검: `AttendanceEditModal.tsx`의 저장 흐름(입력 → 확인 → PATCH → 성공 토스트 → 닫기)은 정상. 토스트는 단일 슬롯·4초 타이머(`Toast.tsx`). 원래 테스트는 PATCH 응답을 기다리지 않고 바로 성공 문구를 단언하므로, 응답 지연 시 4초 토스트 노출 구간과 어긋날 수 있는 테스트 측 취약점으로 판단. 구현 코드는 수정하지 않음.

### 테스트 수정 (테스트 측, 단언 의미 유지)
- `frontend/e2e/attendance.spec.ts` `saveClockOut` 헬퍼: 확인(submit) 클릭과 함께 `PATCH /api/v1/admin/attendance/{id}` 응답을 `waitForResponse`로 대기하고 `ok()`를 단언한 뒤 기존 성공 문구 단언을 수행. 기존 단언은 그대로 유지하고 API 성공 확인을 추가만 함(약화 없음, skip 없음).
- 검증: `npx tsc --noEmit`(frontend) 통과, `npx eslint e2e/attendance.spec.ts` 통과.

### 재실행 결과 (수정 후, 같은 8개 spec 묶음, E2E_ADMIN_PASSWORD=test0000 E2E_INITIAL_PASSWORD=test0000, PLAYWRIGHT_BASE_URL 미설정)
| 회차 | 결과 |
|---|---|
| run C | 42 passed, 0 failed |
| run D | 42 passed, 0 failed |
(수정 전 참고: run A 42 passed, run B 42 passed)

- `attendance.spec.ts` 4건(`shouldEditTodayClockOutFromAdminAttendanceAndRestoreIt` 포함) 전부 통과. 재현되지 않은 간헐 실패이므로 완전 재현 불가 상태임을 명시.

### 담당
- 실패 원인은 테스트 측 응답 대기 부재로 판단하여 tester가 수정. 구현(frontend/backend) 담당 조치 없음.

### 미실행
- 이번 Run 2는 E2E 묶음 재실행 중심. 단위·e2e(backend) 전체 재실행은 하지 않음(Run 1 결과 유지). 구현 코드 변경이 없어 영향 없음.
