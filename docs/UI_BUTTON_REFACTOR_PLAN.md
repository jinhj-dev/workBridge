# UI 버튼 단계별 리팩터링 계획 (UI_BUTTON_REFACTOR_PLAN)

> 상태: **v4 — 단계 1~8 구현 완료(2026-11-14, 브랜치 `feature/button-refactor`, 리뷰 APPROVE). 진행 상태는 §8, 머지 전 미검증 항목은 §8.3**. 계획 확정은 v3(사용자 결정 B1~B17 반영, 2026-11-13). 값은 `docs/UI_BUTTON_PATTERNS.md` §11 결정 사항 기준이다(결정 원문 `.claude/work/button-audit/decisions.md`). 변경 내역은 §9.
> 근거: 조사 `docs/UI_BUTTON_AUDIT.md`(버튼 ID BT01~BT80), 표준 `docs/UI_BUTTON_PATTERNS.md`, frontend 검토 `.claude/work/button-audit/frontend-review.md`(이하 REVIEW). 모달 표준 `docs/UI_MODAL_PATTERNS.md` v3과 일치시킨다.
> 이 문서는 계획만 담는다. 코드·`docs/09_DESIGN_SYSTEM.md`는 수정하지 않았다.

---

## 0. 선행 조건과 공통 원칙

1. 사용자 결정 B1~B17 — **완료**(2026-11-13, 전부 권장안).
2. frontend 검토(Q1~Q12) — 완료, v2에 반영.
3. **모든 단계에서 유지할 것**(시각만 바꾸고 동작은 바꾸지 않는다):
   - 클릭 이벤트: `onClick` 핸들러·`stopPropagation`(BT34·BT37)·단계 전환(`setStep`)
   - 폼 제출: `type="submit"`·`form={id}`(FormModal)·Enter 제출·`noValidate`. **Button 기본 `type="button"`이므로 제출 버튼은 반드시 `type="submit"`을 명시**하고, 누락되면 "조용히 제출되지 않는" 회귀가 되므로 FormModal·검색 3곳·인증 폼 2곳은 단계마다 Enter 제출 테스트를 돌린다
   - 화면 이동: `<Link href>` 대상·`router.back()`(SCR-009)·URL Query 갱신
   - 권한·표시 조건: `!item.isSystem`(部署 編集·削除), `canCancel`·`canProcess`(休暇詳細), `leave.status === 'PENDING'`(承認 목록), `isAdmin`(CardLink), `!mustChangePassword`(SCR-009 キャンセル)·`mustChangePassword`(ログアウト), `department && !department.isSystem`(この部署を編集)
   - 비활성화 조건: `own`(본인 신청), `!loaded`(出勤), `done`(退勤済み), `!hasConditions`(条件をクリア), `month === currentMonth`(今月), `submitting`, `page <= 1`·`page >= totalPages`, `busy`
   - 접근성: 문구·`aria-label`(`detailLabel(name)` 등)·`aria-pressed`·`aria-expanded`·`autoFocus`·`data-autofocus`·단계 key 재마운트(UI_MODAL_PATTERNS §7)
   - 배치 클래스: `mt-1`(BT01), `sm:flex-1`·`sm:flex-row-reverse` 래퍼(SCR-009), `sm:mt-6`(BT09), 래퍼 `lg:mt-6`(BT10), `-m-2`(모달 X), `relative`(벨) — Button `className` 또는 래퍼에 그대로 유지
4. 한 단계 = 한 PR(단계 2는 커밋 2개). 각 단계 끝에 §5의 검증을 통과해야 다음 단계로 간다.
5. 커밋·PR 문구는 일본어(CLAUDE.md §5).
6. **`form.tsx` 버튼 상수는 단계 1~7에서 수정하지 않는다**(B15). 이행이 끝난 상수는 단계 8에서 삭제한다.

---

## 1. 변경 대상과 우선순위

| 우선 | 대상(AUDIT ID) | 변경 내용(결정 기준) | 시각 변화 | 단계 |
|---|---|---|---|---|
| P0 | 공통 기반 | `components/Button.tsx` 신규(가산), ESLint `className` 규칙(B16) | 없음(사용처 0) | 1 |
| P0 | 토큰·첫 이행 | 버튼 토큰 치환 커밋(B6) / `SectionError` BT77 단독 이행 | BT77 px 16→12(22곳) | 2 |
| P1 | 모달 footer BT42~61 + 모달 X BT62 | `Button size="md"`, X는 `ghost` 아이콘 전용 | X radius 4→8(B9) | 3 |
| P1 | 페이지 주 동작 BT01~03·05~11, BT12 | `Button lg`/`md` | BT05 모바일 44→48, BT06 40→48·14→16, BT07·08 44→48, 검색 px 32→24, BT09·11 모바일 전폭·BT11 아이콘 제거(B14), BT12 44→40(B3) | 4 |
| P2 | 표 내부 BT22~31, 텍스트 링크 BT04·32·33·38 | `Button sm` / `buttonClass({variant:'text'})` | px 16→12(BT22~27), BT27 회색→Primary 아웃라인 + 아이콘(B10) | 5 |
| P2 | 아이콘 BT17~21·64 | `Button` 아이콘 전용 / 벨 `buttonClass` | BT19·20 36→40, BT21 sm→md(B8), 벨 radius 4→8 | 6 |
| P3 | 모바일 검증 | 360/768/1024/1440, 터치 영역 | 필요한 텍스트 링크만 히트 영역 | 7 |
| P3 | 중복 제거 | `form.tsx` 버튼 상수 8개 삭제, 로컬 클래스 15곳(식별자 23개 중 대상분), Chevron SVG 중복 | 없음 | 8 |
| 이행 안 함 | BT63 Notice X | 기록만(사용처 0, hover 색 다름) | — | — |
| 대상 외 | V8~V11, BT13·14·15·16·34·39·40·41·80 | 변경 없음(포커스·터치 규칙 확인만, 단계 7) | — | — |

이행 대상 합계: 53건(공통 Button 대상 54건 − BT63).

---

## 2. 단계별 계획

### 단계 1. 공통 Button 정리 (무변경 가산)

| 항목 | 내용 |
|---|---|
| 변경 파일 | 신규 `components/Button.tsx`, 신규 `components/Button.test.tsx`, ESLint 설정 파일(`className` 금지 규칙, B16). **`form.tsx`·`globals.css`·화면 파일은 수정하지 않는다** |
| 내용 | `BASE_CLASS`·`VARIANT_CLASS`·`SIZE_CLASS`·`ICON_ONLY_CLASS` 리터럴 맵(PATTERNS §4.3). 크기는 **Tailwind 기본 spacing**(`h-9`·`h-10`·`h-12` 등)으로 먼저 구현(토큰은 단계 2). variant 색·hover·disabled 값은 `form.tsx` 상수와 같은 토큰(`bg-primary-100`·`border-danger-100`·`text-danger-100`·`bg-danger-100` 등)을 쓴다 |
| 영향 범위 | 없음(사용처 0) |
| 위험 | 맵에 동적 조합(`` `h-${n}` ``)을 쓰면 CSS 미생성 → 리터럴만. ESLint 규칙이 기존 코드에 오탐하지 않는지(대상이 `<Button>`·`buttonClass()` 덧붙임뿐이라 기존 코드엔 해당 없음) |
| 테스트 | `Button.test.tsx`: variant별 핵심 색 클래스(기존 테스트가 단언하는 `border-danger-100`·`text-danger-100`·`bg-danger-100` 포함), size별 높이 클래스, `type` 기본 `button`, `loading` → disabled + `svg.animate-spin` + 문구 유지, `loading`이 앞 아이콘 자리를 대체, 아이콘 `aria-hidden`, `iconOnly` + `aria-label`, `onClick`·`form`·`autoFocus`·`data-autofocus`·`ref` 전달, disabled 시 클릭 무시, **렌더 결과의 루트가 `<button>` 1개**, `text`에 `inline-flex`·`whitespace-nowrap`이 없음, sm에만 `whitespace-nowrap`, 어디에도 `select-none` 없음. 타입 테스트: `iconOnly`에서 `aria-label` 누락 시 컴파일 오류(`@ts-expect-error`) |
| 완료 조건 | 전체 vitest·tsc·lint·build 통과, 화면 변화 0 |

### 단계 2. Variant·Size 표준화 (토큰 + 첫 이행)

커밋 2개로 나눈다.

| 커밋 | 내용 | 파일 | 검증 |
|---|---|---|---|
| 2-a 토큰(B6) | `globals.css` `@theme`에 `--spacing-btn-*`·`--radius-btn` 추가, `Button.tsx` 맵의 `h-10` 등을 같은 계산값의 `h-btn-md` 등으로 치환(완전한 리터럴) | `app/globals.css`, `components/Button.tsx`, `Button.test.tsx`(높이 클래스 기대값) | 사용처 0이라 화면 영향 없음. 계산값은 단계 3 첫 이행 직후 Playwright `toHaveCSS('height','40px')`·`'36px'`·`'48px'` 단언 1개씩 추가(jsdom은 Tailwind CSS를 로드하지 않음) |
| 2-b SectionError | `components/SectionError.tsx` [再試行]을 `Button size="sm"`으로. sm 확정 직후 22곳 시각 변화(px 16→12)를 단독으로 확인 | `components/SectionError.tsx` | `SectionError` 사용 화면 렌더 테스트(조회 실패 → [再試行] 클릭 → `reload` 호출), `Notice` 높이 불변(`h-9` 유지) 캡처 |

2-a는 B6 결정(토큰 도입, 별도 커밋)에 따라 반드시 2-b와 다른 커밋으로 둔다.

### 단계 3. 모달 내부 버튼 (BT42~62, 8파일)

| 항목 | 내용 |
|---|---|
| 변경 파일 | `components/Modal.tsx`(X만, footer 래퍼는 건드리지 않음), `components/ConfirmDialog.tsx`, `components/FormModal.tsx`, `components/leave/LeaveDayModal.tsx`, `components/leave/LeaveDetailModal.tsx`, `app/(app)/admin/attendance/AttendanceEditModal.tsx`, `app/(app)/admin/departments/DepartmentDetailModal.tsx`, `app/(app)/admin/departments/DepartmentMembersModal.tsx` |
| 내용 | `<button className={modal…}>` → `<Button variant size="md">`, `{submitting && <Spinner />}` → `loading`(확정 버튼의 `disabled={submitting}`은 제거, 취소 버튼의 `disabled={submitting}`은 유지). 모달 X → `Button variant="ghost" iconOnly className="-m-2"`, `disabled={busy}` 유지. `form.tsx`의 `modal*ButtonClass`는 이 단계 후 사용처 0이 되지만 삭제는 단계 8 |
| 영향 범위 | 모달 9종 전부(UI_MODAL_AUDIT M01~M09) |
| 위험 | ① `FormModal` 제출 버튼 `type="submit" form={formId}` 누락 → 제출 불가 ② `LeaveDetailModal` 단계 key 재마운트·`autoFocus={returnFocus === …}`·`data-autofocus` 전달 ③ footer D4 판정(`Modal.tsx:134` `has-[>:only-child]`·`has-[>:nth-child(3)]`)은 직계 자식 수 기준 → Button이 `<button>` 1개만 렌더하면 유지(REVIEW Q3) ④ `ConfirmDialog` `tone` → variant 변환 ⑤ 모달 X 모서리 4→8 ⑥ md 버튼에 `whitespace-nowrap`이 없음을 확인(2열 footer 긴 문구) |
| 테스트 | `ConfirmDialog.test.tsx`(`:61,64` `bg-danger-100` 클래스 단언, `:80,85` `svg.animate-spin`), `FormModal.test.tsx`(`:67,72` `svg.animate-spin`), `Modal.test.tsx`(`:60` footer `sm:border-t` — footer 래퍼 불변이면 통과), `LeaveApplyModal`·`DepartmentFormModal` 사용처 테스트, `LeaveDetailModal`·`AttendanceEditModal.test.tsx`·`DepartmentMembersModal.test.tsx`·`DashboardView.test.tsx`(출퇴근 확인), e2e `modal-a11y.spec.ts`·`leaves.spec.ts`·`approvals.spec.ts`·`departments*.spec.ts`. 단계 2-a의 `toHaveCSS` 단언을 이 단계 e2e에 추가 |

### 단계 4. 페이지 주요 액션 (BT01~03·05~12)

| 항목 | 내용 |
|---|---|
| 변경 파일 | `app/login/LoginForm.tsx`, `app/password/PasswordChangeForm.tsx`, `app/(app)/leaves/LeaveManagementLayout.tsx`, `app/(app)/admin/departments/DepartmentsView.tsx`(헤더·条件をクリア), `app/(app)/dashboard/AttendanceSection.tsx`(로컬 `base` 제거), `app/(app)/attendance/AttendanceHistoryView.tsx`, `app/(app)/admin/attendance/AdminAttendanceView.tsx`(검색), `app/(app)/leaves/LeaveHistoryList.tsx`(검색) |
| 영향 범위 | SCR-001·002·003·004·008·009·010 |
| 위험 | ① 검색 버튼 `type="submit"` 유지 ② 배치 클래스 유지(§0-3) ③ B3 적용 시 360 폭 `PageHeader` 한 줄(「休暇申請」·「部署を追加」 lg) ④ 「条件をクリア」 40 vs 옆 입력 44 정렬 ⑤ 出勤 `disabled={!loaded}`·退勤 `disabled={done}` 유지 ⑥ 호출부의 충돌 클래스(`flex`·`rounded-lg font-bold`·`h-*`·`px-*`) 제거 — ESLint로 검출 |
| 테스트 | `LoginForm.test.tsx`·`PasswordChangeForm.test.tsx`(Enter 제출·disabled·Spinner), `LeaveManagementLayout.test.tsx`, `DepartmentsView.test.tsx`, `DashboardView.test.tsx`(**`:337` 출근 카드 버튼 수 `toHaveLength(1)`** — 아이콘을 버튼 안에 두므로 유지되는지 확인), `AttendanceHistoryView.test.tsx`, `AdminAttendanceView.test.tsx`, `LeavesView.test.tsx`(BT11 Search 아이콘 단언 여부 확인, B14), e2e `login`·`password`·`dashboard*`·`attendance*`·`leaves`·`departments*` |
| 사용자 확인 | B3 조건 ①~④를 360·1440 캡처로 PR에 첨부 |

### 단계 5. 테이블 내부 액션·텍스트 링크 (BT22~33, BT38, BT04)

| 항목 | 내용 |
|---|---|
| 변경 파일 | `app/(app)/leaves/LeaveHistoryList.tsx`, `app/(app)/leaves/approvals/ApprovalsView.tsx`, `app/(app)/admin/attendance/AdminAttendanceView.tsx`(修正·사원명), `app/(app)/admin/departments/DepartmentsView.tsx`(RowActions·確認), `app/(app)/dashboard/CardLink.tsx`, `app/password/PasswordChangeForm.tsx`(ログアウト). B10 적용 시 아이콘 위치 파일(아래 ⑤) |
| 내용 | 로컬 `detailButtonClass`·`smallButtonClass`·`approveButtonClass`·`rowButtonClass` 제거, `Button size="sm"`. 修正은 B10에 따라 `primaryOutline` + Pencil. 텍스트 링크는 `buttonClass({variant:'text'})`(CardLink는 `withIcon`) |
| 영향 범위 | SCR-002·004·008·010 목록(표·카드 양쪽) |
| 위험 | ① `disabled={own}`(承認·却下) 유지 ② `aria-label`(대상 이름 포함) 유지 — 테스트가 이 이름으로 찾음 ③ `!item.isSystem` 조건부 렌더 유지 ④ 360 카드형 목록·1024 표 열 폭(sm `whitespace-nowrap` + 修正 아이콘 추가로 폭 약 20px 증가, B10 조건 — 360 카드·1024 표 캡처를 PR에 첨부) ⑤ Pencil 아이콘: 勤怠 화면이 `admin/departments/icons.tsx`를 라우트 간 import하지 않도록 공용 위치로 이동(이동 시 `departments/icons.tsx`·`DepartmentsView.tsx:33`·신규 위치·`AdminAttendanceView` 3~4파일). 위치는 구현 전 architect 확인 ⑥ 사원명 링크가 `text`(기반 없음)라 긴 이름 줄바꿈 유지 |
| 테스트 | `LeavesView.test.tsx`, `ApprovalsView.test.tsx`, `AdminAttendanceView.test.tsx`, `DepartmentsView.test.tsx`(`:365-371` `border-danger-100`·`text-danger-100` 클래스 단언, 詳細에 `text-danger-100` 없음), `DashboardView.test.tsx`(CardLink), e2e `approvals`·`departments-responsive`·`attendance` |

### 단계 6. 아이콘 버튼 (BT17~21, BT64)

| 항목 | 내용 |
|---|---|
| 변경 파일 | `components/layout/TopBar.tsx`(벨 `buttonClass({variant:'ghost',iconOnly:true})` + `relative`, 로컬 `iconButtonClass` 삭제 — 벨에서만 사용), `components/leave/MonthNavigator.tsx`, `app/(app)/attendance/AttendanceSheetView.tsx`(前月·翌月·今月, 로컬 `Chevron` → `leaveIcons`의 `ChevronLeftIcon`·`ChevronRightIcon`) |
| 제외 | `Notice.tsx` X(BT63) — 사용처 0, hover 색 다름(REVIEW E7). 모달 X는 단계 3에서 처리 |
| 영향 범위 | 상단바, SCR-003 출근부, SCR-004 휴가 캘린더 |
| 위험 | ① 벨의 빨간 점 `absolute` 위치(`relative` 필요) ② B8로 출근부 월 이동 36→40, 헤더 행 +4px ③ 출근부 간격(`gap-1 sm:gap-2`)·라벨 서체는 그대로 둔다(B8 결정: 버튼만 통일) ④ `TopBar`의 `menuItemClass`·사용자 메뉴(대상 외)는 건드리지 않음 ⑤ Chevron 선 굵기 2→1.75 |
| 테스트 | `AppShell.test.tsx`, `LeaveCalendarView.test.tsx`, `AttendanceSheetView.test.tsx`, **`AttendanceView.test.tsx`**(前月·翌月·今月 이름 검색), `DashboardView.test.tsx`, e2e `attendance-sheet-layout`(표 행 높이 단언 `:77,79`은 영향 없음 예상, 화면 높이 가정 확인), `leave-calendar-mobile`·`leave-visual`·**`leave-management`·`leave-sidebar-submenu`** |

### 단계 7. 모바일 반응형 검증

| 항목 | 내용 |
|---|---|
| 변경 파일 | 원칙적으로 없음. 발견된 문제만 해당 파일에서 배치 클래스로 수정 |
| 확인 | 360 / 768 / 1024 / 1440(D15)에서 SCR-001~004·008~010 + 모든 모달. ① 모달 footer D4·긴 확정 문구 줄바꿈 ② PageHeader 한 줄 ③ 카드형 목록 행 동작 줄바꿈 ④ 검색 버튼 전폭(B14) ⑤ 터치 영역(B7): 텍스트 링크 BT04·32·33·38의 24×24 충족 여부를 측정하고, 간격 예외로 충족하지 못하는 곳만 `text` 세로 padding 적용(PATTERNS §7.2). 대상 외 BT16·34·40은 측정 결과만 기록 ⑥ 포커스 링이 `overflow-hidden` 컨테이너에서 잘리지 않음 |
| 방법 | Playwright 뷰포트 캡처(기존 `*-responsive`·`leave-visual` 방식) + 수동 확인. 결과는 `.claude/work/button-audit/`에 기록 |

### 단계 8. 중복 스타일 제거·문서 반영

| 항목 | 내용 |
|---|---|
| 변경 파일 | `components/form.tsx`(버튼 상수 8개 삭제 — grep으로 사용처 0 확인 후), `components/form.test.tsx`(`:46-47` `modalDangerButtonClass` 상수 직접 단언 → `Button.test.tsx`의 danger variant 단언으로 이전), 남은 로컬 클래스 사용처, `AttendanceSheetView.tsx:43` `Chevron` 삭제 확인 |
| 확인 | grep: `ButtonClass` import 0건(Pagination 등 대상 외 로컬 이름 제외), 대상 버튼에서 `h-9 px-4`·`h-12 px-8` 등 크기 조합 0건 |
| 위험 | 상수 삭제 시 import 누락 → tsc가 검출 |
| 문서 | architect 문서 반영 모드에서 §6 사항 반영 |

---

## 3. 영향 범위와 위험 요약

| 위험 | 대상 | 대응 |
|---|---|---|
| R1 별칭 출력 불일치 | `form.tsx` 상수 | 별칭 방식을 쓰지 않음(B15). 상수는 이행 중 무변경, 단계 8에서 삭제 |
| R2 클래스 병합 불확정 | `className` 덧붙임 전반 | 배치 전용 규약 + ESLint(B16), 이행 시 호출부 충돌 클래스 제거 |
| R3 줄바꿈·선택 부작용 | 모달 footer·표·사원명 | 공통 기반에서 `whitespace-nowrap`·`select-none` 제외, sm에만 nowrap, `text`는 기반 미적용 |
| 제출 동작 깨짐 | 검색 3곳·인증 폼 2곳·FormModal | `type="submit"` 명시, Enter 제출 테스트 |
| 모달 footer 배치 깨짐 | 모든 모달 | Button은 `<button>` 단일 요소, `modal-a11y`·D4 e2e |
| 포커스 이동 회귀 | 단계형 모달(M06·M08), ConfirmDialog | `autoFocus`·`data-autofocus` 전달 테스트 |
| 클래스 단언 테스트 | `DepartmentsView.test.tsx:365-371`, `ConfirmDialog.test.tsx:61,64`, `form.test.tsx:46-47` | 색 토큰 클래스 유지(`toHaveClass`는 토큰 단위 비교), `form.test`는 단계 8에서 이전 |
| Spinner 선택자 | `ConfirmDialog.test.tsx:80,85`, `FormModal.test.tsx:67,72` | 기존 `Spinner` 컴포넌트·`animate-spin` 유지 |
| 토큰 치환 검증 | 단계 2-a | 별도 커밋, Playwright `toHaveCSS` |
| 시각 변화 | §1 "시각 변화" 열 | 단계 2-b·3~6 PR에 캡처 첨부 |
| 셸 회귀 | TopBar 벨 | 대상 외 V8은 손대지 않음 |

---

## 4. 디자인 / 동작 / 로직 변경 범위

| 구분 | 바뀌는 것 | 바뀌지 않는 것 |
|---|---|---|
| 디자인 | 크기 통일(44 폐지, sm px 12, lg px 24, 월 이동 40), 勤怠 「修正」 색·아이콘, 검색 버튼 아이콘·모바일 전폭, ghost radius 8, (필요한 곳만) 텍스트 링크 히트 영역 | 색 토큰, variant 색, 모달 외형, V8~V11, Notice X, 출근부 월 라벨 서체(B8 A) |
| 동작 | 없음 | 클릭·제출·이동·포커스·키보드 |
| 로직 | 없음 | 권한·표시·비활성 조건, API 호출 |
| 문구 | 없음 | `messages/ja.ts` 전부 |

SCR-009 キャンセル이 제출 중 활성인 점(AUDIT BT03)은 동작 변경이라 이번 계획에 넣지 않는다(필요하면 별도 기능 변경).

---

## 5. 회귀 테스트 계획

| 수준 | 내용 | 시점 |
|---|---|---|
| 단위 | `Button.test.tsx`(단계 1 신규, 타입 테스트 포함), 단계별 화면 테스트(§2 각 단계 "테스트") | 매 단계 |
| 정적 | `npx tsc --noEmit`, `npm run lint`(B16 규칙 포함), `npm run build`(frontend) | 매 단계 |
| 전체 | `npm test`(frontend 전체 vitest) | 매 단계 |
| E2E | 단계별 관련 spec + 단계 8에 전체 `npm run test:e2e`(E2E 계정 환경변수 필요) | 단계 3~8 |
| 계산값 | Playwright `toHaveCSS`로 sm 36·md 40·lg 48 높이(토큰 치환 검증) | 단계 3 이후 |
| 시각 | 360/768/1024/1440 캡처 전후 비교 | 단계 2-b·4~7 |
| 접근성 | 키보드만으로 각 버튼 도달·실행(링크는 Enter, 버튼은 Enter·Space), 포커스 링 표시, 아이콘 전용 이름(`modal-a11y.spec.ts` 확장 여부는 tester 판단) | 단계 3·6·7 |

테스트 시나리오(요약):
- 정상: 각 버튼 클릭 시 기존 핸들러 호출, 제출 버튼 Enter 제출, 링크 이동 경로.
- 비활성: 본인 신청 承認·却下, 出勤 로딩 전, 退勤済み, 条件 없음, 今月, 페이지 끝, 제출 중(모달 전체 버튼).
- 로딩: 로그인·비밀번호 변경·모달 확정의 Spinner 표시와 문구 유지, 중복 클릭 방지.
- 권한: 시스템 부서 編集·削除·この部署を編集 미표시, 비관리자 CardLink 미표시, 처리 불가 휴가의 承認·却下 미표시.

---

## 6. 09 갱신 예정 사항 (단계 8, 문서 반영 모드)

`docs/UI_BUTTON_PATTERNS.md` §10 변경안 표 그대로 반영한다. 요약:

1. §2.3 버튼 높이 문구(3단계, 44 삭제)·radius 예외 명시·버튼 크기 토큰 행.
2. §3 Button 행(구현 variant 7종·size).
3. §5 신규 항목 11 "버튼 공통 패턴"(`className` 배치 전용·ESLint 포함).
4. §6 `components/Button.tsx` 행 신규, `form.tsx` 버튼 상수 행 삭제(단계 8 삭제 후), 이행 중 문서 반영이 먼저 일어나면 `primaryOutlineButtonClass` 기록(AUDIT X1)·`textButtonClass` 설명(X3), `Modal` footer 판정 표기(X6), `MonthNavigator`·`SectionError`·`Modal`·`TopBar` 값 변경분.
5. 그 밖: `.claude/work/context.md` 공용 모듈에 `Button` 추가(`form.tsx` 버튼 상수·`primaryOutlineButtonClass` "미기록" 표시 제거). SCR-004 명세의 신청 버튼 크기 문구가 있으면 B3 결과로 갱신.

---

## 7. 작업 규모 추정

| 단계 | 파일 수 | 규모 |
|---|---|---|
| 1 | 3(신규 2 + ESLint 설정) | 중 |
| 2 | 3(2-a 3, 2-b 1) | 소 |
| 3 | 8 | 중 |
| 4 | 8 | 중 |
| 5 | 6~9 | 중 |
| 6 | 3 | 소 |
| 7 | 0~수 개 | 검증 위주 |
| 8 | 3~5 + 문서 | 소 |

---

## 8. 진행 상태 (2026-11-14)

작업 기록: `.claude/work/button-refactor/`(구현 `frontend.md` C1~C9, 테스트 `test-report.md` Run 1~11, 리뷰 `review.md` Round 2 APPROVE). 단계 결과는 청크 C1~C9로 진행했다.

### 8.1 단계별 결과

| 단계 | 청크 | 상태 | 결과 요약 |
|---|---|---|---|
| 1 | C1 | 완료 | `components/Button.tsx` 신규(Tailwind 기본 spacing), ESLint `no-restricted-syntax` 3 selector(`files: src/**/*.tsx`). 사용처 0, 화면 변화 없음. `Button.test.tsx` 38건 |
| 2-a | C2 | 완료(단독 커밋) | `globals.css` `@theme`에 `--spacing-btn-*`·`--radius-btn` 추가, 맵을 토큰 클래스로 치환(계산값 동일). 빌드 CSS에 토큰 클래스 생성 확인 |
| 2-b | C3 | 완료 | `SectionError` [再試行] → `Button size="sm"`(px 16→12) |
| 3 | C4 | 완료 | 모달 8파일 footer 전부 `Button`(md), 모달 X = `ghost` 아이콘 전용(radius 4→8). footer 래퍼 무변경 |
| 4 | C5 | 완료 | BT01~03·05~12 이행(44 폐지: 休暇申請·部署を追加·出勤·退勤 lg 48, 条件をクリア md 40, 검색 3곳 lg·아이콘 없음·`sm` 미만 전폭). B3 ①~④ 4폭 측정 통과(Run 5·6) |
| 4 보정 | C5 Fix 1 | 완료 | `SearchInput`이 `inputClass`의 `h-12`와 충돌해 실제 48px이던 문제 수정. **사용자 결정: SearchInput은 44px 유지**(09 §6 기재값). `form.tsx`에 `inputBaseClass` 신설 |
| 5 | C6 | 완료 | 표 행 동작 `Button sm`(勤怠 修正 = `primaryOutline` + Pencil, B10), 사원명 링크·CardLink = `buttonClass({variant:'text'})`, BT04 ログアウト = `text`. `PencilIcon`을 `admin/departments/icons.tsx` → `components/leave/leaveIcons.tsx`로 이동. B10 360 카드·1024 표 측정 통과(Run 7) |
| 6 | C7 | 완료 | 벨 = `buttonClass({variant:'ghost',iconOnly:true})`(radius 8), `MonthNavigator`·출근부 前月·翌月 = `Button iconOnly`(출근부 36→40), 今月 sm→md, 출근부 로컬 `Chevron` 삭제(`leaveIcons` 사용) |
| 7 | C8 | 완료(코드 변경 없음) | 아래 8.2 |
| 8 | C9 + 문서 | 완료 | `form.tsx` 버튼 상수 8개 삭제(사용처 0 grep 확인), `form.test.tsx` 단언을 `Button.test.tsx`로 이전. 09 §2.3·§3·§5-11·§6과 context.md 갱신(문서 반영 모드) |
| 리뷰 보정 | Review Fix 1 | 완료 | `inputBaseClass`에서 좌우 padding·글자 크기도 분리(`inputClass = h-12 px-4 text-base/6 + inputBaseClass`), `SearchInput`은 `h-11 pr-4 pl-10 text-sm/5` 직접 지정(같은 속성 중복 지정 0, 보이는 값 동일). `eslint.config.mjs` 공백 복구 |

### 8.2 단계 7(모바일 반응형) 결과 요약

측정은 읽기 전용 e2e `e2e/button-visual.spec.ts`·`e2e/button-c8.spec.ts`(360/768/1024/1440, 쓰기 요청 차단)로 했다.

- ② PageHeader 한 줄: `/leaves`·`/admin/departments` 제목 높이 = line-height(1행), 버튼 top 차이 < 버튼 높이 → 4폭 통과. 部署を追加 48·条件をクリア 40·出勤·退勤 48 통과.
- ① 모달 footer: 4종(休暇申請·出勤確認·勤怠修正·部署作成)에서 2개 버튼 2열(같은 top) 4폭 통과. 구조상 footer 래퍼 무변경·Button 단일 요소라 D4 판정 불변.
- ③ 카드형 행: 勤怠 修正 360 카드(버튼 한 줄, 행 180)·1024 표(가로 넘침 없음) 통과. 승인·부서 카드 행은 데이터 의존이라 미측정(`flex-wrap` 래퍼 유지).
- ④ 검색 버튼 3곳: `sm` 미만 내용폭과 같은 전폭(286/286) 통과.
- ⑤ 텍스트 링크 터치 영역(B7): BT04 ログアウト 높이 20·최근접 거리 26, BT38 CardLink 높이 20·거리 51 이상 → 24px 원 간격 예외 성립. BT32·33 사원명 링크는 높이 ≥ 24 또는 간격 예외. **`py-0.5` 적용 대상 없음**.
- ⑥ 포커스 링: 修正 버튼은 overflow 래퍼가 없어 잘림 없음. 다른 overflow 래퍼 안 버튼은 미측정.
- 360에서 条件をクリア와 SearchInput은 다른 줄에 배치됨(기록만, 768 이상은 같은 줄·중심 차이 0).
- 미측정: 모달 9종 중 5종(상세 데이터·행 조작 필요), 긴 확정 문구 줄바꿈, 대상 외 BT16·34·40.

### 8.3 머지 전 미검증 항목 (리뷰 #5)

- DB를 쓰는 e2e spec(`leave-calendar-mobile`, `leave-management`, `leaves`, `attendance`, `attendance-status`, `login`, `password`, `dashboard`, `dashboard-renewal`, `approvals`, `departments`·`departments-manager`·`departments-responsive`·`departments-list-modal`·`departments-members-modal`) 미실행.
- `npm run test:e2e` 전체 미실행.
- E4 키보드 도달(링크 Enter, 버튼 Enter·Space, 포커스 링) 미실행.
- `npm run build`: C2 시점 1회만 exit 0, 이후(C3~C9·Review Fix 1) 미실행.
- 실행한 것: 단위 Vitest 54 files 801 passed, `tsc`·`lint` exit 0, 읽기 전용 e2e 6 spec 68 passed(Run 11).

### 8.4 후속 과제 (범위 밖, 미수정)

- `leaves/LeaveHistoryList.tsx` `dateInputClass`(`${inputClass} h-11 px-3 text-sm/5`)가 `inputClass`의 `h-12`·`px-4`·`text-base/6`과 같은 속성을 중복 지정(SearchInput과 같은 유형의 클래스 충돌).
- `iconInputClass`(`pl-11`)를 `inputClass`(`px-4`)와 함께 쓰는 기존 사용처의 padding 중복 지정.
- `e2e/leave-visual.spec.ts` `shouldCaptureScrolledBottomAtPc1440` 간헐 실패(변경 전 기준에서도 실패, 데이터·환경 의존 기존 문제).
- SCR-009 キャンセル이 제출 중에도 활성(AUDIT BT03, 동작 변경이라 범위 밖, §4).

---

## 9. 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v1 | 2026-11-13 | 최초 계획안 |
| v2 | 2026-11-13 | frontend 검토 반영. ① 단계 1을 **`form.tsx` 무변경 가산**으로 변경(별칭 출력 동일 불성립, R1·B15), 별칭 비교 테스트 삭제 ② 단계 2를 "토큰 치환 커밋(B6, `toHaveCSS` 검증) + `SectionError` 단독 이행"으로 재구성(Q10) ③ 모달 X를 단계 6→3으로 이동, Notice X를 단계 6에서 제외(E7) ④ ESLint `className` 규칙을 단계 1에 추가(R2·B16) ⑤ 테스트 누락 보강: `form.test.tsx:46-47`, `svg.animate-spin`(`ConfirmDialog.test.tsx:80,85`·`FormModal.test.tsx:67,72`), `Modal.test.tsx:60`, `DashboardView.test.tsx:337`, `AttendanceView.test.tsx`, e2e `leave-management`·`leave-sidebar-submenu`(E8·Q12) ⑥ 배치 클래스 유지 목록(BT01 `mt-1`, BT10 래퍼 `lg:mt-6` 등, E4·E5) ⑦ 이행 대상 53건 명시(E2) ⑧ B3·B8·B10·B14 확인 조건을 해당 단계에 추가 |
| v3 | 2026-11-13 | **사용자 결정 B1~B17 반영**(전부 권장안). 상태를 확정 계획으로 변경, §0 선행 조건을 완료로 표시, §1 기준을 "결정 기준"으로, 단계 2의 B6 대체 경로(단계 8 연기·미도입) 문구 삭제, 단계 6의 B8 선택지 표현을 결정값으로 정리, 단계 5에 B10 캡처 첨부 조건 명시 |
| v4 | 2026-11-14 | 구현 완료 반영. 상태를 단계 1~8 완료로 변경, §8 진행 상태 신설(변경 이력은 §9로 이동)(단계별 결과·단계 7 결과 요약·C5 Fix 1 SearchInput 44px 사용자 결정·Review Fix 1·머지 전 미검증 항목·후속 과제) 추가 |
