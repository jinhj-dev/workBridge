# design-frontend: 휴가 승인 (SCR-005) + 사이드바 승인 대기 배지

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md` 전체(§3 화면 구성, §4 조회 조건, §5~7 상세·승인·반려, §8 검증, §10 상태 처리)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §4.4 휴가 상세 모달
- `docs/03_SCREEN_LIST.md` → "Common UI Rules"(인증 및 권한 처리, 상태 처리, 목록, 모달, 전역 내비게이션 표의 "휴가 승인" 행)
- `docs/09_DESIGN_SYSTEM.md` §2(카운터 배지 색: 배경 General 100 + 흰 텍스트, Text 4 12/16), §3 "컴포넌트"(Tabs horizontal, Counter 16px 원형), §6 구현된 공용 컴포넌트
- API 계약: `design-backend.md` 계약 요약

## 화면
| ID | 화면명 | 라우트 |
|---|---|---|
| SCR-005 | 휴가 승인 | /leaves/approvals (ADMIN 전체 보기 `?scope=all`) |

## SCR-005 구성
페이지 제목(`text-h5`, `messages.nav.approvals`와 같은 문구) → [ADMIN만] `Tabs`(보기 전환) → `Card`(목록).

### 보기 전환 (ADMIN만)
- `Tabs` 항목: 내게 할당된 요청(`mine`, 기본) / 전체 승인 대기(`all`)
- 전환 시 `router.push('/leaves/approvals?scope=all')`(mine은 scope 생략 가능), page는 1로
- EMPLOYEE: Tabs를 렌더링하지 않고 항상 `scope=mine`으로 API 호출

### URL Query 해석 (`ApprovalsView` 안의 순수 함수)
- `scope`: ADMIN이고 값이 `all`일 때만 all, 그 외(없음·잘못된 값·비관리자) mine
- `page`: 1 이상 정수가 아니면 1
- API 경로: `/leaves/pending-approval?scope=${scope}&page=${page}&limit=20`

### 목록 (`Card`, md 이상 표 / md 미만 카드 목록)
- 표: `table.ts`의 `thClass`·`tdClass`, `<th scope="col">`. 컬럼은 SCR-005 §3 순서: 신청자 / 부서 / 휴가 종류 / 기간 / 일수(우측 정렬) / 승인자(scope=all만) / 신청일 / 처리
- 표시 형식: `formatPeriod`, `formatDays`, `formatTokyoDate`(createdAt), 부서·승인자 없음은 `messages.common.noValue`, 종류는 `messages.leave.types`
- 처리 열: [상세](secondary) [승인](primary) [반려](secondary), 높이 36·`text-sm/5`(SCR-008 `smallButtonClass`와 같은 크기). 각 버튼 `aria-label`에 신청자 이름 포함(예: `${name}さんの休暇を承認`)
- 본인 신청 행(`leave.user.id === me.id`, scope=all에서 발생): [승인][반려] `disabled`. [상세]는 사용 가능
- md 미만: `PendingApprovalsSection`의 카드 목록 구조 + 하단에 같은 버튼 3개(scope=all이면 승인자 줄 추가)
- `Pagination`(20건). 항목 0건이면 Empty 문구, `totalCount > 0`인데 0건(범위 밖 페이지)이면 SCR-008처럼 Pagination도 표시
- Empty: mine "승인 대기 중인 요청이 없습니다." / all "전체 승인 대기 요청이 없습니다."(SCR-005 §10)
- Loading `SkeletonLines`, 조회 실패 `SectionError onRetry={reload}`

### 상세·승인·반려
- 상태: `selected: { id: string; step: 'detail' | 'approve' | 'reject' } | null`
- [상세] → `step:'detail'`, [승인] → `'approve'`, [반려] → `'reject'`로 `LeaveDetailModal` 오픈
- `onProcessed`: 목록 `reload()` + 배지 `refresh()`

## 기존 컴포넌트 수정
### `components/leave/LeaveDetailModal.tsx`
- prop 추가: `initialStep?: 'detail' | 'approve' | 'reject'`(기본 `'detail'`). 열릴 때(leaveId가 바뀔 때) step을 initialStep으로 시작. 기존 사용처(대시보드)는 변경 없이 동작해야 함 — 호출측에서 `key`로 리셋해도 됨
- 표시 step = `canProcess ? step : 'detail'` (조회해 보니 이미 처리됐거나 권한이 없으면 확인 단계 대신 상세를 보여줌)
- 확인/사유 단계의 [취소]: initialStep이 `'detail'`이면 상세로 돌아가고, 그 외에는 모달을 닫음
- 409 `ALREADY_PROCESSED`: 서버 message 대신 신규 문구 `messages.leave.alreadyProcessed`(SCR-005 §10 "이미 처리된 요청입니다. 목록을 새로고침합니다." 의미) 토스트 → 닫고 `onProcessed`. 403은 기존 `t.forbidden`, 404는 기존대로 서버 message
- 기존 동작(검증, 중복 제출 방지, 403/404 조회 실패 시 닫기)은 그대로

### `components/layout/AppShell.tsx` + `Sidebar.tsx` (배지)
- 신규 `components/layout/PendingApprovalCount.tsx`: `PendingApprovalCountProvider`, `usePendingApprovalCount(): { count: number | null; refresh: () => void }`
  - Provider 밖에서 호출하면 `{ count: null, refresh: () => {} }`(기존 화면 단독 테스트가 깨지지 않게)
  - `apiFetch<Paginated<Leave>>('/leaves/pending-approval?scope=mine&limit=1')` → `totalCount`. 셸 표시 시, `pathname` 변경 시, `refresh()` 시 조회. 재조회 중에는 직전 값 유지(깜빡임 방지), 늦게 온 이전 응답은 무시
  - 실패(ApiError·NetworkError): count=null(배지 숨김), 토스트 없음. 그 외 예외는 다시 throw
- AppShell: 인증·가드 통과 후 렌더링하는 부분만 Provider로 감싸고 `SidebarNav`에 `pendingApprovalCount` 전달(사이드바·드로어 2곳, 조회는 1회)
- SidebarNav: prop `pendingApprovalCount?: number | null`. `/leaves/approvals` 항목에서 값 > 0이면 우측에 카운터 표시(100 이상 "99+"). 스타일: 높이 16·최소 폭 16·`rounded-full`·`bg-general-100 text-white text-xs/4 tabular-nums`(09 §2). 숫자는 `aria-hidden`, 링크 이름에는 `sr-only`로 `messages.nav.pendingCount(n)` 추가
- `dashboard/PendingApprovalsSection.tsx`: `handleProcessed`에서 `usePendingApprovalCount().refresh()`도 호출

## 신규 시스템 컴포넌트
- `components/Tabs.tsx` `Tabs({ label, items: { value: string; label: string }[], value, onChange })` — 09 §3 Tabs horizontal(활성: `primary-100` 글자 + 하단 2px 라인, 비활성 `general-80`, 하단 구분선 `general-40`). 이유: 09 §6에 없음, SCR-004(신청/이력 탭)에서도 재사용 예정
  - 접근성: `role="tablist"` + `aria-label`, 각 `role="tab"` `aria-selected`, 선택된 탭만 `tabIndex=0`, ←/→로 이동·선택, focus-visible outline `primary-100`. 목록 영역은 호출측에서 `role="tabpanel"`로 연결하지 않아도 됨(보기 전환 필터 용도) — 단순하게 유지

## 문구 (`messages/ja.ts`, 일본어. 키만 지정, 의미는 SCR-005)
- `approvals`: title, scopeLabel, scopeMine, scopeAll, listTitle, emptyMine, emptyAll, 컬럼(applicant, department, leaveType, period, days, approver, createdAt, actions), detail, approve, reject, 버튼 aria-label 함수 3개(name)
- `leave.alreadyProcessed`, `nav.pendingCount(n)`
- 기존 재사용: `messages.leave.*`(종류·확인·반려 검증·성공 토스트), `messages.common.noValue`

## 파일
신규
- `frontend/src/app/(app)/leaves/approvals/page.tsx`(metadata, `Suspense` — `admin/attendance/page.tsx`와 같은 형태)
- `frontend/src/app/(app)/leaves/approvals/ApprovalsView.tsx`
- `frontend/src/app/(app)/leaves/approvals/ApprovalsView.test.tsx`
- `frontend/src/components/Tabs.tsx`, `Tabs.test.tsx`
- `frontend/src/components/layout/PendingApprovalCount.tsx`
- `frontend/e2e/approvals.spec.ts`
수정
- `frontend/src/components/leave/LeaveDetailModal.tsx`, `LeaveDetailModal.test.tsx`
- `frontend/src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `AppShell.test.tsx`(apiFetch mock 추가 필요 — 현재 mock 없음)
- `frontend/src/app/(app)/dashboard/PendingApprovalsSection.tsx`
- `frontend/src/messages/ja.ts`

재사용 참고: `dashboard/PendingApprovalsSection.tsx`(표·카드 목록), `admin/attendance/AdminAttendanceView.tsx`(URL Query·Pagination·범위 밖 페이지), `lib/api/useApiQuery.ts`, `components/Pagination.tsx`, `components/table.ts`, `components/form.tsx`

## 문서 갱신 예정 (frontend.md에 실제 결과로 기록)
- SCR-005: 좁은 폭 카드 목록, URL Query 해석 규칙, 본인 신청 버튼 비활성, 행 [승인][반려]가 상세 조회 후 확인 단계로 열림
- SCR-002 §상태 처리 409 ALREADY_PROCESSED 문구를 SCR-005와 통일
- 03 전역 내비게이션: 배지 갱신 시점·0건 숨김·99+·실패 시 숨김
- 09 §6: `Tabs`, `PendingApprovalCount`, SidebarNav·LeaveDetailModal 변경 prop
- 10 로드맵 §7 프론트 2항목
