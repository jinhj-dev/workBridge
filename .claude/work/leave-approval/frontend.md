# frontend: 휴가 승인 (SCR-005) + 사이드바 승인 대기 배지

## 파일
신규 (frontend/)
- `src/app/(app)/leaves/approvals/page.tsx`, `ApprovalsView.tsx`, `ApprovalsView.test.tsx`
- `src/components/Tabs.tsx`, `Tabs.test.tsx`
- `src/components/layout/PendingApprovalCount.tsx`
- `e2e/approvals.spec.ts` (관리자: 메뉴 이동 → 탭 전환 `?scope=all`. 데이터 생성 없음, **미실행**: 개발 서버·DB·E2E 비밀번호 환경 없음)
수정
- `src/components/leave/LeaveDetailModal.tsx` (+test): `initialStep` prop, 표시 step = `canProcess ? step : 'detail'`, 확인/사유 [취소]는 initialStep이 detail이면 상세로, 아니면 닫기, 409 ALREADY_PROCESSED는 `messages.leave.alreadyProcessed`
- `src/components/layout/AppShell.tsx` (+test): 가드 통과 후 부분을 `PendingApprovalCountProvider`로 감싸고 내부 `ShellLayout`으로 분리, 고정 사이드바·드로어에 `pendingApprovalCount` 전달(조회 1회)
- `src/components/layout/Sidebar.tsx`: `pendingApprovalCount` prop, 카운터 배지
- `src/app/(app)/dashboard/PendingApprovalsSection.tsx`: 처리 후 `refresh()` 호출
- `src/messages/ja.ts`: `approvals.*`, `leave.alreadyProcessed`, `nav.pendingCount(n)`

## 구현한 화면 / 사용 시스템 컴포넌트
- SCR-005 휴가 승인 `/leaves/approvals` (ADMIN `?scope=all`): Card, Tabs(신규), Pagination, SectionError, SkeletonLines, `table.ts`, form 버튼 클래스, LeaveDetailModal(Modal/Badge 경유)
- 03 전역 내비게이션 배지: SidebarNav 카운터(높이 16·`rounded-full`·`bg-general-100`·`text-xs/4`, 99+, 0건·실패 시 숨김, `sr-only` 문구)
- URL Query: `parseApprovalsQuery(params, isAdmin)` (ApprovalsView에서 export). scope=all은 ADMIN만, page는 1 이상 정수 외엔 1. 비관리자는 항상 mine 호출
- 배지 갱신 시점: 셸 표시 시 / pathname 변경 시 / `refresh()`(승인·반려·대시보드 처리 후). 재조회 중 직전 값 유지, 늦은 응답 무시, 실패 시 null(토스트 없음)

## 새로 만든 시스템 컴포넌트
- `components/Tabs.tsx` `Tabs({label, items:{value,label}[], value, onChange})`
- `components/layout/PendingApprovalCount.tsx` `PendingApprovalCountProvider`, `usePendingApprovalCount()` (Provider 밖에서는 `{count:null, refresh:noop}`)

## 화면 리스트와 다른 점
- 없음. 용어는 기존 ja.ts에 맞춰 반려=「却下」, 승인자 열 표시명 「承認者」, 탭 「自分への依頼」「すべての承認待ち」 사용(문구 사전 신규 키).
- 행 [승인][반려]는 상세를 조회한 뒤 확인/사유 단계로 열린다(조회 중에는 상세 스켈레톤, 이미 처리됐으면 상세 표시).

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: Tabs(horizontal, `role=tablist/tab`, `aria-selected`, 선택 탭만 tabIndex 0, ←/→ 이동·선택·순환, 활성 `primary-100` 글자+하단 2px, 구분선 `general-40`, 토큰만 사용) / PendingApprovalCount(Provider·훅) / SidebarNav `pendingApprovalCount` prop·카운터 배지 스타일 / LeaveDetailModal `initialStep` prop
- `docs/04_.../SCR-005_LEAVE_APPROVAL.md`: 좁은 폭(md 미만) 카드 목록 + 하단 버튼 3개, URL Query 해석 규칙, 본인 신청 [승인][반려] 비활성, 행 버튼이 확인 단계로 직접 열림
- `docs/04_.../SCR-002`: 409 문구를 SCR-005와 통일(`すでに処理された申請です。一覧を更新します。`)
- `docs/03_SCREEN_LIST.md` 전역 내비게이션: 배지 갱신 시점·0건 숨김·99+·실패 시 숨김
- `docs/10_DEVELOPMENT_ROADMAP.md` §7 프론트 2항목: 검증 후 갱신(E2E 미실행 명시)

## impeccable 점검 후 고친 점
- Operate 모드로 기존 패턴 유지. 처리 열 버튼은 SCR-008과 같은 높이 36, 본인 행은 disabled 색(`primary-60`/`general-60`)으로 구분. Tabs는 모바일에서 가로 스크롤 가능(`overflow-x-auto`), focus 링크는 `-outline-offset`으로 잘림 방지. 배지는 색에만 의존하지 않도록 `sr-only` 문구 제공. 설계상 하드코딩 색·px 없음(토큰 클래스만)

## 화면 확인
- 생략 (브라우저 도구 없음)

## 검증
- `npx tsc --noEmit` 통과, `npm run lint` 통과, `npm run build` 통과(`/leaves/approvals` 포함), `npx vitest run` 16 파일 228 테스트 통과
- Playwright 미실행

## 임시 처리·백엔드 요청
- 없음. 참고: `npx prettier --write`로 범위를 넓히면 무관한 테스트 파일 2개가 바뀌어 되돌렸다(변경 파일은 위 목록뿐).

## Fix 1
- 대상: review.md 중간 1건(frontend) — ApprovalsView 본인 신청 행의 비활성 버튼 스타일(09 §6)
- `leaves/approvals/ApprovalsView.tsx`: approveButtonClass에 `disabled:bg-primary-60 disabled:hover:bg-primary-60` 추가, [반려]에 `disabled:hover:bg-white` 추가(AttendanceSection과 같은 패턴)
- 검증: `npx tsc --noEmit` 통과, eslint(leaves 하위) 통과
