# UI 버튼 공통 패턴 설계 (UI_BUTTON_PATTERNS)

> 상태: **v4 — 사용자 결정 B1~B17(2026-11-13) + B18·B19(詳細·編集 버튼 통일, 2026-11-14) 반영, 확정**. 결정 원문: `.claude/work/button-audit/decisions.md`, `.claude/work/button-unify/decisions.md`. 결정 목록과 조건은 §11. 변경 내역은 §12.
> 근거 조사: `docs/UI_BUTTON_AUDIT.md`(이하 AUDIT, 버튼 ID BT01~BT80). 단계 계획: `docs/UI_BUTTON_REFACTOR_PLAN.md`. frontend 검토: `.claude/work/button-audit/frontend-review.md`(이하 REVIEW).
> 모달 표준(`docs/UI_MODAL_PATTERNS.md` v3, D1~D15)과 충돌하지 않는다. 특히 **D3' footer 버튼 높이 40, D4 개수별 배치, D5 위험 확정 = 빨간 채움, D8 취소 = 아웃라인**은 그대로 이 문서의 `md` 크기·`danger`·`secondary` 규칙이 된다.
> 원칙: 기존 `components/form.tsx` 버튼 클래스의 **색(variant) 값을 그대로 재사용**한다. 새 variant 색은 만들지 않는다. 크기만 공통화한다(CLAUDE.md §2·§3).
> 전제(REVIEW F1): `tailwind-merge`·`clsx`·`class-variance-authority`는 설치되어 있지 않으며 도입하지 않는다. 클래스 충돌은 규약과 정적 검사로 막는다(§4.6).

---

## 1. 범위

### 1.1 대상 (공통 Button으로 통일) — 54건

AUDIT §2의 V1~V7(57건)에서 V6의 BT16·BT34·BT40을 뺀 **54건**. 이 중 BT63(Notice X)은 사용처가 없어 이행하지 않는다(**실제 이행 53건**).
화면 위치로는 등록·저장, 수정, 삭제, 취소·닫기, 상세·확인, 검색·필터 실행, 승인·반려, 출근·퇴근, 표 내부 액션, 모달 footer, 「すべて見る」 류 링크, 월 이동·닫기 아이콘.

### 1.2 대상 외 (각자 컴포넌트 유지, §1.3 공통 규칙만 적용)

| 유형 | 대상 | 이유 |
|---|---|---|
| V8 내비게이션 | `Sidebar`·`SidebarSubmenu`·`MobileTabBar`·`TopBar` 사용자 메뉴·메뉴 항목 | 활성 상태(`aria-current`)·전폭 행 레이아웃이 버튼과 다름. 셸은 09 §5-6 참조 이미지 재현 대상 |
| V9 토글·세그먼트·탭 | `StatusFilterButtons`, `DayLeaveList` 세그먼트, 캘린더 날짜 셀, `Tabs` | 선택 상태(`aria-pressed`·`aria-selected`)가 본질. 세그먼트는 사용처 1곳이라 공통화하지 않음(3곳 규칙) |
| V10 페이지네이션 | `Pagination` | 셀 규격(36×36)이 09 §6에 독립 정의 |
| V11 행·카드 버튼 | 목록 행 버튼, `StatCard` 링크, 캘린더 막대, 출근부 휴가 배지 | 버튼이 아니라 "누를 수 있는 콘텐츠" |
| V6 일부 | BT16 정렬 헤더(`SortableTh`), BT34 모달 여는 표 안 이름, BT40 「+N件」 | 표·캘린더 안 전용 표현(BT34는 B12) |
| 미사용 | BT63 Notice 닫기 X | 사용처 0, hover 색(`white/60`)이 ghost와 다름. 기록만(CLAUDE.md §3) |

### 1.3 공통 규칙만 공유하는 항목

포커스(§5.2), disabled 표현(§5.4), 터치 영역(§7.2), 아이콘 `aria-hidden`, 아이콘 전용의 `aria-label`. 그 외 모양은 각 컴포넌트의 09 §6 기록을 따른다.

---

## 2. Variant 표준 (7종)

| variant | 용도 | 기존 출처 | 배경 / 글자 / 테두리 | hover | focus | disabled |
|---|---|---|---|---|---|---|
| `primary` | 영역의 주 동작 1개(등록·저장·申請·検索·承認·확정) | `primaryButtonClass` | `primary-100` / 흰색 Bold / 없음 | `primary-90` | F(`primary-100`) | 배경 `primary-60` |
| `secondary` | 취소·닫기·戻る·詳細·확인·再試行·条件をクリア 등 보조. **D8의 "아웃라인"은 이 variant**(회색 테두리) | `secondaryButtonClass` | 흰색 / `general-100` Bold / `general-50` | 배경 `general-30` | F | 글자 `general-60`, `disabled:hover:bg-white` |
| `primaryOutline` | 주 동작 다음 단계·강조 보조(退勤する, 표 안 수정) | `primaryOutlineButtonClass` | 흰색 / `primary-100` Bold / `primary-100` | 배경 `primary-30` | F | 테두리 `general-50` 글자 `general-60`, `disabled:hover:bg-white` |
| `danger` | **모달 안 위험 동작 확정 전용**(삭제·取消 확정, D5) | `modalDangerButtonClass` | `danger-100` / 흰색 Bold / 없음 | `danger-100/90` | Fd(`danger-100`) | 배경 `danger-100/50` |
| `dangerOutline` | 목록·상세에서 위험 동작의 **입구**(削除 → 확인 모달) | `dangerOutlineButtonClass` | 흰색 / `danger-100` Bold / `danger-100` | 배경 `danger-30` | Fd | 테두리 `general-50` 글자 `general-60`, `disabled:hover:bg-white` |
| `ghost` | 테두리·배경 없는 아이콘 버튼(모달 X, 상단바 벨) | `Modal.tsx:115`(모달 X)의 값. 벨(`TopBar.tsx:16-17`)은 같은 값에서 disabled만 없음 | 투명 / `general-80` / 없음 | 배경 `general-30` | F | 글자 `general-60`, `disabled:hover:bg-transparent`(모달 X 현행) |
| `text` | 텍스트만 있는 보조 동작·링크(「すべて見る」, ログアウト, 사원명 링크) | `textButtonClass` | 투명 / `primary-100` **Medium** / 없음 | 밑줄 | F | 글자 `general-60`, 밑줄 없음 |

- 사용자 요청 용어와의 대응: Primary = `primary` / Secondary = `secondary` / Outline = `primaryOutline` / Destructive = `danger`(채움)·`dangerOutline`(아웃라인) / Icon Button = variant + `iconOnly`(§3.2, 주로 `secondary`·`ghost`) / Ghost·Text = `ghost`·`text`. 이름은 기존 상수명을 유지한다(B2).
- `ghost`의 근거는 **모달 X와 벨 2곳**이다(v2 정정, AUDIT §5.4 E1). Notice X(`Notice.tsx:105`, 28·hover `white/60`)는 값이 달라 ghost에 포함하지 않는다.
- 09 §3 Figma의 **Light(Primary 40)**는 코드에 사용처가 없어 만들지 않는다.
- 신규 색 토큰 없음.

### 2.1 Variant 선택 규칙

| 상황 | variant |
|---|---|
| 한 영역(카드·모달·폼·페이지 헤더)의 주 동작 | `primary` — **영역당 최대 1개**. 예외: 표 행 반복(행마다 [承認]) |
| 주 동작 옆의 취소·닫기·이전 단계 | `secondary`(D8) |
| 조회·확인 | `secondary` |
| 상세 열기(「詳細」) | `secondary` + Eye 아이콘 — 공통 `DetailButton`(§4.7, B18) |
| 주 동작과 쌍을 이루는 다음 단계(출근 후 퇴근) | `primaryOutline` |
| 수정 입구(표 행·상세, 「編集」) | `primaryOutline` + Pencil 아이콘(B10) — 공통 `EditButton`(§4.7, B18). 문구는 「編集」(「修正」 쓰지 않음, B19) |
| 삭제·비활성화 등 되돌릴 수 없는 동작의 입구 | `dangerOutline` |
| 위 동작의 모달 확정 버튼 | `danger`(D5). 모달 밖에서 쓰지 않는다 |
| 승인·반려 확정(却下する) | `primary`(반려는 정상 업무 처리, B11) |
| 화면 이동 텍스트 링크 | `text` + `<Link>`(§6) |
| 아이콘만 있는 닫기·셸 아이콘 | `ghost` |
| 아이콘만 있는 월 이동 등 컨트롤 | `secondary` + `iconOnly` |

---

## 3. Size 표준

### 3.1 텍스트 버튼 크기 (sm / md / lg)

| size | 높이 | 좌우 padding | 글자 | 아이콘 | 아이콘↔글자 | radius | 줄바꿈 | 용도 |
|---|---|---|---|---|---|---|---|---|
| `sm` | **36** | **12** (B4) | 14/20 Bold | 16 | 4 | 8 | `whitespace-nowrap`(§4.3) | 표·목록 행 안, 카드 안 보조(再試行), 툴바 보조 |
| `md` | **40** | 16 | 14/20 Bold | 20 | 8 | 8 | 허용 | 기본. **모달 footer(D3')**, 페이지 헤더 보조, 툴바(条件をクリア) |
| `lg` | **48** | **24** (B5) | 16/24 Bold | 20 | 8 | 8 | 허용 | 페이지 주 동작(休暇申請·部署を追加), 인증 폼 제출, 검색 실행, 出勤·退勤 |

- 09 §2.3 "버튼 높이 Large 48 / Medium 40 / Small 36"(Figma)과 같은 3단계다. **44는 쓰지 않는다**(B3. AUDIT §5.2의 44 사용 4건 중 休暇申請·出勤·退勤은 lg, 条件をクリア는 md로 옮기고, 部署を追加도 lg로 맞춘다).
- `text` variant는 높이·padding을 갖지 않는다(인라인). 글자 14/20 Medium 고정, 아이콘이 있을 때만 16·간격 4. 터치 영역은 §7.2.
- 기본 size는 `md`.
- sm만 `whitespace-nowrap`인 이유: 표·행 동작 문구(詳細·承認·却下·修正·編集·削除·確認·再試行)는 2~3글자라 넘치지 않고, 줄바꿈되면 행 높이가 무너진다(현행 `rowButtonClass`와 같음). md·lg는 모달 2열 footer(360 폭에서 버튼 약 122px)·긴 확정 문구가 있어 줄바꿈을 막지 않는다(REVIEW R3).

### 3.2 아이콘 전용 (`iconOnly`)

| size | 박스 | 글리프 | 용도 |
|---|---|---|---|
| `sm` | 36×36 | 20 | 밀집 영역(표 안 아이콘 동작이 생길 경우) |
| `md` | 40×40 | 20(테두리형) / **24**(`ghost`) | 월 이동(B8: 출근부·휴가 캘린더 모두 40), 모달 X, 상단바 벨 |

- `ghost` md의 글리프 24는 09 §2.3 "아이콘 24"와 모달 X·벨의 현행 값이다.
- `lg` 아이콘 전용은 두지 않는다(사용처 없음).
- 아이콘 전용 `Button`은 `aria-label` 필수(타입으로 강제, §4.4). `<Link>` 아이콘 전용(벨)은 타입으로 강제할 수 없어 리뷰 체크리스트(§9.3)로 확인한다.

### 3.3 디자인 토큰 (B6: 도입, 별도 커밋)

`globals.css` `@theme`에 버튼 크기 토큰만 추가한다. `Notice`의 `--spacing-notice-*`·`--radius-notice`(`globals.css:72-75`) 선례와 같은 방식이며, 색은 추가하지 않는다.

| 토큰 | 값 | Tailwind 사용 |
|---|---|---|
| `--spacing-btn-sm` / `-md` / `-lg` | 2.25rem / 2.5rem / 3rem | `h-btn-md`, `size-btn-md`(아이콘 전용) |
| `--spacing-btn-x-sm` / `-md` / `-lg` | 0.75rem / 1rem / 1.5rem | `px-btn-x-md` |
| `--spacing-btn-gap-sm` / `--spacing-btn-gap` | 0.25rem / 0.5rem | `gap-btn-gap` |
| `--radius-btn` | 0.5rem | `rounded-btn` |

- 글자 크기는 기존 09 §2.2 Text 3(14/20)·Text 2(16/24) = `text-sm/5`·`text-base/6`을 쓴다(신규 typography 토큰 없음).
- 토큰은 `buttonClass()`(§4) 안에서만 참조한다. 화면 코드에서 `h-btn-*`를 직접 쓰지 않는다.
- 적용 조건(REVIEW Q1·B6):
  1. **별도 커밋**으로 한다. 먼저 Tailwind 기본 spacing(`h-10` 등)으로 맵을 만들고 테스트를 통과시킨 뒤, 같은 계산값의 토큰 클래스로 치환하는 커밋을 따로 둔다. 토큰 클래스(`h-btn-md`)와 기본 클래스(`h-10`)는 값(2.5rem)이 같지만 문자열이 달라 클래스 비교 테스트는 반드시 깨지기 때문이다.
  2. 검증은 **계산값**으로 한다. jsdom은 Tailwind CSS를 로드하지 않으므로 Playwright `toHaveCSS('height', '40px')` 같은 단언을 쓴다.
  3. 맵에는 **완전한 리터럴 클래스**만 쓴다(`'h-btn-md px-btn-x-md …'`). `` `h-btn-${size}` `` 같은 동적 조합은 Tailwind가 정적 스캔으로 찾지 못해 CSS가 생성되지 않는다.
- 값의 정의 위치는 `@theme` 토큰 1곳이고, 토큰을 참조하는 곳은 `buttonClass()` 1곳이다.

---

## 4. 공통 Button 컴포넌트 설계

### 4.1 현황과 방향

- 현재는 **클래스 문자열 방식**(`form.tsx` 상수 8개)이고 Button 컴포넌트는 없다. 색만 상수가 담당하고 크기·disabled·아이콘 배치는 호출부가 조합한다(AUDIT §3).
- 방향(B1): **`buttonClass()` 함수 1개 + 얇은 `Button` 컴포넌트**를 같은 파일에 둔다. `<Link>`는 컴포넌트로 감싸지 않고 `buttonClass()`를 쓴다(§6).
- 기존 `form.tsx` 상수는 **이행 중 건드리지 않는다**(B15: 무변경 가산). 새 `Button`과 별개로 공존하다가 사용처가 0이 되면 단계 8에서 삭제한다. 이유: `buttonClass()`의 공통 기반·radius 위치·disabled 내장 때문에 기존 상수와 "출력 클래스 동일한 별칭"은 성립하지 않는다(REVIEW Q1·R1).

### 4.2 파일·export

| 파일 | export | 비고 |
|---|---|---|
| `components/Button.tsx`(신규) | `Button`, `buttonClass`, `ButtonVariant`, `ButtonSize` | 09 §6에 기록 |
| `components/form.tsx` | 기존 8개 상수 **변경 없음** | 단계 8에서 사용처 0 확인 후 삭제 |

### 4.3 `buttonClass(options)` 구조

```ts
type ButtonVariant = 'primary' | 'secondary' | 'primaryOutline' | 'danger' | 'dangerOutline' | 'ghost' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';
function buttonClass(options?: {
  variant?: ButtonVariant; // 기본 'secondary'
  size?: ButtonSize;       // 기본 'md'. text는 무시
  iconOnly?: boolean;      // 정사각형 박스, padding 없음
  withIcon?: boolean;      // text variant에서 아이콘을 붙일 때만(inline-flex 정렬)
}): string;
```

내부는 리터럴 문자열 맵 3개로 나눈다(REVIEW Q1).

| 맵 | 내용 | 적용 |
|---|---|---|
| `BASE_CLASS` | `inline-flex items-center justify-center` + 포커스 공통(`focus-visible:outline-2 focus-visible:outline-offset-2`) + `disabled:cursor-not-allowed` | **`text` 제외** 모든 variant |
| `VARIANT_CLASS[variant]` | 색·hover·포커스 색·**radius**·글자 굵기·disabled | 항상 |
| `SIZE_CLASS[size]` / `ICON_ONLY_CLASS[size]` | 높이·좌우 padding·글자 크기·아이콘↔글자 간격·(sm만) `whitespace-nowrap` | `text` 제외 |

- **공통 기반에 넣지 않는 것**(REVIEW R3): `whitespace-nowrap`(sm에만), `select-none`(쓰지 않음 — 사원명 등 텍스트 선택을 막지 않는다).
- **radius는 variant 맵에 둔다**: `text`는 포커스 링용 `rounded`(4, 현행), 나머지는 8. 공통 기반에 두면 text에서 덮어써야 해 충돌이 생긴다.
- `text`는 `BASE_CLASS`·size를 쓰지 않는다. 아이콘이 없으면 일반 인라인 요소라 긴 이름이 셀 안에서 줄바꿈된다. `withIcon`(Button은 `icon`이 있으면 자동)일 때만 `inline-flex items-center gap-1`을 더한다(CardLink 「すべて見る ›」).
- hover는 `hover:`로 쓰고, 배경이 바뀌지 않는 아웃라인·ghost variant는 `disabled:hover:*`를 짝으로 둔다. `enabled:hover:`는 쓰지 않는다 — `<a>`(`<Link>`)는 `:enabled`에 해당하지 않아 링크의 hover가 사라진다.
- 채움 variant(`primary`·`danger`)는 Tailwind 4 변형 순서상 `disabled:bg-*`가 `hover:bg-*`를 이기므로 `disabled:hover:*`가 필요 없다(REVIEW Q4. 빌드 CSS 확인은 단계 1 테스트에서).
- `<button>`·`<Link>` 양쪽에 같은 결과를 쓴다. `<Link>`에는 disabled가 없으므로 disabled 클래스는 영향이 없다.

### 4.4 `Button` props

| prop | 타입 | 기본 | 설명 |
|---|---|---|---|
| `variant` | `ButtonVariant` | `'secondary'` | §2 |
| `size` | `ButtonSize` | `'md'` | §3 |
| `type` | `'button' \| 'submit' \| 'reset'` | **`'button'`** | 폼 안 의도치 않은 제출 방지. 제출은 `type="submit"`(+ 모달은 `form={id}`)을 명시. 누락 시 "조용히 제출이 안 되는" 회귀가 되므로 제출 버튼은 단계마다 Enter 제출 테스트 필수(계획서 §0) |
| `disabled` | `boolean` | — | 그대로 `disabled` 속성 |
| `loading` | `boolean` | `false` | `true`면 `disabled` + 아이콘 슬롯에 `Spinner`. 문구는 그대로(접근 이름 불변) |
| `icon` | `ReactNode` | — | `<span aria-hidden>` 슬롯에 넣고 size별 크기(16/20, ghost 아이콘 전용 24), 안쪽 SVG는 `[&>svg]:size-full` |
| `iconPosition` | `'start' \| 'end'` | `'start'` | `end`는 「すべて見る ›」 같은 진행 방향 표시 |
| `iconOnly` | `true` | — | **리터럴 판별자**(REVIEW Q2). `iconOnly: true`이면 `icon`·`aria-label` 필수, `children` 금지 / 생략이면 `children` 필수 |
| `children` | `ReactNode` | — | 문구 |
| `className` | `string` | — | **배치 전용**(§4.6) |
| 그 밖 | `ComponentPropsWithRef<'button'>` | — | `onClick`, `form`, `aria-*`, `autoFocus`, `data-autofocus`, `ref`(React 19 prop) 그대로 전달 |

- **`fullWidth` prop은 두지 않는다**(B17, REVIEW §4.1). 전폭은 `className="w-full"`(반응형은 `w-full sm:w-auto`)로 준다. 현행 호출부 6곳이 이미 `w-full`을 직접 쓰고, prop과 `className` 두 곳에서 폭을 정하면 읽기 어렵다.
- **`loading` 슬롯 규칙**: `loading ? <Spinner /> : icon` 한 줄로 처리한다. 아이콘이 없는 버튼에서는 문구 앞에 Spinner가 생긴다(현행 7곳과 같은 모양). 아이콘과 loading을 함께 쓰는 곳은 현재 0건이라 추가 분기가 생기지 않는다(REVIEW Q9). Spinner는 기존 `Spinner` 컴포넌트를 그대로 쓴다 — 테스트가 `svg.animate-spin`으로 찾는다(`ConfirmDialog.test.tsx:80,85`, `FormModal.test.tsx:67,72`). sm(슬롯 16)에서 Spinner(`size-5`)가 슬롯 크기를 따르는지는 단계 1 테스트에서 확인.
- **`loading` ⊃ `disabled`**: 확정 버튼을 `loading={submitting}`으로 옮길 때 `disabled={submitting}`을 중복 지정하지 않는다. 같은 영역 취소 버튼의 `disabled={submitting}`은 그대로 둔다.
- `loading`에 `aria-busy`는 붙이지 않는다(현행 7곳 모두 미사용).
- **Button은 `<button>` 요소 1개만 렌더한다**(Fragment·래퍼 `div`·Tooltip 금지). `Modal` footer D4 판정이 footer 직계 자식 수를 세기 때문이다(REVIEW Q3).
- 기존 Props 패턴과의 관계: `Badge`·`Notice`는 자체 interface이고 HTML 속성 스프레드가 없으나 Button은 스프레드가 필수(`form`·`aria-*`·`data-autofocus`)라 형태가 다르다. 또 `variant`는 Badge·Notice에서는 **색 의미**(info/error…), Button에서는 **스타일 계열**이고, `size`는 Modal에서는 **폭**, Button에서는 **높이**다. 이름은 같지만 의미가 다르므로 09 §6 Button 행에 병기한다. `ConfirmDialog`의 `tone`('primary'|'danger')은 내부에서 `variant`로 변환하고 API는 바꾸지 않는다.

### 4.5 채택하지 않은 안

| 안 | 이유 |
|---|---|
| `Button`에 `href`/`as`(다형 컴포넌트) | Next `Link` props·prefetch·ref 타입이 섞여 타입이 복잡해진다. 링크는 `buttonClass()` 한 줄로 충분(B1) |
| `IconButton` 별도 컴포넌트 | "하나의 공통 Button" 요구. 아이콘 전용은 `iconOnly` 판별자 + 타입 강제로 해결 |
| `children` 생략으로 아이콘 전용 판정 | `{cond && '문구'}`가 `false`일 때 "빈 텍스트 버튼"과 구분할 수 없다(REVIEW Q2) |
| `fullWidth` prop | §4.4(B17) |
| `form.tsx` 상수를 `buttonClass()` 별칭으로 재정의 | 출력 클래스 동일이 성립하지 않음(B15) |
| `ButtonGroup` 컴포넌트 | 간격 규칙(§5.7)은 `gap-*` 한 줄. 모달 footer는 `Modal`이 이미 담당 |
| Light(Primary 40)·Success variant | 사용처 없음 |
| 세그먼트 컨트롤 공통화 | 사용처 1곳(`DayLeaveList`) |
| `tailwind-merge` 도입 | §4.6 |

### 4.6 `className` 규약과 방지책 (REVIEW R2)

Tailwind는 **CSS 출력 순서**로 우선순위를 정한다(문자열 안 순서는 무관). `tailwind-merge`가 없으므로, 호출부 `className`이 `buttonClass()`와 같은 CSS 속성을 건드리면 어느 쪽이 이길지 예측할 수 없다.

| 구분 | 클래스 |
|---|---|
| **허용(배치 전용)** | margin(`m*-`, `-m-2` 포함), 폭(`w-full`, `sm:w-auto`, `sm:flex-1`, `flex-1`, `shrink-0`), 정렬(`self-*`, `order-*`), 위치(`relative`, `absolute`와 위치값), 그리드(`col-span-*`) — 반응형 접두사 포함 |
| **금지** | `h-*`·`size-*`·`min-h-*`, `p*-*`, `text-*`, `font-*`, `leading-*`, `bg-*`, `border*`, `rounded*`, `gap-*`, `flex`·`inline-flex`·`grid`, `items-*`·`justify-*`, `whitespace-*`, `outline*`, `shadow*`, `opacity-*`, `cursor-*`, 그리고 위 항목의 `hover:`·`disabled:`·`focus-visible:` 변형 |

이행 시 현행 호출부의 충돌 후보(CardLink `flex gap-0.5`, `AttendanceSection.tsx:102` `rounded-lg font-bold`, BT05 `flex`, 각종 `h-*`·`px-*`)는 반드시 제거한다.

방지책(B16: ESLint + 리뷰 체크리스트):
1. **ESLint `no-restricted-syntax`**: `<Button className=…>`의 문자열·템플릿 리터럴, 그리고 `className={`${buttonClass(…)} …`}` 형태의 덧붙임에서 금지 접두사 정규식에 걸리면 오류. 의존성 추가 없음(기존 ESLint 설정에 규칙만 추가).
2. 보조: `Button.test.tsx`에는 규약 테스트를 두지 않는다(호출부 문자열은 단위 테스트로 잡을 수 없다). 리뷰 체크리스트(§9.3)에 같은 항목을 둔다.

채택하지 않은 대안: `tailwind-merge`(의존성 추가 + 커스텀 토큰 `h-btn-md`·`text-page-title`·`rounded-btn` 등을 `extendTailwindMerge`로 등록해야 판정이 맞아 유지 비용이 큼), 기반을 `@layer components` CSS로 이동(클래스 이름 기반 테스트 `toHaveClass('bg-danger-100')`가 깨지고 09의 "Tailwind 클래스 + 토큰" 방식과 달라짐).

ESLint 대상 요소는 `Button`·`DetailButton`·`EditButton`이다(selector `JSXOpeningElement[name.name=/^(Button|DetailButton|EditButton)$/]`, 2026-11-14 B18).

### 4.7 역할 프리셋 `DetailButton`·`EditButton` (B18, 2026-11-14)

`components/ActionButtons.tsx`. 기존 `Button`을 감싸 **variant·아이콘·기본 문구만 고정**한 프리셋이다. 새 외형·클래스·토큰은 없다(§4.5 `IconButton` 불채택과 충돌하지 않음 — 새 외형이 아니라 역할 고정).

| 컴포넌트 | 고정값 | 받는 props |
|---|---|---|
| `DetailButton` | `secondary` + `EyeIcon`, 기본 문구 `messages.common.detail`(「詳細」) | `size?`(`'sm'`(기본)·`'md'`), `children?`, `className?`(배치 전용), 그 밖 `<button>` 속성(`onClick`·`disabled`·`aria-label`·`autoFocus`·`data-autofocus`·`ref`) |
| `EditButton` | `primaryOutline` + `PencilIcon`, 기본 문구 `messages.common.edit`(「編集」) | 위와 같음 + `iconOnly`(리터럴 판별자. `true`면 `aria-label` 필수·`children` 금지) |

- `type`은 항상 `button`(Button 기본), `variant`·`icon`·`loading`은 받지 않는다. `<button>` 1개만 렌더한다(§4.4).
- size는 §3 위치 규칙대로: 표·카드 행 sm(36), 모달 footer md(40).
- **`children`에 의한 문구 대체는 예외적으로만 쓴다.** 기본 문구 「詳細」「編集」을 우선한다(2026-11-14 현재 사용처 0. 部署詳細 footer도 기본 문구 「編集」, Q5).
- 「詳細」「編集」 역할의 버튼을 새로 만들 때는 `Button`에 variant·아이콘을 직접 지정하지 말고 이 프리셋을 쓴다.

---

## 5. 상태별 디자인

### 5.1 hover

| variant | hover |
|---|---|
| 채움(`primary`·`danger`) | 한 단계 밝게: `primary-90` / `danger-100/90` |
| 아웃라인(`secondary`·`primaryOutline`·`dangerOutline`) | 연한 배경: `general-30` / `primary-30` / `danger-30` |
| `ghost` | 배경 `general-30` |
| `text` | 밑줄 |

- disabled일 때 hover 변화는 없다(§4.3의 `disabled:hover:*` 짝 또는 변형 순서로 보장).
- Tailwind 4의 `hover:`는 `@media (hover: hover)` 안에서만 동작해 터치 기기에서 hover 색이 남지 않는다.

### 5.2 focus-visible

- 표준: `outline-2 outline-offset-2`, 색 `primary-100`(위험 variant는 `danger-100`). 현행 그대로.
- 안쪽(`-outline-offset-2`): 전폭 행·잘리는 컨테이너 안(메뉴 항목·목록 행·하단 탭) — V8·V11 규칙.
- `overflow-hidden` 컨테이너(Card 헤더·표 셀)에서 offset 2 링이 잘릴 수 있는 위험은 현행과 같다. 단계 7에서 확인.
- `focus:`(마우스 클릭 포커스) 스타일은 쓰지 않는다.

### 5.3 active / pressed

- **버튼에 `active:` 스타일을 두지 않는다**(B13). 현행 0건이고, `primary-100`보다 진한 Primary 토큰이 없어 새 색이 필요해진다. 터치 기기에서 눌림 피드백이 없다는 점은 기록만 한다.
- "눌린 상태"가 의미인 토글은 `aria-pressed` + 시각 상태로 표시한다(V9, Button 대상 외).

### 5.4 disabled

- 모든 variant에 **내장**한다(§2 표). 공통: `cursor-not-allowed`, hover 없음.
- WCAG 1.4.3 대비 예외(09 §3 Button 기존 기록).
- disabled 조건은 화면 로직이 정한다(본인 신청, 로딩 전, 퇴근 완료, 조건 없음, 이번 달, 제출 중, 페이지 끝). Button은 표시만 한다.
- 링크는 disabled가 없다. 이동할 수 없으면 링크를 렌더하지 않거나 일반 텍스트로 둔다.

### 5.5 loading

- `loading` = disabled + 아이콘 슬롯에 `Spinner`(20, 글자색 상속). 문구는 바꾸지 않는다(「申請する」 그대로).
- 쓰는 곳: 서버 요청을 보내는 제출·확정 버튼(로그인, 비밀번호 변경, 모달 확정). 화면 이동만 하는 검색 버튼은 쓰지 않는다(현행).
- 모달은 `busy`와 함께 쓴다(UI_MODAL_PATTERNS §3.4·§4.6). 제출 중 같은 영역의 취소 버튼도 disabled(현행 모달 규칙). 모달 밖 폼(SCR-009)의 취소 버튼은 현재 제출 중에도 활성이며(AUDIT BT03), 바꾸면 동작 변경이라 이번 범위에서 다루지 않는다.
- 제출 중 disabled가 되면 포커스가 `body`로 빠질 수 있는 현행 동작은 그대로다(설계상 변경 없음).

### 5.6 error

- 버튼에 error 상태·variant를 두지 않는다. 오류는 `FieldError`(필드)·`Notice error`(폼 전체)·토스트가 담당한다(09 §5-9).
- 실패 후 버튼은 다시 활성으로 돌아간다(현행).

### 5.7 버튼 간 간격

| 위치 | 간격 |
|---|---|
| 모달 footer | 12(`Modal`이 담당, UI_MODAL_PATTERNS §5.1) |
| 페이지 폼 하단(SCR-009), 표 행 동작, 툴바, 헤더 버튼 묶음 | 8(`gap-2`) |
| 월 이동 버튼 ↔ 월 라벨 | 休暇カレンダー 12(`MonthNavigator`) / 出勤簿 4→`sm` 8. 둘 다 현행 유지(B8: 버튼 크기만 통일) |
| 버튼 안 아이콘 ↔ 글자 | sm 4 / md·lg 8 (§3.1) |

---

## 6. 링크와 버튼의 구분·접근성

### 6.1 요소 선택

| 동작 | 요소 | 모양 |
|---|---|---|
| 다른 화면으로 이동(URL 경로 변경) | `<Link href>` | 버튼 모양이면 `buttonClass({variant,size})`, 텍스트면 `buttonClass({variant:'text'})` |
| 모달 열기·제출·상태 변경·단계 전환 | `<button>`(`Button`) | §2 |
| 같은 화면의 URL Query만 바꾸는 조작(페이지네이션·필터 적용) | `<button>` 허용(현행 `router.push`) | 해당 컴포넌트 규칙 |
| 브라우저 뒤로(SCR-009 キャンセル `router.back()`) | `<button>` 허용(목적지가 고정 URL이 아님) | `secondary` |

- 금지: 고정 URL로 이동하는데 `<button onClick={() => router.push('/…')}>`를 쓰는 것, `<div onClick>`·`<span onClick>` 버튼(AUDIT §8의 기존 4건은 대상 외로 기록만).
- **링크는 Enter로만 활성화되고 Space로는 활성화되지 않는다.** 버튼 모양 링크를 폼 제출·동작 대용으로 쓰지 않는다(위 표가 이를 보장).
- 화면 이동 텍스트는 `text`(primary 색)로 "링크임"을 색으로 드러낸다. 평상시 밑줄이 없으므로 **문장 속 인라인 링크에는 `text`를 쓰지 않는다**(WCAG 1.4.1 색만으로 구분 금지). 현재 사용처(CardLink·사원명·ログアウト)는 모두 단독 배치라 해당 없음.
- 모달을 여는 표 안 이름(BT34)은 현행 스타일(`general-100` Bold + hover 밑줄)을 유지하고 Button 대상에서 뺀다(B12).

### 6.2 접근 이름

- 반복되는 표 행 버튼은 `aria-label`에 대상 이름을 넣는다(현행 `detailLabel(name)` 등 유지). 테스트가 이 이름으로 버튼을 찾으므로 이행 시 바꾸지 않는다.
- 아이콘 전용은 `aria-label` 필수, 아이콘은 `aria-hidden`.
- 장식 기호(✓, ›)는 `aria-hidden`.
- 보이는 문구는 접근 이름에 포함되어야 한다(WCAG 2.5.3). 버튼 문구를 바꾸면 그 버튼의 `aria-label`도 같이 바꾼다(예: B19 「修正」→「編集」에 따라 SCR-008 `adminAttendance.editLabel` 「…の勤怠を編集」). 모달 footer의 `EditButton`처럼 `aria-label`이 없으면 보이는 문구가 이름이다.

### 6.3 상태 속성

토글 `aria-pressed`, 메뉴·드로어 `aria-expanded`+`aria-controls`, 현재 위치 `aria-current`. Button 컴포넌트는 이 속성을 그대로 전달만 한다.

---

## 7. 반응형·모바일

### 7.1 배치

| 위치 | `sm` 미만 | `sm` 이상 |
|---|---|---|
| 모달 footer | D4(1개 전폭 / 2개 2열 전폭 / 3개 이상 오른쪽 정렬 줄바꿈) | 오른쪽 정렬 |
| 인증·단독 폼 제출(SCR-001·009) | 전폭, 세로 쌓기(주 동작 위) | SCR-001 전폭 유지 / SCR-009 `sm:flex-1` 가로, 주 동작 오른쪽 |
| 검색 실행 | **전폭**(B14, BT10 방식) | 폭 자동 |
| 페이지 헤더 주 버튼 | 폭 자동, 한 줄 유지(`PageHeader`) | 같음 |
| 카드 안 단일 동작(出勤·退勤) | 전폭 | 전폭(현행) |
| 표 행 동작 | `flex-wrap gap-2`(카드형 목록) | 오른쪽 정렬 |

- size는 반응형으로 바꾸지 않는다(한 버튼 = 한 size). 현재 유일한 반응형 크기(BT05 `h-11 → md:h-12`)는 lg 고정으로 정리한다(B3).
- 검증 폭: **360 / 768 / 1024 / 1440**(D15).

### 7.2 터치 영역 (B7)

| 기준 | 값 |
|---|---|
| 버튼(sm 이상) | 최소 36×36 — sm 정의로 보장 |
| 모바일(`sm` 미만) 화면의 단독 주 동작 | md(40) 이상 |
| 텍스트 버튼·밀집 요소(V6·V11·V9 등) | **히트 영역 최소 24×24**(WCAG 2.2 2.5.8 AA) |
| 인접 버튼 간격 | 8 이상(§5.7) |

- 텍스트 버튼(높이 20)의 24 확보 방법(REVIEW Q8): **필요한 곳만 세로 padding(`py-0.5`)**. 주변에 24px 원이 겹치지 않는 단독 배치(예: Card 헤더 오른쪽 CardLink)는 2.5.8 간격 예외로 충족하므로 padding 없이 둔다. 의사 요소로 히트 영역만 넓히는 방식은 `relative`를 강제해 배치 클래스와 충돌하고 인접 요소와 겹쳐 오탭을 만들어 쓰지 않는다. padding을 넣는 곳은 계획서 단계 7에서 측정 후 정한다.
- 44(WCAG 2.5.5 AAA)를 최소로 하지 않는 이유: 표 내부 sm(36)·페이지네이션(36)을 모두 키우게 되어 360 폭에서 카드형 목록 동작이 줄바꿈된다.

---

## 8. 모달 하단 버튼 (UI_MODAL_PATTERNS와의 정합)

| 모달 규칙 | 버튼 규칙 |
|---|---|
| D3' footer 높이 40 | `size="md"`(기본값) |
| D4 개수별 배치 | `Modal` footer 그리드가 Tailwind `has-[>:only-child]`·`has-[>:nth-child(3)]`로 **직계 자식 수**를 판정한다(`Modal.tsx:134`). Button은 `<button>` 1개만 렌더하고 폭은 그리드가 정한다(`w-full`을 주지 않음) |
| D5 위험 확정 빨간 채움 | `variant="danger"` |
| D8 취소 아웃라인 | `variant="secondary"` |
| Primary·Danger 최대 1개, 주 동작 오른쪽 끝 | §2.1 |
| 제출 중 Spinner·busy | `loading` + `Modal busy` |
| 초기 포커스 `data-autofocus` / 단계 전환 `autoFocus` | 속성 그대로 전달 |

- 현행 모달 상수는 `flex`, Button 기반은 `inline-flex`다. footer 그리드의 자식은 blockify되어 레이아웃은 같다(REVIEW Q3).
- 모달 X(BT62)는 모달 시각 회귀를 한 번에 확인하도록 footer와 같은 단계(계획서 단계 3)에서 `ghost` 아이콘 전용으로 바꾼다. `-m-2`(헤더 정렬용)는 배치 클래스로 유지.

---

## 9. 사용 규칙

### 9.1 사용 예시

```tsx
// 페이지 헤더 주 동작
<Button variant="primary" size="lg" icon={<PlusIcon />} onClick={openApply}>{messages.leaves.applyButton}</Button>
// 표 행 동작(詳細·編集은 프리셋, §4.7)
<DetailButton aria-label={t.detailLabel(item.name)} onClick={() => onDetail(item)} />
<EditButton aria-label={t.editLabel(item.name)} onClick={() => onEdit(item)} />
<EditButton iconOnly aria-label={t.editLabel(item.name)} onClick={() => onEdit(item)} />
// 모달 footer의 수정 입구
<EditButton size="md" onClick={onEdit} />
<Button variant="dangerOutline" size="sm" icon={<TrashIcon />} aria-label={t.deleteLabel(item.name)} onClick={() => onDelete(item)}>{t.delete}</Button>
// 모달 footer
<Button type="submit" form={formId} variant="primary" loading={submitting}>{submitLabel}</Button>
// 아이콘 전용
<Button iconOnly icon={<ChevronLeftIcon />} aria-label={messages.leaveCalendar.prevMonth} onClick={() => onChange(-1)} />
// 모바일 전폭 검색(배치는 className)
<Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">{messages.dateRange.search}</Button>
// 화면 이동 링크
<Link href="/leaves" className={buttonClass({ variant: 'text', withIcon: true })}>…</Link>
```

### 9.2 금지사항

1. 호출부 `className`에 §4.6 금지 클래스(높이·padding·글자·색·radius·정렬·disabled 등) 지정.
2. 파일 로컬 버튼 클래스 상수 신설(AUDIT §3.1의 기존 것은 이행 후 제거).
3. `form.tsx` 상수의 신규 사용, 상수에 크기 클래스를 이어 붙이는 기존 방식.
4. hex·임의 px(`h-[42px]` 등), 버튼 그림자, `buttonClass` 맵의 동적 클래스 조합.
5. 한 영역에 `primary` 2개 이상(표 행 반복 제외), 모달 밖 `danger`(채움).
6. `aria-label` 없는 아이콘 전용 버튼·링크, `div`/`span` onClick 버튼, 고정 URL 이동용 `<button>`, 문장 속 인라인 링크에 `text`.
7. 44px 등 3단계 밖의 높이, 반응형 size 변경.
8. Button을 Fragment·래퍼로 감싸 반환하는 변경(모달 footer 판정).
9. 문구 하드코딩(`messages` 사용, context.md 규칙).

### 9.3 신규 버튼 구현 기준 (체크리스트)

1. 동작이 화면 이동인가? → `<Link>` + `buttonClass()`. 아니면 `Button`.
2. variant는 §2.1 표로 고른다. 영역의 `primary`는 1개인가. 「詳細」·「編集」(수정 입구)이면 `DetailButton`·`EditButton`(§4.7)을 쓰고, 수정 입구 문구는 「編集」(B19).
3. size는 위치로 고른다: 표·목록 행 = sm / 모달·일반 = md / 페이지 주 동작·인증 폼·검색 = lg.
4. 서버 요청이면 `loading`, 조건부 비활성이면 `disabled`(조건은 로직). 제출 버튼은 `type="submit"`.
5. 아이콘은 기존 자산(`leaveIcons`·`departments/icons`·`dashboard/icons`·`navIcons`)을 재사용, 아이콘 전용이면 `aria-label`(링크도).
6. 표 행 반복이면 `aria-label`에 대상 이름.
7. `className`은 배치 클래스만(§4.6).
8. 360 폭에서 줄바꿈·전폭 규칙(§7.1)·터치 영역(§7.2) 확인.
9. 위 규칙과 다른 버튼이 필요하면 구현 전에 차이·이유를 기록해 architect 검토 → 사용자 승인 후 이 문서를 고친다(화면 단위 예외 금지, UI_MODAL_PATTERNS와 같은 절차).

---

## 10. `docs/09_DESIGN_SYSTEM.md` 반영 변경안 (확정. 계획서 단계 8, 문서 반영 모드에서 반영)

> 여기서는 변경안만 적는다. 09는 직접 수정하지 않았다.

| 절 | 현재 | 변경안 |
|---|---|---|
| §2.3 컨트롤 radius | 버튼·입력 radius 8 | 문장 유지 + "예외: `Pagination` 셀·`StatusFilterButtons`는 radius 4(대상 외 컴포넌트), 텍스트 버튼의 포커스 링 radius 4" 추가(B9) |
| §2.3 버튼 높이 | Large 48 / Medium 40 / Small 36 + SCR-004 신청 48(`md` 미만 44)/기본 44/소형 36 | "Large 48 / Medium 40 / Small 36. 구현은 `Button` `size` lg/md/sm(UI_BUTTON_PATTERNS §3). 44는 쓰지 않는다(2026-11 버튼 표준화)" — SCR-004 44 문구 삭제(B3) |
| §2.3 신규 행 "버튼 크기 토큰" | 없음 | `--spacing-btn-*`·`--radius-btn` 값 표(B6) |
| §3 Button 행 | Primary / White / Light / Danger, 크기 3종 … | "구현 variant 7종: primary / secondary(White, D8의 아웃라인) / primaryOutline / danger(채움, 모달 확정) / dangerOutline(입구) / ghost(무테 아이콘) / text. Light는 미구현. size sm 36·md 40·lg 48, 아이콘 전용 36/40. 규칙은 UI_BUTTON_PATTERNS" |
| §5 신규 항목 11 | 없음 | "버튼 공통 패턴(2026-11, 사용자 결정 B1~B17)": 공통 `Button`·`buttonClass()`만 사용, variant 선택 규칙 요약, size 위치 규칙, disabled·loading 내장, 링크 = `Link`+`buttonClass`, `className` 배치 전용(ESLint), 금지사항 요약, 예외 절차 |
| §6 신규 행 `components/Button.tsx` | 없음 | `Button({variant?,size?,type?,disabled?,loading?,icon?,iconPosition?,iconOnly?,className?,...})`, `buttonClass({variant?,size?,iconOnly?,withIcon?})` — 용도·토큰·접근성, `variant`/`size`가 Badge·Notice·Modal과 의미가 다르다는 주석 |
| §6 `form.tsx` 버튼 상수 행 | 개별 설명 | 이행 중: "신규 사용 금지, `Button` 이행 대상"으로 표시 + **`primaryOutlineButtonClass` 행 추가**(현재 미기록, AUDIT X1). 단계 8에서 상수 삭제 시 행 삭제 |
| §6 `textButtonClass` | "로그아웃 등 보조 링크성 동작" | "텍스트 버튼·텍스트 링크(`<Link>`에도 사용)"(AUDIT X3). 단계 8에서 삭제 |
| §6 `Modal` 행 | "footer 배치는 DOM 자식 수로 판정(CSS `:has()`)" | "Tailwind `has-[>:only-child]`·`has-[>:nth-child(3)]`로 판정"(AUDIT X6), X 버튼은 `Button` ghost 아이콘 전용 |
| §6 `MonthNavigator`·`SectionError`·`TopBar`(벨) | 각자 크기·클래스 기록 | `Button`/`buttonClass` 사용으로 문구 갱신(값 변경분만). `Notice` X는 변경 없음 |

---

## 11. 결정 사항 (확정, 2026-11-13)

사용자가 B1~B17을 하나씩 확인했고 모두 권장안으로 결정했다(`.claude/work/button-audit/decisions.md`). 검토했던 다른 선택지와 비교 근거는 v2 문서(git 이력)와 frontend 검토(`.claude/work/button-audit/frontend-review.md` §3)에 있고, 여기서는 결정값과 적용 조건만 적는다.

| ID | 항목 | 결정 | 적용 조건·근거 |
|---|---|---|---|
| B1 | 공통 Button 구현 형태 | `Button` 컴포넌트 + `buttonClass()`(Link용). 다형 `href`는 두지 않음 | 내부는 base/variant/size 리터럴 맵(§4.3) |
| B2 | Variant 이름 | 기존 상수명 유지: primary·secondary·primaryOutline·danger·dangerOutline·ghost·text | `secondary`가 D8의 "아웃라인" |
| B3 | 44px 처리 | 44 폐지. 休暇申請·部署を追加·出勤·退勤 → lg 48, 条件をクリア → md 40 | 단계 4에서 캡처로 사용자 확인: ① 360 `PageHeader` 한 줄 ② SCR-010 헤더 +8px ③ 条件をクリア와 옆 입력(44)의 2px 어긋남 ④ 出勤·退勤 카드 +4px |
| B4 | sm 좌우 padding | 12 | `SectionError`(22곳)는 단독 PR(계획서 단계 2-b) |
| B5 | lg 좌우 padding | 24 | 검색 버튼 폭 16 감소 허용 |
| B6 | 버튼 크기 토큰 | 도입(`--spacing-btn-*`·`--radius-btn`) | 별도 커밋(계획서 단계 2-a), Playwright `toHaveCSS`로 계산값 검증, 맵은 완전한 리터럴만(§3.3) |
| B7 | 모바일 최소 터치 영역 | 버튼 36(sm) / 모바일 단독 주 동작 40 / 텍스트·밀집 요소 히트 영역 24 | 텍스트 링크는 간격 예외로 충족하지 못하는 곳만 세로 padding(§7.2, 계획서 단계 7) |
| B8 | 월 이동 버튼 | 버튼만 40으로 통일(출근부 前月·翌月 36→40, 「今月」 sm→md), 출근부 Chevron → `leaveIcons` | 버튼↔라벨 간격·라벨 서체 차이는 유지·기록(AUDIT §4.3). 출근부 헤더 +4px — `attendance-sheet-layout`·`leave-management` e2e 확인 |
| B9 | radius 4 처리 | ghost 아이콘(모달 X·벨)만 8. Pagination·StatusFilterButtons·Notice X는 4 유지 + 09에 예외 명시 | 모달 X 모서리 변화는 단계 3 캡처 확인 |
| B10 | 표 안 수정 버튼 | `primaryOutline` + Pencil 아이콘 통일(勤怠 「修正」 회색 → Primary 아웃라인) | 버튼 폭 약 20px 증가를 360 카드·1024 표 캡처로 확인. Pencil은 라우트 간 import 대신 공용 위치로 이동(계획서 단계 5) |
| B11 | 却下 버튼 색 | 현행 유지(입구 `secondary`, 확정 「却下する」 `primary`) | D5 빨강은 데이터가 사라지는 동작에만 |
| B12 | 표 안 이름 스타일 | 화면 이동 = `text`, 모달 여는 이름(BT34) = 현행 유지(Button 대상 외) | |
| B13 | active 스타일 | 추가하지 않음 | |
| B14 | 검색 버튼 3곳 | lg, 아이콘 없음, `sm` 미만 전폭 | BT11 아이콘 제거 시 `LeavesView.test.tsx` 단언 확인 |
| B15 | 단계 1 진행 방식 | `form.tsx` 무변경 가산. 기존 상수는 단계 8에서 사용처 0 확인 후 삭제 | 이행 기간 중 `form.tsx` 버튼 상수 신규 사용 금지 |
| B16 | `className` 오용 방지 | ESLint `no-restricted-syntax` + 리뷰 체크리스트 | 허용·금지 목록은 §4.6 |
| B17 | `fullWidth` prop | 두지 않음. 전폭은 `className="w-full"`(반응형 `w-full sm:w-auto`) | |
| B18 | 詳細·編集 버튼 통일(2026-11-14) | 詳細 = `secondary` + Eye, 編集 = `primaryOutline` + Pencil. 공통 프리셋 `DetailButton`·`EditButton`(§4.7). 행 sm·모달 footer md | 적용: SCR-004 신청 이력·SCR-005 표/카드·SCR-006 행·SCR-010 행의 [詳細], SCR-006 행·社員詳細 footer·役職確認, SCR-008 행, SCR-010 행·部署詳細 footer의 [編集]. SCR-006 [編集] secondary → primaryOutline, SCR-010 部署詳細 footer primary → primaryOutline. `EyeIcon`은 `components/leave/leaveIcons.tsx`로 이동. 화면별 `detail`/`edit` 문구 키는 `messages.common.detail/edit`로 통합 |
| B19 | 「修正」→「編集」 버튼 명칭 통일(2026-11-14) | 수정 입구 버튼 문구는 「編集」. 바꾸는 범위는 **버튼 문구와 그 `aria-label`·sr-only 열 제목만**(SCR-008 행 버튼·`adminAttendance.editLabel`·조작 열 제목) | 대상 외: 확인 단계 확정 버튼 [修正する](확인문 「勤怠を修正しますか？」와 짝), 모달 제목·설명·확인문·토스트, 상태 표시 「管理者修正」, 툴팁 |
| Q1~Q7 | B18·B19 적용 시 개별 결정(`.claude/work/button-unify/decisions.md`) | Q1 SCR-008 확인 단계 [修正する] 유지 / Q2 役職確認 아이콘 전용 편집 = `EditButton iconOnly`(primaryOutline) / Q3 SCR-008 sr-only 열 제목 「修正」→「編集」 / Q4 部署詳細 footer primary → primaryOutline + Pencil / Q5 部署詳細 footer 문구 「この部署を編集」→「編集」(360px 2줄 줄바꿈 해소) / Q6 SCR-010 목록 표/카드 전환점 `md`→`xl`(1280) / Q7 SCR-005 표/카드 전환점 `md`→`xl` | Q6·Q7: 詳細 Eye 추가(폭 +20px)로 768·1024px에서 표 操作 열이 스크롤 영역·`overflow: hidden` 밖으로 잘림(SCR-010 1024에서 138px, SCR-005 1024에서 87px). `lg`로는 해소되지 않아 `xl`. 표·카드 디자인은 불변 |


---

## 12. 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v1 | 2026-11-13 | 최초 설계안(B1~B14) |
| v2 | 2026-11-13 | frontend 검토(`.claude/work/button-audit/frontend-review.md`) 반영. ① `ghost` 근거를 "3곳 같은 값"에서 "모달 X·벨 2곳"으로 정정, Notice X 대상 외(E1·E7) ② 대상 54건·이행 53건 명시(E2) ③ `buttonClass` 내부를 base/variant/size 리터럴 맵으로 구조화, 공통 기반에서 `whitespace-nowrap`·`select-none` 제외(sm만 nowrap, text는 기반 미적용), radius를 variant 맵으로, `enabled:hover` 미채택(R3·Q1·Q4) ④ `className` 규약(허용·금지 목록)과 ESLint 방지책 §4.6 신설, `tailwind-merge` 비채택 명시(R2) ⑤ `form.tsx` 별칭 방식 폐기 → 무변경 가산(B15, R1) ⑥ 아이콘 전용을 `iconOnly` 리터럴 판별자로(Q2), `fullWidth` 제거(B17), loading 슬롯 규칙·Spinner 유지 조건(Q9), Button 단일 요소 조건(Q3) ⑦ 토큰 도입 조건(별도 커밋·`toHaveCSS`·리터럴, B6) ⑧ 링크 Enter 전용·인라인 링크 금지(§6.1), 터치 영역 padding 방식(Q8) ⑨ 모달 footer 판정 표기 정정(E9), 모달 X를 단계 3으로 ⑩ B3·B8·B10·B14 조건 추가, B15~B17 신설 |
| v3 | 2026-11-13 | **사용자 결정 B1~B17 반영**(전부 권장안, `.claude/work/button-audit/decisions.md`). §11을 선택지 비교표에서 "결정 사항(확정)" 표(결정값·적용 조건)로 교체. 본문의 "권장"·"B6에서 도입 안 함" 등 미결 표현을 확정 표현으로 정리(§2.1·§3·§4·§5.3·§5.7·§6.1·§7). §10 09 변경안은 확정안으로 유지 |
| v4 | 2026-11-14 | **詳細·編集 버튼 통일(B18·B19, Q1~Q7)**. §2.1 상세 열기 = `secondary` + Eye, 수정 입구 문구 「編集」, §4.6 ESLint 대상에 `DetailButton`·`EditButton` 추가, §4.7 역할 프리셋 신설(`children` 대체는 예외적으로만), §6.2 보이는 문구 ⊂ 접근 이름, §9.1 예시·§9.3 체크리스트, §11 B18·B19·Q1~Q7 |
