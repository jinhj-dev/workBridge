# design-frontend — modal-refactor

## 0. 공통

### 참조 문서 (해당 섹션만 읽을 것)
- `docs/UI_MODAL_PATTERNS.md` v3 — §1 공통 구조, §2·§2.1 유형·아이콘, §3 유형별 패턴, §4 컴포넌트(§4.2 Modal / §4.3 클래스 / §4.4 FieldHint·CharCount / §4.5 ReadOnlySummary / §4.6 ConfirmDialog / §4.7 FormModal), §5 토큰·금지, §7 접근성
- `docs/UI_MODAL_REFACTOR_PLAN.md` §1(모달별 변경 대상), §2(단계), §3(위험 R1~R10), §4(디자인/동작/로직 경계)
- `docs/UI_MODAL_AUDIT.md` §3(Modal 실측·닫기 경로), §4 해당 모달 절
- 시안: `.claude/work/modal-audit/mockups/build.mjs:74-94`(외형 ①' CSS), `build-d7.mjs:47-64`(ReadOnlySummary·FormTable), `build-d8.mjs`(아웃라인 취소·빨간 위험 버튼), `compare-*.png`
- `docs/09_DESIGN_SYSTEM.md` §3 Button·Modal, §6 Modal·form 행(현행 확인용. 이번에 수정하지 않음)
- 확정 결정: `.claude/work/modal-audit/decisions.md`(D1~D15), 이번 권장안: `plan.md` "사용자 부재로 권장안 적용" 표(U1~U4, R10, A1~A10)

### 전 청크 공통 규칙
- **비즈니스 로직 무변경**: API 호출·요청 본문, 검증 규칙(글자 수 계산 포함, L1), 오류 코드별 처리, 권한 판정, 페이지·검색, `submittingRef` 등 중복 제출 방지 로직은 그대로 둔다. 바꾸는 것은 마크업·클래스·aria·포커스·busy뿐.
- UI 문구는 `messages/ja.ts`만(하드코딩 금지), 코드 주석은 일본어.
- 기존 테스트가 깨지면 testing-rules §10: 의도한 변경(외형·초기 포커스·busy)에 의한 것만 단정을 고치고, 그 이유를 frontend.md에 적는다. 그 외 실패는 코드 쪽을 고친다.
- 청크마다: `cd frontend && npx tsc --noEmit && npm run lint` + 해당 단위 테스트 통과 후 커밋(일본어 커밋 메시지, 예: `refactor: Modalにdescription・busy・data-autofocusを追加`).
- 각 청크의 frontend.md에 "문서 갱신 예정"(09·명세에 반영할 사실)을 누적 기록. 8단계 architect가 그것만 반영한다.
- 스크린샷(PNG)은 `.claude/work/modal-refactor/screenshots/{before,after}/` (git 관리 외). 절차는 test-plan.md §4.

### 대상 모달 (AUDIT §2)
| ID | 파일 | 아이콘(C3에서 지정) |
|---|---|---|
| M01 部署登録/編集 | `frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx` | `BuildingIcon`(`./icons`) |
| M02 部署詳細 | `.../admin/departments/DepartmentDetailModal.tsx` | `BuildingIcon`(`./icons`) |
| M03 所属社員確認 | `.../admin/departments/DepartmentMembersModal.tsx` | `PeopleIcon`(기존) |
| M04 部署の削除 | `.../admin/departments/DepartmentDeleteModal.tsx` | `TrashIcon`(`./icons`) |
| M05 休暇申請 | `frontend/src/components/leave/LeaveApplyModal.tsx` | `CalendarIcon`(기존) |
| M06 休暇詳細(+承認·却下·取消) | `frontend/src/components/leave/LeaveDetailModal.tsx` | `CalendarIcon`(기존, 단계 간 유지) |
| M07 날짜별 휴가자 | `frontend/src/components/leave/LeaveDayModal.tsx` | `CalendarIcon`(`@/components/CalendarIcon`) |
| M08 勤怠の修正 | `frontend/src/app/(app)/admin/attendance/AttendanceEditModal.tsx` | `ClockIcon`(`@/components/layout/navIcons`, 사이드바 全体勤怠管理와 같은 자산) |
| M09 出勤/退勤の登録 | `frontend/src/app/(app)/dashboard/AttendanceSection.tsx:225-254` | `EnterIcon`/`ExitIcon`(`./icons`) |

아이콘은 새로 만들지 않는다(A8). `Modal` 아이콘 박스의 `[&>svg]:size-6`이 크기를 정한다.

---

## C1. 공통 기반 가산 (REFACTOR_PLAN 단계 1) — 기존 화면 무변경

### 대상 파일
- 수정: `frontend/src/components/Modal.tsx`, `frontend/src/components/form.tsx`, `frontend/src/components/Select.tsx`, `frontend/src/messages/ja.ts`(`common.charCount`만)
- 신규: `frontend/src/components/ReadOnlySummary.tsx`, `ReadOnlySummary.test.tsx`, `frontend/src/components/form.test.tsx`(FieldHint·CharCount·클래스)
- 테스트 수정: `frontend/src/components/Modal.test.tsx`(단정 추가만), `Select.test.tsx`(autoFocus 1건)

### 내용
1. `Modal` (PATTERNS §4.2)
   - `description?: ReactNode`: 제목 아래 `<p id={descId}>`(id는 `useId()`), 있을 때만 dialog에 `aria-describedby={descId}`. 스타일 `mt-2 text-sm/5 text-general-80 sm:text-base/6`. `subtitle`이 같이 있으면 description 아래.
   - `busy?: boolean`:
     ① dialog `onCancel`(Esc)에서 `busy`면 `e.preventDefault()`.
     ② `onClose`(close 이벤트)에서 최신 `busy`·`open`을 **ref로** 읽어, `busy && open`이면 `onClose`를 부르지 않고 `dialog.showModal()`로 재오픈(Chrome close watcher 연속 Esc 안전망). 호출부가 `open=false`로 닫은 경우(같은 렌더에서 busy가 아직 true여도)는 재오픈하지 않는다. busy가 아니면 현행대로 `onClose()`.
     ③ X 버튼 `disabled={busy}` + `disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-transparent`.
   - 초기 포커스: `showModal()` 직후 `dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()`. 없으면 브라우저 기본.
   - 이 청크에서는 `variant`·`icon?`·외형 클래스는 **그대로**(C3에서 변경).
2. `form.tsx` (PATTERNS §4.3·§4.4)
   - `modalSecondaryButtonClass` = `${secondaryButtonClass} flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-white`
   - 신규 `modalDangerButtonClass` = `rounded-lg bg-danger-100 font-bold text-white hover:bg-danger-100/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-100 flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:bg-danger-100/50`
   - 신규 `confirmMessageClass = 'break-words text-general-100'`
   - 신규 `FieldHint({ id?, children })` → `<p id className="mt-1 text-xs/4 text-general-80">`
   - 신규 `CharCount({ id, length, max, error? })`: `<div className="flex items-start justify-between gap-3"><div>{error}</div><p id className="mt-1 shrink-0 text-sm/5 tabular-nums ...">` — `length > max`면 `font-medium text-danger-100`, 아니면 `text-general-80`. 표시 문구 `messages.common.charCount(length, max)`(=`${n}/${max}`, R10). `length`는 호출부가 계산(L1 유지). `error`는 `FieldError` 요소(ReactNode).
3. `ReadOnlySummary.tsx` (PATTERNS §4.5): `ReadOnlySummary({ children, className? })` → `<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-general-30 px-5 py-4 text-sm/5 ...">`, `ReadOnlySummaryItem({ label, children })` → Fragment(`<dt className="text-general-80">` + `<dd className="min-w-0 wrap-anywhere text-general-100">`). `DetailTable.tsx`의 export 형태를 따른다.
4. `Select.tsx`: `autoFocus?: boolean` 추가 → 네이티브 `<select>`에 `data-autofocus={autoFocus ? '' : undefined}`(A5). React `autoFocus`는 쓰지 않는다(열리기 전 커밋되어 무효).

### 완료 조건
- 기존 모든 화면의 렌더 결과가 동일(예외: 기존 disabled secondary(M06·M09 제출 중)가 비활성 모양으로 바뀜 — 결함 수정, 의도).
- `Modal.test.tsx` 신규 단정: describedby, busy 시 X disabled, `cancel` 이벤트 `defaultPrevented`, busy 중 `close` 이벤트 후 open 유지·`onClose` 미호출, busy 아님 시 `close`→`onClose` 1회, open=false로 닫을 때 재오픈 없음, `[data-autofocus]` 포커스. 기존 단정 6개 무수정 통과.
- `ReadOnlySummary.test.tsx`, `form.test.tsx`, `Select.test.tsx` 통과. tsc·lint 통과.

---

## C2. ConfirmDialog + 단계형 확인 (단계 2) — M09 → M04 → M06·M08 확인 단계

### 대상 파일
- 신규: `frontend/src/components/ConfirmDialog.tsx`, `ConfirmDialog.test.tsx`
- 수정: `AttendanceSection.tsx`(M09), `DepartmentDeleteModal.tsx`(M04), `LeaveDetailModal.tsx`(M06 approve·cancel·reject 단계), `AttendanceEditModal.tsx`(M08 확인 단계 + 로컬 버튼 클래스)
- 테스트: `DashboardView.test.tsx`, `DepartmentsView.test.tsx`, `LeaveDetailModal.test.tsx`, `AttendanceEditModal.test.tsx`

### 내용
1. `ConfirmDialog` (PATTERNS §4.6): props `open, icon, title, message, notice?, confirmLabel, cancelLabel?(기본 messages.common.cancel), tone?('primary'|'danger', 기본 primary), submitting, onConfirm, onClose`.
   - 내부 `Modal size="md" busy={submitting}`. 본문 `<div className="flex flex-col gap-4">`(값은 `build-d8.mjs` delete 시안 기준으로 확인, 시안 값이 다르면 시안을 따름) 안에 `<p className={confirmMessageClass}>{message}</p>` + `notice`가 있으면 `<Notice variant="warning">`.
   - footer: [cancel] `modalSecondaryButtonClass`, `disabled={submitting}`, `onClick={onClose}` / [confirm] tone별 `modalDangerButtonClass`|`modalPrimaryButtonClass`, `disabled={submitting}`, `{submitting && <Spinner/>}`.
   - 초기 포커스: danger → [cancel]에 `data-autofocus`, primary → [confirm]에 `data-autofocus`.
2. M09: 인라인 `Modal` → `ConfirmDialog`. `icon` = pending이 clockIn이면 `EnterIcon`, clockOut이면 `ExitIcon`. `onClose`는 기존 가드(`submittingRef.current`면 무시) 그대로, `submitting`·`pending`·409 재조회·`onClocked`는 호출부 유지. [キャンセル] 클릭도 같은 `onClose`를 거침(제출 중엔 disabled라 동작 동일).
3. M04: `ConfirmDialog tone="danger" icon={<TrashIcon/>} message={t.confirm(name)} notice={inactiveMemberCount>0 ? t.inactiveNote(n) : undefined} confirmLabel={t.submit}`. 로컬 `buttonClass`·`primaryButtonClass`/`secondaryButtonClass` import 제거. 동작 변경: 제출 중 [キャンセル] disabled, 초기 포커스 [キャンセル].
4. M06 (단계형 확인, 부모 `Modal`): `busy={submitting}`. approve·cancel 본문 `<p className={confirmMessageClass}>`.
   - approve 단계: [承認する]에 `data-autofocus` + `autoFocus`(열린 상태에서 detail→approve 전환 시 React autoFocus가, initialStep='approve'로 열릴 때 data-autofocus가 작동).
   - cancel(取消 확정) 단계: 제출 버튼 `modalDangerButtonClass`(A3), [戻る]에 `data-autofocus` + `autoFocus`.
   - reject 단계: textarea에 `data-autofocus` 추가(기존 `autoFocus` 유지). 레이아웃·CharCount는 C5.
5. M08 확인 단계: `busy={submitting}`, 본문 `<p className={confirmMessageClass}>`, [修正する]에 `data-autofocus` + `autoFocus`. 로컬 `buttonClass`/`subButtonClass`/`submitButtonClass` → `modalSecondaryButtonClass`/`modalPrimaryButtonClass`(값 동일).

### 완료 조건
- 위 4개 View/모달 테스트 + `ConfirmDialog.test.tsx` 통과. `queryByRole('dialog')` 계열 단정이 여전히 의미 있음(role `dialog` 유지).
- M04 제출 중 [キャンセル] disabled 단정 신규, M09 제출 중 Esc(cancel 이벤트) 무시 단정 신규.
- 과도기 차이(확인 모달만 아이콘 존재)는 C3에서 해소되므로 기록만.

---

## C3. 외형 ①' + footer 개수별 배치 + 제목 아이콘 (단계 3) — 9개 모달 전부

### 대상 파일
- 수정: `Modal.tsx`, `Modal.test.tsx`, 9개 모달 파일(아이콘 지정·`variant` 제거), `ConfirmDialog.tsx`(필요 시)
- 테스트: 모달 관련 단위 테스트 전체(외형 단정이 있는 곳만 조정)

### 내용 (PATTERNS §4.2 외형표, 시안 `build.mjs:74-94`)
- `variant` prop 삭제, `icon: ReactNode` **필수**. `compact = size === 'md'`.
- dialog: `w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] rounded-2xl shadow-card-soft` + 기존 `m-auto max-h-[calc(100dvh-2rem)] ${SIZE_CLASS} flex-col bg-white p-0 text-general-100 backdrop:bg-general-100/50 open:flex`.
- Header: `px-5 pt-5` + compact `sm:px-7 sm:pt-7` / 그 외 `sm:px-8 sm:pt-8`. 아이콘 박스는 현행(`size-10 rounded-md bg-primary-30 text-primary-100`, I-4·I-5).
- 제목: compact `text-h6 font-bold` / 그 외 `text-h6 font-bold sm:text-h5`(`text-xl/7` 제거).
- subtitle: `mt-1` 무스타일로 단일화(form용 설명문 스타일은 description으로 이관됨).
- Body: compact `mt-4 px-5 sm:px-7` / 그 외 `mt-6 px-5 sm:px-8`, `min-h-0 flex-1 overflow-y-auto text-base/6 text-general-80` 유지.
- Footer 바깥: `shrink-0 px-5 pt-6 pb-5` + compact `sm:px-7 sm:pb-7` / 그 외 `sm:px-8 sm:pb-8`.
- Footer 안쪽(D4, A1 — DOM 자식 수를 CSS로 판정): `grid grid-cols-2 gap-3 has-[>:only-child]:grid-cols-1 has-[>:nth-child(3)]:flex has-[>:nth-child(3)]:flex-wrap has-[>:nth-child(3)]:justify-end sm:flex sm:flex-wrap sm:justify-end sm:border-t sm:border-general-40 sm:pt-5`. (Tailwind 4 arbitrary `has-[]` 변형이 기대대로 생성되는지 빌드 결과 CSS 또는 브라우저로 확인. 안 되면 대안을 frontend.md에 적고 진행)
- 호출부:
  - M01: `variant="form"` 제거, `subtitle` → `description`, `icon={<BuildingIcon/>}`(배치·size는 C4).
  - M02: `icon={<BuildingIcon/>}`. 히어로 아이콘 유지(U1).
  - M07: `icon={<CalendarIcon/>}`. M08: `icon={<ClockIcon/>}`(navIcons).
  - M03·M05·M06·M04·M09: 기존/C2 아이콘 유지.
- `Modal.test.tsx`(R3): helper에 `icon` 기본값 추가, "plain"(아이콘 없음) 단정 삭제, footer `border-t` → `sm:border-t` 단정으로 변경, 폭(`max-w-*`) 단정은 그대로 유효. 변경 사유를 frontend.md에 "D1·D6 외형 방침 변경에 따른 단정 변경"으로 기록.

### 완료 조건
- tsc(아이콘 필수화로 누락 시 컴파일 오류 → 0건), lint, 모달 관련 단위 테스트 전체 통과.
- 9개 모달 after 스크린샷(360/768/1024/1440) 저장, before와 대비해 차이가 외형 ①'·아이콘·footer 배치뿐임을 frontend.md에 표로 기록(사용자 확인 대상, A9).

---

## C4. FormModal (단계 4) — M05 → M01 → M08

### 대상 파일
- 신규: `frontend/src/components/FormModal.tsx`, `FormModal.test.tsx`
- 수정: `LeaveApplyModal.tsx`(M05), `DepartmentFormModal.tsx`(M01), `AttendanceEditModal.tsx`(M08), `messages/ja.ts`(R10 문구 3개)
- 테스트: `LeaveApplyModal.test.tsx`, `LeaveManagementLayout.test.tsx`, `DepartmentFormModal.test.tsx`, `AttendanceEditModal.test.tsx`, `AdminAttendanceView.test.tsx`

### FormModal (PATTERNS §4.7, D14 최소)
- props: `open, title, onClose, icon, description(필수), size?(기본 'lg'), onSubmit(e: FormEvent<HTMLFormElement>), submitLabel, cancelLabel?(기본 messages.common.cancel), submitting, children`.
- `Modal busy={submitting}` + `<form id={useId()} noValidate onSubmit className="flex flex-col gap-6">{children}</form>` + footer [cancel](`modalSecondaryButtonClass`, `disabled={submitting}`(A2), `onClick={onClose}`) [submit](`type="submit" form={id}`, `modalPrimaryButtonClass`, disabled+Spinner). footer 덮어쓰기·Notice 슬롯 prop 없음.

### M05 (기준 배치, 변경 최소)
- `Modal` → `FormModal`(icon `CalendarIcon`, description `t.description`「新しい休暇を申請します。」, submitLabel `t.submit`). 기존 `formId`·footer 제거. `handleSubmit` 그대로.
- 理由 textarea `placeholder={t.reasonPlaceholder}`「休暇の理由を入力してください」. 날짜·Select는 기본 표시.
- 申請日数(U2): 회색 박스 → `<div aria-live="polite" aria-labelledby=... className="flex min-h-12 items-center text-base/6 font-bold text-general-100 tabular-nums">`.
- 일수 힌트 → `<FieldHint id={`${baseId}-days-hint`}>`, D13(A4): 開始日·終了日 입력 `aria-describedby`에 힌트 id 추가(오류 id가 있으면 함께, 공백 구분).
- 理由 카운터 → `<CharCount id={`${ids.reason}-count`} length={reasonLength} max={REASON_MAX} error={errors.reason && <FieldError .../>} />`. `t.count`가 미사용이 되면 `ja.ts`에서 제거.
- 休暇種別 `Select`에 `autoFocus`(A5).
- 승인자 자동 승인 안내(`t.autoApprove`)는 현행 유지(값 칸 일반 문단).

### M01 (배치 전면)
- `Modal` → `FormModal`(size lg(기본), icon `BuildingIcon`, description `editDescription|createDescription`, submitLabel `save|create`, onSubmit `(e) => void handleSubmit(e)`). `FORM_ID`, `cancelButtonClass`, 로컬 `buttonClass`, `primaryButtonClass` import 제거.
- `FormRow` 4개 → `<FormTable>` + `FormTableRow`(部署コード required / 部署名 required / 責任者 / 説明). 입력 id·aria 연결은 그대로. required 행 입력에 `aria-required="true"`가 없으면 추가.
- 코드 힌트·책임자 후보 100 안내 → `FieldHint`(코드 힌트는 기존 id `department-code-hint` 유지).
- 説明 카운터 → `CharCount`(간격 8→4, 표기 「n / max」→「n/max」, error를 왼쪽 슬롯으로). 글자 수는 `description.length` 그대로(L1).
- `IconField`(U3)·ApproverSelect `leadingIcon`·검색·디바운스·`managerUnchanged`·오류 처리 유지.
- `Notice`(info)는 `FormTable` 뒤(Body 맨 아래).
- 部署コード input에 `data-autofocus`(A5).

### M08 (A 단계형, FormModal 대상 외 — `Modal` 직접)
- `size="lg"`, `description={t.description}`「出勤・退勤時刻を修正します。」(입력·확인 두 단계 공통), `busy={submitting}`(C2).
- 입력 단계 본문 `<div className="flex flex-col gap-6">`: ① `errors.server` 있으면 `Notice error` ② `ReadOnlySummary`(社員名, 勤務日 `tabular-nums`) ③ `FormTable`: 出勤時刻(`required`, A6: `aria-required="true"`, `data-autofocus`) / 退勤時刻(힌트 `FieldHint id="attendance-edit-clock-out-hint"`). 기존 `dl`·`labelClass` 제거.
- `INVALID_TIME_RANGE` → 입력 단계 복귀 + Notice error 로직 그대로.

### 완료 조건
- 위 테스트 + `FormModal.test.tsx` 통과. 기존 단정 중 라벨·역할 기반 쿼리가 그대로 통과하는지 우선 확인(FormRow→FormTable 전환으로 접근 이름이 바뀌지 않아야 함).
- 360 폭 스크린샷: FormTable 1열, ReadOnlySummary 줄바꿈, footer 2열 전폭.

---

## C5. Detail·List 마무리 (단계 5) — M02·M06 → M03·M07

### 대상 파일
- 수정: `LeaveDetailModal.tsx`(reject 단계), 필요 시 `DepartmentDetailModal.tsx`·`DepartmentMembersModal.tsx`·`LeaveDayModal.tsx`
- 테스트: `LeaveDetailModal.test.tsx` + 호출부(`DashboardView`·`LeavesView`·`ApprovalsView`·`AttendanceSheetView`), `DepartmentMembersModal.test.tsx`, `LeaveCalendarView.test.tsx`, `DepartmentsView.test.tsx`

### 내용
- M06 reject: 오류·카운터 블록 → `CharCount`(length는 기존 `[...rejectReason].length`). 라벨 위 배치 유지(A7). `t.reject.count` 미사용 시 제거.
- M02·M03·M07: C3 이후 남은 차이 점검 — 본문 강조 문장에 임의 클래스 대신 규칙 토큰 사용, subtitle 스타일 단일화 영향(M03 배지) 확인, Body 내 `text-xl/7` 잔존 없음. 고칠 것이 없으면 "변경 없음"으로 기록.
- M06 호출부 5곳 코드 무변경(R5).

### 완료 조건
- 위 테스트 전부 통과. M03 15장 e2e 스크린샷 전후 검토 결과 기록.

---

## C6. 중복 정리 (단계 6)

### 내용
- `frontend/src/components/FormRow.tsx` 삭제(사용처 0 확인. 전용 테스트 없음).
- 잔존 확인 grep(0건이어야 함): `FormRow`, `cancelButtonClass`, `variant="form"`, `*Modal.tsx`·`AttendanceSection.tsx`의 `const buttonClass`, 모달 안 `text-xl/7`, `messages`의 미사용 키(`leaves.apply.count`, `leaveDetail…reject.count` 등 이번 변경으로 고아가 된 것만).
- 이번 변경으로 미사용이 된 import 제거. 기존 dead code는 건드리지 않고 frontend.md에 언급만.

### 완료 조건
- `cd frontend && npx tsc --noEmit && npm run lint && npm test` 전부 통과.
- frontend.md "문서 갱신 예정"에 C1~C6 누적 내용(신규 부품 시그니처, Modal props 변경, FormRow 삭제, 아이콘 자산 위치, R10 문구) 정리.

---

## 호출 API (변경 없음)
기존 그대로: M01 `POST/PATCH /admin/departments`, `GET .../manager-candidates`, M03 `GET /admin/departments/:id/members`, M04 `DELETE /admin/departments/:id`, M05 `POST /leaves`·승인자 후보, M06 `GET /leaves/:id`·`POST .../approve|reject|cancel`, M08 `PATCH /admin/attendance/:id`, M09 출근·퇴근. 상세는 `docs/06_API_SPECIFICATION.md`.

## 재사용 기존 부품
`components/FormTable.tsx`(변경 없음, `labelId` 지원), `DetailTable.tsx`, `Notice.tsx`, `Spinner.tsx`, `Select.tsx`, `leave/ApproverSelect.tsx`, `form.tsx`(`FieldError`, `RequiredMark`, `IconField`, `inputClass`, `textareaClass`).
