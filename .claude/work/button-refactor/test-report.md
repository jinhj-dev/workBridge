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
