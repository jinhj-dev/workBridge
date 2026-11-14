# 버튼 공통 UI 패턴 — frontend 보조 검토

> 검토 대상: `docs/UI_BUTTON_AUDIT.md` / `UI_BUTTON_PATTERNS.md` / `UI_BUTTON_REFACTOR_PLAN.md`, 질문 `questions-for-frontend.md`(Q1~Q12).
> 코드·docs는 수정하지 않았다. 근거는 `frontend/src/` 기준 `파일:라인`(접두 생략). 확인 방법: 소스 직접 열람 + grep. 빌드·테스트·화면 실행은 하지 않았다(미검증).

---

## 0. 선행 확인 (결론에 영향이 큰 사실)

| # | 사실 | 근거 |
|---|---|---|
| F1 | `tailwind-merge`·`clsx`·`class-variance-authority` **모두 미설치**. Tailwind `^4`, React 19.3 | `frontend/package.json` (grep 결과 `tailwindcss`·`react`·`next`만 출력) |
| F2 | Modal footer D4 판정은 **CSS `:has()` 직접 작성이 아니라 Tailwind `has-[>:only-child]`·`has-[>:nth-child(3)]`** (grid 컨테이너 직계 자식 수) | `components/Modal.tsx:134` (`globals.css:124`의 `:has`는 `html:has(dialog:modal)` 스크롤 잠금용으로 무관) |
| F3 | `--spacing` 기본값 재정의 없음 → `h-btn-md`(2.5rem) = `h-10`(`calc(var(--spacing)*10)` = 2.5rem). 값은 같지만 **클래스 문자열은 다르다** | `app/globals.css` (`--spacing:` grep 0건), `@theme` 선례는 `:72-75` `--radius-notice`·`--spacing-notice-*` |
| F4 | 버튼 리터럴 수: `<button` 69줄 / `<Link` 11줄 = AUDIT 80건과 일치 | grep (`<button` 69, `<Link` 11, `<a ` 0) |
| F5 | Spinner 사용 버튼 7곳(LoginForm:159, PasswordChangeForm:183, ConfirmDialog:71, FormModal:64, LeaveDetailModal:207·243, AttendanceEditModal:135) = AUDIT와 일치. 테스트가 `button.querySelector('svg.animate-spin')`로 찾는다 | `ConfirmDialog.test.tsx:80,85`, `FormModal.test.tsx:67,72` |

---

## 1. Q1~Q12 답변

### Q1. `buttonClass()`로 기존 상수 8개와 출력 클래스 집합을 동일하게 — **조건부 가능 / 난이도 중 / 위험 중**

그대로(PATTERNS §4.3 설계 그대로)는 **불가**하다. 어긋나는 지점:

| 어긋남 | 상수(라인) | 설명 |
|---|---|---|
| 공통 기반 추가 | P·S·PO·DO·T (`form.tsx:52-65,77`) | 현행엔 `inline-flex items-center justify-center whitespace-nowrap select-none`가 **없다**. §4.3 "공통 기반"을 넣으면 클래스 집합이 달라진다. `whitespace-nowrap`·`select-none`은 표시도 달라진다(아래 위험 R3) |
| `flex` vs `inline-flex` | MP·MS·MD (`form.tsx:68-72`) | 모달 상수는 `flex`, 설계는 `inline-flex`. 모달 footer는 grid/flex 자식이라 레이아웃은 같지만 클래스 집합은 불일치 |
| radius | T (`form.tsx:78`) | `rounded`(4). 설계의 공통 기반이 radius 8을 갖고 있으면 text variant에서 덮어써야 함. **radius는 base가 아니라 variant 문자열에 둬야** 한다 |
| 포커스 색 | MD (`form.tsx:72`) | `outline-danger-100`. variant 문자열에 포함하면 표현 가능(P 확장 불필요) — 문제 없음 |
| disabled 유무 | P·S·T | 단계 1(동일)과 단계 2(disabled 내장)를 나누면 variant 문자열을 두 번 바꾸게 된다 |
| 크기 | P·S·PO·DO·T | 크기 없음. 별칭은 `size` 미지정 모드가 필요 → `buttonClass`에 "크기 없음" 경로가 생긴다(설계에 없는 옵션) |

권장 대안(난이도 중):
1. `Button.tsx` 내부를 `variantClass`(색·hover·focus·radius·disabled) / `sizeClass` / `baseClass` 3개 맵으로 분리하고, `form.tsx` 별칭은 "variant 문자열(+ 모달은 md 크기 문자열)"을 참조한다. 단계 1은 **기존 화면 무변경 가산**(Button 신규만, `form.tsx`는 건드리지 않는다)으로 하고, 별칭 전환은 단계 3·4 PR과 함께 또는 단계 8에서 한다. 그러면 "클래스 집합 동일" 요구 자체가 필요 없어진다.
2. 동일성 비교 테스트를 쓰려면 PO·DO·MD처럼 disabled가 이미 들어있는 variant만 대상으로 하고, P·S·T는 단계 2에서 disabled를 추가한 뒤의 문자열을 새 기준으로 정한다. 즉 **단계 1·2를 한 PR로 합치는 편이 중복 작업이 없다.**

B6(토큰) 시 "동일 출력" 기준: **계산값 동일**(2.5rem)로 본다. 클래스 집합 비교 테스트는 `h-10` → `h-btn-md`에서 반드시 깨진다. jsdom은 Tailwind CSS를 로드하지 않아 계산값 검증이 불가능하므로, 방법은 (a) B6을 단계 1 이전 별도 커밋으로 분리해 "h-10 그대로" 상태에서 동일성 테스트를 통과시킨 뒤 토큰으로 치환하거나, (b) 단계 1에서는 토큰 대신 기본 spacing으로 구현하고 B6을 단계 8로 미룬다(PATTERNS §3.3이 "정의 위치 1곳"이면 어느 쪽이든 허용한다고 명시). 시각 확인은 Playwright `toHaveCSS('height','40px')` 같은 계산값 단언이 필요하다. 또한 Tailwind는 소스 문자열을 정적으로 스캔하므로 ``h-btn-${size}`` 같은 **동적 조합은 CSS가 생성되지 않는다** — 맵에 완전한 리터럴(`'h-btn-md px-btn-x-md ...'`)로 써야 한다.

### Q2. 아이콘 전용 판별 유니온 — **가능 / 난이도 하~중 / 별도 prop(`iconOnly`) 판별자가 더 단순**

- `children?: undefined` 판별은 `ButtonHTMLAttributes`가 이미 `children?: ReactNode`를 가져 `Omit<…, 'children'>` 후 재정의해야 한다. `{cond && 'text'}`처럼 `false`가 `children`에 들어오면 "텍스트 버튼인데 비어 있음"과 "아이콘 전용"을 런타임에서 구분할 수 없다(타입은 통과).
- `aria-label`은 `ButtonHTMLAttributes`에서 이미 optional `string`이라 `& { 'aria-label': string }` 교차는 충돌 없이 required가 된다. React 19라 `ref`는 `ComponentPropsWithRef<'button'>`로 받으면 된다.
- 권장: 리터럴 판별자 `iconOnly: true`(→ `icon`·`aria-label` 필수, `children` 금지) | `iconOnly?: false`(→ `children` 필수). 함수 내부 분기가 명확하고 오용이 컴파일 오류로 잡힌다. PATTERNS §9.1 말미("iconOnly 불필요할 수 있다")의 질문에는 "prop 유지 권장".
- 주의: `buttonClass({iconOnly})`(Link용)는 `aria-label` 강제가 없다 → Link 아이콘 전용(벨, TopBar.tsx:58)은 리뷰/ESLint로 보강 필요.

### Q3. Button이 `<button>` 단일 요소일 때 footer D4 판정 — **유지됨 / 난이도 하 / 위험 하**

- 판정 대상은 `Modal.tsx:134` grid의 **DOM 직계 자식**이다. React 함수 컴포넌트는 DOM 노드를 추가하지 않으므로 `Button`이 `<button>`만 반환하면 자식 수는 불변. `icon`·`Spinner`를 감싸는 `span`은 button 안쪽이라 영향 없음(질문 가설 맞음).
- 단 조건: Button이 Fragment/래퍼 `div`/Tooltip 래퍼를 반환하지 않을 것. 조건부 렌더(`{canEdit && <Button/>}`, `DepartmentDetailModal.tsx:34`)는 `false`가 DOM을 만들지 않아 현행과 같다.
- `inline-flex` vs 현행 `flex`: grid/flex 자식은 blockify되어 레이아웃 동일.

### Q4. `disabled:hover:bg-primary-60`의 필요성 — **불필요(과잉 지정), 다른 Primary에 버그 없음**

- Tailwind 4의 variant 정렬은 `hover` → `focus` → `active` → `enabled` → `disabled` 순이라 `disabled:`가 `hover:`보다 **뒤**에 출력된다. 둘의 specificity가 같은(`:hover`/`:disabled` 모두 0,2,0) 상태에서 후자가 이기므로 `disabled:bg-primary-60`만으로 disabled hover 시 색이 바뀌지 않는다. `ApprovalsView.tsx:53`의 `disabled:hover:bg-primary-60`은 중복.
- BT01(`LoginForm.tsx:157`)·BT02(`PasswordChangeForm.tsx:181`)·BT07(`AttendanceSection.tsx:109`)은 `disabled:bg-primary-60`만 있고 정상 동작 가능(코드상). 실제 hover 색 비교는 브라우저로 확인하지 않았다(미검증).
- 반대로 **S·PO·DO는 `disabled:hover:bg-white`가 필요**하다: disabled는 배경 변경이 없어 `hover:bg-general-30`이 그대로 적용되기 때문(`form.tsx:61,65`, `ApprovalsView.tsx:139`). 새 `buttonClass`는 `hover:`를 `enabled:hover:`로 감싸면(Tailwind 4 `enabled:` 변형) 쌍으로 쓰는 `disabled:hover:*`를 없앨 수 있다. 다만 클래스 문자열이 바뀌므로 Q1의 동일성 테스트와 충돌 → 단계 2 이후에 적용.

### Q5. B3 권장(44 폐지) 영향 — **조건부 가능 / 난이도 하 / 위험 중(시각)**

- ① 「休暇申請」 lg: `PageHeader`는 `action`이 `shrink-0`, 제목 `truncate min-w-0`(`PageHeader.tsx:19-25`). 360폭에서 버튼 폭 ≈ px 48 + 아이콘 20 + 간격 8 + 4글자×16 ≈ 140. 제목 영역은 360 − 좌우 padding − 140 − gap 12 − 아이콘 24 − gap 8 정도 → 「休暇管理」(22px×4=88)는 들어가는 계산이다. 실제 `LeaveManagementLayout.tsx:62-70` 화면 폭 검증은 필요(미실행).
- ② 「部署を追加」 40→48: `PageHeader`는 `items-center`라 헤더 높이는 최대 아이콘 24/32·제목 30/36 → 버튼 48이 행 높이를 결정한다(+8px). SCR-010 하단 `gap-2` 구조라 눈에 띄는 변화는 있지만 깨지진 않는다. 글자 14→16 + `sm:px-6`→항상 24, 360폭에서 「部署を追加」 5글자 ≈ 156으로 제목 폭이 약 112 → 「部署管理」(88) 가능하나 여유 24. 360 확인 필수.
- ③ 「条件をクリア」 44→40: 컨테이너가 `flex flex-wrap items-center gap-2`(`DepartmentsView.tsx:516`)라 세로 중앙 정렬되어 4px 차는 위·아래 2px씩. `SearchInput`(`h-11`, `SearchInput.tsx:34`)·정렬 `select`(`h-11`, `:529`)와 같은 줄에서 **중앙정렬이라 허용 범위로 보이나 입력창 상·하 선과 불일치**가 생긴다. 이견 후보: 조건 클리어 버튼을 md 대신 입력창 높이에 맞추는 것이 시각적으로 낫다 → B3에서 "예외 유지"가 아니라 **입력창을 44→40으로 줄이는 쪽**은 입력 규칙(09 §2.3 입력 44?) 변경이라 범위 밖. 결론: 40 + `items-center`로 진행하되 캡처로 사용자 확인.

### Q6. B10 `PencilIcon` 위치 — **cross import 가능 / 이동은 선택 / 난이도 하**

- 현재 `departments/icons.tsx`의 `PencilIcon`은 `DepartmentsView.tsx:33,135` 1곳, `TrashIcon`은 `DepartmentsView`·`DepartmentDeleteModal.tsx:9,58` 2곳에서 쓴다. 이 파일을 import하는 곳은 모두 `admin/departments/` 안(6파일).
- 勤怠(`admin/attendance/AdminAttendanceView.tsx`)가 `@/app/(app)/admin/departments/icons`를 import하는 건 라우트 간 의존이라 구조상 어색하나 동작상 문제 없음.
- 권장: **이번 범위에서는 cross import 하지 않고** Pencil만 `components/leave/leaveIcons.tsx`(이미 `PlusIcon`·`SearchIcon`·`Chevron*` 공용 사용, 같은 `Icon` 래퍼·`size-full` 기본)에 같은 path로 복제/이동. 단 `leaveIcons.tsx` 헤더 주석이 "休暇管理用"이라 위치가 어울리지 않는다. 장기적으로 공용 `components/icons/`를 만드는 것은 아이콘 위치 4곳(`leaveIcons`·`dashboard/icons`·`navIcons`·`departments/icons`)을 한꺼번에 다룰 때 한다.
- 이동 시 수정 범위: `departments/icons.tsx`(Pencil 삭제), `DepartmentsView.tsx:33` import, 신규 위치 + `AdminAttendanceView`. 3파일. 선 굵기도 확인: `leaveIcons`는 `strokeWidth 1.75`, 출근부 로컬 `Chevron`은 2(`AttendanceSheetView.tsx:43-54`), `departments` 쪽은 미확인(Pencil 16px 렌더 시 굵기 차 검증 필요).

### Q7. B8(월 이동 40) — **가능 / 난이도 하 / 위험 하~중**

- `attendance-sheet-layout.spec.ts`의 높이 단언은 **표 행**(`:77` `box.height-36`, `:79` 좌우 행 일치)·`scrollWidth`이고 월 이동 버튼 크기를 단언하는 곳은 grep으로 찾지 못했다. 헤더 행이 +4px 높아져 표 위치가 내려갈 뿐이다. 다만 `:43,67` 문서 오버플로(세로 스크롤 아님)·뷰포트 1366×768에서 "스크롤 없이 한 화면" 같은 암묵 가정이 있는지는 spec 전체를 읽지 않았다 → tester 확인 필요.
- 출근부 헤더: `AttendanceSheetView.tsx:379-412`는 `gap-1 sm:gap-2`, 월 라벨 `text-base/6 font-medium`; `MonthNavigator.tsx:20`은 `gap-3`, `text-lg/7 font-bold`. **B8은 버튼 크기만 통일하는데 두 곳의 간격·라벨 서체는 계속 다르다.** PATTERNS §5.7은 "월 라벨 간격 12(현행 MonthNavigator)"만 기록 → 출근부 쪽은 누락(B8 범위 확장 여부 결정 필요).
- 로컬 `Chevron`(strokeWidth 2) → `leaveIcons` Chevron(1.75): 굵기 0.25 차는 20px 표시에서 거의 식별 불가라 수용 가능(눈으로 확인한 것은 아님, 수치 판단). 경로 좌표 동일(`m15 6-6 6 6 6`).
- 휴가 캘린더 쪽 `MonthNavigator.tsx:10`은 `flex size-10`이고 `aria-label`·`<span aria-hidden size-5>` 래핑 구조라 Button `icon` 슬롯과 거의 동일 → 이행 난이도 낮음.

### Q8. 텍스트 버튼 히트 영역 24 — **가능 / 난이도 중 / 위험 중**

- `Card` 헤더는 `min-h-7`(=28)·`items-center`(`Card.tsx:24`)라 높이 20 → `py-0.5`(24)로 늘려도 28 안에 들어가 **Card 헤더 높이는 변하지 않는다**(CardLink 5곳). 표 행은 셀 padding이 크므로 무영향으로 보이나, `PasswordChangeForm.tsx:200`(`mt-4` 단독), `AdminAttendanceView.tsx:168,203`(표 셀/카드 이름)은 줄 높이가 20→24가 되어 행 높이가 4px 변할 수 있음(표 행이 `h-9` 고정이면 무영향, 미확인).
- `py-0.5` 방식(상·하 2px)은 단순하고 포커스 아웃라인도 함께 커져 시각적으로도 정상. 의사 요소(`relative after:absolute after:-inset-y-0.5`)는 `relative`를 강제해 `className`의 `absolute`/`relative` 배치와 충돌하고, 인접 요소 위로 히트가 겹쳐 오히려 오탭을 만든다 → **권장은 padding**. 단 포커스 링이 padding 포함 박스를 감싸므로 현행 대비 약간 커진다.
- WCAG 2.5.8은 "24px 미만이어도 주변에 24px 원이 겹치지 않는 간격"이면 허용되므로, 가로로 충분히 떨어진 단독 링크는 padding 없이도 만족할 수 있다(`CardLink`는 헤더 우측 단독). 요건을 만족하는 곳만 padding을 넣는 방안도 있다.
- 사원명 링크(`AdminAttendanceView`)에 text variant의 `inline-flex`+`whitespace-nowrap`이 들어가면 긴 이름이 셀에서 넘친다(R3).

### Q9. `loading` 시 앞 아이콘 → Spinner 대체 — **가능 / 난이도 하 / 위험 하**

- 현재 아이콘 + loading 동시 사용 0건(AUDIT 5.3과 일치: loading 7곳은 모두 아이콘 없음). 대체 규칙은 사용처가 없어 **지금은 불필요한 일반화**다. 현행 "앞에 Spinner 추가만"이 단순하다(CLAUDE.md §2).
- 단 sm(아이콘 16)에서 Spinner는 `size-5` 고정(`Spinner.tsx`)이라 크기 불일치가 생긴다. Button이 Spinner를 아이콘 슬롯 안에 넣고 `[&>svg]:size-full`로 슬롯 크기를 따르게 하면 해결되나, 이 경우에도 테스트의 `svg.animate-spin` 선택자는 유지된다(`Spinner` 컴포넌트와 `animate-spin` 클래스를 그대로 쓸 것).
- 권장: 단계 1에서는 "아이콘이 있으면 아이콘 자리를 Spinner로, 없으면 앞에 추가"가 하나의 슬롯 로직(`loading ? <Spinner/> : icon`)으로 구현되어 **오히려 분기가 줄어든다** — 어느 쪽이든 비용 차이는 작다. 우선순위 낮음.
- 참고: 제출 중 `disabled`가 되면 포커스가 `body`로 빠질 수 있는 기존 동작은 그대로(설계상 변경 없음).

### Q10. 단계 순서 / SectionError 위치 — **현행 순서 적절, SectionError는 단계 3으로 당기지 않아도 되나 모달 회귀 확인 시 포함 권장 / 난이도 하**

- 모달에서 `SectionError`를 쓰는 곳: `LeaveDetailModal`, `DepartmentMembersModal`(AUDIT 질문 문구). 22곳 중 모달 2곳. SectionError는 `Notice action` 슬롯 안의 `sm` 버튼(`SectionError.tsx:18-25`)이라 모달 footer(D4 자식 수)와 무관해 단계 3의 위험(R-모달 footer)을 공유하지 않는다.
- 단 `SectionError`의 **px 16→12(B4)**는 22곳 전부에 시각 영향이 있고 Notice 높이에 영향(`h-9` 유지라 높이 불변). 단계 4의 다른 10여 개 변경과 섞여 PR 리뷰 부담이 크므로, 오히려 **단계 2의 "sm 정의"와 같은 시점(sm size 확정 직후 단독 PR)**으로 앞당기는 것이 회귀 확인이 쉽다. 22곳이 한 컴포넌트이므로 테스트도 `SectionError` 1파일 + 사용처 렌더 확인으로 끝난다.
- 단계 6(아이콘)과 단계 3(모달)의 의존: `Modal.tsx` X 버튼은 모달 전체에 영향을 주므로 단계 3과 6을 따로 하면 모달 시각 회귀 확인이 두 번 필요. 가능하면 `Modal` 헤더 X는 단계 3에서 같이(또는 단계 6을 모달 직후로 이동).

### Q11. 대상 외 V8~V11 중 함께 정리할 것 — **TopBar `iconButtonClass`는 단계 6에서 제거 가능 / 그 외 대상 외 유지 권장**

- `TopBar.tsx:16` `iconButtonClass`는 벨(`:65`)에서만 쓴다(`menuItemClass`는 별도) → 단계 6에서 벨을 `buttonClass({variant:'ghost',iconOnly:true})`로 바꾸면 상수 제거 가능. 질문 가설 맞음.
- `Notice.tsx:101`의 X(`size-7`, `-m-1`, `hover:bg-white/60`)는 **사용처 0건**(AUDIT BT63)이며 hover 색이 일반 `general-30`이 아니다 → ghost variant에 포함시키면 모양이 바뀐다. 단계 6 대상에서 **제외하고 기록만** 권장(CLAUDE.md §3 미사용 코드 건드리지 않기).
- `Modal.tsx:110` X: `disabled:text-general-60 disabled:hover:bg-transparent`(`busy`) 등 ghost 설계와 거의 같으나 `-m-2`가 있어 `className`(배치)로 유지.
- 회귀가 줄어드는 정리: `AttendanceSection.tsx`의 `base`(`[&>span]:size-5 [&>span>svg]:size-full`)는 단계 4에서 Button 아이콘 슬롯으로 흡수되므로 문제 없음. `Sidebar.tsx:102`↔`SidebarSubmenu.tsx:27` 중복은 별도 정리 후보(버튼 표준 범위 밖).

### Q12. 계획서 §2 변경 파일 누락 — **누락 있음**

| 누락 | 내용 |
|---|---|
| `components/form.test.tsx:46-47` | `modalDangerButtonClass`가 `bg-danger-100`·`disabled:bg-danger-100/50`을 포함하는지 **상수 직접 단언**. 별칭화·삭제(단계 1·8) 때 수정 필요 |
| `components/Notice.test.tsx:44-62` | `action={<button …>}`를 일반 button으로 렌더(Button 미사용) — 영향 없음(참고) |
| `DashboardView.test.tsx:337` | `within(attendanceCard()).getAllByRole('button')`를 `toHaveLength(1)`로 단언 — 출근/퇴근 버튼 구조 변경 시 영향(단계 4) |
| `AttendanceSheetView.test.tsx`·`AttendanceView.test.tsx`·`LeaveCalendarView.test.tsx`·`DashboardView.test.tsx`(前月·翌月·今月 이름 검색) | 단계 6 테스트 목록에 `AttendanceSheetView.test.tsx`·`LeaveCalendarView.test.tsx`는 있으나 **`AttendanceView.test.tsx`는 빠져 있음**. 단 이름 검색이라 접근 이름(`aria-label`)만 보존하면 영향 없음 |
| e2e `leave-management.spec.ts` | 월 이동 버튼(`prevMonth`/`nextMonth`) 참조 — 단계 6 e2e 목록에 `leave-calendar-mobile`·`leave-visual`은 있으나 `leave-management`·`leave-sidebar-submenu`는 없음 |
| `ConfirmDialog.test.tsx:80,85`, `FormModal.test.tsx:67,72` | `svg.animate-spin` 선택자. **단계 3**에 명시 필요(Spinner 구조 유지 조건) |
| `components/Modal.test.tsx:60` | `footer` 클래스(`sm:border-t`) 단언 — footer 래퍼를 건드리지 않으면 영향 없음 |
| `MobileTabBar`·`SidebarSubmenu` 등 | 대상 외라 영향 없음 |

클래스 문자열 단언 위치 전체(버튼 관련): `DepartmentsView.test.tsx:365-370`(`border-danger-100`·`text-danger-100`, 비교 `not text-danger-100`), `ConfirmDialog.test.tsx:61,64`(`bg-danger-100`), `form.test.tsx:46-47`. 모두 **토큰 단위 클래스 매칭**이므로 variant 문자열에 해당 토큰이 남아 있으면 통과한다(`toHaveClass`는 부분 문자열이 아니라 클래스 토큰 비교). `disabled:bg-danger-100/50`은 `bg-danger-100` 토큰과 다르다. `StatusFilterButtons`(`AttendanceHistoryView.test.tsx:328-330`)의 `bg-success-40` 등은 대상 외라 영향 없음.

---

## 2. 감사 문서의 사실과 다른 항목

(코드 열람으로 확인된 것만. 모두 비치명적이며 표준 설계 결론을 뒤집지는 않는다.)

| # | 위치 | 문서 | 실제 |
|---|---|---|---|
| E1 | **PATTERNS §2 `ghost` 행**, §3.2 | "`Modal.tsx:115`·`TopBar.tsx:16-17`의 같은 값 … 이미 **3곳**에 같은 값으로 있는 모양" | 같지 않다. Modal X: `-m-2 size-10 rounded … disabled:text-general-60 disabled:hover:bg-transparent`(`Modal.tsx:115`), 벨: disabled 없음(`TopBar.tsx:16-17`), Notice X: `size-7 -m-1 hover:bg-white/60`(`Notice.tsx:105`) — 크기(40/40/28)·hover 색·disabled·음수 margin이 모두 다르다. 같은 값은 Modal X와 벨 2곳이고 그것도 disabled 정의가 다르다 |
| E2 | AUDIT §6·§1.2 "V1~V7 = 57건" 및 PATTERNS §1.1 | V1~V7 57건이 Button 대상 | 같은 문서에서 BT16(SortableTh)·BT34·BT40을 V6로 세면서 PATTERNS §1.2/계획서 §1은 "대상 외"로 둔다 → 실제 Button 대상은 **54건**(또는 BT63 미사용 포함 시 54, 제외 시 53). 집계 불일치 |
| E3 | AUDIT §3.1 제목 "파일별 로컬 버튼 클래스 (15개)" | 15개 | 표의 **행이 15개**일 뿐 식별자는 약 **22개**(`ApprovalsView` 3, `Pagination` 4, `StatusFilterButtons` 3 등). 표에도 `Modal.tsx:115`·`Notice.tsx:105`(인라인 X)·`Sidebar.tsx:102`가 빠져 있다(§5.4 본문에만 언급) |
| E4 | AUDIT §4.1 BT01 | `P + flex h-12 w-full px-6 text-base/6 gap-2` | `mt-1`이 추가로 있다(`LoginForm.tsx:157`) — 배치 클래스, Button `className`으로 남겨야 함 |
| E5 | AUDIT §4.2 BT10 | "`h-12 w-full px-8 sm:w-auto`" | 버튼은 `div.sm:col-span-2 lg:col-span-1 lg:mt-6` 안에 있음(`AdminAttendanceView.tsx:304-306`). 높이 정렬용 `lg:mt-6`이 래퍼에 있어 Button `className`이 아니라 래퍼 유지 |
| E6 | PATTERNS §5.7 / AUDIT BT19~21 | 월 이동 버튼 ↔ 라벨 간격 12(MonthNavigator) | 출근부는 `gap-1 sm:gap-2`(`AttendanceSheetView.tsx:381`)이고 라벨도 `text-base/6 font-medium`(휴가 캘린더는 `text-lg/7 font-bold`, `MonthNavigator.tsx:24`). B8은 버튼 크기만 다루고 간격·라벨 서체 불일치는 문서에 기록 없음 |
| E7 | PLAN 단계 6 "`Notice.tsx`(X) → Button 변경" | 변경 대상에 포함 | 사용처 0건이고 hover가 다른 색(`white/60`) → ghost variant로 합치면 신규 색 규칙이 필요(E1과 연결). 대상에서 제외 권장 |
| E8 | PLAN 단계 3 테스트 | `ConfirmDialog.test.tsx:61,64` | `form.test.tsx:46-47`(상수 직접 단언)과 `svg.animate-spin` 선택자(`ConfirmDialog.test.tsx:80,85`, `FormModal.test.tsx:67,72`)가 빠짐 |
| E9 | 질문 Q3 / PATTERNS §6 Modal 주석 | "CSS `:has()`로 footer 직계 자식 수" | 실제는 Tailwind `has-[>:only-child]`/`has-[>:nth-child(3)]`(`Modal.tsx:134`) — 의미는 동일, 표기만 다름 |
| E10 | AUDIT §4.4 BT28 비고 | "BT28 … `S + rowButtonClass`" 크기 `36·12·14/20` | 맞음. 다만 `rowButtonClass`(`DepartmentsView.tsx:111-112`)는 `inline-flex … whitespace-nowrap`을 이미 가진 **유일한 곳**이다(다른 표 내부 버튼은 줄바꿈 허용). 공통 base의 `whitespace-nowrap`이 다른 버튼으로 퍼지는 부작용이 AUDIT/PATTERNS 어디에도 언급되지 않음(R3) |

(확인했고 일치한 항목: 전체 80건 리터럴 수, V별 합계 산술(24+9+16+8=57), 높이 분포 합계(48:6/44:4/40:25/36:14), BT05·06·07·08·09·10·11·12 클래스·라인, BT03 disabled 없음, P 직접 9곳·S 직접 13곳·form.tsx import 19파일, `SectionError` 사용 22곳, Spinner 7곳, Card `min-h-7`.)

---

## 3. B1~B14 frontend 의견

| ID | 의견 | 이유·조건 |
|---|---|---|
| B1 (Button + `buttonClass()`) | **동의** | 단, Q1대로 `variantClass`/`sizeClass`/`baseClass`를 분리해 별칭과 Link 양쪽이 같은 맵을 참조하게 할 것. 다형 `href`를 안 만드는 결정에 동의(Next Link 타입 부담) |
| B2 (기존 변수명 유지) | **동의** | 단 `danger`(모달 확정 전용, 채움)와 `dangerOutline`이 시각적으로 구분되는 이름이라 유지. `secondary`가 사실상 "outline"이라는 점은 문서에 명시 |
| B3 (44 폐지) | **조건부 동의** | 360폭 `PageHeader` 한 줄 유지(Q5①②)와 `条件をクリア` 40 vs 입력창 44 정렬(Q5③)을 단계 4 캡처로 사용자 확인. 출근/퇴근 44→48은 카드 폭 100%라 안전하나 카드 높이 +4px |
| B4 (sm px 12) | **동의** | `SectionError`·`承認/詳細/却下`·`今月`(B8로 md) 영향. 단 `SectionError`는 22곳 시각 변경 → 단독 PR 권장(Q10) |
| B5 (lg px 24) | **동의** | `照会`/`検索` 폭이 16px 줄어드는 것은 허용. BT09는 `sm:mt-6` 라벨 높이 정렬이 있어 버튼 크기(48)가 같으면 안전 |
| B6 (토큰 도입) | **이견(순서)** | 도입 자체는 동의하나 **클래스 집합 동일성 테스트와 충돌**(Q1). 단계 1 이전/이후에 별도 커밋으로 분리하고 계산값(Playwright `toHaveCSS`)으로 검증. 동적 클래스 조합 금지 |
| B7 (36 / 40 / 24) | **동의** | text variant는 padding보다 "필요한 곳만"(Q8). 24 규칙은 WCAG 2.5.8 간격 예외로도 충족 가능한 곳은 padding 불필요 |
| B8 (월 이동 40) | **동의, 범위 확장 제안** | 출근부 헤더 간격(`gap-1 sm:gap-2`)·라벨 서체도 함께 정리할지 사용자에게 확인(E6). `leave-management.spec.ts`/`attendance-sheet-layout.spec.ts` 영향 확인 |
| B9 (radius 8 / 대상 외 4) | **동의** | ghost의 `rounded`(4)→8: Modal X(`-m-2`)가 hover 배경을 가지므로 모서리가 약간 커진다. 시각 확인 필요 |
| B10 (修正 = primaryOutline + Pencil) | **이견(부분)** | 방향은 동의. 다만 (a) 表 행 3열 카드에서 勤怠 「修正」에 아이콘+Primary 테두리가 추가되어 한 줄 폭이 늘어난다(`AdminAttendanceView`는 표 열 폭도 영향) — 360 카드·1024 표 폭 확인 필요, (b) 勤怠 화면은 승인 목록의 「承認」(Primary 채움)과 시각 위계가 다른 화면이라 "수정 = 강조" 규칙이 화면 간 일관되는지 사용자 확인 필요(`詳細`은 회색 유지) |
| B11 (却下 현행) | **동의** | 변경 없음 = 위험 최소 |
| B12 (이름 스타일 구분) | **동의** | BT34는 Button 대상 외로 유지. 단 BT32·33 text variant에 `whitespace-nowrap` 부작용(R3) 주의 |
| B13 (active 없음) | **동의** | 터치 기기 피드백이 없는 점은 기록만. `hover`는 Tailwind 4에서 `@media (hover:hover)` 안이라 터치에서 hover 잔류 문제도 없다 |
| B14 (검색 lg·아이콘 없음·전폭) | **동의** | `LeaveHistoryList.tsx:251`의 Search 아이콘 제거로 `LeavesView.test.tsx`에서 아이콘 존재를 단언하는지 확인 필요(grep 미실시). 접근 이름은 `aria-hidden` 아이콘이라 불변 |

---

## 4. Button Props 설계 검토 (질문 4)

### 4.1 기존 Props 패턴과의 충돌

- `Badge`·`Notice`는 자체 interface(`variant`, `className`)이고 HTML 속성 스프레드가 없다. `Button`은 `ComponentPropsWithRef<'button'>` 스프레드가 필수(`form`, `aria-*`, `data-autofocus`, `autoFocus`)라 **패턴이 다르다**. 충돌은 아니나 Badge/Notice의 `variant` 값은 색 의미(info/error…)이고 Button의 `variant`는 스타일 계열이라 같은 이름에 다른 의미 → 문서에 병기.
- `size`는 `Modal`(`size: 'sm'|'md'|…`, `Modal.test.tsx:40-51`)과 같은 키워드지만 값 의미가 다르다(모달 폭 vs 버튼 높이). 충돌 아님.
- `loading` ⊃ `disabled`: 호출부가 `disabled={submitting}`을 이미 쓰는 곳(7곳)에서 `loading`으로 옮길 때 `disabled`를 중복 지정하면 안 되고, 취소 버튼의 `disabled={submitting}`은 그대로 필요. 규칙이 바뀌는 곳이라 `Button.test.tsx`에 명시.
- `fullWidth` + `className`("반응형 전폭은 className") 이원화: `fullWidth`는 `w-full`을 넣고 `sm:w-auto`를 `className`으로 주면 **둘이 공존**해 정상 동작하지만(반응형 variant 우선), 두 곳에서 폭이 정해져 읽기 어렵다. `fullWidth` prop을 없애고 `className`(배치)로만 두는 편이 단순하다(현행 호출부 6곳이 이미 `w-full`을 직접 쓴다).
- `type` 기본 `'button'`: 현재 `<button>`은 모두 type을 명시하고 있어(AUDIT 열람상 `type="submit"`/`"button"`) 기본값 변경은 안전. 단 단계 3·4에서 제출 버튼에 `type="submit"` 누락 시 **조용히 제출이 안 되는** 회귀(PLAN §0 3번 동의) → `FormModal`·검색 3곳·인증 2곳에 대한 테스트(Enter 제출 포함)를 단계마다 필수로.

### 4.2 Tailwind 4 클래스 병합·우선순위 (tailwind-merge 미도입, F1)

- Tailwind는 **CSS 출력 순서**로 우선순위를 정한다(문자열의 앞뒤 순서는 무관). 같은 프로퍼티 충돌 시 어느 쪽이 이기는지 호출부가 예측할 수 없다.
- 실제로 충돌하는 현행 호출 패턴: `flex`(BT05/MonthNavigator/CardLink/`CardLink`의 `${T} flex items-center gap-0.5`) vs 기반 `inline-flex`, `gap-0.5`(CardLink) vs size gap, `rounded-lg font-bold`(`AttendanceSection.tsx:102`) vs variant, `h-*`/`px-*`. 이행 시 이 클래스를 호출부에서 제거해야 한다.
- 규칙 `className`=배치 전용(margin·`w-full`·`sm:*`·`flex-1`·`self-*`·`order-*`·`relative`·`-m-2`)만 안전: 이들은 기반이 다루지 않는 프로퍼티다. 단 반응형 `sm:w-auto`는 base `w-full`(fullWidth)과 충돌하지 않고 공존(변형 정렬로 `sm:`이 이김).
- 대안 비교:
  1. **규약+테스트(권장)**: `className`에 `h-`/`px-`/`py-`/`text-`/`bg-`/`border-`/`rounded`/`gap-`/`flex`/`inline-flex` 토큰이 있으면 실패하는 소규모 테스트 or eslint `no-restricted-syntax`(템플릿 문자열 정규식). 의존성 추가 없음(CLAUDE.md §2).
  2. `tailwind-merge` 도입: 의존성 추가 + Tailwind 4 커스텀 토큰(`h-btn-md`, `text-page-title`, `rounded-btn` 등)을 `extendTailwindMerge` 설정해야 충돌 판정이 맞아 오히려 유지 비용이 있다. 현 시점에선 비추천.
  3. 기반을 `@layer components`(CSS)로 이동하면 `className`의 utility가 항상 이기지만, 클래스 이름 기반 테스트(`toHaveClass('bg-danger-100')`)가 깨지고 Tailwind 토큰 사용 규칙(09 "Tailwind 클래스 + 토큰")과 달라져 비추천.
- `hover`/`disabled` 쌍(Q4): 새 variant 문자열은 `disabled:` 우선순위가 `hover:`보다 뒤인 Tailwind 4 순서를 전제한다. variant 순서를 바꾸는 `group-hover`·`has-*` 도입 시 재확인.

### 4.3 Link용 `buttonClass()` 접근성

- `<Link>`는 `disabled`가 없다(설계 §5.4와 일치) → disabled 클래스가 DOM에서 무의미하지만 `cursor-not-allowed`가 `disabled:`로 붙어 있어 시각 영향 없음.
- **Space 키로 활성화되지 않는다**(링크는 Enter만). 버튼 모양 링크가 폼 제출 대용이 되면 안 된다 → PATTERNS §6.1 규칙(이동은 Link, 동작은 button)이 이를 보장. 문서에 "Link는 Enter만"을 접근성 주의로 추가 권장.
- 아이콘 전용 Link(벨, `TopBar.tsx:58`): `buttonClass({iconOnly})`는 `aria-label`을 강제하지 못한다 → 현행 `aria-label` 유지, 신규에는 리뷰 체크리스트.
- `text` variant: 평상시 밑줄 없이 `primary-100` 색만으로 링크를 구분(hover에서만 밑줄). 인접 본문이 있는 곳에선 WCAG 1.4.1(색만으로 구분) 위반 가능성 — 현재는 모두 단독 배치(CardLink·사원명·ログアウト)라 허용 범위. 문서에 "문장 속 인라인 링크에는 사용하지 않는다" 한 줄 권장.
- `select-none`을 `<Link>`·사원명에 적용하면 이름 텍스트 복사/선택이 안 된다(현행 가능). `select-none`은 base에서 **제거** 권장.
- 스크린 리더: `aria-current`/`aria-expanded` 등 상태 속성은 호출부가 그대로 전달(PATTERNS §6.3)하므로 문제 없음.
- 포커스: `focus-visible` outline offset 2는 `overflow-hidden` 컨테이너(Card 헤더, 표 셀)에서 잘릴 수 있음 — 현행과 동일한 위험이라 단계 7 확인 항목으로 유지.

---

## 5. 리팩터링 단계별 위험·테스트 영향 (질문 5)

| 단계 | 주 위험 | 테스트가 의존하는 것 | 조치 |
|---|---|---|---|
| 1 | Q1의 동일성 불가(base 추가). `whitespace-nowrap` 추가(R3). 토큰 동적 조합 | `form.test.tsx:46-47` 상수 문자열 단언 | 가산 전용(form.tsx 불변) 또는 1·2 병합. `Button.test.tsx`에 `type` 기본값·`loading`·접근 이름 |
| 2 | P·S·T disabled 내장: `disabled:hover:bg-white` 필요 variant 구분(Q4). `enabled:hover` 도입 시 클래스 문자열 변경 | `DepartmentsView.test.tsx:365-370`, `ConfirmDialog.test.tsx:61,64`(토큰 클래스) | 색 토큰(`border-danger-100`·`text-danger-100`·`bg-danger-100`) 유지 |
| 3 | 모달 9종 전부. `data-autofocus`·`autoFocus` 전달 누락, `type="submit" form` 누락, `tone`→variant | `ConfirmDialog.test.tsx:80,85` / `FormModal.test.tsx:67,72`(`svg.animate-spin` 하위 노드), `modal-a11y.spec.ts`, 이름 기반 `getByRole('button',{name})` 전반 | Spinner는 기존 컴포넌트·클래스 유지. footer 직계는 `<button>` 단일(Q3) |
| 4 | `SectionError` 22곳 시각 변화, 페이지 헤더 높이, 모바일 전폭(BT09·11), 인증 폼 `sm:flex-row-reverse` | `DashboardView.test.tsx:337`(버튼 수), `LeavesView.test.tsx`(검색 아이콘?), `LoginForm.test.tsx`·`PasswordChangeForm.test.tsx`(Enter 제출·disabled) | 배치 클래스(`mt-1`·`sm:mt-6`·`sm:flex-1`)는 `className`에 유지 |
| 5 | 표 안 버튼 줄바꿈(`whitespace-nowrap`), `aria-label` 보존, 修正 아이콘 추가 폭 | `DepartmentsView.test.tsx`(`detailLabel`/`deleteLabel` 이름), approvals/attendance e2e | `aria-label` 문구 불변. `rowButtonClass`가 `nowrap`인 유일 사례임을 문서화(E10) |
| 6 | Modal X 모서리 4→8(B9), 벨 위치(`relative` + 빨간 점 `absolute`), 출근부 헤더 +4px, Chevron 굵기 | `attendance-sheet-layout.spec.ts`(행 높이는 표 행 단언), 이름 기반 `前月`/`翌月` 검색 | `-m-2`·`relative`는 `className`. Notice X는 제외(E7) |
| 7 | 360/768/1024/1440 시각 확인 | e2e `*-responsive`, `leave-visual` | 텍스트 버튼 padding 방식(Q8) 결정 후 |
| 8 | `form.test.tsx` 상수 직접 단언 삭제/이전, 로컬 클래스 제거 누락 | `form.test.tsx:46-47` | 별칭 삭제 시 `Button.test.tsx`로 이전 |

---

## 6. 가장 큰 위험 3개

1. **R1(Q1): "별칭 출력 동일"이 설계상 성립하지 않는다.** `buttonClass()` 공통 기반(`inline-flex`·`whitespace-nowrap`·`select-none`)·radius·disabled·`h-btn-*` 토큰이 기존 8개 상수의 클래스 집합과 달라 단계 1 완료 조건("화면 변화 0")과 동일성 테스트가 맞지 않는다. 단계 1·2 병합 또는 `form.tsx` 불변 가산, B6 분리가 필요.
2. **R2(§4.2): 클래스 병합 규칙 부재.** `tailwind-merge` 없이 호출부 `className`이 기반과 같은 프로퍼티(`flex`/`inline-flex`, `gap-*`, `rounded-*`, `h-*`)를 건드리면 CSS 출력 순서에 의해 결과가 불확정. 현행 호출부에 이미 이 충돌 후보가 다수(CardLink `flex gap-0.5`, `AttendanceSection` `rounded-lg font-bold`, BT05 `flex`). 규약 + 테스트/ESLint로 방어 필요.
3. **R3: 기반 `whitespace-nowrap`·`select-none`의 부작용.** 현재 `whitespace-nowrap`을 가진 버튼은 `rowButtonClass`(`DepartmentsView.tsx:111-112`) 하나뿐이다. 모든 variant에 넣으면 모달 2열 footer(360폭 약 122px/버튼)·표/카드 안 `詳細`·`承認`·사원명 링크가 줄바꿈 불가가 되어 **360폭에서 넘침/잘림** 가능성이 있다(가장 긴 모달 확정 문구는 messages에서 측정하지 않았다 — 미검증). `select-none`은 사원명 복사 불가. `text` variant에서는 `nowrap`·`select-none`·`justify-center`를 제외하고, `nowrap`은 `sm` 이상 표 안 버튼에만 선택 적용 권장.

---

## 7. 미검증 항목

- 개발 서버 기동·Playwright 스크린샷·실제 렌더 시각 확인, vitest/e2e 실행: **미실행**(분석 단계, 코드 수정 금지).
- Tailwind 4 variant 정렬(`disabled` 후행)은 공식 변형 순서 기준 판단이며 빌드 CSS를 열어 확인하지 않음.
- `LeavesView.test.tsx`의 검색 아이콘 단언 여부, `attendance-sheet-layout.spec.ts` 전문, 모달 확정 문구 최장 길이는 열람하지 않음.
