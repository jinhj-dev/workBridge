RESULT: PASS

## Run 1 (C1)

- 대상: C1 공통 Button 추가 (`frontend/src/components/Button.tsx`)
- 작성한 테스트: `frontend/src/components/Button.test.tsx` (신규, T1 항목 전체)
- 실행 명령 (PowerShell, `frontend/`):
  - `npx vitest run src/components/Button.test.tsx` → 38 passed / 0 failed
  - `npx vitest run` (전체) → 52 files passed, 779 tests passed / 0 failed
  - `npx tsc --noEmit` → exit 0 (`@ts-expect-error` 2건 포함 통과)
  - `npm run lint` → exit 0
- 실패: 없음
- 참고: 전체 Vitest 실행 중 jsdom의 `Not implemented: navigation to another Document` 콘솔 메시지가 stderr에 출력됨. 테스트는 모두 통과. 어느 테스트에서 나는지는 확인하지 않음 (C1 변경과 무관으로 추정, 기존 파일 기준).
- 미실행: `npm run build`, Playwright e2e (C1은 사용처 0이라 화면 변화 없음, 계획상 C1 e2e 대상 없음)

## Run 2 (C2)

- 대상: C2 버튼 크기·radius 토큰 치환 (`globals.css` `@theme`, `Button.tsx` 맵 클래스)
- 갱신한 테스트: `frontend/src/components/Button.test.tsx`
  - 높이 `h-9/10/12` → `h-btn-sm/md/lg`, 정사각 `size-9/10/12` → `size-btn-sm/md/lg`, 제외 단언 `px-3/4/6` → `px-btn-x-*`
  - primary 채움 variant에 `rounded-btn` 단언 추가
  - 테스트 수 변화 없음(38)
- 실행 명령 (PowerShell, `frontend/`):
  - `npx vitest run src/components/Button.test.tsx` → 38 passed / 0 failed (Run 2 갱신 후 기준, 전체 실행에 포함)
  - `npx vitest run` (전체) → 52 files passed, 779 tests passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
- 실패: 없음
- 미실행: `npm run build`, Playwright e2e. C2 계산값(36/40/48px, radius 8px) 단언은 C4 e2e `toHaveCSS`에서 추가 예정

## Run 3 (C3)

- 대상: C3 SectionError의 [再試行]을 `Button size="sm"`으로 이행 (`frontend/src/components/SectionError.tsx`)
- 작성한 테스트: `frontend/src/components/SectionError.test.tsx` (신규, 4건)
  - 기본 문구(`messages.common.loadError`), 전달 문구 표시
  - 再試行 버튼 `type="button"`·`h-btn-sm` 단언
  - 再試行 클릭 시 `onRetry` 1회 호출
- 기존 화면 테스트: 再試行을 클릭해 재조회하는 기존 케이스가 이미 있음 (DashboardView, LeavesView, ApprovalsView, AttendanceHistoryView, DepartmentsView, DepartmentMembersModal, LeaveCalendarView, ApproverSelect, DepartmentFormModal, AttendanceSheetView). 이번 실행에 포함되어 통과
- 실행 명령 (PowerShell, `frontend/`):
  - `npx vitest run` (전체) → 53 files passed, 783 tests passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
- 실패: 없음
- 미실행: `npm run build` (지시에 따라 미실행, 3000 개발 서버 보호), Playwright e2e

## Run 4 (C4)

- 대상: C4 모달 내부 버튼 BT42~62 이행 (Modal X, ConfirmDialog, FormModal, LeaveDetailModal, AttendanceEditModal, DepartmentDetailModal, DepartmentMembersModal)
- 추가 단위 테스트 (3건, 전체 786 = 783 + 3)
  - `components/FormModal.test.tsx`: `shouldEnableSubmitAgainWhenSubmittingEndsAfterFailure` (제출 실패 후 확정 버튼 재활성, spinner 제거)
  - `components/leave/LeaveDetailModal.test.tsx`: `shouldShowSpinnerAndDisableBackAndCloseWhileApproveSubmitting` (承認 送信中 spinner, 戻る·X disabled), `shouldReenableApproveButtonAfterUnexpectedFailure` (500 실패 후 承認 재활성, 모달 유지)
- 기존 단위 테스트(Modal·ConfirmDialog·FormModal·LeaveDetailModal·AttendanceEditModal·DepartmentMembersModal 등)는 변경 없이 통과
- 추가 e2e (`frontend/e2e/modal-a11y.spec.ts`): `shouldSizeFooterButtons40pxAndCloseIconRadius8px` (확정·취소 버튼 height 40px, X border-radius 8px). 기존 `shouldHandleFocusEscapeAndSubmittingInClockInConfirm`과 같은 route mock 방식이며 POST 없음
- 실행 명령:
  - `npx vitest run` (PowerShell, `frontend/`) → 53 files passed, 786 tests passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
  - Playwright: `e2e/modal-a11y.spec.ts`만 실행. 환경변수 `PLAYWRIGHT_BASE_URL=http://localhost:3000` 지정(globalSetup의 개발 DB 계정 초기화와 webServer 기동을 건너뜀). E2E 비밀번호는 `.env.local`에서 프로세스 환경변수로만 읽고 출력하지 않음 → 2 passed / 0 failed / 0 skipped
- 실행하지 않은 spec: 개발 DB에 쓰는 기존 spec(leaves, approvals, departments*, dashboard-renewal, attendance* 등)은 지시에 따라 미실행. 나머지 C4 e2e 회귀(`leaves`·`approvals`·`departments*`)도 같은 이유로 미실행
- 계획 편차: test-plan E3(`button-visual.spec.ts`)는 C5·C6·C8 범위라 C4에서는 만들지 않음. C4의 E2 계산값 단언은 `modal-a11y.spec.ts`에 추가함(test-plan E2가 허용하는 위치)
- 실패: 없음
- 미실행: `npm run build` (지시에 따라 미실행)

## Run 5 (C5)

- 대상: C5 버튼 이행(LoginForm, PasswordChangeForm, LeaveManagementLayout, DepartmentsView, AttendanceSection, AttendanceHistoryView, AdminAttendanceView, LeaveHistoryList)
- 전체 결과: RESULT FAIL. 원인은 구현 1건(B3 ③ SearchInput 높이, 담당 frontend). 테스트 단언은 설계값(44px)을 그대로 유지
- 단위 테스트: 전체 Vitest 53 files, 793 tests passed / 0 failed (직전 786에서 +7)
  - 추가 `app/login/LoginForm.test.tsx`: `shouldShowSpinnerAndKeepLabelWhileLoggingIn`
  - 추가 `app/password/PasswordChangeForm.test.tsx`: `shouldShowSpinnerAndKeepLabelWhileSubmitting`
  - 추가 `admin/attendance/AdminAttendanceView.test.tsx`: `shouldSubmitSearchWhenEnterPressedInNameInput` (Enter 제출)
  - 추가 `attendance/AttendanceHistoryView.test.tsx`: `shouldSubmitPeriodWhenEnterPressedInDateInput` (Enter 제출)
  - 추가 `leaves/LeavesView.test.tsx`: `shouldSearchWhenEnterPressedInAppliedDateInput` (Enter 제출)
  - 추가 `admin/departments/DepartmentsView.test.tsx`: `shouldDisableClearWhenNoConditions`, `shouldEnableClearWhenNameConditionExists`
  - 로그인·비밀번호 변경의 Enter 제출과 disabled 검증은 기존 테스트에 이미 있었음. 깨진 기존 단언은 없음
- e2e: `e2e/button-visual.spec.ts`(신규, 4건: 360/768/1024/1440). 결과 0 passed / 4 failed. 실패는 모두 같은 단언 1건(③ SearchInput 높이)
  - 실행: `PLAYWRIGHT_BASE_URL=http://localhost:3000` 지정(globalSetup의 개발 DB 초기화와 webServer 기동 건너뜀). 로그인만 실제 백엔드 경유, 나머지 GET만 통과, POST·PATCH·DELETE는 중단, 출근·퇴근·作成·申請 버튼은 클릭하지 않음. 화면 이동은 앱 내 링크 클릭(전체 재읽기 없음). E2E 비밀번호는 `.env.local`에서 프로세스 환경변수로만 읽고 출력하지 않음
- 실행 명령:
  - `npx vitest run` (PowerShell, `frontend/`) → 53 files, 793 passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
  - `npx playwright test e2e/button-visual.spec.ts` (PLAYWRIGHT_BASE_URL 지정) → exit 1 (4 failed)

### B3 측정값 (CSS px, 뷰포트별)

| 항목 | 360 | 768 | 1024 | 1440 | 설계값 | 판정 |
|---|---|---|---|---|---|---|
| ① /leaves 見出し 높이 / line-height | 30 / 30 | 36 / 36 | 36 / 36 | 36 / 36 | 1행 | 통과 |
| ① /leaves 申請 버튼 top 차이 / 높이 | 9 / 48 | 6 / 48 | 6 / 48 | 6 / 48 | 차이 < 높이 | 통과 |
| ① /admin/departments 見出し 높이 / line-height | 30 / 30 | 36 / 36 | 36 / 36 | 36 / 36 | 1행 | 통과 |
| ① /admin/departments 追加 버튼 top 차이 | 9 | 6 | 6 | 6 | < 48 | 통과 |
| ② SCR-010 部署を追加 높이 | 48 | 48 | 48 | 48 | 48 | 통과 |
| ③ 条件をクリア 높이 | 40 | 40 | 40 | 40 | 40 | 통과 |
| ③ SearchInput 높이 | **48** | **48** | **48** | **48** | 44 | **실패** |
| ③ 중심 차이(clear vs search) | 108 (줄 바뀜) | 0 | 0 | 0 | ≤1 기록 | 기록 |
| ④ ダッシュボード 出勤 높이 | 48 | 48 | 48 | 48 | 48 | 통과 |

- 실패 원인(담당 frontend): `components/SearchInput.tsx`가 `h-11`을 붙이지만 `components/form.tsx`의 `inputClass`에 `h-12`가 있어 렌더 높이가 48px이 된다. 충돌 클래스를 정리해 44px로 맞춰야 한다(테스트 기대값은 변경하지 않음).
- 360에서는 条件をクリア와 검색 입력이 다른 줄로 나뉜다(중심 차이 108px). 이는 기록만 하며 판정하지 않는다. 필요하면 설계 재확인.
- 참고: 4개 뷰포트 모두 ①②④ 통과. 실패는 ③ 한 항목뿐이다.

### 캡처 (Playwright 출력 폴더, 커밋 안 함)

- 경로: `frontend/test-results/button-visual-幅-{360|768|1024|1440}px-*/` 아래 `{width}-leaves.png`, `{width}-departments.png`, `{width}-dashboard.png` (각 폭 3장, 총 12장). 같은 이름의 첨부본은 `attachments/` 아래에 있다.
- 측정 원본: 같은 폴더의 `measurements.jsonl`.

### 미실행·미확인

- 개발 DB에 쓰는 기존 spec(login, password, dashboard*, attendance*, leaves, departments*, approvals, leave-*)은 쓰기 여부 불확실로 미실행. C5 e2e 회귀는 확인하지 못함.
- `npm run build` 미실행(지시에 따라).
- 3000·6000 서버는 조작하지 않음.

## Run 6 (C5 Fix 1)

- 대상: SearchInput 높이 충돌 수정(`components/form.tsx` `inputBaseClass` 분리, `components/SearchInput.tsx` `inputBaseClass` + `h-11`). 테스트 기대값 44는 유지
- 전체 결과: RESULT PASS. Run 5의 실패(③ SearchInput 48px)가 해소됨
- 단위 테스트: 전체 Vitest 53 files, 793 passed / 0 failed (변경 없음, 신규 단위 테스트 없음)
- e2e: `e2e/button-visual.spec.ts` 5 passed / 0 failed / 0 skipped
  - 신규 `shouldKeepLoginInputsAt48pxWhileSearchInputIs44px`: 로그인 화면(인증 불필요, GET만) 사원번호·비밀번호 입력란 `toHaveCSS('height','48px')` 통과. 일반 입력란 48px 유지 확인
  - 4폭(360/768/1024/1440) `shouldMeasureHeaderAndActionButtonsAndCapture`: ③에 SearchInput `toHaveCSS('height','44px')` 추가. 4폭 모두 통과
- 실행 조건: Run 5와 동일(`PLAYWRIGHT_BASE_URL=http://localhost:3000`, globalSetup 건너뜀, 로그인만 실제 백엔드, 쓰기 요청 차단, 출근·퇴근·作成·申請 미클릭, 비밀번호 미출력)
- 실행 명령:
  - `npx vitest run` (PowerShell, `frontend/`) → 53 files, 793 passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
  - `npx playwright test e2e/button-visual.spec.ts` → exit 0 (5 passed)

### B3 ③ 재측정 (CSS px)

| 뷰포트 | 条件をクリア 높이 | SearchInput 높이 | 중심 차이 |
|---|---|---|---|
| 360 | 40 | 44 | 106 (줄 바뀜, 기록만) |
| 768 | 40 | 44 | 0 |
| 1024 | 40 | 44 | 0 |
| 1440 | 40 | 44 | 0 |

- 측정 원본: `frontend/test-results/button-visual-幅-*/measurements.jsonl` (Run 5와 같은 폴더, 최신 실행이 덮어씀)
- 캡처: 같은 폴더의 `{width}-leaves.png`, `{width}-departments.png`, `{width}-dashboard.png` 갱신

### 미실행·미확인

- 개발 DB에 쓰는 기존 spec(login, password, dashboard*, attendance*, leaves, departments*, approvals, leave-*)은 미실행. 쓰기 여부 불확실
- `npm run build` 미실행(지시에 따라)
- 3000·6000 서버는 건드리지 않음
