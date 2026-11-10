# design-frontend: 휴가 신청 공통 모달화 + 이력 상태·종류 토글 필터

## 참조 문서 (해당 섹션만)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2(신청 항목), §3.3(이력·필터), §4.1(신청), §5(검증 문구), §6(예외)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §3-4(휴가 현황 "휴가 신청 버튼")
- `docs/03_SCREEN_LIST.md` "Common UI Rules" → 모달, 목록(URL Query) / "화면 이동"
- `docs/09_DESIGN_SYSTEM.md` §3 컴포넌트(Modal, Radio), §3 "Page Header", §6 표(Modal, form.tsx, ApproverSelect, `StatusFilterButtons`)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md` 상태 필터 항목, 커밋 2a5c1b8(SCR-003 토글 구현)
- 이전 작업 `.claude/work/leave-request/design-frontend.md`(폼 검증·에러 매핑의 원래 결정)

## 화면
- **SCR-004 휴가 관리** · `/leaves` · 공통 — 탭 삭제
- **SCR-002 대시보드** · `/dashboard` · 공통 — 휴가 현황 카드의 신청 버튼만 변경
- **공통 휴가 신청 모달**(신규, SCR-004 §3.2 내용을 모달로) — 두 화면에서 같은 컴포넌트

## 1. 공통 휴가 신청 모달 `components/leave/LeaveApplyModal.tsx` (신규)
- props: `{ open: boolean; onClose: () => void; onApplied: (leave: Leave) => void; onBalanceStale?: () => void }`
- `Modal`(기존, 폭 420 고정, 수정 금지) 사용. 제목 `messages.leaves.apply.title`. 열 때마다 초기 상태가 되도록 사용처에서 `key`를 바꾸거나 닫을 때 상태 리셋
- 본문 = 기존 `LeaveApplyForm`의 `<form>`(Card 제거). 1열 배치, 시작일·종료일만 `sm:grid-cols-2`
- footer: [キャンセル] `textButtonClass`(onClose) / [申請する] `primaryButtonClass` + `type="submit" form={formId}` + 요청 중 `Spinner`·disabled (09 Modal: 우측 [취소(텍스트)][확인(채움)])
- 이동하는 로직(변경 없이 그대로): 클라이언트 검증·처음 오류 필드 focus, `submittingRef` 중복 방지, `SERVER_FIELD` 매핑, 서버 에러 처리(APPROVER_* → 승인자 재선택+후보 reload, 409/422 토스트, 422면 `onBalanceStale`), 성공 토스트 PENDING/APPROVED 구분
- 성공: 토스트 → `onApplied(leave)` → 사용처가 닫기. 요청 중 닫아도 응답 처리(토스트·onApplied)는 그대로 진행
- 승인자 후보 `GET /leaves/approvers`는 모달이 열려 있을 때만 조회(`open && approvalRequired`)
- `ApproverSelect` 드롭다운이 `<dialog>` 안에서 잘리지 않는지 확인(dialog 스크롤로 보이면 OK). 문제 있으면 보고만 하고 Modal은 고치지 않음

### 휴가 종류 라디오
- `<fieldset>` + `<legend className={labelClass}>`(「休暇の種類」) + `<input type="radio" name=... value=...>` 5개(`messages.leave.types` 순서, `LEAVE_TYPES`)
- 배치: `flex flex-wrap gap-x-5 gap-y-2`, 각 항목 `<label>`로 감싸 텍스트 클릭 가능. radio 크기 20px(`size-5`), 색 `accent-primary-100`, focus-visible outline은 기존 form 규칙과 같은 토큰. 새 토큰 금지
- 초기 선택 없음. 미선택 제출 시 기존 문구 `validation.leaveType`, `aria-invalid`·`aria-describedby`는 fieldset(또는 첫 radio)에 연결, focusFirst는 첫 radio
- 반차 선택 시 종료일 고정·비활성화, 종류 변경 시 leaveType·period 오류 해제는 기존 동작 그대로
- 공용 Radio 컴포넌트는 만들지 않음(사용처 1곳)

## 2. SCR-004 `/leaves` (`LeavesView.tsx`)
- 구성: Page Header(좌 `h1` 제목, 우 [休暇申請] `primaryButtonClass` 버튼, `sm` 미만에서는 제목 아래 전체 폭 가능) → 상단 요약 → `LeaveHistoryList` → `LeaveDetailModal` → `LeaveApplyModal`
- `Tabs` 사용 제거. `tab` 파라미터는 해석하지 않음(`?tab=apply`·`?tab=history`가 와도 이력 화면, URL 정리는 하지 않아도 됨)
- 이력 조회는 항상 수행(`tab === 'history'` 조건 제거)
- `onApplied`: 모달 닫기 + `balance.reload()` + `go({ year: 시작일 연도, statuses:[], leaveTypes:[], page:1 })`. 이동 결과 URL이 현재와 같으면 `history.reload()`도 호출해 새 신청이 보이게 함
- `onBalanceStale` = `balance.reload`

### 이력 필터 (`LeaveHistoryList.tsx`)
- 필터: 연도(기존 select 유지) / **상태 토글**(select 삭제, 4종 복수 선택) / **휴가 종류 토글**(신규, 5종 복수 선택). 누르는 즉시 URL 반영·1페이지. 선택 없음 = 전체
- 레이아웃: 세로로 연도 select(`max-w-xs`) → 상태 그룹 → 종류 그룹, 각 그룹은 `flex flex-wrap gap-2`(375px에서 줄바꿈, 가로 스크롤 없음). 안내 문구(「選択しない場合はすべて表示します。」 계열) 1개를 두 그룹 아래에 두고 두 그룹이 같은 id로 `aria-describedby`
- 기존 select `leaves-status` 삭제
- Empty 문구: 기존 "申請した休暇はありません。" 그대로(필터 유무 구분 안 함)

### 휴가 필터 토글 `components/leave/LeaveFilterButtons.tsx` (신규)
- 왜 신규: `StatusFilterButtons`는 근태 상태·문구·배지가 고정된 근태 전용. 근태 쪽은 수정하지 않음
- props(제네릭): `{ idPrefix: string; label: string; options: readonly T[]; optionLabel: (v: T) => string; variantOf: (v: T) => BadgeVariant; selected: T[]; onChange: (next: T[]) => void; describedBy?: string }`
- 동작·접근성은 `StatusFilterButtons`와 동일: `role="group"`+`aria-labelledby`, 각 `<button type="button" aria-pressed>`, 토글 후 `options` 순서로 정렬해 onChange, 선택 중 ✓(aria-hidden)
- 스타일: `StatusFilterButtons`의 buttonClass/selectedClass/unselectedClass와 같은 값(높이 40, radius 4, 선택 `general-100` 테두리+Bold, 미선택 투명 테두리 hover `general-50`), 배경은 `BADGE_VARIANT_CLASS[variantOf(v)]`. 새 토큰 금지
- 사용: 상태 = `LEAVE_STATUSES`, `messages.leave.statuses`, `LEAVE_STATUS_BADGE`(목록 배지와 같은 색) / 종류 = `LEAVE_TYPES`, `messages.leave.types`, 항상 `neutral`
- id: 상태 `leaves-status`, 종류 `leaves-leave-type` (idPrefix)

### URL Query (`lib/leave-days.ts`)
- `LeavesQuery` → `{ year, statuses: LeaveStatus[], leaveTypes: LeaveType[], page }`(`tab`·`LeavesTab` 삭제, 단일 `status` 삭제)
- URL 파라미터 이름은 `status`, `leaveType`(쉼표 구분, 예 `status=PENDING,APPROVED&leaveType=HALF_AM`)
- `parseLeavesQuery`: `date-range.ts` `parseStatuses`와 같은 방식 — split(',') 후 미지 값·중복 버리고 표시 순서로. 비면 `[]`(URL에 쓰지 않음)
- 기존 단일 값 URL(`?status=APPROVED`)은 1개 선택으로 그대로 복원(하위 호환)
- API: `/leaves/me?year&status=<join(',')>&leaveType=<join(',')>&page&limit=20`(빈 배열은 생략, `toQueryString`)
- 5종 배열은 `LEAVE_TYPES`(`readonly LeaveType[]`)로 `leave-days.ts`에 두고 모달·필터·파서가 공유(현재 `LeaveApplyForm`의 `Object.keys(messages.leave.types)` 대체)

## 3. SCR-002 대시보드 (`LeaveBalanceSection.tsx`)
- `<Link href="/leaves?tab=apply">` → `<button type="button">`(같은 클래스·문구 `t.apply`)로 `LeaveApplyModal` 열기
- `onApplied`: 모달 닫기 + `query.reload()`(휴가 현황). 화면 이동 없음. `onBalanceStale` = `query.reload`
- 모달 상태는 `LeaveBalanceSection` 안에서 관리(`DashboardView` 변경 불필요)

## 문구 (`messages/ja.ts`)
- 삭제: `leaves.tabsLabel`, `tabApply`, `tabHistory`(사용처 없어짐)
- 추가: `leaves.applyButton`(「休暇申請」), `leaves.apply.cancel`(「キャンセル」, `common`에 같은 의미 키가 있으면 재사용), 이력 필터 라벨 `leaves.history.leaveType`이 이미 표 헤더용으로 있으면 재사용, 필터 안내 `leaves.history.filterHint`(「選択しない場合はすべて表示します。」)
- 모든 표시 문구는 일본어, 하드코딩 금지

## 호출 API
| API | 용도 |
|---|---|
| POST /leaves | 신청(모달) |
| GET /leaves/approvers | 승인자 후보(모달 open 시) |
| GET /leaves/balance | 요약 / 대시보드 휴가 현황 reload |
| GET /leaves/me | 이력(`status` 쉼표 복수화, `leaveType` 쉼표 복수 추가, design-backend.md) |

## 생성·수정·삭제 파일 (`frontend/`)
신규
- `src/components/leave/LeaveApplyModal.tsx`, `src/components/leave/LeaveApplyModal.test.tsx`(기존 `LeaveApplyForm.test.tsx` 14건 이전 + 라디오·footer 케이스)
- `src/components/leave/LeaveFilterButtons.tsx`, `src/components/leave/LeaveFilterButtons.test.tsx`
삭제
- `src/app/(app)/leaves/LeaveApplyForm.tsx`, `LeaveApplyForm.test.tsx`
수정
- `src/app/(app)/leaves/LeavesView.tsx`(+ `.test.tsx`), `LeaveHistoryList.tsx`
- `src/app/(app)/dashboard/LeaveBalanceSection.tsx`, `DashboardView.test.tsx`(링크 기대값 → 모달 오픈)
- `src/lib/leave-days.ts`(+ `.test.ts`), `src/messages/ja.ts`
- `e2e/leaves.spec.ts`(`?tab=apply` 진입 → 버튼으로 모달 열기)
- `AppShell.test.tsx`의 `/leaves?tab=apply`는 리다이렉트 예시 문자열일 뿐이므로 수정하지 않음

재사용: `components/attendance/StatusFilterButtons.tsx`(토글 구현·스타일 참고, 수정 금지), `components/Badge.tsx`(`BADGE_VARIANT_CLASS`), `components/Modal.tsx`, `form.tsx`(labelClass/inputClass/textareaClass/primaryButtonClass/textButtonClass/selectClass/FieldError), `leave/ApproverSelect.tsx`, `Spinner`, `Toast`, `lib/leave-days.ts`, `lib/date-range.ts`(`toQueryString`), `leave/LeaveDetailModal.tsx`(모달 footer 구성 참고)

## 문서 갱신 예정
- SCR-004: §1 URL(탭 삭제), §3 구성(Page Header 버튼, 탭 2 → 이력 섹션), §3.2 → 공통 휴가 신청 모달(종류 Radio), §3.3 필터(상태 select → 복수 선택 토글, 휴가 종류 토글 추가, URL Query 쉼표 구분), §4.1 성공 후 동작(모달 닫기·요약·이력 재조회)
- SCR-002 §3-4: 휴가 신청 버튼 → 공통 휴가 신청 모달, 성공 시 휴가 현황 재조회
- 03_SCREEN_LIST: SCR-004 행 설명, Common UI Rules "모달"에 휴가 신청 모달 공통 사용, "화면 이동"의 `/leaves?tab=apply` 줄을 모달로
- 09 §6: `LeaveApplyModal`(props, Modal 사용, 라디오 스타일), `LeaveFilterButtons`(props, StatusFilterButtons와 같은 스타일, 종류는 neutral), SCR-004 §4 행의 탭 언급
- 08 SCR-004 행: 모달 신청·라디오·상태/종류 토글 필터
- 10_DEVELOPMENT_ROADMAP 해당 항목
