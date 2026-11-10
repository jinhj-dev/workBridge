VERDICT: APPROVE

# Round 1

## 리뷰 범위
- 프론트: `leaves/approvals/{page,ApprovalsView,ApprovalsView.test}.tsx`, `components/Tabs(.test).tsx`, `components/layout/{PendingApprovalCount,AppShell,AppShell.test,Sidebar}.tsx`, `components/leave/LeaveDetailModal(.test).tsx`, `dashboard/{PendingApprovalsSection,DashboardView.test}.tsx`, `messages/ja.ts`, `e2e/approvals.spec.ts`, `e2e/attendance.spec.ts`
- E2E 도구(tester Run 2): `backend/prisma/e2e-account-data.ts`(resetE2eAdminAttendance), `backend/prisma/e2e-attendance-reset.ts`, `backend/package.json`
- 백엔드 테스트(tester Run 1): `backend/test/admin-attendance.e2e-spec.ts` 동일 날짜 정렬 비교 수정 — 구현 정렬 기준과 일치, 문제 없음
- `docs/` 직접 수정 없음 확인. 백엔드 앱 코드 변경 없음 확인

## 이슈

[중간] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/leaves/approvals/ApprovalsView.tsx:38-40, 98 — 본인 신청 행의 [승인]은 `primaryButtonClass`+`disabled:cursor-not-allowed`뿐이라 비활성일 때도 `primary-100` 채움 그대로이고 hover(`primary-90`)도 계속 적용된다. 09 §6 "disabled는 `disabled:bg-primary-60`" 위반이며 frontend.md의 "본인 행은 disabled 색(primary-60/general-60)으로 구분" 설명과도 다르다. [반려]도 disabled 시 hover 배경이 바뀐다 / approveButtonClass에 `disabled:bg-primary-60`(+`disabled:hover:bg-primary-60`), 반려에 `disabled:hover:bg-white` 추가(AttendanceSection.tsx:81과 같은 패턴).

[중간] [담당: tester] [분류: 테스트] frontend/src/components/leave/LeaveDetailModal.test.tsx:334-389 — test-plan M-03(기본 `initialStep='detail'`에서 확인/사유 단계 [취소] → 상세로 복귀, onClose 미호출)이 없다. 이번에 [취소] 분기를 바꿨으므로 대시보드 경로 회귀 확인이 필요 / 상세 → [承認] → [キャンセル] 후 상세 제목·항목 표시, `onClose` 0회를 검증하는 케이스 추가.

[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/leaves/approvals/ApprovalsView.test.tsx:117-126 — A-01 "컬럼·값 표시(이름·부서·종류·기간·일수·신청일)"가 검증되지 않는다. `findAllByText('申請者')`는 열 머리글(`t.applicant`='申請者')과도 일치해 행 렌더링 없이도 통과한다. 부서·종류·기간·일수·신청일 값 assertion이 하나도 없음 / 신청자 이름을 머리글과 다른 값으로 바꾸고, 표 행에서 `営業部`·`年次有給`류 종류 문구·`formatPeriod`·`formatDays`·`formatTokyoDate` 결과를 확인. A-02(ADMIN 기본 호출이 `scope=mine&page=1&limit=20`)도 같은 김에 assertion 추가.

[낮음] [담당: tester] [분류: 테스트] frontend/src/components/layout/AppShell.test.tsx:98-104 — S-02 실패 케이스는 초기값이 null이라 거부 처리 전에 검사해도 통과하는 사실상 무의미한 검증이고, 토스트 부재도 서버 message('エラー')가 아닌 `messages.error.unknown`으로 확인한다. totalCount=0 케이스도 명시적 테스트가 없다 / 성공(count>0) 후 refresh 실패로 배지가 사라지는지, `queryByText('エラー')` 부재, 0건 숨김을 각각 검증 권장.

[낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/leaves/approvals/ApprovalsView.test.tsx:215-220 — A-16 Loading 테스트가 표·Empty 부재만 확인하고 스켈레톤 존재는 확인하지 않는다. 405-420 `shouldNotCallApiForOwnRow...`는 disabled 버튼을 누르지 않아 PATCH 0건이 자명함(138-158과 중복) / 스켈레톤 요소 확인, 중복 테스트 정리 권장.

[낮음] [담당: tester] [분류: 테스트] frontend/src/components/leave/LeaveDetailModal.test.tsx:228-240 — 기존 409 테스트의 서버 message 'すでに処理された申請です。'가 신규 `t.alreadyProcessed`의 접두어라 `toHaveTextContent`(부분 일치)로는 서버 문구 표시 여부를 구별 못 한다(M-04 "대시보드 경로도 동일") / 서버 message를 다른 문구로 바꾸고 `t.alreadyProcessed` 표시를 검증.

[낮음] [담당: tester] [분류: 테스트] backend/prisma/e2e-account-data.ts:162-175 — 신규 `resetE2eAdminAttendance`에 단위 테스트가 없다(같은 파일의 다른 함수는 `e2e-account-data.spec.ts`로 검증). 이름 불일치·미존재 시 예외, 900001 행만 삭제 여부 테스트 권장.

[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance.spec.ts:20-28 — beforeAll의 로컬 DB 초기화가 `PLAYWRIGHT_BASE_URL` 지정 시(원격 대상, globalSetup은 초기화 skip)에도 실행되어 대상 서버와 다른 DB를 지운다. 기존 afterAll과 같은 패턴이라 낮음 / globalSetup과 같은 조건으로 skip 권장. E-02가 E-01 결과에 의존하는 점은 주석으로 명시돼 있어 수용.

[낮음] [담당: tester] [분류: 문서갱신] .claude/work/context.md:50 — 새 스크립트 `db:e2e-attendance-reset`(개발 DB 전용, 900001 attendance 삭제)이 명령어 섹션에 없다 / 문서 갱신 예정에 추가.

## 확인 결과 (문제 없음)
- API 계약: `/leaves/pending-approval?scope&page&limit=20`, 배지 `scope=mine&limit=1`, `GET /leaves/:id`, `PATCH approve`(본문 없음), `PATCH reject {rejectReason: trim}` — 06·design-backend와 일치. 403 `t.forbidden`, 409 `t.alreadyProcessed`, 404 서버 message, VALIDATION_ERROR `details.rejectReason` 처리
- SCR-005: 화면 ID·라우트·ADMIN 전용 보기 전환·컬럼 순서·승인자 열(scope=all만)·본인 행 [승인][반려] 비활성·Empty 2종·Pagination·범위 밖 페이지 처리 구현. 비관리자 `?scope=all`은 mine으로 호출
- LeaveDetailModal `initialStep`: 처리 불가면 상세 표시, 비-detail 시작의 [취소]는 닫기, 호출측 key 리셋. 대시보드 사용처 동작 유지
- 배지: Provider는 가드 통과 후만 마운트(조회 1회, 사이드바·드로어 공유), pathname/refresh 재조회, 늦은 응답 무시, 실패 시 숨김·토스트 없음, 99+, `sr-only` 건수 문구
- Tabs: role tablist/tab, aria-selected, roving tabIndex, ←/→ 순환, 토큰 클래스만 사용
- 변경 파일에 hex/rgb/임의 px 하드코딩 없음, UI 문구 모두 ja.ts 경유, 코드 주석 일본어
- frontend.md "문서 갱신 예정"이 plan의 DOC_ISSUES 5건(SCR-005, SCR-002 409, 03 배지 규칙, 09 §6 Tabs·PendingApprovalCount·prop 변경, 10 로드맵)을 모두 포함
- E2E 도구: localhost·non-production 가드, 이름 확인 후 900001 attendance만 삭제, 비밀번호 불필요, 오류 시 DATABASE_URL 미노출

# Round 2

## 리뷰 범위
- frontend Fix 1: `frontend/src/app/(app)/leaves/approvals/ApprovalsView.tsx`
- tester Run 3: `LeaveDetailModal.test.tsx`, `ApprovalsView.test.tsx`, `AppShell.test.tsx`, `e2e/attendance.spec.ts`, `backend/prisma/e2e-account-data.spec.ts`

## Round 1 이슈 처리 확인
- [중간/frontend] 본인 행 disabled 스타일 — 해결. ApprovalsView.tsx:40 `disabled:bg-primary-60 disabled:hover:bg-primary-60`, :98 `disabled:text-general-60 disabled:hover:bg-white`. AttendanceSection.tsx:81·152 패턴과 일치, 09 §6 준수, 토큰만 사용
- [중간/tester] M-03 — 해결. LeaveDetailModal.test.tsx:195-207 상세 → [承認] → [キャンセル] 후 상세 항목 표시, 확인 문구 부재, `onClose` 미호출, approve PATCH 0건 검증
- [중간/tester] A-01·A-02 — 해결. ApprovalsView.test.tsx:132-160 신청자 `佐藤花子`로 머리글 충돌 제거, 열 머리글 7개 순서와 행 값(부서·종류·기간·일수·신청일) 검증. :167 ADMIN 기본 호출 `scope=mine&page=1&limit=20` 검증
- [낮음] S-02 — 해결. AppShell.test.tsx:106-132 성공 후 0건 숨김, 성공 후 refresh 실패 시 숨김 + 서버 문구 `エラー` 토스트 부재
- [낮음] A-16·본인 행 중복 — 해결. :252-266 `role=status` 안 스켈레톤 5개, :449-466 disabled 버튼 `fireEvent.click` 후 확인 미오픈·PATCH 0건
- [낮음] 409 서버 문구 구별 — 해결. LeaveDetailModal.test.tsx:245-253 `サーバーの文言` 부재와 `t.alreadyProcessed` 표시 확인
- [낮음] resetE2eAdminAttendance 단위 테스트 — 해결. e2e-account-data.spec.ts:147-180 3건(900001만 삭제·件数 반환 / 미존재 / 이름 불일치 시 삭제 없음)
- [낮음] attendance.spec beforeAll — 해결. :23 `PLAYWRIGHT_BASE_URL` 지정 시 skip(global-setup과 같은 조건). afterAll 미변경 사유 수용
- [낮음] context.md 스크립트 — 미처리(아래 제안으로 유지)

## 이슈 (낮음, 제안)

[낮음] [담당: tester] [분류: 문서갱신] .claude/work/context.md:50 — `db:e2e-attendance-reset`이 여전히 명령어 섹션에 없다. test-report Run 3은 "architect 담당"이라 적었으나 Round 1은 tester 담당으로 지정했음 / 문서 갱신 예정(test-report)에 항목으로 남기거나 오케스트레이터가 context.md 갱신 시 반영.

[낮음] [담당: tester] [분류: 테스트] frontend/src/components/leave/LeaveDetailModal.test.tsx:195-207 — M-03은 확인(승인) 단계만 다룬다. 사유(반려) 단계 [キャンセル] → 상세 복귀는 같은 분기라 위험은 낮지만 검증 없음 / 필요 시 반려 경로도 같은 케이스로 추가.

## 확인 결과
- Fix 1 외 구현 코드 변경 없음, `docs/` 직접 수정 없음
- Run 3: frontend unit 245, e2e 23, backend unit 176, backend e2e 229 모두 통과 보고. 변경 테스트 파일에 skip/only/TODO 없음
