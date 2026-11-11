# design-frontend — leave-application-modal-ui

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2 공통 휴가 신청 모달, §5 입력값 검증, §6 예외 처리
- `docs/03_SCREEN_LIST.md` "모달" 절(SCR-002·SCR-004 공용)
- `docs/09_DESIGN_SYSTEM.md` §3 Modal·Dropdown(Select), §6 `form.tsx`·`Modal`·`ApproverSelect`·`LeaveApplyModal` 행
- 결정 사항: 같은 폴더 `decisions.md`(D1~D5는 승인 결과를 따른다. 아래는 추천안 기준)

## 화면
- SCR-004 §3.2 공통 휴가 신청 모달(`LeaveApplyModal`). 사용처 SCR-002 `dashboard/LeaveBalanceSection.tsx`, SCR-004 `leaves/LeavesView.tsx` — 사용처 코드는 변경 없음(props 동일).

## 목표 구성 (첨부 이미지·상세 모달 기준)
`Modal open title={t.title}(D1: "休暇申請") icon={<CalendarIcon/>} size="lg"` → 본문 `<form noValidate>` 안에 `FormTable` 1개 → footer [キャンセル](아웃라인) [申請する](Primary, 요청 중 Spinner·disabled).

| 순서 | 항목명(messages) | 필수 * | 입력 | 비고 |
|---|---|---|---|---|
| 1 | 休暇種別 `t.leaveType` | O | `Select`(신규) 옵션 `LEAVE_TYPES` → `messages.leave.types[type]`, placeholder `選択してください`(초기 미선택) | 변경 시 `clearError('leaveType')`,`clearError('period')` 기존과 동일 |
| 2 | 開始日 `t.startDate` | O | `<input type="date" className={inputClass}>` | |
| 3 | 終了日 `t.endDate` | O | 같음. 반차면 disabled + 시작일 값 고정(기존) | 반차여도 * 유지 |
| — | 기간 오류 | | 2·3 행 아래가 아니라 **終了日 행 값 셀 안**에 `FieldError id=${startDate}-error` | 두 date 입력 모두 `aria-describedby`로 연결(기존) |
| 4 | 申請日数 `t.days` | X | 읽기 전용 표시 박스(`rounded bg-general-30 px-4 py-3` 수준, 값 Bold `tabular-nums`, `aria-live="polite"`) + 아래 `t.daysHint`(12px) | 컨트롤 없음 → 라벨은 `<span>` |
| 5 | 理由 `t.reason` | O | `textarea`(`textareaClass`, rows 4) + FieldError + 글자 수(`t.count`) | 기존 그대로 |
| 6a | 承認者 `t.approver` (승인 필요) | O | `ApproverSelect` 그대로 + `required` prop 추가 | |
| 6b | 承認者 `t.approver` (승인 불필요) | X | 안내 문구 `t.autoApprove` | D4. 라벨은 `<span>` |

- ステータス 행은 두지 않는다(현재도 없음).
- 필수 * 표시 기준 = `validate()`가 필수로 검사하는 항목. 구현에서는 행마다 `required` 값을 하드코딩하지 말고 다음처럼 한 곳에서 정의해 `validate()`와 같은 근거를 쓴다: `const approverRequired = approvalRequired` (승인자 행 표시 조건과 `validate()`의 `approvalRequired && !approver` 조건이 같은 변수). 종류·시작·종료·사유는 항상 필수.
- 각 필수 컨트롤에 `aria-required="true"`. 비필수 행(申請日数, 6b)은 * 도 aria-required도 없음.

## 새 공통 컴포넌트

### 1) `frontend/src/components/FormTable.tsx` (신규)
- `FormTable({children, className?})`: DetailTable과 같은 외곽(`rounded-md border border-general-40 overflow-hidden`). 요소는 `<div>`(입력 폼이므로 `dl` 아님).
- `FormTableRow({label, htmlFor?, labelId?, required?, children})`
  - `htmlFor`가 있으면 `<label htmlFor>`, 없으면 `<span id={labelId}>`로 항목명 표시.
  - `required`면 항목명 뒤에 `RequiredMark`(label **밖** 형제 요소. 접근 가능한 이름에 * 가 섞이지 않게).
  - 배치(D3 추천): `grid grid-cols-1 sm:grid-cols-[10rem_1fr]`, 행 구분선 `border-b border-general-40 last:border-b-0`. 항목명 셀 `bg-general-30 text-sm/5 font-medium text-general-80`, <sm `px-3 py-2`, sm 이상 `px-5`·입력 높이 48 기준 세로 중앙에 오도록 상단 패딩(예 `sm:pt-[26px]`, 정확한 값은 구현 시 맞춤). 값 셀 `bg-white px-3 py-3 sm:px-5 min-w-0`.
- 스타일 공유: `DetailTable.tsx`의 외곽·항목명 셀·값 셀 클래스 중 공통 부분을 export 상수로 빼서 FormTable이 import(DetailTable 출력 HTML·클래스는 그대로 유지, `DetailTable.test.tsx` 통과 유지).

### 2) `RequiredMark` — `frontend/src/components/form.tsx`에 추가
- `<span aria-hidden="true" className="ml-1 font-bold text-danger-100">*</span>`. 의미 전달은 컨트롤의 `aria-required`.

### 3) `frontend/src/components/Select.tsx` (신규, D5)
- `Select<T extends string>({id, value: T | '', onChange: (value: T) => void, options: readonly {value: T; label: string}[], placeholder?: string, invalid?: boolean, describedBy?: string, required?: boolean, disabled?: boolean})`
- 네이티브 `<select>` + `selectClass` + `appearance-none pr-10`, 오른쪽에 chevron SVG(`pointer-events-none`, `aria-hidden`, `text-general-80`). placeholder가 있으면 첫 옵션 `<option value="" disabled>`.
- `aria-invalid={invalid || undefined}`, `aria-describedby={describedBy}`, `aria-required={required || undefined}`.
- 기존 select 사용처(AdminAttendanceView, LeaveHistoryList)는 바꾸지 않는다.

### 4) 모달 footer 버튼 — `form.tsx`에 상수 추가 (D2)
- `modalPrimaryButtonClass` = 현재 `LeaveDetailModal`의 `submitButtonClass`와 같은 값(`primaryButtonClass` + `flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:bg-primary-60`)
- `modalSecondaryButtonClass` = `subButtonClass`와 같은 값(`secondaryButtonClass` + `h-10 px-4 text-sm/5`)
- `LeaveDetailModal`의 로컬 상수 2개를 이것으로 교체(화면 변화 없음). 신청 모달 footer도 사용. [キャンセル]은 `modalSecondaryButtonClass`(텍스트 버튼 → 아웃라인).

### 5) `frontend/src/components/CalendarIcon.tsx` (신규)
- `LeaveDetailModal.tsx` 하단의 로컬 `CalendarIcon`을 그대로 옮겨 export. 상세·신청 모달이 공유.

### 6) `ApproverSelect` 수정
- props에 `required?: boolean` 추가 → combobox input에 `aria-required`. 나머지 동작(in-flow 목록, loading/error/empty 표시) 변경 없음.

## 상태 흐름·검증·에러 (변경 없음)
- state(leaveType, startDate, endDate, reason, approver, errors, submitting), `effectiveEnd`, `countLeaveDays`, `validate()`, `focusFirst()`(ids.leaveType은 이제 Select의 id), `handleServerError()`, `SERVER_FIELD`, 요청 본문, 토스트, `onApplied`/`onBalanceStale` 모두 그대로.
- 休暇種別 오류: `Select`에 `invalid`·`describedBy=${ids.leaveType}-error`, FieldError는 Select 아래(fieldset/legend는 제거).

## 문구 (`frontend/src/messages/ja.ts`)
- `leaves.apply.title`: `'休暇を申請'` → `'休暇申請'`(D1)
- `common.selectPlaceholder: '選択してください'` 추가

## 호출 API (변경 없음, 상세는 design-backend.md)
- `GET /leaves/approvers`(승인 필요 사용자, open 시), `POST /leaves`

## 반응형
- 모달 `size="lg"`(최대 640). sm 이상 2열, <sm 세로 배치(D3). 본문만 세로 스크롤(Modal 기존), 승인자 후보 목록은 in-flow라 표 안에서 펼쳐진다.

## 생성·수정 파일
- 신규: `frontend/src/components/FormTable.tsx`, `frontend/src/components/Select.tsx`, `frontend/src/components/CalendarIcon.tsx`, `frontend/src/components/FormTable.test.tsx`, `frontend/src/components/Select.test.tsx`
- 수정: `frontend/src/components/leave/LeaveApplyModal.tsx`, `components/leave/LeaveDetailModal.tsx`(버튼 상수·아이콘 import만), `components/DetailTable.tsx`(클래스 상수 export만), `components/form.tsx`(RequiredMark, 모달 버튼 상수), `components/leave/ApproverSelect.tsx`(`required`), `messages/ja.ts`
- 테스트 수정: `components/leave/LeaveApplyModal.test.tsx`, `app/(app)/dashboard/DashboardView.test.tsx`(424행 radio 선택), `components/leave/ApproverSelect.test.tsx`(required 추가 시), `frontend/e2e/leaves.spec.ts`(71·102·110·163행 radio → `selectOption`)
- 참고: `components/Modal.tsx`, `components/DetailTable.tsx`, `components/leave/LeaveDetailModal.tsx`, `lib/leave-days.ts`

## 문서 갱신 예정 (frontend.md에 이어서 기록)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2: 휴가 종류 Radio→Select(placeholder), footer [キャンセル] 아웃라인, 필수 항목 * 표시·2열 표 배치·모바일 세로 배치, 모달 제목
- `docs/09_DESIGN_SYSTEM.md` §3 Modal 행(취소 버튼 아웃라인), §6: FormTable·Select·RequiredMark·모달 버튼 상수·CalendarIcon 신규, LeaveApplyModal·ApproverSelect 행 갱신, (D6 승인 시) DetailTable·LeaveStatusBadge·Modal icon/size
