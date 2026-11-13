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

## Run 7 (C6)

- 대상: C6 표 내부 액션·텍스트 링크(BT22~33·38·04). ApprovalsView, DepartmentsView, AdminAttendanceView, LeavesView, DashboardView CardLink 관련
- 기존 단위 테스트는 C6 변경 후에도 전부 통과. 깨진 단언은 없음 (DepartmentsView의 削除 `border-danger-100`·`text-danger-100`, 詳細에 `text-danger-100` 없음 단언도 그대로 통과)
- 추가 단위 테스트 2건 (전체 795 = 793 + 2)
  - `leaves/approvals/ApprovalsView.test.tsx`: `shouldShowNoApproveOrRejectButtonsForProcessedLeave` (承認済み行에 承認·却下 없음, 詳細은 활성)
  - `admin/attendance/AdminAttendanceView.test.tsx`: `shouldRenderDecorativePencilAndSingleLineSmEditButton` (修正 `whitespace-nowrap`, 아이콘 슬롯 `aria-hidden`)
- 이미 있던 단언(확인만): 本人 행 承認·却下 disabled + 詳細 활성, 修正 클릭→수정 모달, 사원명 링크 `href=/admin/users/{id}`, 削除만 danger 스타일, 시스템 부서 編集·削除 미표시
- e2e: `e2e/button-visual.spec.ts`에 B10 추가 (360·1024, 2건 신규). 전체 7 passed / 0 failed / 0 skipped (기존 5건 + B10 2건)
  - B10 구성: 全体勤怠管理 목록 GET은 고정 1행으로 응답(`/api/v1/admin/attendance**`, 긴 사원명 포함). 그 외 GET은 실제 백엔드, POST·PATCH·DELETE 차단, 로그인만 실제
  - 修正은 모달을 열고 Escape로 닫기까지만 함. 保存 없음
- 실행 명령:
  - `npx vitest run` (PowerShell, `frontend/`) → 53 files, 795 passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
  - `npx playwright test e2e/button-visual.spec.ts` (PLAYWRIGHT_BASE_URL=http://localhost:3000) → exit 0 (7 passed)

### B10 측정값 (CSS px, SCR-008 修正 버튼)

| 뷰포트 | 표시 형식 | 버튼 높이 | 버튼 폭 | 행 높이 | white-space | 표 scrollWidth / clientWidth |
|---|---|---|---|---|---|---|
| 360 | 카드(li) | 36 | 74 | 180 | nowrap | 해당 없음(표 숨김) |
| 1024 | 표(tr) | 36 | 74 | 61.5 | nowrap | 644 / 644 (가로 넘침 없음) |

- 판정: 修正 높이 36(sm), 한 줄(nowrap), 아이콘 포함. 1024 표는 가로 넘침 없음
- 측정 원본: `frontend/test-results/button-visual-B10-幅-{360|1024}px-*/measurements.jsonl`
- 캡처: 같은 폴더 `{width}-admin-attendance.png` (목록 상태, 모달 열기 전)

### 미실행·미확인

- 개발 DB에 쓰는 기존 spec(approvals, departments-responsive, attendance, login, password, dashboard*, leaves, leave-*, attendance-sheet-layout 등)은 미실행. 쓰기 여부 불확실. C6 e2e 회귀(`approvals`·`departments-responsive`·`attendance`)는 확인하지 못함
- 修正 버튼의 "폭 약 +20px" 변화 수치는 이전 상태와 비교하지 않음(변경 전 측정 없음)
- `npm run build` 미실행(지시에 따라)
- 3000·6000 서버는 건드리지 않음. 구현 코드·커밋 없음

## Run 8 (C7)

- 대상: C7 아이콘 버튼 (ベル TopBar, 出勤簿 월 이동, 休暇カレンダー MonthNavigator, 今月·Chevron)
- 전체 결과: RESULT FAIL. 실패 1건은 기존 spec `e2e/leave-visual.spec.ts`의 `shouldCaptureScrolledBottomAtPc1440`(원인 미확정, 아래 참고). C7 신규 단언은 모두 통과
- 단위 테스트: 전체 Vitest 53 files, 797 passed / 0 failed (직전 795에서 +2)
  - 추가 `components/layout/AppShell.test.tsx`: `shouldLinkBellToApprovalsWithCountAndRedDotWhenPending`(href·承認待ちN件 이름·빨간 점 aria-hidden), `shouldLinkBellWithoutRedDotWhenNoPending`(이름 休暇承認へ移動, 점 없음)
  - 이미 있던 단언(확인만, 변경 없음): 前月·翌月 이름 클릭(출근부·휴가 캘린더), 今月 disabled/enabled(출근부), 월 변경 후 재조회. 깨진 기존 단언 없음(`size-9` 등 클래스 단언 없음)
- e2e: `e2e/button-visual.spec.ts` C7 신규 2건(360·1440). 결과 2 passed / 0 failed
  - 벨: `a[href="/leaves/approvals"]` border-radius 8px 통과(360·1440)
  - 휴가 캘린더 MonthNavigator: 前月·翌月 height 40px 통과(360·1440)
  - 출근부 월 이동: 1440에서 前月·翌月·今月 height 40px 통과. 360에서는 출근부가 마운트되지 않음(md 기준, 구간 밖은 履歴 표시) → 측정 대상 아님(아래 수치 참고)
- 실행: `e2e` 4개 spec을 `PLAYWRIGHT_BASE_URL=http://localhost:3000`으로 실행(globalSetup의 DB 초기화와 webServer 기동 건너뜀)
- 실행 명령:
  - `npx vitest run` (PowerShell, `frontend/`) → 53 files, 797 passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
  - `npx playwright test e2e/button-visual.spec.ts e2e/attendance-sheet-layout.spec.ts e2e/leave-sidebar-submenu.spec.ts e2e/leave-visual.spec.ts` → 실행 58건 중 56 passed / 2 failed. 실패 2건 중 button-visual C7 360은 출근부 가정 오류였고 수정 후 통과. 남은 1건이 leave-visual

### 실행한 spec 과 미실행 spec

- 실행(읽기 전용 확인 완료, 쓰기 요청 없음): `button-visual.spec.ts`, `attendance-sheet-layout.spec.ts`(스크린샷은 `.claude/work/attendance-sheet-ui/screenshots`에 저장), `leave-sidebar-submenu.spec.ts`(스크린샷은 환경변수 미지정으로 저장 안 함), `leave-visual.spec.ts`(beforeAll은 skip 조건만. 스크린샷은 `.claude/work/` 하위에 저장)
- 미실행: `leave-calendar-mobile.spec.ts`. `beforeAll`이 `npm run db:e2e-leave-calendar-fixture`(개발 DB 쓰기)를 실행하므로 쓰기 가능성이 확실해 미실행
- 미실행(기존): login, password, dashboard*, attendance*, leaves, departments*, approvals 등 쓰기 가능 spec

### 실패 1건 (기존 spec, 원인 미확정)

- `leave-visual.spec.ts` › `shouldCaptureScrolledBottomAtPc1440`: `/leaves/calendar`(1440x900)에서 최하단 스크롤 값이 0. 기대값은 0 초과
- 추정: 페이지 높이가 뷰포트 안에 들어가 스크롤이 생기지 않음. 픽스처 데이터(휴가 캘린더 샘플)에 의존할 가능성. 이 spec은 `leave-calendar-mobile`이 만드는 픽스처를 전제할 수 있으나 이 spec 자체에는 설정이 없음
- C7 변경(아이콘 굵기, 벨 radius)은 페이지 높이를 바꾸지 않으므로 회귀 가능성은 낮다고 보지만, 확인하지는 못함(변경 전 기준 실행 없음)
- 담당: 미정. 환경(픽스처) 확인 또는 spec 전제 조건 확인이 필요. 구현 문제로는 판정하지 않음

### B C7 측정값 (CSS px)

| 항목 | 360 | 1440 |
|---|---|---|
| 벨 `a[href=/leaves/approvals]` 높이·폭 / radius | 40 / 40 / 8px | 40 / 40 / 8px |
| 출근부 前月·翌月 높이 | 측정 안 함(미마운트, 件数 0) | 40 / 40 |
| 출근부 今月 높이 | 측정 안 함 | 40 (toHaveCSS 통과) |
| 출근부 헤더 h1 높이 / line-height | 측정 안 함 | 34 / 34 (1행) |
| 출근부 前月 상단 차이 | 측정 안 함 | 3 |
| 출근부 가로 넘침 | 측정 안 함 | 0 |
| 휴가 캘린더 前月·翌月 높이 | 40 / 40 | 40 / 40 |

- 360 헤더 줄바꿈 수치: 출근부 자체가 360에 없으므로 비교할 현행 값이 없다. 360 헤더 줄바꿈 확인은 출근부(md 이상) 범위 밖이라 보류
- 캡처: `frontend/test-results/button-visual-C7-幅-{360|1440}px-*/` 아래 `attendance-month-nav.png`, `calendar-month-nav.png`
- 측정 원본: 같은 폴더의 `measurements.jsonl`

### 미확인

- `npm run build` 미실행(지시에 따라)
- 3000·6000 서버는 건드리지 않음. 구현 코드·커밋 없음

### Run 8 판정 보완 (leave-visual 회귀 여부)

- 방법: C7 구현 3파일(`TopBar.tsx`, `MonthNavigator.tsx`, `AttendanceSheetView.tsx`)만 `git stash`(이름 c7-baseline)로 되돌리고, 나머지(테스트·기록 파일)는 그대로 둔 상태에서 `leave-visual.spec.ts`의 `shouldCaptureScrolledBottomAtPc1440`만 같은 조건(PLAYWRIGHT_BASE_URL=http://localhost:3000)으로 실행. 15초 대기 후 실행, 실행 직후 `git stash pop`으로 복원
- 기준(C7 전) 결과: 실패. `Expected: > 0 / Received: 0`(최하단 스크롤 없음). C7 적용 시 실패와 동일
- 판정: C7 회귀 아님. 기존 문제(데이터·뷰포트 의존)로 기록. 기존 실패를 제외하고 RESULT: PASS
- stash 복원 확인: `git stash pop` 성공(`Dropped refs/stash@{0}`), `git stash list` 비어 있음. `git status`에서 `TopBar.tsx`·`MonthNavigator.tsx`·`AttendanceSheetView.tsx`가 다시 수정 상태(M)
- 기존 실패 기록: `leave-visual.spec.ts` › `shouldCaptureScrolledBottomAtPc1440`(기준·C7 모두 실패). 원인 후보는 캘린더 페이지 높이가 뷰포트 안에 들어가는 상태(샘플 휴가 픽스처 부재 가능성). 수정하지 않음
- 결과 집계 정정: Run 8 본문의 "RESULT: FAIL" 판정은 위 판정에 따라 PASS(기존 실패 제외)로 바꿨다. 실행 수치(58건 중 56 passed / 2 failed)는 그대로 둔다

## Run 9 (C8)

- 대상: C8 모바일 반응형 검증(단계 7). 코드 변경 없음. 측정·캡처만
- 결과: RESULT PASS. 신규 읽기 전용 spec `e2e/button-c8.spec.ts`(360·768·1024·1440) 4 passed / 0 failed / 0 skipped
- 단위 테스트: 전체 Vitest 53 files, 797 passed / 0 failed (변경 없음, Run 8과 동일)
- tsc: exit 0 (작성한 spec의 타입 1건을 고친 뒤 재실행해 0 확인)
- lint: exit 0
- 측정 원본: `.claude/work/button-refactor/screenshots/c8/measurements.jsonl` (45줄, 키 `viewport` = 뷰포트 폭). 캡처 PNG 44장은 같은 폴더(gitignore 대상)
- 실행 조건: `PLAYWRIGHT_BASE_URL=http://localhost:3000`(globalSetup 건너뜀, 서버 조작 없음). 로그인만 실제 백엔드. 그 밖의 API 요청은 GET만 통과, POST·PATCH·DELETE는 중단. 모달은 열고 Escape로 닫기까지만(제출 없음). 출근·퇴근·登録·保存 미클릭. 全体勤怠 목록 GET은 고정 1행 응답. 비밀번호 미출력
- DB 쓰기 spec 미실행(기존 login·password·dashboard*·attendance*·leaves·departments*·approvals 등)

### 측정 결과

| 항목 | 기준 | 360 | 768 | 1024 | 1440 | 판정 |
|---|---|---|---|---|---|---|
| ② 検索 버튼 전폭(내용폭 대비) — 출근 | sm 미만 1.0 | 1.00 (286/286) | 미측정(md 이상은 出勤簿 표시라 照会 없음) | — | — | 통과 |
| ② 検索 — 休暇管理 | sm 미만 1.0 | 1.00 (286/286) | 0.12 | 0.12 | 0.07 | 통과 |
| ② 検索 — 全体勤怠 | sm 미만 1.0 | 1.00 (286/286) | 0.12 | 0.39 | 0.23 | 통과 |
| ④ BT38 CardLink「すべて見る」 높이·중심 최근접 거리 | 높이 24 또는 거리 ≥ 12 | 20 / 173 | 20 / 229 | 20 / 341 | 20 / 51 | 통과(간격 예외) |
| ④ BT04 ログアウト(메뉴 항목) | 同 | 40 / 20 | 40 / 20 | 40 / 20 | 40 / 20 | 통과(높이 40) |
| ④ BT32 사원명 링크(표시 중) | 同 | 40 / 10 | 57 / 132 | 57 / 180 | 17 / 176 | 통과(360은 높이 40) |
| ④ BT33 | — | 미측정 | 미측정 | 미측정 | 미측정 | 미측정(아래 참고) |
| ⑤ 修正 포커스 링 잘림 | 잘림 없음 | 없음 | 없음 | 없음 | 없음 | 통과(overflow 래퍼 없음) |
| 모달 footer 2개 — 申請 | 2열(같은 top) | 2열 146/146 | 2열 104/88 | 2열 104/88 | 2열 104/88 | 통과 |
| 모달 footer 2개 — 出勤確認 | 同 | 2열 146/146 | 2열 104/88 | 2열 104/88 | 2열 104/88 | 통과 |
| 모달 footer 2개 — 勤怠修正 | 同 | 2열 146/146 | 2열 104/60 | 2열 104/60 | 2열 104/60 | 통과 |
| 모달 footer 2개 — 部署作成 | 同 | 2열 146/146 | 2열 104/60 | 2열 104/60 | 2열 104/60 | 통과 |
| 出勤する 버튼 높이 | 48 | 48 | 48 | 48 | 48 | 통과 |

- 360의 検索 버튼은 모두 내용폭과 같다(전폭). 1440 全体勤怠는 w-auto 상태의 inline 배치(정상)
- 측정 과정에서 바로잡은 점(spec 쪽): 기준을 외곽 폭 대신 padding을 뺀 내용폭으로 바꿈(休暇管理 검색의 0.87은 폼 padding 때문이었음). 뷰포트 키 충돌 수정. 숨겨진 표 링크 대신 표시 중인 링크를 선택

### 미측정·미확인 (사유)

- ③ 카드형 행 줄바꿈(승인·부서 RowActions): 승인 목록·부서 목록은 개발 DB 데이터에 따라 행이 없을 수 있어 측정하지 않음. 修正 카드(360, 행 180, 버튼 한 줄)만 Run 7에서 확인
- BT33: 본 spec에서 별도 측정하지 않음(사원명 링크는 BT32와 같은 컴포넌트로 보고 BT32 수치로 대표)
- 모달 9종 중 4종만 측정(出勤確認·休暇申請·勤怠修正·部署作成). 休暇詳細·承認·却下·取消·部署詳細/編集/削除·所属社員 등은 상세 데이터 또는 행 조작이 필요해 미측정
- 긴 확정 문구의 줄바꿈: 미측정(확정 문구가 긴 모달을 열 데이터가 없음)
- ⑤ 표 셀·카드의 overflow 래퍼 조사: 修正 버튼 1곳만 측정. 래퍼가 없어 잘림 없음
- 키보드 도달(E4)·BT16·34·40(측정만): 미실행
- 360 화면 캡처 `c8-360-SCR-004-leaves.png`에 Next.js 개발 도구의 "1 Issue" 표시가 보임. 개발 빌드 전용 표시이며 원인은 확인하지 않음. 프론트가 콘솔 오류 여부를 확인하면 좋음

### 수정이 필요한 곳

- 측정 기준에서 수정이 필요한 항목은 없음(모두 통과). 간격 예외가 성립하므로 텍스트 링크 `py-0.5` 적용은 필요하지 않음
- 확인 권장(frontend 담당): ③ 승인·부서 카드 행과 ⑤ 다른 overflow 래퍼 내 버튼은 데이터가 있는 상태에서 별도 측정이 필요함

### 캡처 목록 (`screenshots/c8/`, 폭별 11장 × 4 = 44장)

- `c8-{폭}-SCR-001-login`, `SCR-002-dashboard`, `SCR-003-attendance`, `SCR-004-leaves`, `SCR-004-calendar`, `SCR-008-admin-attendance`, `SCR-010-departments`
- `c8-{폭}-modal-clock-in-confirm`, `modal-leave-apply`, `modal-attendance-edit`, `modal-department-create`
- 캡처 전에 네트워크가 안정될 때까지 대기(스켈레톤 방지)

### 미확인

- `npm run build` 미실행(지시에 따라)
- 3000·6000 서버는 건드리지 않음. 구현 코드 수정·커밋 없음

## Run 10 (C9·최종 회귀)

- 대상: C9 `form.tsx` 버튼 상수 삭제 후 테스트 정리와 최종 회귀
- 결과: RESULT PASS. 단위·타입·린트 모두 통과, 읽기 전용 e2e 64 passed / 0 failed / 0 skipped
- 테스트 정리(C9):
  - `components/form.test.tsx`: 삭제된 상수 `modalDangerButtonClass`·`modalSecondaryButtonClass` import와 그 단언을 제거. `confirmMessageClass` 단언은 유지(describe 이름만 `確認文のクラス`로 변경)
  - `components/Button.test.tsx`: secondary variant에 `disabled:text-general-60` 단언 추가. danger variant의 `bg-danger-100`·`disabled:bg-danger-100/50` 단언은 기존에 이미 있어 그대로 유지
  - 결과: tsc exit 2 → exit 0 회복
- 단위 테스트: 전체 Vitest 53 files, 797 passed / 0 failed (Run 9와 동일 개수. form.test의 단언 1개를 Button.test로 옮김)
- tsc: exit 0 / lint: exit 0
- 실행 조건: `PLAYWRIGHT_BASE_URL=http://localhost:3000`(globalSetup 건너뜀, webServer 미기동). 로그인만 실제 백엔드. 모든 spec은 읽기 전용(쓰기 요청 차단 또는 GET만)
- 읽기 전용 e2e 실행 결과 (6 spec, 64건, 0 failed):
  - `modal-a11y.spec.ts` 2 passed
  - `button-visual.spec.ts` 9 passed (B3·B10·C7 포함, 로그인 입력 48px·검색 44px 포함)
  - `button-c8.spec.ts` 4 passed (360·768·1024·1440)
  - `attendance-sheet-layout.spec.ts` 8 passed
  - `leave-sidebar-submenu.spec.ts` 2 passed
  - `leave-visual.spec.ts` 39 passed
- `leave-visual` 기존 실패 1건(`shouldCaptureScrolledBottomAtPc1440`) 분리 기재: Run 8에서 실패, 같은 날 변경 전 기준(C7 3파일 stash)에서도 동일 실패로 확인. 이번 최종 회귀에서는 통과. 데이터·환경 의존으로 간헐적이며 C9 회귀로 보지 않음. 수정하지 않음
- 스크린샷·측정 파일 쓰기: `attendance-sheet-layout`·`leave-visual`은 기존 설계대로 `.claude/work/` 하위에 PNG를 저장함(DB 쓰기 아님). `button-visual`·`button-c8`은 `test-results/`와 `screenshots/c8/`에 저장

### 미실행 목록 (DB를 쓰는 spec 또는 전체 e2e — 사용자 취침 중 승인 없음)

- `e2e/leave-calendar-mobile.spec.ts`: beforeAll이 `db:e2e-leave-calendar-fixture`(DB 쓰기)를 실행
- `e2e/leave-management.spec.ts`: beforeAll 픽스처(DB 쓰기 가능성)
- `e2e/leaves.spec.ts`: `db:e2e-leaves-reset`(DB 쓰기)
- `e2e/attendance.spec.ts`, `e2e/attendance-status.spec.ts`: `db:e2e-attendance-reset`·`db:e2e-attendance-fixture`(DB 쓰기)
- `e2e/login.spec.ts`, `e2e/password.spec.ts`: 비밀번호 변경·로그인 시도 등 쓰기 가능
- `e2e/dashboard.spec.ts`, `e2e/dashboard-renewal.spec.ts`: 출근 등 쓰기 가능
- `e2e/approvals.spec.ts`: 승인·却下 처리(쓰기)
- `e2e/departments.spec.ts`, `departments-manager.spec.ts`, `departments-responsive.spec.ts`, `departments-list-modal.spec.ts`, `departments-members-modal.spec.ts`: 부서 CRUD 등 쓰기 가능
- `npm run test:e2e` 전체: 위 DB 쓰기 spec을 포함하므로 실행하지 않음

### 미확인

- `npm run build` 미실행(지시에 따라)
- 3000·6000 서버는 건드리지 않음. 구현 코드·커밋 없음
