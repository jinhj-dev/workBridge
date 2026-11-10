# frontend: 休暇詳細 모달 개편

결정 D1~D11 추천안 그대로 구현. 백엔드·API·신청/승인/반려/취소 로직·버튼 노출 규칙은 변경 없음.

## 생성·수정 파일
- 신규: `frontend/src/components/DetailTable.tsx`, `frontend/src/components/leave/LeaveStatusBadge.tsx`
- 수정: `src/app/globals.css`(warning-100/40 토큰, `html:has(dialog:modal){overflow:hidden}`), `components/Modal.tsx`, `components/Badge.tsx`, `components/leave/LeaveDetailModal.tsx`, `app/(app)/leaves/LeaveHistoryList.tsx`, `app/(app)/attendance/AttendanceSheetView.tsx`, `lib/format.ts`(`～`), `messages/ja.ts`(`CANCELLED:'取消済み'`, `detail.unassigned`)
- 테스트 기대값 갱신: `format.test.ts`, `LeaveDetailModal.test.tsx`(처리자·처리일시 항상 표시 + 未所属 테스트 1건 추가), `LeavesView.test.tsx`, `ApprovalsView.test.tsx`, `DashboardView.test.tsx`(기간 `～`)

## 구현한 화면
SCR-004 §4.4 휴가 상세 모달(공통). 호출처(SCR-002 승인 대기, SCR-003 申請 배지, SCR-004 이력, SCR-005 승인 목록)는 모달·배지만 공유, 코드 변경은 배지 교체뿐.
사용 컴포넌트: Modal(`icon`·`size="lg"`), DetailTable/DetailTableRow, LeaveStatusBadge(Badge pill+warning), SkeletonLines, SectionError, Spinner, form.tsx 버튼·FieldError.

## 새로 만든 시스템 컴포넌트
- `components/DetailTable.tsx`: `DetailTable({children,className?})`, `DetailTableRow({label,children})`
- `components/leave/LeaveStatusBadge.tsx`: `LEAVE_STATUS_BADGE`(LeaveDetailModal에서 이동), `LeaveStatusBadge({status,children?})`

## 화면 리스트와 다른 점
- 없음. (Modal 구조 변경으로 `<dialog>`가 `open:flex`를 사용: `flex`를 직접 주면 닫힌 dialog가 표시되기 때문)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §2.1: Yellow 100/40을 @theme에 도입, 경고 배지 = `warning-40` 배경 + general-100 글자, 아이콘 `warning-100`
- §6 Badge 행: variant `warning`, 기본 `gap-1` / Modal 행: `icon?`·`size?('md'|'lg')`, 본문만 내부 스크롤(`max-h 100dvh-2rem`), 푸터 상단 구분선, 좌우 `px-5 sm:px-7`, 배경 스크롤 잠금(CSS), 바깥 클릭으로 닫지 않음 / `DetailTable` 행 신규 / `LeaveStatusBadge` 행 신규 / LeaveDetailModal 행(`LEAVE_STATUS_BADGE` 이동) / LeaveFilterButtons 행(import 경로 `leave/LeaveStatusBadge`)
- `docs/04.../SCR-004_LEAVE.md` §4.4: 処理者·処理日時는 항상 표시(미처리 「—」), 申請者 부서 null이면 「未所属」, 承認者는 자동 승인 시 「自動承認」, 기간 구분자 `～`, 상태 문구 `取消済み`, 상태 Badge 색(승인 대기 Yellow)
- `docs/10_DEVELOPMENT_ROADMAP.md`: 휴가 상세 모달 개편 항목 완료 처리

## impeccable 점검
- 토큰만 사용(hex 없음). pill 배지의 글자는 general-100로 대비 확보, 아이콘은 aria-hidden.
- 모바일 라벨 열 96px로 「ステータス」·「処理日時」가 줄바꿈 없이 들어감, 긴 값은 `break-words`.
- 푸터 `flex-wrap`으로 버튼 3개(閉じる/取消 등)가 좁은 폭에서도 넘치지 않음.

## 화면 확인 (Playwright, 개발 서버)
- 확인: 휴가 상세 모달 PC(1280)·모바일(375) 기본 상태(승인 완료 건). `screenshots/leave-detail-pc.png`, `leave-detail-mobile.png`. 모바일은 높이 700에서 본문만 스크롤, 헤더·푸터 고정 확인. 신청 모달 PC는 푸터 구분선·padding 정상.
- 미확인: 반려 상태(却下理由 행)·승인 대기 배지의 모달 내 모습(단위 테스트로만 확인, 이력 필터 버튼에서 Yellow 배경 확인).
- 확인용으로 만든 테스트 휴가(E2E 관리자 SPECIAL 1건)는 API로 취소함.

## 검증
- `tsc --noEmit` 오류 없음, `eslint src` 오류 없음, `vitest run` 500/500 통과.

## 보고: Modal 공통 변경 영향
- 승인자 드롭다운(`ApproverSelect`, 신청 모달)은 `absolute` 목록이라 본문 `overflow-y-auto` 안에서 잘리거나 본문 스크롤 영역을 늘릴 수 있음(구조상 가능성). 일반 사원 계정이 없어(관리자는 승인자 필드 없음, 900002는 초기 PW 변경 필요) **시각 확인 못 함** → 일반 사원 계정으로 확인 필요. 승인 목록의 모달에는 드롭다운이 없어 해당 없음. 임의로 구조는 바꾸지 않음.
- 나머지 모달(출근 확인, 日付 상세, 근태 수정, 부서 생성·삭제)은 시각 확인 안 함(테스트만 통과).

## 기타
- 임시 처리 없음. prettier 실행 시 CRLF→LF 정규화가 있었으나 git diff상 내용 변경 없음(8개 파일만 실변경).

## Fix 1 (test-report Run 1: 승인자 드롭다운 잘림)
- 수정 파일: `frontend/src/components/leave/ApproverSelect.tsx` 1개만 (Modal 등 공통 컴포넌트 불변).
- 변경: 목록 `ul`의 `absolute z-10`와 래퍼의 `relative`를 제거해 in-flow 배치. 열릴 때 `scrollIntoView?.({block:'nearest'})`로 Modal 본문 스크롤 안에서 목록이 보이는 위치로 이동(jsdom은 해당 API가 없어 옵셔널 호출).
- 방식 선택 근거: (A) 열릴 때만 본문 클리핑 해제는 `<dialog>` 자체가 overflow 클립이고 본문 스크롤이 사라져 모바일에서 깨지므로 부적합, (B) 포털은 큰 구조 변경. 따라서 in-flow가 더 작음(1파일 약 8줄). 목록은 max-h-60 + 자체 스크롤 유지. ApproverSelect 사용처는 LeaveApplyModal뿐이라 다른 모달·승인 목록은 영향 없음.
- 접근성 유지: ARIA combobox/listbox, 방향키·Enter·Esc, 포커스 이동 시 닫힘(onBlur) 로직 불변.
- 검증: `tsc --noEmit` 통과, eslint(components/leave) 통과, vitest 전체 36파일/524건 통과.
- Playwright(관리자 900001, /auth/me approvalRequired=true를 route로 치환, tester와 동일 방식): PC 1280x720 목록 359-599(본문 88-599)로 240px 전체 표시, 모바일 360x640 목록 279-519(본문 80-519) 전체 표시. 외부(제목) 클릭 시 목록 닫힘 확인.
- 스크린샷: `screenshots/approver-dropdown-fix-pc.png`, `screenshots/approver-dropdown-fix-mobile.png`
- 문서 갱신 예정: 없음. 임시 처리·백엔드 수정: 없음. 개발 서버는 이미 기동 중이던 것을 그대로 사용(종료하지 않음).
