VERDICT: APPROVE

# review: 휴가 신청·조회·취소 (Round 1)

## 총평
- 백엔드 4개 API(POST /leaves, GET /leaves/approvers, GET /leaves/me, PATCH /leaves/:id/cancel)는 06 §4·design-backend와 일치한다. 잠금 순서(05 §8), 조건부 UPDATE 취소, 404→403→409 순서, 에러 코드·일본어 message, Controller→Service→Repository 계층, zod DTO 모두 문제없다. raw SQL은 태그드 템플릿 1건뿐이다.
- 프론트 SCR-004는 화면 명세의 요소(요약 4개, 탭, 신청 폼, 이력 표/카드, 필터, 페이지네이션, Empty, 승인자 Searchable Select, 모달 취소 단계)를 빠짐없이 구현했다. 시스템 컴포넌트를 재사용했고, 변경 파일을 Grep으로 확인한 결과 hex·rgb·px·임의값 하드코딩은 없다. 문구는 모두 ja.ts에서 가져온다.
- 구현 쪽 높음·중간 이슈는 없다. test-plan 시나리오 중 일부가 테스트에 들어가지 않아(중간) CHANGES_REQUESTED로 판정한다.

## 이슈

### tester
- [중간] [담당: tester] [분류: 테스트] backend/test/leave-requests.e2e-spec.ts:220,242 — test-plan의 승인자 후보 "사원번호 오름차순 정렬"과 "이름 keyword 부분 일치(대소문자 무시)", 내 이력 "createdAt desc·동순위 id desc 정렬", "totalPages", "year=abc → 400"이 검증되지 않는다(사원번호 keyword·totalCount만 확인함) / 후보 2명 이상으로 순서를 `toEqual`로 확인하고, 이름 대소문자 keyword 케이스를 추가한다. 이력은 createdAt이 같은 2건으로 id desc를, limit=1로 totalPages를 확인하고, year=abc 400도 넣는다.
- [중간] [담당: tester] [분류: 테스트] backend/test/leave-requests.e2e-spec.ts:136,329,690 — test-plan 항목 "leaveType 미정의 값 → 400 VALIDATION_ERROR", IT-CAN-04 "REJECTED → 409", "취소 후 balance pendingDays 감소"가 빠져 있다 / 각각 케이스를 추가한다. pendingDays는 GET /leaves/balance로 취소 전후 값을 비교한다.
- [중간] [담당: tester] [분류: 테스트] frontend/src/components/leave/LeaveDetailModal.test.tsx:436-452 — test-plan의 [취소] 비노출 조건 중 "즉시 승인·시작일 = 오늘(경계)"과 "REJECTED·CANCELLED"가 없다. 지금은 2999년·2000년처럼 먼 날짜만 확인해서 `>`/`>=` 경계 회귀를 잡지 못한다 / `vi.setSystemTime`으로 오늘을 고정하고 startDate=오늘이면 ✕·내일이면 ○를 확인한다. 본인 REJECTED·CANCELLED 건의 ✕도 추가한다.
- [중간] [담당: tester] [분류: 테스트] frontend/e2e/leaves.spec.ts — test-plan §4의 "대시보드 [휴가를 신청] → /leaves?tab=apply", "같은 기간 재신청 → LEAVE_CONFLICT 토스트", "375px에서 가로 스크롤 없음"이 없다(375 테스트는 빈 폼 검증만 함) / 세 시나리오를 추가한다. 실행 환경이 없으면 test-report에 미검증으로 남긴다.
- [낮음] [담당: tester] [분류: 테스트] backend/test/leave-requests.e2e-spec.ts:640 — 테스트 이름 `shouldKeepApproverOnCancelAndReturn404ForNonApplicant`와 달리 실제로는 403을 확인한다 / 이름을 `...Return403ForNonApplicant`로 바꾼다.

### frontend
- [낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/ApproverSelect.tsx:42-69 — status가 loading·error이거나 후보가 0건이면 `error` prop(클라이언트 검증 "承認者を選択してください。")을 보여주지 않는다. 또 `<label htmlFor>`와 `focusFirst`가 가리킬 input이 없다. 기존 안내 문구가 있어서 영향은 작다 / 이 상태들에서도 `FieldError`를 출력하거나, 이 경우에는 label을 빼는 방식을 검토한다.
- [낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/components/leave/ApproverSelect.tsx:159-161 — 활성 항목(`bg-general-30`)과 선택 항목(`bg-primary-30`)이 겹치면 배경 클래스 두 개가 한 요소에 같이 붙고, 어느 쪽이 보일지는 CSS 순서에 달려 있다 / 둘 중 하나만 붙도록 조건을 나눈다.
- [낮음] [담당: frontend] [분류: 문서갱신] .claude/work/leave-request/frontend.md "문서 갱신 예정" — 새 공용 유틸 `lib/leave-days.ts`(`countLeaveDays`, `parseLeavesQuery`, `yearOptions`, `LEAVE_STATUSES`, `isHalfDay`)가 09 §6과 context.md "공용 모듈" 갱신 대상에 빠져 있다 / 항목을 추가한다.

### backend
- [낮음] [담당: backend] [분류: 컨벤션] backend/src/modules/leaves/leaves.repository.ts:50 — 주석이 존재하지 않는 `lockUser()`를 가리킨다 / 실제 흐름인 `createWithUserLock`이 잠근 행을 콜백에 넘긴다는 내용으로 고친다.

## 확인 필요 (이슈로 세지 않음)
- 작업 시작 시점의 git status에 이번 작업 보고서에 없는 수정 파일이 있다: `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`, `frontend/src/app/(app)/leaves/approvals/ApprovalsView.tsx`·`ApprovalsView.test.tsx`·`page.tsx`, `backend/prisma/e2e-attendance-reset.ts`. 리뷰어는 diff를 볼 수 없어서 내용(줄바꿈만 바뀐 것인지 등)을 확인하지 못했다. 구현 에이전트가 고쳤다면 승인 범위 밖 변경(SCR-006은 docs 직접 수정)에 해당한다. 오케스트레이터가 `git diff`로 확인하길 바란다.
- 화면 확인(데스크톱·375px)은 frontend·tester 모두 수행하지 못했다. 스크린샷이 없다.
- Playwright `leaves.spec.ts`는 실행되지 않았다(미검증).

---

# Round 2

## 총평
- Round 1 이슈 9건(중간 4, 낮음 5)을 수정 파일만 다시 확인했다. 중간 4건은 모두 해결됐고, 낮음 5건 중 4건이 반영됐다. 남은 1건은 낮음이라 APPROVE로 판정한다.

## Round 1 이슈 처리 확인
- [해결] tester 중간 (승인자 정렬·이름 대소문자, 이력 정렬·totalPages·year=abc): `leave-requests.e2e-spec.ts:252-314`. 이름 `Ref…`/`ref…`를 대문자 keyword로 찾고 사원번호 오름차순을 `toEqual`로 확인한다. createdAt이 같은 2건은 id desc로, limit=1에서 `totalPages: 3`, `year=abc`는 400으로 확인한다.
- [해결] tester 중간 (leaveType 미정의, REJECTED 409, pendingDays 감소): `:157` `UNKNOWN`→VALIDATION_ERROR, `:417-425` REJECTED→409, `:428-445` GET /leaves/balance 전후 비교(pendingDays 2→0, remainingDays 8→10).
- [해결] tester 중간 (모달 [취소] 경계): `LeaveDetailModal.test.tsx:509-556`. `toFake: ['Date']`로 Date만 고정해 오늘(2026-11-09) ✕·내일 ○, 본인 REJECTED·CANCELLED ✕를 확인한다. `afterEach`에서 실제 타이머로 되돌린다.
- [해결] tester 중간 (Playwright 3개 시나리오): `frontend/e2e/leaves.spec.ts:96-143`. 대시보드 링크(`LeaveBalanceSection.tsx:78`의 href와 일치), LEAVE_CONFLICT 토스트(`/すでに申請された休暇/`가 `leaves.service.ts:115` 메시지와 일치), 375px에서 `/leaves`·`/leaves?tab=apply` 가로 스크롤 없음을 추가했다. 단 실행은 안 됐다(아래).
- [해결] tester 낮음: 테스트 이름이 `shouldKeepApproverOnCancelAndReturn403ForNonApplicant`로 바뀌었다(`:740`).
- [해결] frontend 낮음 (배경 클래스 중복): `ApproverSelect.tsx:163-169`에서 선택이면 `bg-primary-30`, 아니면 활성일 때만 `bg-general-30`을 붙인다.
- [일부 해결] frontend 낮음 (error 미표시): error·0건 상태에서 `FieldError`를 보여준다(`:59`, `:70`). loading 상태와 label `htmlFor`·focusFirst 대상 부재는 frontend.md에 "현행 유지"로 남았다. 아래 낮음 이슈로 이어간다.
- [해결] frontend 낮음 (문서 갱신 예정): frontend.md Fix 1에 `lib/leave-days.ts`의 09 §6·context.md "공용 모듈" 갱신이 추가됐다.
- [해결] backend 낮음 (주석): `leaves.repository.ts:50` 주석이 `createWithUserLock`이 콜백 인자로 넘긴다는 내용으로 고쳐졌다.

## 이슈

### frontend
- [낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/ApproverSelect.tsx:42-73 — loading·error·후보 0건 상태에서는 input이 렌더링되지 않아 부모의 `<label htmlFor={id}>`와 제출 시 focusFirst가 가리킬 대상이 없다(Round 1에서 이어짐, 영향 작음) / 필요하면 이 상태들의 래퍼에 `id`와 `tabIndex={-1}`을 주어 포커스·label 대상을 확보한다.

## 확인 필요 (이슈로 세지 않음)
- Playwright `leaves.spec.ts` 7건(신규 3건 포함)은 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`가 없어 실행되지 않았다. 병합 전에 환경변수를 설정하고 실행해야 한다.
- 화면 확인(데스크톱·375px 스크린샷)은 여전히 수행되지 않았다.
- Round 1에서 남긴 "보고서에 없는 수정 파일"(SCR-006 docs, approvals/ 하위, e2e-attendance-reset.ts) 확인은 오케스트레이터 몫으로 남아 있다. frontend.md에 따르면 이번 수정에서는 건드리지 않았다.
