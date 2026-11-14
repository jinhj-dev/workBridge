# UI 모달 공통 패턴 설계 (UI_MODAL_PATTERNS)

> 상태: **v3 — 사용자 결정 D1~D15 반영(2026-11-13)**. 결정 원문: `.claude/work/modal-audit/decisions.md`, 시안: `.claude/work/modal-audit/mockups/`(`compare-*.png`, `compare-d7-*`, `compare-d8-*`). 변경 내역: `.claude/work/modal-audit/docs-update.md`.
> 남은 미결은 §9.2(소수, 권장안 포함). 그 외 값은 확정이다.
> 근거 조사: `docs/UI_MODAL_AUDIT.md`(이하 AUDIT). 단계 계획: `docs/UI_MODAL_REFACTOR_PLAN.md`.
> 원칙: 기존 컴포넌트(`components/Modal.tsx`, `form.tsx`, `FormTable`, `DetailTable`, `Notice`)를 확장한다. 새 래퍼는 같은 구조가 3곳 이상일 때만 만든다(CLAUDE.md §2).
> 값은 `frontend/src/app/globals.css` `@theme`의 기존 토큰 또는 Tailwind 기본 spacing이다. 신규 토큰은 없다(§5.3).

---

## 1. 공통 구조 (모든 유형)

```
<dialog> ─ Modal
 ├─ Header        [아이콘] 제목                       [X]
 │                         설명(description)?
 │                         보조 슬롯(subtitle: 배지 등)?
 ├─ Body          (유일한 세로 스크롤 영역)
 │    ├─ 폼 전체 오류 Notice(error)          ← 있으면 맨 위
 │    ├─ 읽기 전용 요약 ReadOnlySummary      ← Form에서 수정 불가 값이 있을 때
 │    ├─ 유형별 본문(FormTable / DetailTable / 목록 / 확인 문장)
 │    └─ 안내·주의 Notice(info/warning)      ← 있으면 맨 아래
 └─ Footer        구분선 + 버튼(취소/닫기 … 주 동작은 오른쪽 끝)
```

| 영역 | 규칙 | 근거 |
|---|---|---|
| 아이콘 | **모든 모달 필수**(D6). 선정 기준 §2.1 | 결정 D6 |
| 제목 | 필수. 크기는 §4.2 외형 표 | `Modal.tsx:74-79` |
| description | 제목 아래 설명문. **A Form은 필수**(部署登録 방식, D2), 다른 유형은 선택. `aria-describedby` 연결 | 결정 D2, `DepartmentFormModal.tsx:190` |
| subtitle | 이름 유지. 배지 등 보조 정보 전용(M03). description이 있으면 그 아래 | `Modal.tsx:80-84` |
| Body | 유일한 세로 스크롤. Header·Footer 고정. Body 안 요소 간 간격 24(`gap-6`) | 시안 `.stack{gap:24px}` |
| Footer | 구분선 `general-40`. 왼→오 = 취소/닫기 → 보조 → **주 동작(오른쪽 끝)**. Primary·Danger는 최대 1개 | 현행 |
| X | `aria-label=messages.common.close`, 40×40, `busy` 중 disabled | `Modal.tsx:87-91` |
| Overlay | `backdrop:bg-general-100/50`, 바깥 클릭으로 닫지 않음 | `Modal.tsx:59` |

**단계 전환 규칙**: 확인·사유 입력 단계는 같은 `<dialog>`의 제목·본문·footer만 바꾼다(중첩 dialog 금지). size·아이콘은 단계 사이에 바꾸지 않는다. 확인 단계 [취소]는 진입 경로에 따라 "이전 단계로" 또는 "닫기"(M06 `initialStep` 유지).

---

## 2. 유형 정의 (확정)

| 유형 | 용도 | size | footer | 기준 디자인(D12) | 구현 형태 |
|---|---|---|---|---|---|
| A FormModal | 등록·수정 입력 | **lg 640**(D3) | [キャンセル] [주 동작] | 休暇申請(FormTable 배치) + 部署登録(플레이스홀더·설명문) | `FormModal`(최소 래퍼, D14) |
| A 단계형 폼 | 입력 → 확인 단계가 있는 폼 | lg 640 | 단계별 | 같음 | `Modal` 직접 + A 본문 규칙(M08, D14에서 FormModal 대상 외) |
| B DetailModal | 조회 + 다음 동작 진입 | lg 640 | [閉じる] [동작…] | 休暇詳細 | 패턴 + 부품 조합 |
| C ListModal-표 | 툴바 + 표/카드 + 페이지 | xl 800 | [閉じる] | 所属社員確認 | 패턴 + 부품 조합 |
| C ListModal-단순 | 짧은 목록 | md 420 | [閉じる] | 날짜별 휴가자(LeaveDay) | 패턴 + 부품 조합 |
| D ConfirmDialog | 실행 전 확인 | md 420 | [キャンセル] [실행] | 出勤・退勤の登録. 위험 동작은 部署の削除의 경고 배치 + 빨간 버튼 | `ConfirmDialog` |
| D 단계형 확인 / D' 입력 동반 확인 | 다른 모달 안의 확인·반려 사유 단계 | 부모 유지 | 같음 | 休暇詳細의 단계 | 클래스 규칙 |
| E 복합형 | 목록 + 행 단위 등록·수정 | — | — | — | **정하지 않음**(D9, 필요해질 때 결정) |

- **DetailModal·ListModal은 컴포넌트가 아니라 패턴 이름**이다. 래퍼 없이 `Modal` + 기존 부품을 §3 규칙대로 조합한다(`.claude/agents/frontend.md` §2의 "DetailModal 패턴"은 이 의미). 이유: 본문이 화면마다 다르고 래퍼가 줄이는 코드는 footer 버튼 1~2개뿐.
- 모든 유형에 외형 ①'(§4.2)와 제목 아이콘을 적용한다(D12 비고).

### 2.1 제목 아이콘 선정 기준 (D6)

| 규칙 | 내용 | 예 |
|---|---|---|
| I-1 A·B·C | **대상 도메인(무엇을 다루는가)**의 아이콘 | 部署 → 건물(`BuildingIcon`), 所属社員 → 사람들(`PeopleIcon`), 休暇 → 달력(`CalendarIcon`), 勤怠 → 시계 |
| I-2 D 독립형 | **동작(무엇을 하는가)**의 아이콘 | 삭제 → 휴지통, 出勤 → 들어가기(`EnterIcon`), 退勤 → 나가기(`ExitIcon`) |
| I-3 단계형 | 부모 모달 아이콘 유지(단계 사이 변경 금지) | M06 승인·却下·取消 단계 = 달력 |
| I-4 색 | 위험 동작을 포함해 **항상** `bg-primary-30` 박스 + `text-primary-100`(시안 `compare-d8-delete`). 위험 신호는 버튼 색(D5)과 warning Notice가 담당. **예외 E1**: SCR-006 社員管理 모달 5종은 `iconVariant="circle"`(`bg-violet-30` 원형, §9.3) | |
| I-5 형태 | 40px 박스 `rounded-md`, 아이콘 24, `aria-hidden`(`iconVariant="square"`, 기본). 예외 E1 circle은 48px `rounded-full`, 아이콘 24 | `Modal.tsx` |
| I-6 자산 | 같은 도메인은 같은 아이콘 파일을 쓴다. 신규 아이콘 파일은 만들지 않고 기존 자산을 재사용한다(2026-11-13 정정: 휴지통·勤怠 시계는 이미 있음 — `admin/departments/icons.tsx` `TrashIcon`, `components/layout/navIcons.tsx` `ClockIcon`, 둘 다 24 viewBox·`currentColor`·stroke 1.75). 모달별 사용 파일은 09 §6 `Modal` 행에 기록 | `departments/icons.tsx`, `components/CalendarIcon.tsx`, `dashboard/icons.tsx`, `layout/navIcons.tsx` |

모달별 아이콘(확정 기준 적용): M01 건물 / M02 건물 / M03 사람들 / M04 휴지통 / M05 달력 / M06 달력 / M07 달력 / M08 시계 / M09 出勤 들어가기·退勤 나가기.

---

## 3. 유형별 표준 패턴

### 3.1 A FormModal (A 단계형 폼 포함)

| 항목 | 규칙(확정) |
|---|---|
| 배치(D2) | **`FormTable` + `FormTableRow`**(라벨 열 `10rem` 회색 셀 14/20 Medium `general-80`, 값 셀 흰색, 행 구분선, `sm` 미만 1열). `FormRow`·라벨 위 스택은 모달에서 쓰지 않는다. **예외 E1**: SCR-006 社員追加·社員編集은 라벨 위 스택 `FormStack`/`FormStackRow`(§9.3) |
| 플레이스홀더(D2) | 部署登録 방식: 텍스트·textarea·검색 선택 입력에 `messages`의 placeholder를 둔다(예: 「部署名を入力してください」). 날짜·`Select`는 각 컨트롤 기본 표시 |
| 설명문(D2) | `description` 필수(1문장, 「〜を登録します。」 형태) |
| 입력 장식 아이콘 | `IconField`는 기존 M01 유지. 신규 폼의 표준 여부는 §9.2 U3 |
| 필수 표시 | `FormTableRow required`(`RequiredMark`) + 입력 `aria-required`/`required` |
| 보조 설명 | `FieldHint`(§4.4), `aria-describedby` 연결(D13: M05 일수 힌트도 연결) |
| 필드 오류 | `FieldError`. 제출 시 첫 오류 필드로 포커스(M05 `focusFirst` 방식) |
| 글자 수 | `CharCount`(§4.4). 계산 방식은 호출부 로직 유지(AUDIT L1 별도) |
| 수정 불가 값(D7) | **폼 위 `ReadOnlySummary`**(§4.5)로 분리. FormTable 안에 비활성 입력·텍스트 행으로 넣지 않는다 |
| 입력에 따라 계산되는 값 | 수정 불가 값과 구분: FormTable 행 안에 표시(M05 申請日数, `aria-live="polite"` 유지). 표시 스타일은 §9.2 U2 |
| 폼 전체 오류 / 안내 | `Notice error` Body 맨 위 / `Notice info` Body 맨 아래 |
| 제출 | `<form id noValidate>` + footer `type="submit" form={id}`. Enter 제출 |
| 제출 중 | 주 버튼 disabled + `Spinner`, `busy` |
| 단계형(M08) | 입력 단계 버튼이 `type="button"` + 검증 후 단계 전환이라 FormModal 대상 외. 본문은 위 규칙 그대로 |

폭 확인: lg(640)에서 FormTable 값 셀 입력 폭 ≒ 640 − 좌우 padding 64 − 테두리 2 − 라벨 160 − 셀 padding 40 = **약 374px**. `datetime-local`·`Select`·`ApproverSelect` 모두 수용(시안 `compare-d7-attedit`).

### 3.2 B DetailModal (패턴)

| 항목 | 규칙 |
|---|---|
| 본문 | `DetailTable` + `DetailTableRow`(라벨 열 6rem → `sm` 10rem, 14/20) |
| 머리 요약(선택) | 대표 정보를 표 앞에 둘 수 있다(M02 히어로). 제목 아이콘과의 중복은 §9.2 U1 |
| 값 없음 / 긴 텍스트 | `messages.common.noValue` / `whitespace-pre-line`(또는 `pre-wrap`) + `break-words` |
| 로딩 / 오류 | `SkeletonLines` / `SectionError` |
| footer | [閉じる] 왼쪽, 이어지는 동작 오른쪽. Primary 최대 1개 |

### 3.3 C ListModal (패턴)

| 항목 | 단순형(md) | 표형(xl) |
|---|---|---|
| 목록 | `ul divide-y divide-general-40`, 항목 `py-3` | 툴바(건수 + `SearchInput`) → `lg` 이상 표 / 미만 카드 |
| 페이지 | 없음 | `Pagination`(`sm` 미만 `compact`) |
| 상태 | 빈 상태 없음(열기 전에 항목 확정) | Loading `SkeletonLines` / Empty·No result 문구 `py-4 text-center text-sm/5 text-general-80` / Error `SectionError` |
| 스크롤 | Body 스크롤만 | **Body 스크롤만, 5명 페이지**(D10 코드 기준. 표 내부 50dvh 스크롤은 쓰지 않음) |

### 3.4 D ConfirmDialog / 단계형 확인 / D'

| 항목 | 규칙(확정) |
|---|---|
| 폭 | 독립형 md. 단계형·D'는 부모 유지 |
| 본문 | 확인 문장 `confirmMessageClass`. 영향 고지는 문장 아래 `Notice warning`(部署の削除 방식) |
| 버튼(D5) | [キャンセル](아웃라인, D8) + [실행]. 위험 동작(삭제·비활성화·취소 확정)은 **빨간 채움** `modalDangerButtonClass` |
| 제출 중 | 양 버튼 disabled + Spinner + `busy` |
| 초기 포커스 | 위험 동작 = [キャンセル], 그 외 = 주 버튼(`data-autofocus`). X에 가지 않게 함 |
| role | `dialog` 유지(`alertdialog` 미도입, §7) |
| D' 입력 | A의 필드 규칙(라벨·FieldError·CharCount), 입력에 `data-autofocus` |

---

## 4. 공통 컴포넌트 구조

### 4.1 전체 그림

```
components/Modal.tsx            ← 확장(description, busy, data-autofocus, ①' 외형, 개수별 footer)
 ├─ components/ConfirmDialog.tsx   ← 신규. D 독립형 (M04·M09 + SCR-007 확인 2종 예정)
 └─ components/FormModal.tsx       ← 신규(D14). A 최소 래퍼 (M01·M05 + SCR-006 예정). M08 제외
components/form.tsx             ← 모달 버튼 클래스(modalDanger 추가), confirmMessageClass, FieldHint, CharCount
components/FormTable.tsx        ← A 표준 배치(변경 없음, labelId 이미 지원 :12-14)
components/ReadOnlySummary.tsx  ← 신규(D7). 폼 위 읽기 전용 요약
components/DetailTable.tsx      ← 변경 없음
components/FormRow.tsx          ← M01 이행 후 미사용 → 삭제(정리 단계)
components/Notice.tsx           ← 변경 없음
```

채택하지 않은 안(v2 유지): `ModalFooterButtons`(ConfirmDialog·FormModal이 반복을 흡수, 단계형은 버튼 구성이 단계마다 달라 분기만 늘어남), `ConfirmMessage` 컴포넌트(클래스 상수로 충분), DetailModal·ListModal 래퍼(§2).
v2에서 폐기: `FormRow`의 `htmlFor | labelId` 확장, size별 폼 배치 규칙(D2가 FormTable 통일로 결정되어 불필요).

### 4.2 `Modal` 확장

| prop | 변경 | 설명 |
|---|---|---|
| `description?: ReactNode` | 추가 | 설명문. `useId()`로 id를 만들어 있을 때만 `aria-describedby` |
| `subtitle?: ReactNode` | 이름 유지 | 배지 등 보조 슬롯. 스타일은 `mt-1`·무스타일로 단일화 |
| `busy?: boolean` | 추가 | ① `cancel`에서 `preventDefault` ② `close`에서 busy면 `onClose`를 부르지 않고 `showModal()`로 재오픈(Chrome close watcher 대비 안전망) ③ X disabled |
| `icon` | **필수로 변경**(D6) | `icon?` → `icon` |
| `variant` | 폐지 | 외형 1계열(①') |
| `size` | 유지 | md 420 / lg 640 / xl 800 |
| 초기 포커스 | 추가 동작 | `showModal()` 직후 `[data-autofocus]` 요소에 `focus()`(React `autoFocus`는 열리기 전 커밋되어 무시될 수 있음) |

외형 ①'(D1 확정, 시안 `build.mjs:74-94` 기준):

| 항목 | lg·xl | md |
|---|---|---|
| radius / 그림자 | 16 `rounded-2xl` / `shadow-card-soft` | 같음 |
| 폭 | 모바일 `100%-1rem`(여백 8), `sm` 이상 `100%-2rem` | 같음 |
| Header padding | `px-5 pt-5` → `sm:px-8 sm:pt-8`(32) | `px-5 pt-5` → `sm:px-7 sm:pt-7`(28) |
| 제목 | `text-h6` → `sm:text-h5`(20/28 → 24/34) | `text-h6`(20/28) 고정 |
| description | `mt-2 text-sm/5 sm:text-base/6 text-general-80` | 같음 |
| Header↔Body | 24(`mt-6`) | 16(`mt-4`) |
| Body padding | `px-5 sm:px-8` | `px-5 sm:px-7` |
| Footer | `pt-6 pb-5 sm:pb-8`, `sm` 이상 본문 폭 안쪽 `border-t` + `pt-5` | `sm:pb-7`, 나머지 같음 |

알려진 차이(수용): 단계형 확인(M06, lg)은 제목 24, 독립 확인(md)은 20. 단계 사이 size를 바꾸지 않는 규칙을 우선한다.

Footer 배치(D4 확정): `sm` 미만 = 버튼 2개 → 2열 전폭 그리드 / 1개 → 전폭 / 3개 이상 → 오른쪽 정렬 줄바꿈(`flex-wrap justify-end`). `sm` 이상 = 오른쪽 정렬. 버튼 개수는 `footer` 자식 수로 판정하거나 호출부가 넘기는 방식 중 구현이 정한다(시안 `.in`/`.in.one`/`.in.many`).

### 4.3 `form.tsx` 클래스

| 클래스 | 값(확정) |
|---|---|
| `modalPrimaryButtonClass` | 현행 유지: 높이 40(D3'), `px-4 text-sm/5`, disabled `bg-primary-60` |
| `modalSecondaryButtonClass` | 아웃라인(D8) + `flex items-center justify-center gap-2` + disabled(`cursor-not-allowed text-general-60 hover:bg-white`) 추가 |
| `modalDangerButtonClass` | 신규(D5): `rounded-lg bg-danger-100 font-bold text-white hover:bg-danger-100/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-100 disabled:cursor-not-allowed disabled:bg-danger-100/50` + 높이 40 |
| `confirmMessageClass` | 신규: `break-words text-general-100` |
| 로컬 클래스 | 폐지: `DepartmentDeleteModal.tsx:56`, `AttendanceEditModal.tsx:110-112`, `DepartmentFormModal.tsx:36-37,182-183` |

disabled 대비: WCAG 1.4.3은 비활성 컴포넌트를 대비 요구에서 제외한다. 09에 "disabled는 대비 기준 예외" 1줄 추가 예정.

### 4.4 폼 보조 부품 (`form.tsx`)

| 이름 | 시그니처 | 대체 대상 |
|---|---|---|
| `FieldHint` | `FieldHint({ id?, children })` → `mt-1 text-xs/4 text-general-80` | M01 :229·:267, M05 :281(D13으로 id 부여·연결), M08 :204 |
| `CharCount` | `CharCount({ id, length, max, error? })` → 오류(좌)·카운터(우), `mt-1 text-sm/5 tabular-nums`, 초과 시 `font-medium text-danger-100` | M01 :285-295(간격 8→4), M05 :298-310, M06 :303-313 |

### 4.5 `ReadOnlySummary` (신규, `components/ReadOnlySummary.tsx`, D7)

용도: 폼 모달에서 **수정할 수 없는 대상 정보**(누구의·어느 날의 데이터를 고치는지)를 폼 위에 요약 표시. 시안 방식 C(`build-d7.mjs:47-48,63-64`).

| export | 시그니처 | 마크업 |
|---|---|---|
| `ReadOnlySummary` | `ReadOnlySummary({ children, className? })` | `<dl>` |
| `ReadOnlySummaryItem` | `ReadOnlySummaryItem({ label, children })` | `<dt>` + `<dd>` (Fragment) |

`DetailTable`/`DetailTableRow`와 같은 children 조합 방식(기존 네이밍 규칙).

| 항목 | 값(기존 토큰) |
|---|---|
| 컨테이너 | `grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-general-30 px-5 py-4 text-sm/5` (radius 12 = `Notice`의 `radius-notice`와 같은 값) |
| 라벨(dt) | `text-general-80` |
| 값(dd) | `min-w-0 wrap-anywhere text-general-100`, 숫자·날짜는 호출부가 `tabular-nums` |
| 위치 | Body에서 폼 전체 오류 Notice 다음, FormTable 앞. 간격 24 |
| 반응형 | 모든 폭에서 2열(라벨 auto). 360에서도 줄바꿈으로 수용(시안 `compare-d7-*-mobile`) |
| 접근성 | `dl`/`dt`/`dd` 의미 구조. 입력과 연결하지 않음(정보 표시) |
| 금지 | 입력 가능 값·계산 값을 넣지 않는다. 대상 정보가 1개뿐이어도 같은 부품 사용 |

적용 대상: M08(社員名·勤務日, 현재 `dl` `AttendanceEditModal.tsx:166-171`을 대체). SCR-007 등 향후 수정 폼.
참고: 시안의 「部署の編集」에서 部署コード를 요약으로 뺀 것은 시안 가정이며, 현재 코드·명세(SCR-010 §5 :94-98)는 편집 시 부서 코드 수정이 가능하다. 이 변경은 로직·명세 변경이라 이번 패턴에 포함하지 않는다(§9.2 U5).

### 4.6 `ConfirmDialog` (신규)

| prop | 타입 | 설명 |
|---|---|---|
| `open`, `title`, `onClose` | | |
| `icon` | ReactNode | 필수(I-2 동작 아이콘) |
| `message` | ReactNode | `confirmMessageClass` |
| `notice?` | ReactNode | 문장 아래 `Notice warning` |
| `confirmLabel`, `cancelLabel?` | string | 취소 기본 `messages.common.cancel` |
| `tone?` | `'primary' \| 'danger'` | danger면 `modalDangerButtonClass` + 초기 포커스 [キャンセル] |
| `submitting` | boolean | `busy` + 양 버튼 disabled + Spinner |
| `onConfirm` | `() => void` | |

내부: `Modal size="md"` + 고정 본문·footer. M09로 옮길 때 `submittingRef`·`pending`·409 재조회는 `AttendanceSection`에 남긴다.

### 4.7 `FormModal` (신규, D14 최소 구성)

| prop | 타입 | 설명 |
|---|---|---|
| `open`, `title`, `onClose`, `icon` | | `Modal`과 같음 |
| `description` | ReactNode | **필수**(D2) |
| `size?` | | 기본 `lg` |
| `onSubmit` | `(e: FormEvent<HTMLFormElement>) => void` | M01·M05 모두 수용 |
| `submitLabel`, `cancelLabel?` | string | |
| `submitting` | boolean | `busy` + 주 버튼 disabled + Spinner |
| `children` | ReactNode | ReadOnlySummary·FormTable·Notice(배치는 §1 규칙) |

`Modal` + `<form id noValidate>` + footer 2버튼만. `footer` 덮어쓰기·Notice 슬롯 prop은 두지 않는다. M08은 대상 외.

---

## 5. 디자인 토큰 사용 규칙

### 5.1 사용 토큰

| 용도 | 토큰/클래스 |
|---|---|
| 배경 / 글자 | `bg-white` / 제목 `general-100`, 본문 기본 `general-80`, 강조 `general-100` |
| Overlay / 구분선 / 그림자 | `general-100/50` / `general-40` / `shadow-card-soft` |
| 제목 | `text-h6`, `text-h5`(`text-xl/7` 임의 조합 금지) |
| 본문 / 표·라벨 / 힌트 | `text-base/6` / `text-sm/5` / `text-xs/4` |
| 아이콘 박스 | `bg-primary-30` `text-primary-100`(위험 동작 포함). 예외 E1 circle은 `bg-violet-30` `text-primary-100` |
| 읽기 전용 요약 | `bg-general-30`, `rounded-xl`, dt `general-80` / dd `general-100` |
| 위험 버튼 | `danger-100`, `danger-100/90`, `danger-100/50` |
| 안내 | `Notice`의 `notice-*` |
| 간격 | 4의 배수: Header↔Body 16/24, Body 요소 간 24, footer 버튼 간 12 |

### 5.2 금지

- 모달 안 hex·임의 px 신규 사용(기존 `FormTable.tsx:23` `sm:pt-[26px]`는 현행 유지, 신규 추가 금지)
- footer 버튼 크기·색의 화면별 재정의
- `Modal`을 거치지 않는 모달성 오버레이·`<dialog>` 직접 사용(내비게이션 드로어·팝오버 메뉴·콤보박스 목록·Tooltip·Toast는 대상 외, AUDIT §1.3)
- 중첩 dialog, 아이콘 없는 모달, 모달 안 `FormRow`·라벨 위 스택 배치(예외 E1의 SCR-006 `FormStack`만 허용, §9.3)
- `iconVariant="circle"`·`FormStack`을 SCR-006(`app/(app)/admin/users/`) 밖에서 사용
- 수정 불가 값을 비활성 입력으로 표시
- Notice 이외 스타일의 안내 문구

### 5.3 신규 토큰

없음. 신규 클래스·부품만: `modalDangerButtonClass`, `confirmMessageClass`, `FieldHint`, `CharCount`, `ReadOnlySummary`, `ConfirmDialog`, `FormModal`. 위험 버튼의 hover·disabled는 기존 `danger-100`의 투명도 변형(D5).

---

## 6. 반응형

| 구간 | 규칙 |
|---|---|
| 공통 | 가운데 dialog, `max-h: 100dvh − 2rem`, Body만 스크롤. **바텀시트·전체화면 모달 미도입**(D11) |
| `sm` 미만 | 좌우 padding 20, 바깥 여백 8, FormTable 1열, footer 개수별(D4) |
| `sm` 이상 | padding 32(lg·xl)/28(md), FormTable 2열 |
| `lg`(1024) | 표형 List 표/카드 전환점 |
| 검증 폭 | **360** / 768 / 1024 / 1440(D15. frontend.md의 "약 375px"은 사용자가 직접 정합) |

---

## 7. 접근성·상태 처리

| 항목 | 규칙 |
|---|---|
| Esc | 기본 허용, `busy` 중 차단(§4.2 2중 구조) |
| Focus trap | `showModal()` 네이티브 |
| 초기 포커스 | A: 첫 입력 / D'·reject: 입력 / D 위험: [キャンセル] / D 기타: 주 버튼 / B·C: 브라우저 기본. `data-autofocus` |
| 단계 전환 포커스(2026-11-13 구현) | 단계형 모달(M06·M08)은 footer를 단계 key(`<Fragment key={단계}>`)로 감싸 단계 전환 시 버튼을 재마운트하고, 진입 단계의 초기 포커스 요소에 `autoFocus`를 준다(같은 DOM이 재사용되면 직전에 누른 버튼에 포커스가 남아 Enter로 확정될 위험). 되돌아가기 시 M06은 직전 진입 버튼([承認]/[却下]/[取消]), M08은 첫 입력(出勤時刻)에 포커스 |
| 포커스 복귀 | 네이티브. 연 버튼이 사라지거나 disabled되는 경우(M09 출근 후 버튼 교체)는 단계 1에서 실측 |
| 이름·설명 | `aria-labelledby` + `aria-describedby`(description) |
| role | `dialog` 유지. `alertdialog` 미도입 사유: `getByRole('dialog')`가 alertdialog를 매칭하지 않아 `queryByRole('dialog')...not.toBeInTheDocument()` 류(`DashboardView.test.tsx:406`, `DepartmentsView.test.tsx:216,226`)가 항상 통과하는 무의미한 테스트가 되고, 단계형 확인과 role이 갈린다 |
| 스크린 리더 | 장식 아이콘 `aria-hidden`, 오류 Notice만 `role="alert"`, 힌트·글자 수 `aria-describedby`, 계산값 `aria-live="polite"`, 요약은 `dl` |
| Loading / Empty / Error | 조회 `SkeletonLines` / 목록형만 문구 / `SectionError`·`Notice error`·`FieldError`·토스트(03 공통 규칙) |
| Disabled | 모든 모달 버튼 클래스에 disabled 스타일 |
| Validation | 제출 시 검증 → 오류 + 첫 오류 필드 포커스, 입력 시 해제 |

---

## 8. 기준 디자인 (D12 확정)

| 유형 | 기준 | 적용 시 보완 |
|---|---|---|
| A Form | **休暇申請(M05)의 FormTable 배치 + 部署登録(M01)의 플레이스홀더·설명문** | 둘 다 ①' 외형·아이콘·`FormModal`·`CharCount`·`FieldHint` |
| B Detail | **休暇詳細(M06 상세 단계)** | ①' 외형 |
| C List 표형 | **所属社員確認(M03)** | ①' 외형 |
| C List 단순형 | **날짜별 휴가자(M07)** | ①' 외형 + 달력 아이콘 |
| D Confirm | **出勤・退勤の登録(M09)**. 위험 동작은 **部署の削除(M04)의 경고 배치 + 빨간 버튼** | ①' 외형(md 축소) + 동작 아이콘 + busy |

---

## 9. 결정 사항

### 9.1 확정 (2026-11-13, `.claude/work/modal-audit/decisions.md`)

| ID | 결정 |
|---|---|
| D1 | 외형 ①' form 계열 + md 축소 |
| D2 | 폼 배치는 FormTable(休暇申請), 플레이스홀더·제목 아래 설명문은 部署登録 방식 |
| D3 | Form 기본 size lg(640). 部署登録 xl→lg. (M08도 Form이므로 md→lg — D2·D3에서 파생, 시안 `compare-d7-attedit`도 lg) |
| D3' | footer 버튼 높이 40 |
| D4 | 모바일 footer: 2개 = 2열 전폭 / 1개 = 전폭 / 3개 이상 = 오른쪽 정렬 줄바꿈 |
| D5 | 위험 동작 확인 버튼 = 빨간 채움(hover·disabled는 투명도) |
| D6 | 모든 모달 제목 왼쪽 아이콘(Confirm 포함). 기준 §2.1 |
| D7 | 수정 불가 값은 폼 위 읽기 전용 요약(방식 C) → `ReadOnlySummary` |
| D8 | 취소 버튼 = 아웃라인. 09 §3 문구 갱신 |
| D9 | E 복합형은 정하지 않음 |
| D10 | 所属社員確認은 코드 기준(5명 페이지 + Body 스크롤). SCR-010 명세 갱신 |
| D11 | 바텀시트 미도입 |
| D12 | 기준 디자인 §8 |
| D13 | 休暇申請 일수 힌트 `aria-describedby` 연결 |
| D14 | FormModal 신설(최소), 勤怠修正 대상 외 |
| D15 | 모바일 검증 폭 360 |

### 9.2 남은 미결 (확정 결정을 적용하면서 새로 생긴 세부. 구현 단계 전에 확인)

> 2026-11-13 구현(`feature/modal-refactor`)에서 U1~U4는 **사용자 부재로 권장안을 적용**해 확정했다(사용자 확인 후 변경 가능). U5는 범위 밖으로 남긴다.

| ID | 내용 | 권장 / 적용 |
|---|---|---|
| U1 | M02 部署詳細: 제목 아이콘(건물)과 본문 히어로 아이콘(건물, `size-16` 원형)이 중복 | 히어로는 SCR-010 명세 요소라 유지, 제목 아이콘도 규칙대로 적용(중복 수용). 줄이려면 히어로 아이콘만 제거. **적용(권장안)**: 히어로 유지 + 제목 `BuildingIcon` |
| U2 | M05 「申請日数」(입력에 따라 계산되는 값) 표시: 현재 회색 박스(`LeaveApplyModal.tsx:277`) | FormTable 행 안 일반 텍스트(`min-h-12 flex items-center text-base/6 font-bold`)로 바꾸고 `aria-live` 유지. ReadOnlySummary의 회색 배경과 혼동을 피함. **적용(권장안)**: 박스 제거, `flex min-h-12 items-center text-base/6 font-bold text-general-100 tabular-nums`, `aria-live` 유지 |
| U3 | 입력 장식 아이콘(`IconField`)을 폼 표준으로 할지(D2의 "部署登録처럼"이 플레이스홀더·설명문만 지정) | 표준으로 하지 않음(M01 기존 유지, 신규는 선택). **적용(권장안)**: 표준 아님, M01만 유지 |
| U4 | SCR-010 등록 제목: 명세 「部署の登録」 vs 코드 「部署登録」(AUDIT §9 D6) | 코드(「部署登録」) 기준으로 명세 갱신. **적용(권장안)**: SCR-010 명세를 「部署登録」으로 갱신 |
| U5 | 시안의 「部署の編集」은 部署コード를 수정 불가로 가정했으나 현재는 편집 가능 | 이번 범위 밖. 원하면 별도 기능 변경(feature-dev)으로 |

### 9.3 승인된 예외

| ID | 범위 | 내용 | 근거 |
|---|---|---|---|
| E1 | **SCR-006 社員管理 한정**(`app/(app)/admin/users/`의 社員追加·社員編集·社員詳細·社員削除·役職確認 5종). 다른 화면 모달은 바꾸지 않는다 | ① 제목 아이콘 `iconVariant="circle"`(淡紫 `bg-violet-30` 원형 48px, 아이콘 `text-primary-100` 24) — `Modal`·`FormModal`·`ConfirmDialog` 공통 prop, 기본값 `square`(기존 외형) / ② 입력 모달(社員追加·社員編集)은 `FormStack`/`FormStackRow`(라벨 위 스택, 라벨 16/24 Bold + `RequiredMark`, 행 간격 16)로 배치, 社員詳細은 `DetailTable` 그대로 / ③ 라디오 선택은 users 로컬 `RadioCardGroup`(라디오 카드) | 2026-11 사용자 결정(社員管理 화면은 레퍼런스 화상 외형 우선, 화면 안에서 통일). 09 §5 12 |

- E1에서도 유지하는 규칙: 유형(A·B·D·단계형)과 size, 제목·X·footer 구조, footer `Button` variant·size(D5·D8), `description` 필수(A), `busy`·초기 포커스·단계 전환 포커스(§7), 중첩 dialog 금지, 수정 불가 값을 비활성 입력으로 표시하지 않음(社員追加의 自動生成 社員ID는 텍스트 표시), 안내는 `Notice`.
- 社員削除의 LAST_ADMIN 오류는 `ConfirmDialog` 구조상 Notice 대신 토스트로 표시한다(社員編集은 폼 위 `Notice error`).
