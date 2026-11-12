REVIEW: NEEDS_CHANGES

# frontend 검토 (modal-audit) — 정적 코드 분석만, 서버·테스트 실행 없음

총평: AUDIT의 수치·라인은 거의 정확하다(아래 A1). 모달 누락은 없다. 수정이 필요한 것은 (1) PLAN의 테스트 영향 서술, (2) `busy`의 Esc 차단 설계(단독으로는 보장 불가), (3) `alertdialog` 도입 시 테스트 위험, (4) 단계 1의 범위 쪼개기, (5) D5 문서 판정이다.

## A. 코드 대조

### A1. AUDIT §3·§4 수치 — 동의 (사실 오류 거의 없음)
확인 완료(전부 일치): Modal.tsx 폭 :55-58, size :20, overlay :59, header padding :62, 아이콘 :64-71, 제목 :74-79(`text-xl/7` = `--text-h6` 20/28과 같은 값, globals.css:117-118), subtitle :80-84, X :87-101, body :103-105, footer :108-117. M01 버튼 `h-11 sm:h-12 sm:min-w-32 text-base/6`(DepartmentFormModal.tsx:182-183)·취소 회색(:36-37), FormTable 라벨 셀 `px-3 py-2 sm:px-5 sm:pt-[26px] sm:pb-3` / 값 셀 `px-3 py-3 sm:px-5`(FormTable.tsx:23,35), M04 로컬 buttonClass :56, M08 :110-112, M09 :225-254·:228-230, M05 :277·:273·:330 모두 일치.

수정·보완 제안(경미):
- AUDIT §3 Footer 행: "form variant `sm` 미만 grid-cols-2"는 정확하나, 버튼이 1개/3개 이상이면 2열 그리드가 깨진다(실제 form 사용처 M01은 항상 2개라 문제 없음). D4의 "2버튼일 때만 2열" 제안은 타당 → AUDIT §3 관찰에 "버튼 수 가정" 한 줄 추가 권장.
- AUDIT §3 관찰 3번(Esc): 정확. 추가로 **X 버튼 클릭은 onClose 가드(AttendanceSection.tsx:228)가 먼저 작동해 안전하고, 실제 상태 불일치는 Esc 경로만** 해당한다(`open` effect는 prop 변화에만 반응, Modal.tsx:41-46). 이 구분을 적으면 P5 설명이 더 정확해진다.
- AUDIT §4 M04 8번 "제출 중 취소 버튼은 활성 유지": 정확(DepartmentDeleteModal.tsx:65-71에 disabled 없음).
- AUDIT §5.3 "폼 라벨 타이포 3종" 표기는 모순이다. 표 헤더는 3종인데 내용은 2종(16/24 Bold vs 14/20 Medium)을 설명한다. "2종(+배치 3종)"로 정정.

### A2. 모달 누락 — 없음 / 제외 판정 동의
- `<dialog>`·`showModal`은 Modal.tsx 단 한 곳. `<Modal` 사용처 8파일 + AttendanceSection 인라인 = 구현 단위 9개로 AUDIT와 일치(grep: LeaveApply, DeleteModal, AttendanceEdit, DetailModal, LeaveDay, LeaveDetail, DepartmentForm, Members, AttendanceSection). `window.confirm/alert/prompt` 사용 0건.
- `fixed inset` 오버레이는 AppShell 드로어(:142)·TopBar·MobileTabBar·Toast뿐. 제외 판정에 이견 없음. 드로어는 `<dialog>`가 아니므로 PATTERNS §5.2 "Modal을 거치지 않는 오버레이 금지"가 드로어를 막는 것으로 오독되지 않게 "내비게이션 드로어 제외"를 한 줄 명시하길 권장.
- 모바일 캘린더 인라인 목록(LeaveCalendarView.tsx:204-209는 PC용 `LeaveDayModal`, 모바일은 인라인) 제외 동의.

### A3. D5 (所属社員確認) — 코드가 최신 의도. 확인 가능
- 커밋 60379c3(#24, 최신) 메시지: "デスクトップ:6列の表(社員番号・氏名・入社日・部署・役職・連絡先)と各行の矢印アイコン / モバイル:カード / 1ページ5名のページネーション(モバイルはcompact)". 코드 7열 = 6열 + 화살표 열(DepartmentMembersModal.tsx:212-230, COLUMN_COUNT :30, PAGE_SIZE :33, DESKTOP_QUERY :35).
- 따라서 SCR-010 §5(5열·入社日 없음·내부 스크롤·페이지 없음)는 PR #23 시점 명세로 **낡았다**. PATTERNS D10의 "코드 기준으로 명세 갱신" 권장이 맞다. "확인 필요"를 "PR #24 메시지로 확인됨"으로 바꿔도 된다. 단 "50dvh 내부 스크롤"은 #24에 언급이 없어, Body 스크롤(Modal 공통)로 바뀐 것이 의도인지는 사용자 확인 1건 남음.

## B. 공통화 가능성

### Q1. FormModal — 조건부 동의
- 가치는 있다(frontend.md §2가 "등록 모달은 공통 FormModal 패턴"을 명시). 단 지금 M01·M05 2곳이라 CLAUDE.md "3곳 이상" 원칙과는 SCR-006 예정분을 합쳐야 3곳. **래퍼가 줄이는 것은 footer 2버튼 JSX와 form id 연결뿐**이므로, 최소 구현은 `FormModal = Modal + <form id> + footer(cancel/submit)`로 한정할 것.
- M05는 `onSubmit`이 `handleSubmit(e)`(LeaveApplyModal.tsx:214), M01은 `void handleSubmit(e)`(:213) 형태라 시그니처를 `(e: FormEvent) => void`로 받으면 양쪽 수용 가능.
- M08(입력→확인 단계)은 **FormModal 밖(Modal 직접 + 공통 버튼 클래스)**을 권장. `footer` 덮어쓰기 prop은 FormModal을 "footer를 못 쓰는 Modal"로 만들어 존재 의미를 흐리고, M08은 입력 단계 버튼이 `type="button"`+검증 후 단계 전환(AttendanceEditModal.tsx:143-151)이라 submit 모델이 다르다. 단 입력 단계 본문은 FormRow·FieldHint를 쓰면 일관성은 확보된다.
- 대안(더 얇게): 래퍼 없이 `ModalFooterButtons({cancelLabel,onCancel,submitLabel,submitting,formId?})` 같은 footer 전용 조각 + `form.tsx` 클래스만으로도 M01·M05·M08·M04·M09 전부 커버된다. FormModal vs 이 조각은 architect 판단 사항으로 남김.

### Q2. 외형 안 ①을 md(420) 확인 모달에 적용 — 과하다, 크기별 분기 필요
- md 420에서 padding 32 → 본문 폭 356. M04 확인 문장 + warning Notice는 줄바꿈이 늘고 헤더(제목 24)가 본문보다 두드러진다. 현재 확인 모달은 코드상 가장 가벼운 유형.
- 구현은 쉽다: Modal.tsx:76 한 곳 `size === 'md' ? 'text-h6' : 'text-h6 sm:text-h5'`(+ padding도 size별이면 :62·:104·:109에 3곳). 복잡도는 낮으나 **"size가 외형 토큰까지 결정"하는 결합**이 생긴다. 또 M06 확인 단계는 lg 폭(단계 전환 폭 고정 규칙)이라 제목이 24px가 되어 독립 확인(M04·M09, 20px)과 달라진다 → PATTERNS §3.4 "독립형 md, 단계형은 부모 폭 유지"와 결합하면 확인 모달 제목이 2종이 된다. 시안 확인 전에 안 ①(전체 form 계열)을 권장 확정하지 말고, "md만 padding 28·제목 20"을 대안 ①'로 병기할 것.

### Q3. 네이티브 `<dialog>` 동작 — 정적으로 확정 불가 항목 있음 (구현 근거 위주)
- (a) 초기 포커스: showModal은 DOM 순서상 첫 포커스 가능 요소를 포커스한다. 헤더가 본문보다 앞이므로 **X 버튼**(Modal.tsx:87). 확인 모달에서 Enter 연타 시 X(닫기)가 눌리는 위험이 있다. 대안: 확인류에서 주 버튼/취소 버튼에 `autoFocus`를 두면 HTML `autofocus` 처리가 아니라 React가 commit 시 `focus()`를 호출하는데, 이때 dialog가 아직 `open` 전(display none)이라 **무시된다**. 따라서 Modal에서 `showModal()` 직후 `dialog.querySelector('[data-autofocus]')?.focus()` 같은 명시 처리가 필요. 단 M06 reject 단계 textarea `autoFocus`(LeaveDetailModal.tsx:294)는 단계 전환 시점에 이미 open이라 정상 동작한다(이 때문에 현재 문제가 안 드러남).
- (b) 포커스 복귀: HTML 명세상 `close()`는 showModal 시점의 이전 포커스 요소로 복귀한다. 다만 열 때 사용한 버튼이 닫힌 뒤 unmount/disabled되는 경우(M09 출근 후 버튼 교체 등)는 body로 떨어진다. 실측 필요(실행 금지 범위라 미검증).
- (c) Esc 차단: **`cancel` preventDefault 단독은 보장되지 않는다.** Chrome(close watcher)은 사용자 조작 없이 연속 Esc를 누르면 두 번째 cancel을 취소 불가로 처리한다. 권장 설계: ① `onCancel`에서 busy면 preventDefault, ② **`onClose`(네이티브 close 이벤트)에서 busy이면 `ref.current.showModal()`로 다시 열고 호출부 `onClose`를 부르지 않음**(상태 재동기화 안전망). ②가 Modal 하나에만 들어가므로 호출부는 `busy`만 넘기면 된다. 포커스는 재오픈으로 첫 요소로 가지만 제출 중이라 허용 가능.
- 테스트 주의: vitest.setup.ts:10-16의 showModal/close는 개폐만 흉내 내며 cancel 이벤트·Esc를 재현하지 않는다. busy 테스트는 `fireEvent(dialog, new Event('cancel', {cancelable:true}))`로 `defaultPrevented`를 단정하고, 안전망은 `fireEvent(dialog, new Event('close'))` 후 `open` 속성 재설정을 단정한다. 실제 브라우저 연속 Esc는 Playwright e2e 1건으로만 검증 가능.

### Q4. `role="alertdialog"` — 이번 범위에서는 보류 권장
- ARIA상 `<dialog role="alertdialog">`는 허용되나, **`getByRole('dialog')`가 alertdialog를 매칭하지 않는다.** 영향: DashboardView.test.tsx:388, :406, DepartmentsView.test.tsx:216·221·226·310·314 등. 특히 `queryByRole('dialog')... not.toBeInTheDocument()`(DashboardView.test.tsx:406, DepartmentsView.test.tsx:216,226)류는 role이 바뀌면 **항상 통과하는 무의미한 테스트로 변질**한다. e2e `getByRole('dialog')` 35곳(예: dashboard-renewal 7, departments 5, departments-list-modal 5)도 M04·M09 대상분은 수정 필요.
- 이점(스크린 리더가 즉시 낭독)은 크지만 단계형(M06·M08)과 불일치 문제가 생긴다. 도입한다면 `tone="danger"`만, 테스트는 role 상수를 한 곳(`getByRole('alertdialog')` 헬퍼)으로 일원화.

### Q5. subtitle / description — `subtitle` 유지 권장
- 호출부 이행 비용: `subtitle=` 사용처는 M01(설명문→`description`), M03(배지, 변경 없음) 2곳뿐(DepartmentFormModal.tsx:190, DepartmentMembersModal.tsx:319). 이름 변경(`headerExtra`)은 M03 1곳 추가 수정이라 비용도 작다. 다만 변경 이득이 낮고 09 §6에 `subtitle` 기록이 있으므로 **`subtitle` 유지 + `description` 신규 + variant 폐지 시 subtitle 스타일은 "mt-1, 무스타일" 단일화**가 가장 단순하다. 단 `description`과 `subtitle` 동시 지정 시 배치 규칙(description 아래 subtitle?)을 PATTERNS에 명시할 것.
- `aria-describedby`는 `useId()`로 descriptionId를 만들어 description이 있을 때만 dialog에 연결(`aria-describedby={description ? descId : undefined}`).

### Q6. Danger 채움 버튼 — 신규 토큰 없이 가능
- globals.css에는 `--color-danger-100`, `--color-danger-30`만 있다(:34-35, `danger-90` 없음). Tailwind 4는 `@theme` 색에 `/90`을 color-mix로 지원하므로 `hover:bg-danger-100/90` 가능. 기존에도 `general-100/50` 투명도 변형이 있어(Modal.tsx:59) 규칙 위반이 아니다.
- 제안값: `rounded-lg bg-danger-100 font-bold text-white hover:bg-danger-100/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-100 disabled:cursor-not-allowed disabled:bg-danger-100/50`(Primary의 disabled `bg-primary-60`과 같은 "옅은 동색" 방식). PATTERNS §4.3의 `bg-danger-30 text-danger-100/60`(옅은 배경+옅은 글자)은 disabled 표현이 Primary와 달라 비추천. 대비는 흰 글자/옅은 적색이라 disabled 예외 범위이나, 09 접근성 기준에 "disabled 대비 예외"가 있는지는 architect 확인.

### Q7. `ConfirmMessage` — export 불필요, 클래스 상수 권장
- 문장 요소는 `<p className="text-general-100">`(LeaveDetailModal.tsx:277, AttendanceEditModal.tsx:159, AttendanceSection.tsx:253)로 클래스 하나뿐이고, M04는 `break-words`가 추가로 필요(DepartmentDeleteModal.tsx:86). 컴포넌트화하면 props로 `breakWords` 같은 분기가 생겨 CLAUDE.md "단일 사용 추상화 금지"에 반한다. `form.tsx`에 `confirmMessageClass = 'break-words text-general-100'` 상수 1개로 충분(`break-words`는 다른 문장에도 무해).

### Q8. FieldHint·CharCount — 동의, 단 시각 차이가 생김
- `length`를 prop으로 받는 설계는 문제 없다. 계산 차이 실재: M01 `description.length`(DepartmentFormModal.tsx:184, 검증 :106-107도 `.length`) vs M05·M06 `[...reason].length`(LeaveApplyModal.tsx:88·102, LeaveDetailModal.tsx:140·285). M01은 서러게이트 페어(이모지)가 2로 계산되어 서버가 코드포인트 기준이면 검증 불일치 가능 → 로직 변경이라 이번 범위 밖이며 **별도 이슈로 기록**만 권장.
- 시각 차이: M01 카운터는 우측 단독 `mt-2`(AUDIT :285-292), M05·M06은 `mt-1` + 오류 좌측. CharCount 통일 시 M01 카운터 간격이 8→4로 바뀐다(의도한 통일이면 PLAN에 명시). `CharCount`는 `aria-describedby` 대상이므로 `id`는 필수 prop로 유지, 초과 시 `font-medium text-danger-100` 규칙도 내장.
- `FieldHint`: M05 :281은 `id`가 없다(aria-describedby 미연결). 추출 시 `id`를 optional로 두거나 M05도 describedby에 연결할지 결정 필요(접근성 개선이지만 동작 변경 아님).

### Q9. FormRow `labelId` — 필요, 소규모 확장
- 현재 `htmlFor`가 필수(FormRow.tsx:11). M05의 읽기 전용 행 2개(:273, :330)는 `labelId`(`<span id>`) 방식이라 FormRow가 `htmlFor?`/`labelId?` 둘 다 받아야 한다(FormTableRow.tsx:12-14, :24-33과 동일 패턴을 복사). 둘 다 없으면 타입 단계에서 막기 어려우므로 `htmlFor`와 `labelId` 중 하나 필수(유니온 타입)로 정의.
- 추가 주의: FormRow의 라벨 `sm:pt-3`(FormRow.tsx:19)은 48px 입력 기준 정렬이다. 일수 박스(`py-3`+24=48, M05 :277)는 맞지만, 자동 승인 문단(`min-h-12 items-center text-sm/5`, :331)은 라벨 baseline이 어긋난다(라벨 16/24 vs 문단 14/20) → 박스·문단 스타일을 FormRow 안에서 같이 정리해야 한다.
- 또 M05는 `Select`(:217)·`ApproverSelect`·textarea(라벨 `sm:pt-3`로 1행 정렬, FormRow 주석 :5와 일치)를 쓴다. 라벨 열 `8.5rem`(136) → lg(640) 모달에서 입력 폭이 줄어든다(640-64-136-16=424). 날짜 입력은 문제없음.

## C. 리팩터링 계획

### C1. 난이도·변경 파일 — 대체로 현실적, 보정 필요
| 모달 | PLAN | 제 평가 | 사유 |
|---|---|---|---|
| M01 | 중 | **중** | form→공통 클래스 교체는 쉽다. 단 e2e 3개(departments-manager·departments-responsive·departments)의 폭/버튼 가시성 단정 확인 필요 |
| M02 | 하 | 하 | |
| M03 | 중 | 중 | 외형만이면 하. 스크린샷 15장(departments-members-modal.spec.ts)이 부담 |
| M04 | 하 | 하 | `DepartmentsView.test.tsx`의 삭제 케이스(제출 중 취소 disabled 신규 단정 필요) |
| M05 | 중 | **상** | FormTable→FormRow는 라벨 타이포·열 폭·행 구분선 소멸로 최대 시각 변화 + `labelId` 확장(Q9) + `leave-visual.spec.ts`(5)·`leaves.spec.ts`(4)·LeaveApplyModal.test(구조 비의존이라 통과 예상) |
| M06 | 상 | 상(단, 호출부 5곳 **코드 변경은 없음**) | 4단계 + 확인 폭 정책 + 테스트 93건의 role/dialog 단정(LeaveDetailModal.test.tsx) |
| M07 | 하 | 하 | |
| M08 | 중 | 중 | `AttendanceEditModal.test.tsx` 존재(PLAN 기재 맞음). 입력 단계 레이아웃을 FormRow로 바꿀 때 `labelClass` 스택→좌우 2열이 md(420)에서 좁다(420-64-136-16=204px 입력 폭, datetime-local 입력 불가능 수준) → **M08은 FormRow 전환 비추천, 라벨 위 스택 유지가 현실적**(PATTERNS D2 "표준 1개"와 충돌, 예외 조항 필요) |
| M09 | 하 | 하~중 | 인라인 → ConfirmDialog 이동 시 `submittingRef`·`pending`·409 재조회 로직의 위치 정리 필요. DashboardView.test.tsx 36건 role 단정 |

- **누락된 테스트·호출부**: `FormTable.test.tsx`·`DetailTable.test.tsx`(PLAN 단계 6의 FormTable 삭제 시 테스트 파일도 삭제/수정 필요), `AdminAttendanceView.test.tsx`(M08 호출부), `LeaveManagementLayout.test.tsx`(M05 호출부), `LeaveCalendarView.test.tsx`(M07 호출부, PLAN은 단계 4에만 기재 — 맞음).
- **R3(클래스 단정 약 20곳) 과대 서술**: 실제 Modal 외형(크기·overflow·border-t)을 단정하는 곳은 `Modal.test.tsx` :42,45,51-53,59,61,37 약 7곳뿐. `DepartmentMembersModal.test.tsx` 5건·`LeaveDetailModal.test.tsx`의 `toHaveClass`는 Badge·`break-words`·`whitespace-pre-wrap`(:644-665)로 모달 외형과 무관. R3을 "Modal.test.tsx 7곳 + 역할 단정 의존"으로 정정.
- **Modal.test.tsx 영향 구체화**: footer 테스트(:56-62)는 `実行` 버튼의 `parentElement`가 `border-t`를 갖는지 본다. D4(구분선을 본문 폭 안쪽 `sm:border-t`로 통일)로 바꾸면 `border-t`가 아니라 `sm:border-t`라 **그대로 실패**한다. 이 테스트는 "footer 구분선 존재"의 의도라 부모 클래스 단정 대신 footer 영역에 `role="group"` 등 의미 속성을 두고 단정하는 편이 낫다(C3 참조).
- **e2e 스크린샷 38곳/11스펙**(PLAN R2): grep로 확인한 값과 일치(`toHaveScreenshot|.screenshot(` 38건). 다만 이것들이 비교(`toHaveScreenshot`)인지 저장(`.screenshot(`)인지 PLAN이 구분하지 않았다 — 비교형이면 "기준 갱신", 저장형이면 수동 검토만 필요하다. 단계 1 착수 전 분류 필요.

### C2. 순서 — 단계 1 먼저는 위험, 쪼개기 권장
- 단계 1이 "9개 모달 외형 일괄 + 버튼 클래스 + 신규 부품"을 한 PR로 묶는다. 외형(시각적 대변경, 사용자 합의 필요)과 순수 가산 변경(`description`·`busy`·`FieldHint`·`CharCount`·disabled 스타일·`modalDangerButtonClass`)은 위험도가 다르다.
- 제안 순서:
  1. **단계 0'**: 가산 전용 PR — `Modal.description/busy`(+close 안전망, Q3), `form.tsx` 신규 클래스·부품. 기존 모달 외형 무변경. `Modal.test.tsx` 신규 테스트만 추가. (리스크 낮음, 사용자 결정 D1~D5 불필요)
  2. `ConfirmDialog` + M09·M04 적용(사용자 가시 변화는 삭제 버튼 색·제출 중 Esc 차단뿐, 파괴적 동작 버그 해소 가치 높음).
  3. 외형 통일(D1) — 시안 승인 후 별도 PR(`variant` 제거 포함).
  4. M01→M05→M08 폼 정리, 5. M03·M07·M02·M06 정리, 6. 정리·회귀.
- 근거: D1~D5가 미결인 동안에도 1·2는 진행 가능하고, 외형 PR의 스크린샷 리뷰가 순수하게 "외형"만 보게 된다.

### C3. 클래스 단정 테스트 → 역할·접근성 기반 — 동의
- 변환 대상은 Modal.test.tsx의 `max-w-*`·`overflow-y-auto`·`border-t` 단정. 권장: ① 폭은 시각 회귀(e2e viewport)로 넘기고 단위 테스트에서는 삭제하거나 `size`별 `data-size` 속성 단정, ② 스크롤 영역은 `role="region"`을 붙이지 않고 `data-testid`/`aria-labelledby` 없이 CSS 의존이라 "본문 영역만 overflow"는 e2e로, ③ footer 구분선은 시각 요소라 단위 테스트 가치가 낮다. 다만 "기대값을 구현에 맞추는 변경"(testing-rules §10)이 되지 않도록 PR에 의도(외형 방침 변경)를 명시.
- 동시에 보강할 단정: `aria-describedby` 연결, `busy` 시 X disabled·`cancel` preventDefault·close 안전망.

## D. `.claude/agents/frontend.md` 규칙과의 충돌 여부
- 충돌 없음, 방향이 일치: §2 "등록 모달은 FormModal, 상세 모달은 DetailModal 패턴" ↔ PATTERNS는 **DetailModal·ListModal 래퍼를 만들지 않는다**(§4.1). frontend.md의 "공통 DetailModal 패턴"은 "컴포넌트"가 아니라 "패턴(규칙+부품)"으로 읽으면 충족되지만, 문구가 컴포넌트 재사용을 암시하므로 PATTERNS §4.1에 "DetailModal/ListModal은 컴포넌트가 아닌 패턴 문서+부품 조합"을 명시해 에이전트가 오해하지 않게 할 것.
- §3(레퍼런스 충돌 시 임의 스타일 금지·Architect 보고) ↔ REFACTOR_PLAN §7 예외 절차와 일치. 이번에 variant="form"이 화면 단위로 들어온 경위(AUDIT §8-2)가 바로 §3가 막으려는 사례다.
- §5(Playwright 데스크톱·모바일 스크린샷 비교) ↔ PLAN §6 시각 검증과 일치. 단 PLAN의 해상도(360/768/1024/1440)와 frontend.md의 "모바일 약 375px"가 다르다 → 360으로 통일할지 명시.
- 보완 제안: frontend.md §4의 "문서 갱신 예정"에 "신규 모달은 PATTERNS의 유형(A~D)을 먼저 선언" 한 줄 추가를 사용자와 상의(사용자 작성 중이므로 수정하지 않음).

## 사용자 결정에 영향 주는 핵심 제안 (요약)
1. `busy`는 `cancel` preventDefault + `close` 이벤트 재오픈 안전망 2중으로(Q3).
2. `alertdialog`는 이번에는 도입하지 않는다(Q4, 테스트 의미 변질 위험).
3. M08은 FormRow 대신 라벨 위 스택 유지(420폭 입력 204px 문제) → D2 "표준 1개"에 예외 규정 필요.
4. 단계 1을 "가산 PR"과 "외형 통일 PR"로 분리(C2). ConfirmDialog를 외형 통일보다 먼저.
5. 확인 모달(md)에 form 계열 padding 32·제목 24는 과함 → D1 안 ①'(md만 축소) 시안 병기(Q2).
6. `ConfirmMessage` 컴포넌트화 불필요, 클래스 상수(Q7). Danger hover는 `danger-100/90`로 신규 토큰 불필요(Q6).
7. D10(SCR-010 정본)은 PR #24 메시지로 "코드가 최신"이 확인됨(A3).
