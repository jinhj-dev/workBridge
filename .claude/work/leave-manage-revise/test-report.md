RESULT: PASS

# test-report: 휴가 신청 공통 모달화 + 이력 상태·종류 토글 필터 (Run 1)

## 실행 결과 요약
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend e2e | `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts` | 43 / 43 통과 |
| Frontend 전체 | `npx vitest run` | 22 파일, 353 / 353 통과 |
| Frontend 타입 | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 경고·오류 없음 |
| Playwright | `frontend/e2e/leaves.spec.ts` | 미검증 (아래 참조) |

## 작성·보강한 테스트 파일
구현 측이 먼저 작성한 테스트를 test-plan과 대조하고, 누락 항목만 추가했다.
- `backend/test/leave-requests.e2e-spec.ts`
  - 추가: `shouldTreatDuplicateStatusAsSingleAndExcludeOtherUsersLeaves` (B6 중복 `status=APPROVED,APPROVED`, B10 타인 건 제외)
  - 기존 추가분: `shouldFilterOwnLeavesByMultipleStatusesAndLeaveTypes`(B2·B3·B4·B5·B7), `shouldRejectInvalidStatusOrLeaveTypeListForOwnLeaves`(B8·B9)
- `frontend/src/components/leave/LeaveFilterButtons.test.tsx`
  - 추가: `shouldShowCheckMarkOnlyOnSelectedButtons`, `shouldUseButtonTypeToAvoidFormSubmit`
- `frontend/src/app/(app)/leaves/LeavesView.test.tsx`
  - 추가: `shouldRestoreTogglesFromUrlIgnoringUnknownValues`(URL 복원·미지 값 무시·상태 select 없음), `shouldRemoveParamWhenLastToggleDeselected`(선택 해제로 파라미터 제거)
- 기존 파일(확인만, 변경 없음): `src/lib/leave-days.test.ts`, `src/components/leave/LeaveApplyModal.test.tsx`, `src/app/(app)/dashboard/DashboardView.test.tsx`

## 실패 항목
없음.

## 미검증 항목
- Playwright `frontend/e2e/leaves.spec.ts` 미실행. 사유: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 환경변수가 없어 로그인 계열 테스트가 skip되는 구성이다. 백엔드(4000)·프론트(3000)는 응답하므로 환경변수만 있으면 실행 가능하다. 375px 가로 스크롤·모달 화면 내 표시는 실화면 확인이 필요하다.
- test-plan §2 중 `LeaveApplyModal`의 "첫 radio focus"·"제출 시 종류 미선택 문구"·"연타 1회" 등은 기존 테스트로 커버되었고 이번 Run에서 재작성하지 않았다.
- `DashboardView`의 "신청 성공 → 모달 닫힘 + balance 재조회"는 기존 테스트 이름에 해당 항목이 명시적으로 없어 확인하지 못했다. 필요하면 추가가 필요하다(담당: frontend).

## 참고
- 테스트 자체의 오류(담당: tester)는 발견되지 않았다.
- 구현 참고(담당: backend, 문서 반영 필요): 400 `details[].field`는 `status.1` 형식이다. 테스트는 접두(`status`/`leaveType`)만 검사하도록 작성했다. API 문서 기재는 backend.md 안내대로 반영 필요.
- 커밋·푸시·브랜치 변경 없음. `docs/`, `backend/prisma/e2e-attendance-reset.ts`, SCR-006 문서는 건드리지 않았다.

---

# Run 2 (review.md tester 担当 中2・低1 反映 + frontend Fix 1 回帰)

RESULT 판정: PASS (실패 0). Playwright는 미검증(아래 참조)

## 실행 결과 요약
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend e2e(이번 변경 대상) | `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts` | 43 / 43 통과 |
| Backend e2e(전체) | `npm run test:e2e` | 11 파일, 277 / 277 통과 |
| Backend unit | `npm test` | 14 파일, 199 / 199 통과 |
| Backend 타입·lint | `npx tsc --noEmit`, `npm run lint` | 오류·경고 없음 |
| Frontend 전체 | `npx vitest run` | 22 파일, 358 / 358 통과 |
| Frontend 타입·lint | `npx tsc --noEmit`, `npm run lint` | 오류·경고 없음 |
| Frontend 포맷 | `prettier --check` (변경 테스트 파일) | 통과(DashboardView.test.tsx는 이번 Run에서 `prettier --write` 적용) |
| Playwright | `frontend/e2e/leaves.spec.ts` | 미검증 (아래 참조) |

## 이번 Run에서 추가·보강한 테스트
review.md 담당 tester 항목 대응:
- [中] `frontend/src/app/(app)/dashboard/DashboardView.test.tsx`
  - 추가: `shouldCloseModalReloadBalanceAndStayOnDashboardAfterApplied` (신청 성공 → 모달 닫힘(`open` 속성 제거), `/leaves/balance` 재조회, `POST /leaves` 1회, `router.push` 미호출)
- [中] `frontend/e2e/leaves.spec.ts`
  - 교체: `shouldOpenApplyModalFromDashboardButton` → `shouldApplyFromDashboardModalAndStayOnDashboard` (실제 신청 후 모달 닫힘, URL `/dashboard` 유지). 기존 테스트와 날짜 충돌을 피하려고 來年 3月の 2週目 月曜를 사용
  - 추가: `shouldFilterHistoryByStatusAndLeaveTypeToggles` (상태 토글 2개 → `status=PENDING%2CAPPROVED`, 표시 행에 REJECTED·CANCELLED 없음, 종류 토글 SPECIAL → `leaveType=SPECIAL`, 표시 행이 SPECIAL만)
- [低] `DashboardView.test.tsx`: `shouldShowBalanceValuesAndApplyLink` → `shouldShowBalanceValuesAndApplyButton` (버튼으로 개명)
- [低] `frontend/src/components/leave/LeaveApplyModal.test.tsx`: 추가 `shouldCallOnCloseWhenCloseIconPressed` (X 버튼 → onClose, POST 없음)
- [低] `frontend/src/app/(app)/leaves/LeavesView.test.tsx`: 추가 `shouldAddSecondStatusToggleToUrlAndResetPage` (상태 2개 선택 시 URL, page 초기화), `shouldPassTwoStatusTogglesToApiInDisplayOrder` (API `status=PENDING%2CAPPROVED`, 표시 순서)
- [低] `backend/test/leave-requests.e2e-spec.ts`
  - `shouldFilterOwnLeavesByMultipleStatusesAndLeaveTypes`에 `leaveType=HALF_AM` 단일 값 케이스(B1) 추가
  - `shouldRejectInvalidStatusOrLeaveTypeListForOwnLeaves`에 `leaveType=ANNUAL,` 케이스(B8) 추가

## Frontend Fix 1 회귀
- `LeavesView.test.tsx`의 `shouldReloadHistoryAndCleanUrlWhenOldTabUrlHasSameHistoryPath`(Fix 1 추가분)와 기존 `shouldReloadHistoryWhenAppliedLeaveMatchesCurrentUrl`, `shouldCloseModalReloadSummaryAndMoveToStartYearAfterApplied`가 전체 스위트에서 통과. 회귀 없음.
- 기존 실패 없음. 이번 Run에서 새로 실패한 테스트 없음.

## 실패 항목
없음.

## 미검증 항목
- Playwright `frontend/e2e/leaves.spec.ts` 미실행. 사유: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 환경변수가 없고 `PLAYWRIGHT_BASE_URL`도 미설정. 로그인 필요 시나리오가 실행되지 않는다. 환경변수 설정 후 `npm run test:e2e`로 확인이 필요하다. 신규 e2e 2건(대시보드 신청 후 머무름, 토글 필터)은 타입체크와 lint만 통과했다.
- 375px 가로 스크롤·모달 화면 내 표시, ApproverSelect 드롭다운이 `<dialog>` 안에서 잘리는지는 실화면 확인이 필요하다(Run 1과 동일).
- review.md 中2・低1 중 tester 담당 항목은 모두 반영했다. 남은 것은 frontend 담당 低(LeaveApplyModal 요청 중 닫힘 → onApplied) 1건으로, 구현 측 판단 사항이라 테스트 대상에서 제외했다.

## 참고
- 테스트 자체의 오류(담당: tester)는 이번 Run에서 발견되지 않았다. 신규 테스트 작성 중 발생한 prettier 포맷 경고는 `DashboardView.test.tsx`에만 있었고 `--write`로 해결했다.
- 커밋·푸시·브랜치 변경 없음. `docs/`, `backend/prisma/e2e-attendance-reset.ts`, SCR-006 문서는 건드리지 않았다.

---

# Run 3 (小修正: LeaveHistoryList モバイル横並び・トグル scroll:false・useSyncedState・aria-busy / LeavesView keepPreviousData・onChange options)

RESULT 판정: PASS (실패 0). Playwright·실화면 모바일 확인은 미검증(아래 참조)

## 실행 결과 요약
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend 대상 | `npx vitest run "src/app/(app)/leaves"` | 2 파일, 52 / 52 통과 (LeavesView 24건 포함) |
| Frontend 전체 | `npx vitest run` | 22 파일, 363 / 363 통과 |
| Frontend 타입 | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Frontend lint | `npm run lint` | 경고·오류 없음 |
| Frontend 포맷 | `npx prettier --check` (LeavesView.test.tsx) | 통과 |

## 이번 Run에서 수정한 테스트 (테스트 자체 기대값 갱신, 담당: tester)
구현 변경(토글에 `{ scroll: false }` 전달)으로 기존 기대값이 어긋나 있었다. 구현은 건드리지 않고 기대값만 새 사양에 맞췄다. assertion을 약하게 만든 것은 없다.
- `shouldPushFilterToUrlAndResetPage`: 상태·종류 토글 push에 `{ scroll: false }` 추가. 연도 변경은 인자 1개(scroll 없음)임을 `mock.lastCall` 길이로 확인 추가.
- `shouldRemoveParamWhenLastToggleDeselected`: `('/leaves', { scroll: false })`
- `shouldAddSecondStatusToggleToUrlAndResetPage`: `('/leaves?status=PENDING%2CAPPROVED', { scroll: false })`

## 이번 Run에서 추가한 테스트 (`frontend/src/app/(app)/leaves/LeavesView.test.tsx`, +5건)
- `shouldPassScrollFalseOnToggleAndKeepBothWhenPressedConsecutively`: 상태 토글 → `{scroll:false}` 전달, 이어서 종류 토글 → URL에 `status=PENDING&leaveType=HALF_AM` 둘 다 포함, push 2회
- `shouldKeepPreviousListWithAriaBusyWhileFilteredResultLoads`: 결과 대기 중 이전 행 2개 유지, 테이블 DOM 동일, 스켈레톤(role=status) 없음, 목록 영역 `aria-busy=true`, 응답 후 새 행 표시·`aria-busy=false`
- `shouldShowErrorInsteadOfPreviousListWhenFilteredRequestFails`: 필터 요청 실패 시 이전 목록을 남기지 않고 오류 표시(loadError), 테이블 없음
- `shouldChangePageWithoutScrollOption`: 페이지 이동 → `/leaves?page=3`, 인자 1개(scroll 옵션 없음)
- `shouldPlaceYearLabelAndSelectInOneRowOnMobile`: 연도 select 부모에 `flex items-center` 클래스(모바일 횡 1열 의도 확인, 실제 배치는 미검증)

## 실패 항목
없음.

## 참고 (테스트 작성 중 발견, 구현 문제 아님)
- `Toast` provider의 `role="status"` live region이 화면 전역에 상시 있어, 스켈레톤 부재 확인은 목록 영역 내부에서만 수행하도록 했다.
- 전체 실행 중 jsdom의 `Not implemented: navigation to another Document` 로그가 출력되었으나 테스트는 모두 통과. 이번 변경과의 관련 여부는 확인하지 않았다(기존 테스트에서 발생하는 jsdom 로그로 추정).

## 미검증 항목
- Playwright `frontend/e2e/leaves.spec.ts`: 미실행. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 등 환경 미설정(Run 1·2와 동일).
- 모바일(sm 미만) 횡 1열 배치, `aria-busy` 중 opacity 전환의 실제 시각 효과: 브라우저 확인 없이 class 수준으로만 검증. 실화면 확인 필요.

## 범위 준수
- 구현 코드(`LeaveHistoryList.tsx`, `LeavesView.tsx`) 미변경. `docs/`, `backend/prisma/e2e-attendance-reset.ts`, SCR-006 문서 미변경.
- git commit·push·브랜치 변경 없음.
