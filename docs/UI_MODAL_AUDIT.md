# UI 모달 전수 조사 (UI_MODAL_AUDIT)

> 상태: **v3** (Architecture Agent, 2026-11-13, 브랜치 `docs/modal-audit`). v2에 frontend 검토(A1~A3·C1), v3에 사용자 결정 D1~D15(`.claude/work/modal-audit/decisions.md`)를 반영했다. 조사 결과(§1~§9)는 코드 현황이라 결정으로 바뀌지 않으며, 결정과의 대응은 §11. 반영 내역은 `.claude/work/modal-audit/docs-update.md`.
> 관련 문서: 패턴 설계 `docs/UI_MODAL_PATTERNS.md`, 단계별 계획 `docs/UI_MODAL_REFACTOR_PLAN.md`.
> 이 문서는 조사 결과만 담는다. 코드·`docs/09_DESIGN_SYSTEM.md`는 수정하지 않았다.
> 모든 수치는 코드의 Tailwind 클래스·토큰에서 읽은 값이다(Tailwind 4 기본 spacing 1단위 = 4px, `rounded-md` = 6px, `rounded-lg` = 8px, `rounded-2xl` = 16px). 근거는 `파일:라인`.

---

## 1. 조사 방법과 모달 판별 기준

### 1.1 판별 기준

다음 중 하나라도 해당하면 "모달"로 본다.

| # | 기준 | 검색 방법 |
|---|---|---|
| C1 | 공통 `Modal`(`components/Modal.tsx`)을 렌더링 | `<Modal` grep |
| C2 | 네이티브 `<dialog>` + `showModal()` | `<dialog`, `showModal` grep |
| C3 | `role="dialog"` / `role="alertdialog"` / `aria-modal` | grep |
| C4 | 화면 전체를 덮는 오버레이(`fixed inset-0` 계열 + 배경 dim) 위에 떠서 **배경 조작을 막는** 패널 | `fixed inset`, `backdrop` grep |
| C5 | 바텀시트(하단에서 올라오는 모달 패널) | C3·C4 검색 결과로 판정 |

같은 컴포넌트가 내부 단계(step)를 바꿔 다른 제목·본문·footer를 보여 주면, **구현 단위 1개 / 논리 모달 N개**로 센다.

### 1.2 조사 범위

- `frontend/src` 전체(테스트 파일 제외)를 위 패턴으로 검색한 뒤, 걸린 파일을 모두 열어 확인했다.
- 결과: C1·C2에 해당하는 것만 존재. **C3 직접 지정, C5 바텀시트는 0건**. 모든 모달은 공통 `Modal` 하나(`<dialog>`) 위에 구현되어 있다.

### 1.3 모달이 아닌 것으로 판정한 오버레이 (제외)

| 요소 | 위치 | 제외 이유 |
|---|---|---|
| 모바일 메뉴 드로어 | `components/layout/AppShell.tsx:138-151` | dim(`bg-general-100/50`) + 좌측 패널이지만 `<dialog>`·포커스 트랩 없음, 상단바·하단 탭이 덮이지 않음(`top-17 bottom-16`). 내비게이션 드로어 패턴 |
| 아바타 사용자 메뉴 | `components/layout/TopBar.tsx:83` | `aria-expanded` 팝오버 메뉴 |
| 승인자 검색 목록 | `components/leave/ApproverSelect.tsx:220` | `role="listbox"` 콤보박스 팝업 |
| Tooltip | `components/Tooltip.tsx:47` | `role="tooltip"` |
| Toast | `components/Toast.tsx:50-52` | `role="status"` 비차단 알림 |
| 모바일 休暇カレンダー 선택일 목록 | `app/(app)/leaves/calendar/LeaveCalendarView.tsx:218-` | 페이지 안 인라인 목록(모달 아님). 같은 데이터의 PC 표시는 `LeaveDayModal` |

### 1.4 요청 예시 중 코드에 존재하지 않는 모달

| 예시 | 상태 |
|---|---|
| 社員追加 / 社員編集 / 社員詳細 | **미구현**. SCR-006·007(`/admin/users`) 프론트·API 없음(context.md). SCR-006 §「사원 등록 모달」, SCR-007 확인 모달 2종은 명세에만 존재 → 향후 이 패턴의 첫 소비자 |
| 役職確認 / 役職追加·編集 | **없음**. 직책은 seed 데이터(`backend/prisma/initial-data.ts` `JOB_TITLES`)만 있고 관리 화면·모달이 없다. 직책은 所属社員確認 표의 배지로만 표시 |
| 承認・却下確認 | 독립 모달이 아니라 `LeaveDetailModal` 내부 단계로 존재(M06) |

---

## 2. 결과 요약

- **구현 단위 9개 / 논리 모달 15개** (공통 기반 `Modal` 1개 별도).
- 9개 모두 공통 `Modal`을 쓴다. 그러나 `Modal` 안의 **본문 레이아웃·footer 버튼·폼 레이아웃은 모달마다 직접 구성**하고 있어 차이가 생긴다.
- `Modal`에 `variant="form"`이 추가되면서(2026-11, SCR-010 참조 이미지 재현) **외형 계열이 2개로 갈라졌다**(radius 6 / 16, 그림자 2종, 제목 20 / 24, 좌우 padding 28 / 32).

| ID | 구현 파일 | 논리 모달(제목, `messages/ja.ts`) | 화면 | 유형(§7) |
|---|---|---|---|---|
| M01 | `app/(app)/admin/departments/DepartmentFormModal.tsx` | 部署登録 / 部署の編集 (2) | SCR-010 | A Form |
| M02 | `app/(app)/admin/departments/DepartmentDetailModal.tsx` | 部署詳細 (1) | SCR-010 | B Detail |
| M03 | `app/(app)/admin/departments/DepartmentMembersModal.tsx` | 所属社員確認 (1) | SCR-010 | C List(표) |
| M04 | `app/(app)/admin/departments/DepartmentDeleteModal.tsx` | 部署の削除 (1) | SCR-010 | D Confirm |
| M05 | `components/leave/LeaveApplyModal.tsx` | 休暇申請 (1) | SCR-004 3탭 공통(`LeaveManagementLayout.tsx:77`) | A Form |
| M06 | `components/leave/LeaveDetailModal.tsx` | 休暇詳細 / 休暇の承認 / 休暇の却下 / 休暇申請の取消 (4) | SCR-002·003·004·005 (호출부 5곳: `AttendanceSheetView.tsx:430`, `LeavesView.tsx:136`, `ApprovalsView.tsx:334`, `PendingApprovalsSection.tsx:208`, `RecentRequestsSection.tsx:86`) | B Detail + D Confirm(단계) + D' 사유 입력 |
| M07 | `components/leave/LeaveDayModal.tsx` | 날짜별 휴가자(`dayModalTitle`) (1) | SCR-004 休暇カレンダー(PC) | C List(단순) |
| M08 | `app/(app)/admin/attendance/AttendanceEditModal.tsx` | 勤怠の修正 입력 / 확인 (2) | SCR-008 | A Form + D Confirm(단계) |
| M09 | `app/(app)/dashboard/AttendanceSection.tsx:225-254` (인라인) | 出勤の登録 / 退勤の登録 (2) | SCR-002 | D Confirm |

---

## 3. 공통 기반 `Modal` 실측 (`frontend/src/components/Modal.tsx`)

| 항목 | `variant="default"` | `variant="form"` | 근거 |
|---|---|---|---|
| 요소 | `<dialog>` + `showModal()`, `aria-labelledby`(useId) | 같음 | :41-53 |
| 폭 | `w-[calc(100%-2rem)]`(좌우 여백 16) | `w-[calc(100%-1rem)]`(8), `sm:w-[calc(100%-2rem)]` | :55-58 |
| 최대 폭(size) | `md` `max-w-105`(420) / `lg` `max-w-160`(640) / `xl` `max-w-200`(800) | 같음 | :20 |
| 최대 높이 | `max-h-[calc(100dvh-2rem)]` | 같음 | :55 |
| radius / 그림자 | `rounded-md`(6) / `shadow-card` | `rounded-2xl`(16) / `shadow-card-soft` | :56-58 |
| Overlay | `backdrop:bg-general-100/50` | 같음 | :59 |
| Header padding | `px-5 pt-5`(20) → `sm:px-7 sm:pt-7`(28) | `px-5 pt-5` → `sm:px-8 sm:pt-8`(32) | :62 |
| 아이콘 슬롯(선택) | `size-10` 박스, `rounded-md`, `bg-primary-30`, 아이콘 24, 제목과 간격 12 | 같음 | :64-71 |
| 제목 | `text-xl/7 font-bold`(20/28, 값은 Heading 6과 동일하나 토큰 `text-h6` 미사용) | `text-h6` → `sm:text-h5`(20/28 → 24/34) | :76 |
| subtitle | `mt-1`, 스타일 없음(호출부가 배지 등을 넣음) | `mt-2 text-sm/5 sm:text-base/6 text-general-80`(설명문) | :80-84 |
| 닫기(X) | `size-10 -m-2`, 아이콘 24, `text-general-80`, hover `bg-general-30` | 같음 | :87-101 |
| Body | `mt-4`(16), `px-5 sm:px-7`, `text-base/6 text-general-80`, `overflow-y-auto` | `mt-6`(24), `px-5 sm:px-8` | :103-105 |
| Footer | `mt-6`(24), **전폭** `border-t border-general-40`, `px-5 py-4 sm:px-7`, `flex flex-wrap justify-end gap-3` | `pt-6 pb-5 sm:pb-8`, `sm` 미만 `grid grid-cols-2 gap-3`(구분선 없음), `sm` 이상 **본문 폭 안쪽** `border-t` + `pt-5` + `flex justify-end` | :108-117 |
| 바깥 클릭 | 닫지 않음 | 같음 | :23, `Modal.test.tsx:64-69` |
| Esc | 네이티브 `close` 이벤트 → `onClose`. **차단 수단 없음** | 같음 | :53 |
| 배경 스크롤 잠금 | `html:has(dialog:modal){overflow:hidden}` | 같음 | `app/globals.css:124-126` |

관찰:
- `subtitle` 하나가 default에서는 "배지 슬롯", form에서는 "설명문"으로 의미가 다르다(:15 주석).
- 설명문이 있어도 `aria-describedby`가 연결되지 않는다.
- form variant의 모바일 footer `grid-cols-2`(:110)는 **버튼 2개를 가정**한다. 1개면 반쪽 폭, 3개 이상이면 2+1로 배치된다. 현재 form 사용처(M01)는 항상 2개라 문제가 드러나지 않았다.
- 닫기 경로별 차이(제출 중 닫기를 거부하는 호출부, 예: `AttendanceSection.tsx:228-230`):
  - **X 버튼**: `onClose` 호출만 하고 dialog를 직접 닫지 않는다. 호출부가 거부하면 `open`이 그대로라 열린 채 유지된다(안전).
  - **Esc**: 브라우저가 dialog를 **먼저 닫은 뒤** `close` 이벤트로 `onClose`를 부른다. 호출부가 거부해도 dialog는 이미 닫혀 있고, `open` 동기화 effect(:41-46)는 prop 변화에만 반응하므로 **화면(닫힘)과 React 상태(open=true)가 어긋난다**. 상태 불일치는 Esc 경로에서만 생긴다.

---

## 4. 모달별 상세

표기: 폭 = `size`, 버튼 높이 h-10 = 40px. "09 준수"는 `docs/09_DESIGN_SYSTEM.md` §3·§6 기준.

### M01 DepartmentFormModal — 部署登録 / 部署の編集 (SCR-010)
1. 화면: `/admin/departments` [部署を追加]·[編集]·部署詳細의 [この部署を編集] (`DepartmentsView.tsx:560-566`)
2. 파일: `app/(app)/admin/departments/DepartmentFormModal.tsx`
3. 공통 컴포넌트: `Modal`(variant form), `FormRow`, `IconField`, `inputClass`·`textareaClass`·`iconInputClass`, `ApproverSelect`, `Notice`, `FieldError`, `Spinner`, `primaryButtonClass`
4. 폭: `xl`(800), `variant="form"` (:191-192)
5. 구조: Header(제목 + 설명문 subtitle :189-190, 아이콘 없음) / Body(`<form>`) / Footer([キャンセル][登録する·保存する])
6. 간격: 필드 간 `gap-5 sm:gap-6`(20/24) (:215). FormRow 라벨 열 `8.5rem`, 열 간격 16 (`FormRow.tsx:18`)
7. Typography: 제목 20→24 Bold, 라벨 16/24 Bold `general-100`(`FormRow.tsx:19`), 힌트 12/16 `general-80`(:229), 글자 수 14/20(:287)
8. 버튼: **로컬 클래스**. 취소 = `cancelButtonClass`(`bg-general-30` 회색 채움 + `border-general-50`, :36-37), 공통 크기 `h-11 sm:h-12 sm:min-w-32 px-4 text-base/6`(:182-183). `sm` 미만 2열 전폭
9. 입력 레이아웃: FormRow 2열(라벨 좌·입력 우) / `sm` 미만 1열. 입력에 장식 아이콘(`IconField`)
10. 안내: `Notice`(info) **폼 마지막**(:297). 코드 힌트는 입력 아래(:229-231)
11. 스크롤: Body만
12. 반응형: 폭 100%-8px(모바일), 라벨 위·입력 아래, footer 2열 그리드
13. 09 준수: △ — `variant="form"`은 09 §6에 기록됨. 취소 버튼 회색 채움은 09 §3 Button 변형(Primary/White/Light/Danger)에 없는 스타일(코드 주석 :35에서 "참조 디자인" 사유)
14. 차이: 다른 Form(M05·M08)과 외형 계열·폼 레이아웃·버튼 크기·취소 버튼 스타일이 모두 다름

### M02 DepartmentDetailModal — 部署詳細 (SCR-010)
1. 화면: 목록 행 [詳細] (`DepartmentsView.tsx:550-558`)
2. 파일: `app/(app)/admin/departments/DepartmentDetailModal.tsx`
3. 공통: `Modal`(default), `DetailTable`·`DetailTableRow`, `Badge`, `modalPrimaryButtonClass`·`modalSecondaryButtonClass`
4. 폭: `lg`(640) (:25)
5. 구조: Header(제목만, **아이콘 없음**) / Body(좌측 히어로 + 우측 DetailTable) / Footer([閉じる][この部署を編集](시스템 부서면 숨김)) (:28-41)
6. 간격: 본문 `flex-col gap-4` → `md:flex-row md:gap-8` (:45), 히어로 `md:w-40` (:46)
7. Typography: 부서명 16/24 Bold(:54), DetailTable 라벨·값 14/20(`DetailTable.tsx:14,17`)
8. 버튼: 공통 modal 클래스(h-10, 14/20). 닫기가 왼쪽, 주 동작이 오른쪽
9. 입력: 없음
10. 안내: 없음
11. 스크롤: Body만
12. 반응형: `md` 미만 세로 배치(히어로 가로형), DetailTable 라벨 열 `6rem`→`sm:10rem`(`DetailTable.tsx:13`)
13. 09 준수: ○ (DetailTable은 09 §6 **미기록**)
14. 차이: 같은 Detail인 M06은 헤더 아이콘 있음·히어로 없음. 히어로 아이콘 `size-16 rounded-full`(:49)은 헤더 아이콘(`size-10 rounded-md`)과 다른 형태

### M03 DepartmentMembersModal — 所属社員確認 (SCR-010)
1. 화면: 목록 所属社員数 옆 [確認] (`DepartmentsView.tsx:573-578`)
2. 파일: `app/(app)/admin/departments/DepartmentMembersModal.tsx`
3. 공통: `Modal`(default, icon, subtitle=Badge), `Badge`, `SearchInput`, `Pagination`, `SkeletonLines`, `SectionError`, `thClass`·`tdClass`, `modalSecondaryButtonClass`, `useMediaQuery`
4. 폭: `xl`(800) (:331)
5. 구조: Header(사람 아이콘 + 제목 + 배지 「{部署名} / 所属社員 N名」 :318-330) / Body(툴바 → 표 또는 카드 → 페이지네이션) / Footer([閉じる] 1개 :334)
6. 간격: 툴바 `flex-wrap justify-between gap-3`(:341), 목록 `mt-3`(:360), 카드 `space-y-2`, 카드 내부 `px-3 py-2 rounded-lg border-general-40`(:273)
7. Typography: 「対象社員」 14/20 + 숫자 20/28 Bold(:342-347), 표는 `table.ts`
8. 버튼: 공통 secondary 1개
9. 입력: 검색 `SearchInput` `w-full sm:w-64`(:349)
10. 안내: 상태 문구(빈 결과) `py-4 text-center text-sm/5 text-general-80`(:196) — Notice 아님(09 §5-9 예외 규칙과 일치)
11. 스크롤: Body만. 5명/페이지 클라이언트 페이지네이션(:33, :361-369)
12. 반응형: `lg`(64rem) 이상 7열 표(:35, :212-220), 미만 카드 목록(:266-311), `sm` 미만 compact 페이지네이션(:37, :367)
13. 09 준수: ○ (size xl·subtitle 배지 기록됨). 단 **SCR-010 명세와 불일치**(§9 D5)
14. 차이: 유일한 "툴바 + 표 + 페이지네이션" 모달. M07(단순 목록)과 폭·아이콘·헤더 구성 다름

### M04 DepartmentDeleteModal — 部署の削除 (SCR-010)
1. 화면: 목록 [削除](소속 0명) (`DepartmentsView.tsx:567-572`)
2. 파일: `app/(app)/admin/departments/DepartmentDeleteModal.tsx`
3. 공통: `Modal`(default), `Notice`(warning), `Spinner`, `primaryButtonClass`·`secondaryButtonClass`
4. 폭: `md`(420, 기본값)
5. 구조: Header(제목만) / Body(확인 문장 + 조건부 Notice) / Footer([キャンセル][削除する])
6. 간격: `flex-col gap-2`(8) (:85)
7. Typography: 확인 문장 16/24 `general-100`(:86, Body 기본 16/24 + 색 덮어씀)
8. 버튼: **로컬 `buttonClass`**(`flex h-10 items-center justify-center gap-2 px-4 text-sm/5`, :56) — `modalPrimaryButtonClass`와 사실상 동일한 값을 중복 정의. **삭제(파괴적) 동작에 Primary(파랑) 채움 사용**(:76). 제출 중 취소 버튼은 활성 유지
9. 입력: 없음
10. 안내: Notice warning을 확인 문장 **아래**(:87-89)
11. 스크롤: Body만
12. 반응형: Modal 기본만
13. 09 준수: △ — 09 §3 Button Danger 변형이 있고 `dangerOutlineButtonClass`(form.tsx:63)가 존재하지만 확인 버튼에 쓰지 않음
14. 차이: M09와 같은 Confirm인데 버튼 클래스 출처·제출 중 비활성 범위가 다름

### M05 LeaveApplyModal — 休暇申請 (SCR-004)
1. 화면: `/leaves/*` 헤더 [休暇申請] (`LeaveManagementLayout.tsx:77`)
2. 파일: `components/leave/LeaveApplyModal.tsx`
3. 공통: `Modal`(default, icon), `FormTable`·`FormTableRow`, `Select`, `inputClass`·`textareaClass`, `ApproverSelect`, `FieldError`, `Spinner`, modal 버튼 클래스
4. 폭: `lg`(640) (:196)
5. 구조: Header(달력 아이콘 + 제목) / Body(`<form>` + FormTable) / Footer([キャンセル][申請する])
6. 간격: FormTable 행 사이 구분선(간격 0), 라벨 셀 `px-3 py-2 sm:px-5 sm:pt-[26px] sm:pb-3`, 값 셀 `px-3 py-3 sm:px-5` (`FormTable.tsx:23,35`)
7. Typography: 라벨 14/20 Medium `general-80`(`FormTable.tsx:20`), 일수 16/24 Bold(:277), 힌트 12/16(:281)
8. 버튼: 공통 modal 클래스(h-10)
9. 입력: **FormTable**(테두리 있는 2열 표, 라벨 열 `10rem` 회색 배경) / `sm` 미만 1열
10. 안내: 승인 불필요 안내는 FormTableRow 값 칸의 일반 문단(:331-333, Notice 아님)
11. 스크롤: Body만
12. 반응형: FormTable 1열, footer는 default(우측 정렬 + flex-wrap)
13. 09 준수: △ — 09 §6 행(:280)·SCR-004 §3.2는 "Radio·[キャンセル](텍스트)"라 적혀 있으나 코드는 `Select`·아웃라인 버튼(§9 D1)
14. 차이: M01과 폼 레이아웃(FormTable vs FormRow), 라벨 타이포(14 Medium 회색 vs 16 Bold 검정), 외형 계열, 버튼 크기 모두 다름

### M06 LeaveDetailModal — 休暇詳細 / 承認 / 却下 / 取消 (공통)
1. 화면: SCR-002 承認待ち·直近の申請, SCR-003 出勤簿 申請 배지, SCR-004 自分の休暇, SCR-005 承認 (호출부 5곳, §2 표)
2. 파일: `components/leave/LeaveDetailModal.tsx`
3. 공통: `Modal`(default, icon), `DetailTable`, `LeaveStatusBadge`, `SkeletonLines`, `SectionError`, `labelClass`·`textareaClass`, `FieldError`, `Spinner`, modal 버튼 클래스
4. 폭: `lg`(640) — **확인 단계도 lg**(단계 전환이라 폭 고정) (:362)
5. 구조: 단계 4개(:32). detail = DetailTable 10행 / approve·cancel = 확인 문장 1개(:276-282) / reject = 라벨 위 textarea + 오류·글자수(:284-315)
6. 간격: reject 단계 오류(좌)·글자수(우) `flex justify-between gap-3`(:303)
7. Typography: 확인 문장 16/24 `general-100`, 라벨 `labelClass`(14/20 Medium, :288)
8. 버튼: 공통 modal 클래스. detail 단계는 최대 4개([閉じる][取消] 또는 [閉じる][却下][承認]) (:236-268). 확인 단계는 제출 중 두 버튼 모두 disabled (:184,192)
9. 입력: reject 단계 — 라벨 위·입력 아래(labelClass), `autoFocus`(:294)
10. 안내: 없음(오류는 토스트·FieldError)
11. 스크롤: Body만
12. 반응형: DetailTable 라벨 열 6rem→10rem
13. 09 준수: ○
14. 차이: 확인 단계가 M04·M09(독립 Confirm, md)와 달리 lg 폭·아이콘 헤더. 확인 단계에서 [却下]의 사유 입력 폼은 M01·M05의 폼 레이아웃과 다름

### M07 LeaveDayModal — 날짜별 휴가자 (SCR-004 休暇カレンダー)
1. 화면: PC 캘린더 막대·「+N件」 (`LeaveCalendarView.tsx:204-211`, :261, :292)
2. 파일: `components/leave/LeaveDayModal.tsx`
3. 공통: `Modal`(default), `LeaveCategoryBadge`, `modalSecondaryButtonClass`
4. 폭: `md`(420)
5. 구조: Header(제목만) / Body(`ul divide-y divide-general-40`) / Footer([閉じる])
6. 간격: 항목 `py-3 gap-1.5`(:36)
7. Typography: 이름 16/24 Bold, 보조 14/20 `general-80`, 기간 14/20 `general-100` (:39-49)
8. 버튼: 공통 secondary 1개
9~10. 입력·안내 없음
11. 스크롤: Body만(항목 수 제한 없음)
12. 반응형: Modal 기본(모바일에서는 이 모달 대신 인라인 목록, §1.3)
13. 09 준수: ○ (09 §6 :283 기록)
14. 차이: M03과 같은 List인데 아이콘·subtitle·빈 상태 처리 없음(빈 목록으로 열리지 않음)

### M08 AttendanceEditModal — 勤怠の修正 (SCR-008)
1. 화면: `/admin/attendance` [修正] (`AdminAttendanceView.tsx:314`)
2. 파일: `app/(app)/admin/attendance/AttendanceEditModal.tsx`
3. 공통: `Modal`(default), `Notice`(error), `inputClass`·`labelClass`, `FieldError`, `Spinner`, `primaryButtonClass`·`secondaryButtonClass`
4. 폭: `md`(420, 기본값) (:216)
5. 구조: 단계 2개(input → confirm). input = 오류 Notice + 읽기 전용 `dl` + 입력 2개 / confirm = 문장 1개(:159)
6. 간격: `flex-col gap-4`(16) (:162), `dl` `grid-cols-[auto_1fr] gap-x-4 gap-y-2`(:166)
7. Typography: `dl` 14/20, dt `general-80`(:166-170), 라벨 14/20 Medium(`labelClass`)
8. 버튼: **로컬 `buttonClass`**(:110-112, M04와 같은 값). [保存](입력 단계)은 Spinner 없음
9. 입력: 라벨 위·입력 아래(1열 세로 스택)
10. 안내: 서버 오류 Notice error를 **본문 맨 위**(:163-165)
11. 스크롤: Body만
12. 반응형: Modal 기본만
13. 09 준수: ○(Notice 규칙 준수). 버튼 클래스 중복
14. 차이: 3번째 폼 레이아웃(라벨 위). 읽기 전용 값 표시 방식이 M05(회색 박스 :277)·M02(DetailTable)와 다름

### M09 AttendanceSection 확인 — 出勤の登録 / 退勤の登録 (SCR-002)
1. 화면: 대시보드 今日の出勤状況 카드의 출근·퇴근 버튼
2. 파일: `app/(app)/dashboard/AttendanceSection.tsx:225-254` (**별도 컴포넌트 없이 카드 안에 인라인**)
3. 공통: `Modal`(default), `Spinner`, modal 버튼 클래스
4. 폭: `md`(420)
5. 구조: Header(제목) / Body(문장 1개 :253) / Footer([キャンセル][登録する])
6~7. 문장 16/24 `general-100`
8. 버튼: 공통 modal 클래스, 제출 중 두 버튼 disabled(:235,243), `onClose`에서 제출 중 닫기 무시(:228-230)
9~10. 없음
11~12. Modal 기본
13. 09 준수: ○
14. 차이: 확인 모달 중 유일하게 제출 중 닫기 방지 로직이 있음(단 Esc는 §3 관찰대로 막히지 않음)

---

## 5. 비교 테이블

### 5.1 외형·구조

| ID | variant | size | 헤더 아이콘 | subtitle | 제목 | radius / 그림자 | footer 버튼 출처 | 버튼 높이 | 취소 버튼 스타일 |
|---|---|---|---|---|---|---|---|---|---|
| M01 | form | xl 800 | - | 설명문 | 20→24 | 16 / soft | 로컬 | 44→48 | 회색 채움(로컬) |
| M02 | default | lg 640 | - | - | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |
| M03 | default | xl 800 | 사람 | Badge | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |
| M04 | default | md 420 | - | - | 20 | 6 / card | 로컬(=modal 값) | 40 | 아웃라인 |
| M05 | default | lg 640 | 달력 | - | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |
| M06 | default | lg 640 | 달력 | - | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |
| M07 | default | md 420 | - | - | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |
| M08 | default | md 420 | - | - | 20 | 6 / card | 로컬(=modal 값) | 40 | 아웃라인 |
| M09 | default | md 420 | - | - | 20 | 6 / card | modal 클래스 | 40 | 아웃라인 |

### 5.2 본문·상태

| ID | 본문 레이아웃 | 필드 간격 | 안내(Notice) 위치 | 로딩 | 빈 상태 | 오류(조회) | 제출 중 | 단계 전환 |
|---|---|---|---|---|---|---|---|---|
| M01 | FormRow | 20→24 | 폼 끝 info | 후보만(ApproverSelect) | - | 후보 재시도 | 주 버튼 disabled+Spinner | - |
| M02 | 히어로+DetailTable | - | - | - | - | - | - | - |
| M03 | 툴바+표/카드+페이지 | - | - | SkeletonLines 4 | 문구 중앙 | SectionError | - | - |
| M04 | 문장+Notice | 8 | 문장 아래 warning | - | - | - | 주 버튼만 disabled | - |
| M05 | FormTable | 0(구분선) | -(일반 문단) | 승인자만 | - | 승인자 재시도 | 주 버튼만 disabled | - |
| M06 | DetailTable / 문장 / 라벨 위 textarea | - | - | SkeletonLines 6 | - | SectionError | 양 버튼 disabled | 4단계 |
| M07 | 구분선 목록 | - | - | - | - | - | - | - |
| M08 | dl + 라벨 위 입력 | 16 | 맨 위 error | - | - | - | 양 버튼 disabled(확인 단계) | 2단계 |
| M09 | 문장 | - | - | - | - | - | 양 버튼 disabled + 닫기 무시 | - |

### 5.3 같은 역할 요소의 표현 차이 (요약)

| 요소 | 변형 수 | 내용 |
|---|---|---|
| 폼 레이아웃 | 3 | FormRow(M01) / FormTable(M05) / 라벨 위 스택(M06 reject, M08) |
| 폼 라벨 타이포 | 2(배치 3) | 타이포 2종: 16/24 Bold `general-100`(FormRow) / 14/20 Medium `general-80`(FormTable·`labelClass`). 배치 3종: 좌측 열(FormRow) / 회색 라벨 셀(FormTable) / 입력 위(`labelClass`) |
| 읽기 전용 값 | 3 | DetailTable(M02·M06) / 회색 박스(M05 :277) / `dl` grid(M08 :166) |
| 글자 수 카운터 | 2 | 우측 단독 `mt-2`(M01 :285-292) / 오류 좌·카운터 우 `mt-1` + 초과 시 `font-medium`(M05 :298-310, M06 :303-313). 글자 수 계산도 `length`(M01) vs 코드포인트 `[...s].length`(M05·M06)로 다름(로직 차이) |
| footer 버튼 크기 | 2 | 40(h-10, 14/20) / 44→48(h-11 sm:h-12, 16/24, min-w 128) |
| 취소 버튼 | 2 | 아웃라인 `secondaryButtonClass` / 회색 채움 `cancelButtonClass`(M01 로컬) |
| 버튼 클래스 정의 위치 | 3 | `form.tsx` modal 클래스 / 로컬 동일값 복제(M04·M08) / 로컬 별도 크기(M01) |
| 파괴적 확인 버튼 | 1(문제) | 삭제도 Primary 파랑(M04) |
| 헤더 아이콘 사용 | 불규칙 | 있음 M03·M05·M06 / 없음 나머지. 기준 없음 |

---

## 6. 공통 컴포넌트 사용 현황

| 컴포넌트 | 사용 모달 | 09 §6 기록 |
|---|---|---|
| `Modal` | 전체 9 | ○ (단 아래 §9 D2·D3) |
| `modalPrimaryButtonClass` / `modalSecondaryButtonClass` | M02·M03·M05·M06·M07·M09 | ✕ (context.md 기재: "09 §6 미기록") |
| `primaryButtonClass` / `secondaryButtonClass` 직접 + 로컬 크기 | M01·M04·M08 | ○ |
| `dangerOutlineButtonClass` | 모달에서 미사용(목록 [削除]만, `DepartmentsView.tsx:143`) | ○ |
| `FormRow` | M01 | ○ (:277) |
| `FormTable` / `FormTableRow` | M05 | ✕ |
| `DetailTable` / `DetailTableRow` | M02·M06 | ✕ |
| `Notice` | M01(info)·M04(warning)·M08(error) | ○ |
| `FieldError` | M01·M05·M06·M08 | ○ |
| `RequiredMark` | M01·M05(FormRow/FormTable 경유) | 부분(FormRow 행에서 언급) |
| `SkeletonLines` / `SectionError` | M03·M06 | ○ |
| `SearchInput` / `Pagination` | M03 | ○ |
| `ApproverSelect` | M01·M05 | ○ |
| `Spinner` | M01·M04·M05·M06·M08·M09 | ○ |

---

## 7. 유형 분류 결과

| 유형 | 해당 | 비고 |
|---|---|---|
| A FormModal | M01, M05, M08(입력 단계) | 3건 모두 레이아웃이 다름 |
| B DetailModal | M02, M06(상세 단계) | 둘 다 DetailTable. M02는 히어로 추가 |
| C ListModal | M03(툴바+표+페이지), M07(단순 목록) | 규모 차이가 큼 → 하위 형태 2개(표형 / 단순형)로 규칙화 |
| D ConfirmDialog | M04, M09, M06(승인·취소 단계), M08(확인 단계) | 독립형 2 + 단계형 3 |
| D' 사유 입력 확인 | M06(却下 단계) | "확인 + 입력 1개". D의 변형으로 취급(새 유형 만들지 않음) |
| E 복합형(목록+등록) | **0건** | 役職관리 등 미구현. 유형 정의만 예약할지 **결정 필요**(PATTERNS §2) |

단계 전환(한 `<dialog>` 안에서 detail→confirm, input→confirm)은 유형이 아니라 **공통 규칙**으로 다룬다(중첩 dialog 금지 방침: `AttendanceEditModal.tsx:37` 주석, 09 §6 LeaveDetailModal 행).

---

## 8. 디자인 불일치의 주요 원인

1. **공통 `Modal`이 "틀"만 제공하고 본문·footer 규칙이 없다.** 폼 레이아웃·버튼 크기·안내 위치가 호출부 재량이라 화면마다 다르게 구성됐다(§5.3).
2. **참조 이미지 재현이 화면 단위로 들어왔다.** SCR-010 部署登録 재현을 위해 `variant="form"`(radius 16·soft 그림자·제목 24·padding 32·2열 footer)과 로컬 회색 취소 버튼이 추가되어 외형 계열이 둘로 갈라졌다(`Modal.tsx:16-17`, `DepartmentFormModal.tsx:35-37`). 같은 시기 앱 전체 Card는 radius 16으로 바뀌었는데(09 §5-6) 기본 모달은 radius 6 그대로다.
3. **같은 역할의 공용 부품이 복수로 존재한다.** FormRow / FormTable / labelClass 스택, DetailTable / dl / 회색 박스. 어느 것이 "모달 표준"인지 문서에 없다(FormTable·DetailTable은 09 §6 미기록).
4. **버튼 규칙이 문서·코드·화면에서 각각 다르다.** 09 §3은 [취소(텍스트)], 코드는 아웃라인, M01은 회색 채움. modal 버튼 클래스는 09 §6 미기록이라 M04·M08이 같은 값을 로컬로 다시 정의했다. 파괴적 동작 규칙(Danger)이 모달에 적용되지 않았다.
5. **유형별 기준(크기·아이콘·제출 중 상태)이 정해져 있지 않다.** 확인 모달이 md(M04·M09)와 lg(M06 단계) 두 폭으로 나타나고, 아이콘·제출 중 비활성 범위·닫기 방지가 모달마다 다르다.

---

## 9. 문서 ↔ 코드 불일치 (DOC_ISSUES)

| # | 문서 | 내용 | 코드 |
|---|---|---|---|
| D1 | 09 §6 :280, SCR-004 §3.2 :37·:41 | 휴가 종류 Radio(fieldset/legend), footer [キャンセル](텍스트) | `Select`(`LeaveApplyModal.tsx:217`), `modalSecondaryButtonClass` 아웃라인(:199), FormTable |
| D2 | 09 §3 :166 | Modal footer [취소(텍스트)] [확인(채움)] | 전 모달 아웃라인(또는 M01 회색 채움) |
| D3 | 09 §6 :245 | Modal padding 28·radius 6만 기재 | 모바일 padding 20(`px-5`), body/footer 간격 16·24 미기재. `form` footer의 모바일 2열은 기재됨 |
| D4 | 09 §6 | `modalPrimaryButtonClass`·`modalSecondaryButtonClass`·`DetailTable`·`FormTable` 행 없음 | 코드에 존재(`form.tsx:67-68`, `DetailTable.tsx`, `FormTable.tsx`) |
| D5 | SCR-010 §5 :119-123·:129 | 所属社員確認 표 5열, 入社日 열 표시 안 함(사용자 결정), 표 최소 폭 640 + 가로 스크롤, 50dvh 내부 스크롤, **모달 안 페이지네이션 없음** | 7열(入社日 포함 + 화살표 열, `DepartmentMembersModal.tsx:212-230`), `lg` 미만 카드 전환(:35, :360), 5명/페이지 페이지네이션(:33, :361-369) |
| D6 | SCR-010 §5 :94 | 등록 제목 「部署の登録」 | `messages` `createTitle: '部署登録'`(`ja.ts:580`) |
| D7 | `.claude/work/context.md` :39 | "09 §3 Danger 버튼은 미구현" | `dangerOutlineButtonClass` 구현·09 §6 :241 기록됨(context.md가 낡음) |

(주의: 이 표의 D1~D7은 **문서 불일치 번호**이며 사용자 결정 번호 D1~D15와 다르다.)
문서 불일치 D5 처리(v3): 사용자 결정 D10으로 **코드 기준(5명 페이지 + 모달 Body 스크롤)이 정본**이 되었고, SCR-010 명세 갱신이 예정되어 있다(REFACTOR_PLAN §7.2). 문서 불일치 D1(SCR-004 §3.2)·D6(등록 제목, PATTERNS U4)·D7(context.md)도 같은 절에서 갱신 예정. D2·D3·D4는 09 갱신(§7.1)에서 해소.

D5 판단 근거(frontend 검토 A3): 최신 커밋 `60379c3`(PR #24)의 메시지에 "デスクトップ:6列の表(社員番号・氏名・入社日・部署・役職・連絡先)と各行の矢印アイコン / モバイル:カード / 1ページ5名のページネーション(モバイルはcompact)"가 명시되어 있다. 따라서 **열 구성·入社日·카드 전환·페이지네이션은 코드가 최신 의도이고 SCR-010 §5는 PR #23 시점 명세로 낡았다**. 단 "표 영역 50dvh 내부 스크롤 + 헤더 고정"이 Modal 공통 Body 스크롤로 바뀐 것은 커밋 메시지에 언급이 없어, **의도된 변경인지 사용자 확인이 1건 남는다**(PATTERNS D10).

D1·D5·D6은 이번 작업 범위(모달 디자인 패턴) 밖의 명세 불일치다. 이번 문서에서는 기록만 하고, 명세 갱신은 사용자 확인 후 별도로 한다(REFACTOR_PLAN §7).

---

## 10. 문제점과 개선 방향 (요약)

| # | 문제 | 영향 | 개선 방향(상세는 PATTERNS·REFACTOR_PLAN) |
|---|---|---|---|
| P1 | 외형 계열 2개(default/form) | 같은 화면(SCR-010)에서 상세·삭제 모달과 등록 모달의 모서리·그림자·제목 크기가 다름 | 외형 1계열로 통일(값은 결정 필요) |
| P2 | 폼 레이아웃 3종 | 신규 폼마다 선택이 갈림 | FormModal 표준 레이아웃 1개 지정 |
| P3 | footer 버튼 크기 2종·취소 스타일 2종·로컬 복제 | 시각 불일치, 수정 시 누락 | 모달 버튼 클래스 단일화 + Danger 변형 추가 |
| P4 | 삭제 확인에 Primary 사용 | 파괴적 동작의 시각 신호 없음 | ConfirmDialog `tone="danger"` |
| P5 | 제출 중 닫힘 | X: 가드가 없는 모달(M01·M04·M05·M08 입력 단계)은 제출 중에도 닫힘. Esc: 가드 유무와 관계없이 모든 모달이 닫히고, 가드가 있는 M09는 화면·상태 불일치(§3) | `Modal`에 `busy`(Esc 차단 + 닫힘 시 재오픈 안전망, PATTERNS §4.2) |
| P6 | 설명문 `aria-describedby` 미연결, subtitle 의미 이중 | 스크린 리더 맥락 손실 | `description` 슬롯 분리 |
| P7 | `modalSecondaryButtonClass`에 disabled 스타일 없음(`form.tsx:68`) | 제출 중 비활성 보조 버튼이 활성처럼 보임(M06·M09) | disabled 스타일 추가 |
| P8 | 헤더 아이콘·안내 위치·읽기 전용 값 표시에 기준 없음 | 화면마다 다름 | 유형별 규칙화 |
| P9 | 문서 미기록 부품(D4) | 재사용 대신 재작성 유발 | 09 §6 보강 |
| P10 | 초기 포커스가 헤더의 X 버튼(DOM 순서상 첫 포커스 가능 요소, `Modal.tsx:87`) | 확인 모달에서 Enter 연타 시 실행 대신 닫힘. 호출부의 `autoFocus`는 `showModal()` 전(닫힌 상태) 커밋이라 무시될 수 있음(M06 却下 단계 :294는 이미 열린 상태에서 전환되어 정상) — frontend 정적 분석, **브라우저 실측 필요** | `Modal`이 `showModal()` 직후 `[data-autofocus]` 요소에 포커스(PATTERNS §7) |

### 범위 밖 별도 이슈 (로직, 이번 리팩터링에서 다루지 않음)

| # | 내용 | 근거 |
|---|---|---|
| L1 | 글자 수 계산 방식 차이. M01은 UTF-16 `length`(카운터·검증 모두), M05·M06은 코드포인트 `[...s].length`. M01은 이모지 등 서러게이트 쌍을 2자로 세므로 서버 기준이 코드포인트라면 클라이언트·서버 검증이 어긋날 수 있다 | `DepartmentFormModal.tsx:106-107,184` / `LeaveApplyModal.tsx:88,102` / `LeaveDetailModal.tsx:140,285` |
| L2 | M05 일수 힌트(`:281`)에 `id`가 없어 입력과 `aria-describedby`로 연결되지 않음 | `LeaveApplyModal.tsx:281` → 사용자 결정 D13으로 연결 확정(리팩터링 단계 4에서 처리, 로직 아님) |

---

## 11. 사용자 결정(D1~D15)과 문제점 대응 (v3)

| 문제 | 해결 결정 | 패턴 위치(PATTERNS) |
|---|---|---|
| P1 외형 2계열 | D1 ①'(form 계열 + md 축소) | §4.2 |
| P2 폼 배치 3종 | D2 FormTable 통일 + 部署登録식 플레이스홀더·설명문 | §3.1 |
| P3 버튼 크기·취소 스타일·로컬 복제 | D3' 40, D8 아웃라인, 로컬 클래스 폐지 | §4.3 |
| P4 삭제에 Primary | D5 빨간 채움 | §3.4, §4.3 |
| P5 제출 중 닫힘 | `busy`(설계, 결정 불필요) | §4.2 |
| P6 설명문 미연결 | `description` + describedby | §4.2 |
| P7 secondary disabled 누락 | 클래스 보강 | §4.3 |
| P8 아이콘·안내·읽기 전용 값 기준 없음 | D6 전 모달 아이콘(§2.1 기준), D7 ReadOnlySummary, Notice 위치 규칙 | §1, §2.1, §4.5 |
| P9 문서 미기록 부품 | 09 갱신 예정 | REFACTOR_PLAN §7.1 |
| P10 초기 포커스 X | `data-autofocus` | §4.2, §7 |
| 명세 불일치 D5 | D10 코드 기준 | REFACTOR_PLAN §7.2 |
| L2 | D13 연결 | §4.4 |

결정 적용 후 남은 세부 미결은 PATTERNS §9.2(U1~U5).
