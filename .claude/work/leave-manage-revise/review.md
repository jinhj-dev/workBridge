VERDICT: APPROVE

# review: 휴가 신청 공통 모달화 + 이력 상태·종류 토글 필터 (Round 1)

리뷰 대상: backend `my-leaves-query.dto.ts`, `leaves.service.ts`, `leaves.repository.ts`, `test/leave-requests.e2e-spec.ts` / frontend `components/leave/LeaveApplyModal.tsx`(+test), `LeaveFilterButtons.tsx`(+test), `leaves/LeavesView.tsx`(+test), `LeaveHistoryList.tsx`, `dashboard/LeaveBalanceSection.tsx`, `DashboardView.test.tsx`, `lib/leave-days.ts`(+test), `messages/ja.ts`, `e2e/leaves.spec.ts`.
대상 외(사용자 지시): `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`, `backend/prisma/e2e-attendance-reset.ts`.

## 이슈

- [높음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/leaves/LeavesView.tsx:71-74 — 신청 성공 후 "현재 URL 문자열 == 이동할 URL"일 때만 `history.reload()`를 호출한다. 그런데 URL 문자열은 달라도 이력 API 경로는 같은 경우가 있다: `/leaves?tab=apply`(북마크·리다이렉트로 남은 링크, 이번 작업이 지원 대상으로 명시), `?year=<올해>`, `?status=FOO`, `?page=1` 등. 이때 `router.push('/leaves')`만 실행되고 `useApiQuery`는 path·nonce가 그대로라 재조회하지 않아 새 신청이 이력에 보이지 않는다. / 비교 기준을 URL 문자열이 아니라 정규화한 값(현재 파싱 결과로 만든 `buildUrl(...)` 또는 이력 API 경로)으로 바꾸거나, push 여부와 관계없이 이력 경로가 바뀌지 않으면 reload한다. `?tab=apply`에서 올해 날짜로 신청한 뒤 `/leaves/me`가 다시 호출되는지 확인하는 테스트를 LeavesView.test에 추가한다.
- [중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/dashboard/DashboardView.test.tsx:370-385 — test-plan §2 "신청 성공 → 모달 닫힘 + `/leaves/balance` 재조회, 화면 이동 없음"이 없다(test-report도 미확인으로 남김). 모달 열기만 검증한다. / 신청 성공 후 dialog가 닫히고 balance 호출 횟수가 늘며 `router.push`가 호출되지 않는 케이스를 추가한다.
- [중간] [담당: tester] [분류: 테스트] frontend/e2e/leaves.spec.ts — test-plan §3의 "이력 상태 토글 복수 선택 시 해당 상태만 / 종류 토글 선택 시 해당 종류만 표시"가 없고, `shouldOpenApplyModalFromDashboardButton`(95-103)은 모달 표시만 보고 "신청 후 대시보드에 머무름"은 검증하지 않는다. / 토글 필터 시나리오 1건을 추가하고, 대시보드 테스트는 실제로 신청해 URL이 `/dashboard`로 유지되고 모달이 닫히는지 확인한다(실행 환경이 없으면 미검증으로 보고).
- [낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/leaves/LeavesView.tsx:65-70 — POST /leaves에는 연도 상한이 없어 내후년 이후 시작일도 신청할 수 있지만, `parseLeavesQuery`는 `yearOptions` 밖의 연도를 올해로 되돌린다. 이 경우 `?year=<내후년>`으로 이동해도 올해 이력이 표시되고 새 신청은 보이지 않는다. 가능성은 낮지만 위 [높음] 수정 시 같이 고려(예: 범위 밖이면 이동 대신 reload만)할 것을 제안.
- [낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/LeaveApplyModal.tsx:173 — 요청 중 모달을 닫고 다시 열면(key 변경으로 이전 인스턴스 unmount) 이전 요청의 응답이 `onApplied`를 호출해 새로 연 모달까지 닫힌다. 드문 경우라 제안으로 남김.
- [낮음] [담당: frontend] [분류: 컨벤션] frontend/src/messages/ja.ts:169 — `leaves.apply.cancel`(「キャンセル」)은 `common.cancel`(15행)과 같은 문구다. 설계는 "common에 같은 의미 키가 있으면 재사용"이었으므로 `messages.common.cancel` 재사용을 제안.
- [낮음] [담당: frontend] [분류: 컨벤션] frontend/src/app/(app)/leaves/LeaveHistoryList.tsx:22 (`=\`` 공백 없음), LeavesView.test.tsx:63(빈 줄 2개)·271-275(긴 줄) — prettier 포맷이 맞지 않는다. 변경 파일만 `prettier --write`.
- [낮음] [담당: tester] [분류: 테스트] DashboardView.test.tsx:354 `shouldShowBalanceValuesAndApplyLink` — 이제 링크가 아닌 버튼이라 테스트 이름이 내용과 맞지 않는다. / LeaveApplyModal.test에 X(닫기) → `onClose` 케이스, LeavesView.test에 상태 2개 동시 선택 URL(`status=PENDING%2CAPPROVED`) 케이스가 없다(LeaveFilterButtons 단위 테스트와 API 경로 테스트로 대부분 커버되므로 낮음). backend e2e는 `leaveType` 단일(B1)·`leaveType=ANNUAL,`(B8 일부) 케이스가 직접적으로는 없다.

## 확인 결과 (문제 없음)
- Backend: `commaSeparatedEnum`은 근태 `statusListSchema`와 같은 패턴. repository는 길이 > 0일 때만 `in` 조건, 대상은 항상 토큰 본인. Controller → Service → Repository 계층 준수. 400 `details[].field`가 `status.N` 형식인 점은 API-ATT-003 기존 동작과 같아 "문서와 다른 점"으로 타당. 06 갱신 시 이 형식을 적으면 된다.
- Frontend: 탭 제거, `?tab=` 무시, 헤더 [休暇申請] 버튼, 공통 `LeaveApplyModal`(Modal 사용·수정 없음, footer 텍스트/채움 버튼, `form=` 연결, Spinner), 라디오(fieldset/legend, 초기 미선택, 첫 radio focus), 승인자 후보는 open일 때만 조회, `LeaveFilterButtons`는 StatusFilterButtons와 같은 클래스·접근성, 상태=배지색·종류=neutral, URL 쉼표 구분·표시 순서 정렬, 대시보드는 버튼 → 모달 + 휴가 현황 reload. 설계와 일치.
- 디자인 시스템: 변경 파일에 hex/rgb/px 임의 값 없음. 일회성 컴포넌트 없음, 새 컴포넌트는 `components/leave/`에 위치. 근태 `StatusFilterButtons` 수정 없음.
- 문구는 모두 ja.ts 참조. "화면 리스트와 다른 점"(라벨 「休暇種別」 재사용, submit 「申請する」, aria-invalid를 fieldset에)은 타당.
- 문서 갱신 예정: backend.md·frontend.md에 06/SCR-004/SCR-002/03/08/09/10 모두 기재되어 있고 실제 코드와 맞다. 구현 에이전트의 `docs/` 직접 수정 없음(SCR-006은 대상 외).

## 담당별 이슈 수
- backend: 0
- frontend: 높음 1, 낮음 4
- tester: 중간 2, 낮음 1

---

# Round 2

리뷰 대상: frontend.md "Fix 1", test-report.md "Run 2"에 적힌 수정 파일만. `LeavesView.tsx`(+test), `LeaveApplyModal.tsx`(+test), `messages/ja.ts`, `DashboardView.test.tsx`, `e2e/leaves.spec.ts`, `backend/test/leave-requests.e2e-spec.ts`. SCR-006 문서·`e2e-attendance-reset.ts`는 대상 외.

## Round 1 이슈 처리 확인
- [높음] LeavesView handleApplied — 해결. `buildHistoryPath()`를 분리하고, 이동할 URL을 `parseLeavesQuery`로 다시 해석해 만든 이력 경로가 현재 `historyPath`와 같으면 `history.reload()`, URL 문자열이 다르면 별도로 `router.push`(LeavesView.tsx:64-79). `?tab=apply`·`?year=<올해>`·`?page=1`·알 수 없는 status 같은 경우는 reload + URL 정리, 다른 연도·필터 상태에서는 push로 경로가 바뀌어 재조회된다. 두 경우가 겹쳐도 중복 조회는 없다. 테스트 `shouldReloadHistoryAndCleanUrlWhenOldTabUrlHasSameHistoryPath`(LeavesView.test.tsx:189)가 push 인자와 재조회 횟수를 확인한다.
- [중간] Dashboard 신청 성공 — 해결. `shouldCloseModalReloadBalanceAndStayOnDashboardAfterApplied`(DashboardView.test.tsx:387)가 dialog 닫힘, balance 재조회, POST 1회, `router.push` 미호출을 확인한다.
- [중간] e2e — 반영. `shouldApplyFromDashboardModalAndStayOnDashboard`(실제 신청 → 토스트, 모달 닫힘, URL `/dashboard` 유지), `shouldFilterHistoryByStatusAndLeaveTypeToggles` 추가. 실행은 환경변수가 없어 미검증으로 보고됨(타당).
- [낮음] 범위 밖 연도 — reload 분기로 이력 재조회는 된다. 새 신청이 화면에 보이지 않는 점은 그대로지만 연도 선택지 범위의 문제라 이번 범위 밖으로 둔다.
- [낮음] 요청 중 닫고 다시 열기 — 보류 사유(onApplied를 막으면 재조회가 빠짐) 타당. 문제 없음.
- [낮음] `leaves.apply.cancel` — 삭제됨. LeaveApplyModal.tsx:194가 `messages.common.cancel` 사용.
- [낮음] prettier — 대상 파일에 적용됨.
- [낮음] tester 항목 — 테스트 이름 변경, X 버튼 → onClose(LeaveApplyModal.test.tsx:175), 상태 2개 URL/API 경로(LeavesView.test.tsx:309, 323), backend `leaveType: 'HALF_AM'` 단일(spec:402)·`leaveType: 'ANNUAL,'`(spec:456) 모두 추가됨.

## 신규 이슈
- [낮음] [담당: tester] [분류: 테스트] frontend/e2e/leaves.spec.ts:136-148 — `toHaveURL` 직후 `rows.all()`로 행을 한 번에 가져오는데, 이때 이력이 아직 로딩 중(SkeletonLines, LeaveHistoryList.tsx:58)이면 0건이라 반복문 검증이 하나도 실행되지 않고 통과할 수 있다. 이전 목록이 남아 있으면 반대로 행 수가 달라 실패할 수도 있다. 특히 SPECIAL 토글 뒤에는 0건/로딩을 구분하지 않는다. / 토글 클릭 전에 `page.waitForResponse(/\/leaves\/me\?.*leaveType=SPECIAL/)`를 걸어 두거나, 반복문 전에 표 또는 빈 상태 표시를 기다리고 행 수를 확인한다. 실행 전 테스트라 낮음으로 둔다.

## 확인 결과 (문제 없음)
- 이번 수정으로 범위 밖 변경, 하드코딩 토큰, 새 문구 추가 없음. ja.ts 256행 `cancel`은 다른 섹션의 기존 키.
- 문서 갱신 예정: Fix 1은 09/06 기재 내용에 영향이 없다(frontend.md 기재와 일치).

## 담당별 이슈 수 (Round 2)
- backend: 0
- frontend: 0
- tester: 낮음 1
