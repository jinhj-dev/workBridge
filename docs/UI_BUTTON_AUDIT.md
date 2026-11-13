# UI 버튼 전수 조사 (UI_BUTTON_AUDIT)

> 상태: **v3** (Architecture Agent, 2026-11-13, 브랜치 `docs/button-audit`, main `d98a9bf` 기준 — 모달 리팩터링 #29 반영 후). v2에 frontend 검토(`.claude/work/button-audit/frontend-review.md`)의 사실 정정 E1~E10을, v3에 사용자 결정 B1~B17(`.claude/work/button-audit/decisions.md`)과의 대응(§7)을 반영했다. 조사 결과(§1~§6, §8~§9)는 코드 현황이라 결정으로 바뀌지 않는다(§10 변경 이력).
> 관련 문서: 표준 설계 `docs/UI_BUTTON_PATTERNS.md`, 단계별 계획 `docs/UI_BUTTON_REFACTOR_PLAN.md`, 모달 표준 `docs/UI_MODAL_PATTERNS.md`(v3, D1~D15).
> 이 문서는 조사 결과만 담는다. 코드·`docs/09_DESIGN_SYSTEM.md`는 수정하지 않았다.
> 수치는 코드의 Tailwind 클래스에서 읽은 값이다(1단위 = 4px: `h-9` 36 / `h-10` 40 / `h-11` 44 / `h-12` 48, `px-3` 12 / `px-4` 16 / `px-6` 24 / `px-8` 32. `rounded` 4 / `rounded-md` 6 / `rounded-lg` 8). 근거는 `파일:라인`(`frontend/src/` 생략).

---

## 1. 조사 방법과 판별 기준

### 1.1 판별 기준

| # | 기준 | 검색 방법 |
|---|---|---|
| C1 | `<button>` 요소 | `<button` grep |
| C2 | 버튼 모양·버튼 역할의 `<Link>`/`<a>`(내비게이션 항목·텍스트 링크 포함) | `<Link`, `<a ` grep |
| C3 | `role="button"` | grep (**0건**) |
| C4 | 버튼이 아닌데 클릭 가능한 요소(`onClick` + `tabIndex`가 붙은 `tr`·`div`) | `onClick=`, `tabIndex` grep → §8 별도 |

- 범위: `frontend/src` 전체, 테스트 파일(`*.test.tsx`) 제외. 걸린 35개 파일을 모두 열어 확인했다.
- 집계 단위: **소스상 정의 1곳 = 1건**(`map`으로 여러 개 그려져도 1건). 공용 컴포넌트 안의 버튼은 컴포넌트 쪽에서 1건으로 세고 사용처 수를 비고에 적었다.
- 제외(버튼 아님): `Tooltip` 트리거(`components/Tooltip.tsx:22`, 정보 표시용 `tabIndex=0` span), 가로 스크롤 영역(`leaves/calendar/LeaveScheduleTable.tsx:26`), 승인자 콤보박스 입력·`role="option"`(`components/leave/ApproverSelect.tsx:205,239`, 입력 컴포넌트 패턴).

### 1.2 결과 요약

| 항목 | 값 |
|---|---|
| 버튼 정의 | **80건** (`<button>` 69 / `<Link>` 11, `<a>`·`role="button"` 0) |
| 버튼이 아닌 클릭 요소 | 4건(§8) |
| 화면·공용 컴포넌트 파일 | 35개 |
| 시각 유형 | **11종**(§2) |
| 실제 쓰이는 높이 | 20(텍스트)·24·28·36·40·44·48 — 7종 |
| 버튼 클래스 출처 | `form.tsx` 공통 상수 8종 + **파일별 로컬 클래스 15곳(식별자 23개)** + 상수 없이 인라인으로 쓴 버튼 클래스 3곳(§3.1) |
| 공통 Button 대상 | **54건**(V1~V7 57건 − 대상 외로 둔 V6의 BT16·34·40). 이 가운데 BT63(Notice X, 사용처 0)은 이행하지 않으므로 **실제 이행 53건**(E2) |

### 1.3 약어

| 약어 | 뜻 |
|---|---|
| F | `focus-visible:outline-2 outline-offset-2 outline-primary-100`(표준 포커스) |
| Fi | 위와 같으나 `-outline-offset-2`(안쪽). 전폭 항목·잘리는 컨테이너용 |
| Fd | F와 같으나 색 `danger-100` |
| P | `primaryButtonClass` / S = `secondaryButtonClass` / PO = `primaryOutlineButtonClass` / DO = `dangerOutlineButtonClass` / T = `textButtonClass` / MP·MS·MD = `modalPrimary/Secondary/DangerButtonClass` |
| 준수 | ◎ 공통 클래스만 사용 / ○ 공통 클래스 + 호출부 인라인 크기 지정(현행 09 규칙상 허용) / △ 공통 클래스를 파일 로컬 상수로 감싸거나 상태(disabled 등)를 호출부에서 재정의 / ✕ 공통 클래스 없이 로컬 클래스만 |

---

## 2. 유형 분류 (시각 유형 11종)

| 코드 | 유형 | 건수 | 공통 클래스 | 대표 |
|---|---|---|---|---|
| V1 | Primary 채움 | 16 | P, MP | 로그인, 休暇申請, 照会, 承認, 모달 확정 |
| V2 | Secondary(회색 아웃라인) | 23 | S, MS | キャンセル, 閉じる, 詳細, 再試行 |
| V3 | Primary 아웃라인 | 2 | PO | 退勤する, 編集 |
| V4 | Danger 아웃라인 | 1 | DO | 削除(목록) |
| V5 | Danger 채움 | 1 (+BT43 `tone="danger"`) | MD | 取り消す, 部署の削除 확정 |
| V6 | 텍스트·링크 | 7 | T 또는 로컬 | すべて見る, ログアウト, 사원명, +N件, 정렬 헤더 |
| V7 | 아이콘 전용 | 7 | 로컬(3종) / S | Modal X, 벨, 前月·翌月 |
| V8 | 내비게이션 항목 | 9 | 로컬 | 사이드바, 하단 탭, 사용자 메뉴 |
| V9 | 토글·세그먼트·탭 | 5 | 로컬 | 상태 필터, 選択日/月全体, 날짜 셀, Tabs |
| V10 | 페이지네이션 셀 | 3 | 로컬 | 前へ·번호·次へ |
| V11 | 목록 행·카드 전체 버튼 | 6 | 로컬 | 직근 신청 행, StatCard 링크, 캘린더 막대 |

V1~V7 = 57건, V8~V11 = 23건. BT43(ConfirmDialog 확정)은 `tone`에 따라 V1/V5가 되며 V1로 셌다.

> 공통 Button 대상은 V1~V7 중 **54건**이다. V6 중 BT16(정렬 헤더)·BT34(모달 여는 표 안 이름)·BT40(「+N件」)은 표·캘린더 안의 전용 표현이라 대상 외로 둔다(PATTERNS §1.2). BT63(Notice X)은 사용처가 없고 hover 색(`white/60`)이 다르므로 기록만 하고 이행하지 않는다(실제 이행 53건). V8~V11은 각자 컴포넌트를 유지하되 포커스·disabled·터치 규칙만 공유한다(PATTERNS §1.3).

---

## 3. 공통 버튼 클래스 현황 (`components/form.tsx`)

| 상수 | 라인 | 색·상태 | 크기 포함? | disabled 포함? | 사용 건수 |
|---|---|---|---|---|---|
| `primaryButtonClass` | :52-53 | `bg-primary-100` 흰 글자 Bold, hover `primary-90`, F | ✕ | ✕ | 9(직접) + MP 경유 |
| `secondaryButtonClass` | :56-57 | 흰 배경 `border-general-50` `general-100` Bold, hover `general-30`, F | ✕ | ✕ | 13(직접) + MS 경유 |
| `primaryOutlineButtonClass` | :60-61 | 흰 배경 `border-primary-100` `primary-100` Bold, hover `primary-30`, F | ✕ | ○(`general-50`/`general-60`) | 2 — **09 §6 미기록** |
| `dangerOutlineButtonClass` | :64-65 | 흰 배경 `border-danger-100` `danger-100` Bold, hover `danger-30`, Fd | ✕ | ○ | 1 |
| `modalPrimaryButtonClass` | :68 | P + `flex h-10 gap-2 px-4 text-sm/5`, disabled `primary-60` | ○ 40 | ○ | 7 |
| `modalSecondaryButtonClass` | :69 | S + 같은 크기, disabled `general-60` | ○ 40 | ○ | 12 |
| `modalDangerButtonClass` | :71-72 | `bg-danger-100` 흰 글자 Bold, hover `danger-100/90`, Fd, 같은 크기, disabled `danger-100/50` | ○ 40 | ○ | 2 |
| `textButtonClass` | :77-78 | `primary-100` 14/20 Medium, hover 밑줄, `rounded`(4), F | ✕(호출부) | ✕ | 4(+CardLink 5곳) |

관찰:
1. **색(variant)만 공통이고 크기는 호출부 책임**(모달 3종만 예외). 그래서 같은 용도라도 높이·padding·글자 크기·`flex` 여부가 호출부마다 다르다(§5).
2. **disabled가 기본 클래스에 없다**(P·S·T). P를 disabled로 쓰는 4곳(BT01·02·07·24)은 모두 `disabled:bg-primary-60`을, S를 disabled로 쓰는 3곳(BT12·21·25)은 `disabled:text-general-60 disabled:hover:bg-white`를 각자 덧붙였다(§5.3).
3. 모달 클래스는 P·S를 확장했지만 Danger 채움(MD)은 P를 확장하지 않고 전체를 다시 썼다(`:71-72`). 포커스 색이 달라서다.
4. 아이콘 전용·내비게이션·페이지네이션용 공통 클래스는 없다. 비슷한 클래스가 3개 파일에 따로 있다(§5.4).

### 3.1 파일별 로컬 버튼 클래스 (15곳·식별자 23개 + 인라인 3곳)

> v2 정정(E3): v1의 "15개"는 표의 행 수였다. 식별자는 23개(`ApprovalsView` 3, `Pagination` 5, `StatusFilterButtons` 3, 나머지 각 1)이고, 상수로 빼지 않은 인라인 버튼 클래스 3곳(아래 표 끝)이 빠져 있었다.

| 파일:라인 | 이름 | 내용 | 비고 |
|---|---|---|---|
| `app/(app)/admin/attendance/AdminAttendanceView.tsx:47` | `smallButtonClass` | S + `h-9 px-4 text-sm/5` | 표 내부 sm |
| `app/(app)/leaves/LeaveHistoryList.tsx:38` | `detailButtonClass` | S + `h-9 px-4 text-sm/5` | 위와 같은 값 |
| `app/(app)/leaves/approvals/ApprovalsView.tsx:51-53` | `smallButtonClass`·`detailButtonClass`·`approveButtonClass` | `h-9 px-4 text-sm/5 disabled:cursor-not-allowed` + S / P(+`disabled:bg-primary-60 disabled:hover:bg-primary-60`) | 같은 이름이 AdminAttendanceView와 다른 값 |
| `app/(app)/admin/departments/DepartmentsView.tsx:111-112` | `rowButtonClass` | `inline-flex h-9 gap-1 px-3 text-sm/5 whitespace-nowrap` | **px 12**(다른 표는 16). `whitespace-nowrap`을 가진 **유일한** 버튼 클래스(다른 버튼은 모두 줄바꿈 허용, E10) |
| `app/(app)/attendance/AttendanceSheetView.tsx:57` | `iconButtonClass` | S + `flex size-9` | 아이콘 36 |
| `app/(app)/attendance/AttendanceSheetView.tsx:58` | `textNavButtonClass` | S + `h-9 px-4 text-sm/5` + disabled | 「今月」 |
| `app/(app)/dashboard/AttendanceSection.tsx:101-102` | `base` | `flex h-11 w-full gap-2 rounded-lg px-6 text-base/6 font-bold disabled:cursor-not-allowed [&>span]:size-5` | 높이 44, P·PO와 `rounded-lg`·`font-bold` 중복 지정 |
| `components/leave/MonthNavigator.tsx:10-11` | `buttonClass` | `size-10 rounded-lg border-general-50 bg-white hover:general-30` + F | S를 쓰지 않고 같은 모양을 재작성(Bold 없음, 40) |
| `components/layout/TopBar.tsx:16-17` | `iconButtonClass` | `size-10 rounded text-general-80 hover:general-30` + F | 무테 아이콘 |
| `components/layout/TopBar.tsx:19-20` | `menuItemClass` | `h-10 w-full px-4 text-sm/5 hover:general-30` + Fi | 드롭다운 항목 |
| `components/layout/MobileTabBar.tsx:30-31` | `tabClass` | `h-12 flex-1 flex-col gap-0.5 rounded-lg text-xs/4 font-medium` + Fi | |
| `components/layout/SidebarSubmenu.tsx:27-28` | `rowClass` | `mx-4 rounded-lg px-4 text-sm/5 font-medium` + F | Sidebar.tsx:102와 같은 값을 따로 씀 |
| `components/Pagination.tsx:33-40` | `cellClass`·`wideCellClass`·`compactCellClass`·`compactEllipsisClass`·`compactWideCellClass` | `size-9 rounded text-sm/5 tabular-nums` + F / compact `h-9 min-w-8 px-1` | radius 4 |
| `components/attendance/StatusFilterButtons.tsx:14-18` | `buttonClass`·`selectedClass`·`unselectedClass` | `h-10 rounded border px-4 text-sm/5` + 배지 색 | radius 4 |
| `app/(app)/leaves/calendar/DayLeaveList.tsx:20-23` | `segmentClass()` | `h-9 px-2 text-xs/5 font-medium` + Fi, 활성 `primary-30` Bold | |
| `components/Modal.tsx:115` | (인라인) | `-m-2 size-10 rounded text-general-80 hover:bg-general-30` + F + `disabled:text-general-60 disabled:hover:bg-transparent` | 모달 X(BT62) |
| `components/Notice.tsx:105` | (인라인) | `-m-1 size-7 rounded text-general-80 hover:bg-white/60` + F, disabled 없음 | Notice X(BT63), 사용처 0 |
| `components/layout/Sidebar.tsx:102` | (인라인) | `mx-4 h-11 rounded-lg px-4 text-sm/5 font-medium` + F | `SidebarSubmenu.tsx:27-28` `rowClass`와 같은 값 |

---

## 4. 전체 버튼 비교표 (80건)

열: 문구(일본어 원문) / 위치 / 클래스 / 색 / 크기(높이·좌우 padding·글자) / radius / 아이콘(크기·간격) / 상태(hover·focus·disabled·loading) / 모바일 / 준수 / 다른 점.
글자 굵기: P·S·PO·DO·MP·MS·MD는 Bold, T는 Medium. border/shadow: 아웃라인 계열만 1px 테두리, **그림자를 쓰는 버튼은 0건**.

### 4.1 페이지 주요 액션 (등록·제출·출근·퇴근)

| ID | 문구 | 위치 | 클래스 | 색 | 크기 | r | 아이콘 | 상태 | 모바일 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BT01 | 「ログイン」 | `app/login/LoginForm.tsx:154` SCR-001 | P + `mt-1 flex h-12 w-full px-6 text-base/6 gap-2`(`mt-1`은 배치, E4) | V1 | 48·24·16/24 | 8 | 없음 | hover·F·disabled `primary-60`·Spinner | 항상 전폭 | ○ | |
| BT02 | 「変更する」 | `app/password/PasswordChangeForm.tsx:178` SCR-009 | BT01 + `sm:flex-1` | V1 | 48·24·16/24 | 8 | 없음 | 같음·Spinner | `sm` 미만 세로 쌓기 | ○ | |
| BT03 | 「キャンセル」 | `PasswordChangeForm.tsx:187` | S + `h-12 w-full px-6 text-base/6 sm:flex-1` | V2 | 48·24·16/24 | 8 | — | hover·F, **disabled 스타일 없음, 제출 중에도 누를 수 있음** | 같음 | ○ | `flex`·`gap` 없음(Spinner 미수용) |
| BT04 | 「ログアウト」 | `PasswordChangeForm.tsx:200` | T + `mt-4` | V6 | 20(텍스트)·0·14/20 | 4 | — | hover 밑줄·F | — | ◎ | 터치 높이 20 |
| BT05 | 「休暇申請」 | `app/(app)/leaves/LeaveManagementLayout.tsx:62` SCR-004 헤더 | P + `flex h-11 px-4 text-sm/5 gap-1.5` → `md:h-12 md:px-6 md:text-base/6 md:gap-2` | V1 | 44→48·16→24·14→16 | 8 | Plus 20, 간격 6→8 | hover·F | **반응형으로 크기 변경** | ○ | 44는 09 §2.3 SCR-004 예외값 |
| BT06 | 「部署を追加」 | `app/(app)/admin/departments/DepartmentsView.tsx:492` SCR-010 헤더 | P + `inline-flex h-10 px-4 sm:px-6 text-sm/5 gap-2` | V1 | 40·16→24·14/20 | 8 | Plus 20, 8 | hover·F | px만 변경 | ○ | 같은 PageHeader 주 버튼인데 BT05와 높이·글자 다름 |
| BT07 | 「出勤する」 | `app/(app)/dashboard/AttendanceSection.tsx:105` SCR-002 | P + 로컬 `base`(`h-11 w-full px-6 text-base/6 gap-2`) | V1 | 44·24·16/24 | 8 | Enter 20, 8 | hover·F·disabled `primary-60`(로딩 전). 확인은 `ConfirmDialog` | 항상 전폭 | △ | 높이 44, `rounded-lg font-bold` 중복 |
| BT08 | 「退勤する」/「退勤済み」 | `AttendanceSection.tsx:120` | PO + `base` | V3 | 44·24·16/24 | 8 | Exit 20, 8 | hover `primary-30`·F·disabled(테두리 `general-50` 글자 `general-60`) | 전폭 | △ | 로컬 `base` 공유 |

### 4.2 검색·필터·정렬

| ID | 문구 | 위치 | 클래스 | 색 | 크기 | r | 아이콘 | 상태 | 모바일 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BT09 | 「照会」 | `app/(app)/attendance/AttendanceHistoryView.tsx:257` SCR-003 | P + `h-12 px-8 sm:mt-6` | V1 | 48·**32**·**미지정(상속 16)** | 8 | — | hover·F | 폭 자동 | ○ | `flex` 없음, 글자 크기 미지정, 라벨 높이 맞춤 `sm:mt-6` |
| BT10 | 「照会」 | `app/(app)/admin/attendance/AdminAttendanceView.tsx:305` SCR-008 | P + `h-12 w-full px-8 sm:w-auto` | V1 | 48·32·미지정 | 8 | — | hover·F | `sm` 미만 전폭 | ○ | BT09와 같은 동작인데 모바일 폭 다름. 라벨 높이 정렬은 버튼이 아니라 래퍼 `div`(`sm:col-span-2 lg:col-span-1 lg:mt-6`, `:304`)가 담당(E5) |
| BT11 | 「検索」 | `app/(app)/leaves/LeaveHistoryList.tsx:251` SCR-004 | P + `flex h-12 px-8 text-base/6 gap-2` | V1 | 48·32·16/24 | 8 | Search 20, 8 | hover·F | 폭 자동 | ○ | 검색 버튼 3곳 중 유일하게 아이콘 |
| BT12 | 「条件をクリア」 | `DepartmentsView.tsx:535` SCR-010 툴바 | S + `h-11 px-4 text-sm/5` + disabled | V2 | **44**·16·14/20 | 8 | — | hover·F·disabled `general-60` | 줄바꿈 | △ | 옆 `SearchInput`(44)에 맞춘 높이 |
| BT13 | 상태명(「勤務中」 등) | `components/attendance/StatusFilterButtons.tsx:44` SCR-003 md 미만 | 로컬 | 배지 색 배경, 선택 `border-general-100` Bold+✓ | 40·16·14/20 | **4** | ✓ 문자 | hover 테두리·F·`aria-pressed` | `flex-wrap gap-2` | ✕ | 토글 |
| BT14 | 「選択日」 | `app/(app)/leaves/calendar/DayLeaveList.tsx:47` 모바일 | 로컬 `segmentClass` | 활성 `primary-30`/`primary-100` Bold, 비활성 흰 배경 `general-80` | **36·8·12/20** | 그룹 8 | — | Fi·`aria-pressed`, hover 없음 | 모바일 전용 | ✕ | 세그먼트 |
| BT15 | 「月全体」 | `DayLeaveList.tsx:55` | 같음 + `border-l` | 같음 | 같음 | 같음 | — | 같음 | | ✕ | |
| BT16 | 열 이름(정렬) | `app/(app)/admin/departments/SortableTh.tsx:22` | 로컬 | `general-80`(정렬 중 `general-100`) | 20·0·14/20 Medium | 4 | Sort 아이콘, 4 | hover 글자색·F | — | ✕ | 표 헤더 안 텍스트 버튼 |

### 4.3 월 이동

| ID | 문구 | 위치 | 클래스 | 색 | 크기 | r | 아이콘 | 상태 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|---|---|
| BT17 | (前月, `aria-label`) | `components/leave/MonthNavigator.tsx:17` 休暇カレンダー | 로컬 | 흰 배경 `border-general-50` `general-100` | **40×40** | 8 | Chevron 20 | hover `general-30`·F, disabled 없음 | ✕ | S와 같은 모양을 재작성 |
| BT18 | (翌月) | `MonthNavigator.tsx:33` | 같음 | | 40×40 | 8 | 20 | 같음 | ✕ | |
| BT19 | (前月) | `app/(app)/attendance/AttendanceSheetView.tsx:382` 出勤簿 | S + `flex size-9` | V2 | **36×36** | 8 | 로컬 `Chevron` 20 | hover·F | △ | 같은 용도인데 BT17과 4px 차, 아이콘 SVG도 별도 정의(`:43`) |
| BT20 | (翌月) | `AttendanceSheetView.tsx:396` | 같음 | | 36×36 | 8 | 20 | 같음 | △ | |
| BT21 | 「今月」 | `AttendanceSheetView.tsx:404` | S + `h-9 px-4 text-sm/5` + disabled | V2 | 36·16·14/20 | 8 | — | hover·F·disabled `general-60` | △ | |

월 이동 묶음의 버튼 외 차이(E6): 休暇カレンダー(`MonthNavigator.tsx:16,29`)는 버튼↔라벨 간격 12(`gap-3`)·라벨 18/28 Bold, 出勤簿(`AttendanceSheetView.tsx:381,392`)는 간격 4→`sm` 8(`gap-1 sm:gap-2`)·라벨 16/24 Medium. 버튼 크기만 맞춰도 이 차이는 남는다. 사용자 결정 B8로 버튼만 40으로 통일하고 이 차이는 유지·기록한다.

### 4.4 테이블·목록 내부 액션 (상세·수정·삭제·승인·반려)

| ID | 문구 | 위치 | 클래스 | 색 | 크기 | r | 아이콘 | 상태 | 모바일 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BT22 | 「詳細」 | `app/(app)/leaves/LeaveHistoryList.tsx:80` | 로컬 `detailButtonClass`(S+sm) | V2 | 36·16·14/20 | 8 | — | hover·F | 표/카드 공용 | △ | |
| BT23 | 「詳細」 | `app/(app)/leaves/approvals/ApprovalsView.tsx:115` | 로컬(S+sm) | V2 | 36·16·14/20 | 8 | — | hover·F | 표 | △ | |
| BT24 | 「承認」 | `ApprovalsView.tsx:125` | 로컬 `approveButtonClass`(P+sm) | V1 | 36·16·14/20 | 8 | — | hover·F·disabled `primary-60`(본인 신청) | 표 | △ | 표 안 유일한 Primary 채움 |
| BT25 | 「却下」 | `ApprovalsView.tsx:134` | S+sm + disabled | V2 | 36·16·14/20 | 8 | — | disabled `general-60` | 표 | △ | 반려가 회색 아웃라인(BT30 削除는 빨강) |
| BT26 | 「詳細」 | `ApprovalsView.tsx:280` | 같음 | V2 | 36 | 8 | — | | 모바일 카드 | △ | |
| BT27 | 「修正」 | `AdminAttendanceView.tsx:326` | 로컬 `smallButtonClass`(S+sm) | V2 | 36·16·14/20 | 8 | — | hover·F | 표/카드 | △ | 수정이 회색(BT29 編集은 Primary 아웃라인 + 아이콘) |
| BT28 | 「詳細」 | `DepartmentsView.tsx:118` | S + `rowButtonClass` | V2 | 36·**12**·14/20 | 8 | — | hover·F | `md` 미만 카드 | △ | 다른 표의 「詳細」는 px 16 |
| BT29 | 「編集」 | `DepartmentsView.tsx:128` | PO + `rowButtonClass` | V3 | 36·12·14/20 | 8 | Pencil 16, 4 | hover·F | 같음 | △ | |
| BT30 | 「削除」 | `DepartmentsView.tsx:139` | DO + `rowButtonClass` | V4 | 36·12·14/20 | 8 | Trash 16, 4 | hover `danger-30`·Fd | 같음 | △ | |
| BT31 | 「確認」 | `DepartmentsView.tsx:190` | S + `rowButtonClass` | V2 | 36·12·14/20 | 8 | — | hover·F | 같음 | △ | |
| BT32 | 사원명 | `AdminAttendanceView.tsx:168` (표) | `<Link>` T | V6 | 20 | 4 | — | hover 밑줄·F | — | ◎ | 이동 대상 `/admin/users/:id`는 미구현 화면(context.md) |
| BT33 | 사원명 | `AdminAttendanceView.tsx:203` (카드) | `<Link>` T | V6 | 20 | 4 | — | 같음 | 카드 | ◎ | |
| BT34 | 신청자명 | `app/(app)/dashboard/PendingApprovalsSection.tsx:116` | 로컬 | `general-100` Bold, hover 밑줄 | 20·0·14/20 | 4 | — | F | 표 | ✕ | 같은 "표 안 이름" 인데 BT32와 색·굵기 다름(링크 vs 모달 열기) |
| BT35 | 승인 대기 행 | `PendingApprovalsSection.tsx:153` | 로컬 | 투명, hover `general-30` | 행(py 10)·4 | 0 | 아바타 36 | Fi | 모바일 목록 | ✕ | V11 |
| BT36 | 직근 신청 행 | `app/(app)/dashboard/RecentRequestsSection.tsx:46` | 로컬 | 같음 | 같음 | 0 | 48 원형 | Fi | | ✕ | V11 |
| BT37 | 휴가 배지 | `AttendanceSheetView.tsx:197` | 로컬(`LeaveStatusBadge` 감쌈) | 배지 색 | 24 | 4 | 배지 아이콘 | F, hover 없음 | | ✕ | V11 |
| BT38 | 「すべて見る」「休暇履歴を見る」「詳細を見る」 | `app/(app)/dashboard/CardLink.tsx:9` (사용 5곳: `DepartmentStatusSection.tsx:100`, `LeaveBalanceSection.tsx:68`, `MonthlyWorkSection.tsx:85`, `PendingApprovalsSection.tsx:202`, `RecentRequestsSection.tsx:83`) | `<Link>` T + `flex gap-0.5` | V6 | 20·0·14/20 | 4 | Chevron 16, **2** | hover 밑줄·F | Card 헤더 줄바꿈 | ◎ | 아이콘 간격 2(다른 곳 4~8) |

### 4.5 캘린더

| ID | 문구 | 위치 | 클래스 | 크기 | r | 상태 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|
| BT39 | 휴가 막대(氏名) | `app/(app)/leaves/calendar/MonthLeaveCalendar.tsx:116` | 로컬, 휴가 분류색 | 24·8·12/24 | 6 | hover `brightness-95`·포커스 offset **1** | ✕ | V11, 포커스 offset 다름 |
| BT40 | 「+N件」 | `MonthLeaveCalendar.tsx:129` | 로컬, `primary-100` 텍스트 | **20**·4·12/20 | 4 | hover 밑줄·포커스 offset 없음 | ✕ | T와 비슷하나 12px·offset 다름 |
| BT41 | 날짜 셀 | `MonthLeaveCalendar.tsx:162` | 로컬, 선택 `primary-30` | 80(셀) | 8 | Fi·`aria-pressed` | ✕ | V9 |

### 4.6 모달 footer (모달 리팩터링 #29 이후)

모두 MP·MS·MD만 사용 — **높이 40·좌우 16·14/20 Bold·radius 8·간격 8(`gap-2`)**, 배치는 `Modal`의 D4 규칙(`sm` 미만 1개 전폭 / 2개 2열 / 3개 이상 오른쪽 정렬 줄바꿈), 버튼 사이 12. 준수 전부 ◎.

| ID | 문구 | 위치 | 클래스 | 상태 |
|---|---|---|---|---|
| BT42 | 「キャンセル」(cancelLabel) | `components/ConfirmDialog.tsx:55` | MS | 제출 중 disabled, danger면 초기 포커스 |
| BT43 | confirmLabel(「出勤する」「削除する」 등) | `ConfirmDialog.tsx:64` | MP / MD(`tone`) | disabled + Spinner |
| BT44 | 「キャンセル」 | `components/FormModal.tsx:50` | MS | 제출 중 disabled |
| BT45 | submitLabel(「申請する」「登録」「保存する」) | `FormModal.tsx:58` | MP, `type="submit" form` | disabled + Spinner |
| BT46 | 「閉じる」 | `components/leave/LeaveDayModal.tsx:29` | MS | — |
| BT47 | 「戻る」 | `components/leave/LeaveDetailModal.tsx:188` (取消 단계) | MS | 제출 중 disabled, autoFocus |
| BT48 | 「取り消す」 | `LeaveDetailModal.tsx:201` | **MD** | disabled + Spinner |
| BT49 | 「キャンセル」 | `LeaveDetailModal.tsx:216` (承認·却下 단계) | MS | 제출 중 disabled |
| BT50 | 「承認する」/「却下する」 | `LeaveDetailModal.tsx:232` | MP(却下도 Primary) | disabled + Spinner |
| BT51 | 「閉じる」 | `LeaveDetailModal.tsx:251` (상세) | MS | — |
| BT52 | 「申請を取り消す」 | `LeaveDetailModal.tsx:255` | MS(입구는 회색, 확정만 빨강) | — |
| BT53 | 「却下」 | `LeaveDetailModal.tsx:266` | MS | — |
| BT54 | 「承認」 | `LeaveDetailModal.tsx:274` | MP | — |
| BT55 | 「戻る」 | `app/(app)/admin/attendance/AttendanceEditModal.tsx:119` (확인 단계) | MS | 제출 중 disabled |
| BT56 | 「修正する」 | `AttendanceEditModal.tsx:127` | MP | disabled + Spinner |
| BT57 | 「キャンセル」 | `AttendanceEditModal.tsx:143` (입력 단계) | MS | — |
| BT58 | 「保存」 | `AttendanceEditModal.tsx:146` | MP | — |
| BT59 | 「閉じる」 | `app/(app)/admin/departments/DepartmentDetailModal.tsx:30` | MS | — |
| BT60 | 「この部署を編集」 | `DepartmentDetailModal.tsx:34` | MP | — |
| BT61 | 「閉じる」 | `app/(app)/admin/departments/DepartmentMembersModal.tsx:334` | MS | — |

### 4.7 아이콘 전용

| ID | 용도 | 위치 | 클래스 | 크기 | r | 아이콘 | 상태 | 준수 | 다른 점 |
|---|---|---|---|---|---|---|---|---|---|
| BT62 | 모달 닫기 X | `components/Modal.tsx:110` | 로컬 무테 `general-80` | 40×40(`-m-2`) | **4** | 24 | hover `general-30`·F·disabled(`busy`) | ✕ | |
| BT63 | Notice 닫기 X | `components/Notice.tsx:101` | 로컬 무테 | **28×28** | 4 | 20 | hover `white/60`·F | ✕ | **현재 사용처 0**(`onClose` 지정 호출부 없음) |
| BT64 | 알림 벨(`/leaves/approvals`) | `components/layout/TopBar.tsx:58` | `<Link>` 로컬 `iconButtonClass` | 40×40 | 4 | 24 + 빨간 점 | hover·F | ✕ | |
| BT17~BT20 | 前月·翌月 | §4.3 | — | 40 / 36 | 8 | 20 | — | — | 테두리형 |

### 4.8 내비게이션 (상단바·사이드바·하단 탭·드로어)

| ID | 문구 | 위치 | 클래스 | 크기 | r | 상태 | 비고 |
|---|---|---|---|---|---|---|---|
| BT65 | 로고 | `TopBar.tsx:49` | `<Link>` `rounded` + F | 로고 크기 | 4 | F | |
| BT66 | 사용자 메뉴(이름) | `TopBar.tsx:79` | 로컬 | 40·4→8·14/20 Medium | **full** | hover·F·`aria-expanded` | 이름 `sm` 이상만 |
| BT67 | 「パスワード変更」 | `TopBar.tsx:108` | `<Link>` `menuItemClass` | 40·16·14/20 | 0 | hover·Fi | |
| BT68 | 「ログアウト」 | `TopBar.tsx:113` | `<button>` `menuItemClass` | 40·16 | 0 | hover·Fi | BT04 「ログアウト」와 모양 다름(문맥 다름, 정상) |
| BT69 | 사이드바 메뉴 | `components/layout/Sidebar.tsx:98` | `<Link>` 로컬 | 44·16·14/20 Medium | 8 | 활성 `primary-30`·hover·F | 드로어에서도 같은 컴포넌트 |
| BT70 | 「休暇管理」 부모 | `components/layout/SidebarSubmenu.tsx:57` | 로컬 `rowClass` | 44 | 8 | `aria-expanded` | |
| BT71 | 하위 메뉴 | `SidebarSubmenu.tsx:99` | `<Link>` `rowClass` | 40, pl 48 | 8 | 활성·F | |
| BT72 | 「ホーム」「出勤簿」「休暇管理」 | `components/layout/MobileTabBar.tsx:51` | `<Link>` `tabClass` | 48·12/16 Medium | 8 | 활성 `primary-30`·Fi | `lg` 미만 |
| BT73 | 「メニュー」 | `MobileTabBar.tsx:76` | `<button>` `tabClass` | 48 | 8 | `aria-expanded`·Fi | 드로어 토글 |

### 4.9 페이지네이션·탭·기타

| ID | 문구 | 위치 | 클래스 | 크기 | r | 상태 | 비고 |
|---|---|---|---|---|---|---|---|
| BT74 | 「前へ」 | `components/Pagination.tsx:66` | 로컬 | 36·12(compact 10)·14/20 | **4** | hover·F·disabled `general-60` | 사용 9곳 |
| BT75 | 번호 | `Pagination.tsx:82` | 로컬 | 36×36(compact 32×36) | 4 | 현재 `primary-30` Bold·`aria-current` | compact 폭 32 |
| BT76 | 「次へ」 | `Pagination.tsx:99` | 로컬 | 36 | 4 | 같음 | |
| BT77 | 「再試行」 | `components/SectionError.tsx:18` | S + `h-9 px-4 text-sm/5` | 36·16·14/20 | 8 | hover·F | ○. **사용 22곳**(가장 많이 렌더되는 버튼). `flex` 없음 |
| BT78 | StatCard(기본) 링크 | `components/StatCard.tsx:55` (사용 `ApprovalsView.tsx:316`) | `<Link>` 로컬 | 카드 | 6 | hover `primary-30`·F·`aria-current` | V11 |
| BT79 | StatCard(아이콘) 링크 | `StatCard.tsx:82` (사용 `AdminStatsSection.tsx:53`) | `<Link>` 로컬 | 카드 | 16 | hover 그림자·F | V11 |
| BT80 | 탭 | `components/Tabs.tsx:44` | 로컬 | 44·4·14/20 | 상단 2 | `role="tab"`·F(안쪽) | **사용처 0**(테스트만). 09 §6에는 기록됨 |

---

## 5. 차이점 분석

### 5.1 같은 목적, 다른 모양

| 목적 | 사용처 | 차이 |
|---|---|---|
| 페이지 헤더 주 버튼 | BT05 「休暇申請」 / BT06 「部署を追加」 | 높이 44→48 vs 40, 글자 14→16 vs 14, 간격 6→8 vs 8 |
| 검색 실행 | BT09 / BT10 / BT11 | 아이콘 유무, 모바일 전폭 여부, 글자 크기 지정 여부(BT09·BT10은 상속 16), `flex` 여부 |
| 표 안 「詳細」 | BT22·BT23·BT26 vs BT28 | px 16 vs 12, `flex` 여부 |
| 표 안 수정 | BT27 「修正」(회색) vs BT29 「編集」(Primary 아웃라인 + 아이콘) | variant·아이콘 |
| 월 이동 | BT17·18(40, 로컬) vs BT19·20(36, S) | 크기 4px, 클래스 출처, Chevron SVG 중복 |
| 표 안 이름 | BT32·33(Link, `primary-100` Medium) vs BT34(버튼, `general-100` Bold) | 색·굵기. 이동 vs 모달 열기라 의미도 다름 |
| 텍스트 버튼 | T(14/20) vs BT40 「+N件」(12/20, offset 없음) | 크기·포커스 |
| 취소 계열 | BT03(48, disabled 없음) vs 모달 MS(40, disabled 있음) | 크기는 문맥 차이로 정상, disabled 누락은 문제 |

### 5.2 높이 분포 (V1~V7)

| 높이 | 건수 | 사용처 |
|---|---|---|
| 48 | 6 | BT01·02·03·09·10·11 (+BT05 `md` 이상) |
| 44 | 4 | BT05(`md` 미만)·07·08·12 |
| 40 | 25 | 모달 footer 20, BT06, BT17·18, BT62·64(아이콘) |
| 36 | 14 | 표 내부 10(BT22~31), BT19~21, BT77 |
| 28 이하 | 8 | BT04·16·32·33·34·38·40(텍스트, 20), BT63(28) |

→ 09 §2.3의 **Large 48 / Medium 40 / Small 36** 3단계와 대부분 맞는다. 벗어나는 것은 **44(4건)**와 텍스트 버튼뿐이다.

### 5.3 상태 표현

| 상태 | 현황 | 문제 |
|---|---|---|
| hover | 채움 = 한 단계 밝게(`primary-90`, `danger-100/90`), 아웃라인 = 연한 배경(`general-30`·`primary-30`·`danger-30`), 텍스트 = 밑줄 | 일관됨 |
| focus-visible | F가 기본. 전폭 항목은 Fi. 예외: BT39(offset 1), BT40(offset 없음) | 거의 일관 |
| active/pressed | **0건**(`active:` 미사용). 토글은 `aria-pressed` + 시각 상태 | 규칙 없음 |
| disabled | 모달 3종·PO·DO·Pagination만 클래스에 내장. P·S·T는 호출부가 매번 추가(4+3곳). BT03은 제출 중에도 활성 | 누락 위험, 중복 |
| loading | Spinner(20) + disabled: BT01·02·43·45·48·50·56. 페이지 버튼(검색 등)은 화면 이동이라 없음 | `aria-busy` 미사용(일관되게 미사용) |
| error | 버튼 자체 error 스타일 없음(오류는 `FieldError`·`Notice`) | 정상 |

### 5.4 중복 정의

- S 모양(흰 배경 + `general-50` 테두리 + hover `general-30`)을 S 없이 재작성: `MonthNavigator.tsx:10-11`.
- 무테 아이콘 버튼 3벌: `Modal.tsx:115`, `Notice.tsx:105`, `TopBar.tsx:16-17`. **값이 같지 않다**(v2 정정, E1): 크기 40/28/40, hover `general-30`/`white/60`/`general-30`, disabled는 Modal X만 있음(`text-general-60 hover:bg-transparent`), 음수 margin `-m-2`/`-m-1`/없음. 공통점은 radius 4·글자 `general-80`·F뿐이다. 같은 모양으로 볼 수 있는 것은 Modal X와 벨 2곳(disabled 정의 차이만).
- sm 크기(`h-9 px-4 text-sm/5`) 6벌: `AdminAttendanceView.tsx:47`, `LeaveHistoryList.tsx:38`, `ApprovalsView.tsx:51`, `AttendanceSheetView.tsx:58`, `SectionError.tsx:21`, (px 12 변형) `DepartmentsView.tsx:111`.
- 사이드바 항목 클래스: `Sidebar.tsx:102` ≒ `SidebarSubmenu.tsx:27-28`.
- Chevron SVG: `AttendanceSheetView.tsx:43`(로컬) vs `components/leave/leaveIcons.tsx`의 `ChevronLeftIcon`·`ChevronRightIcon`.
- `AttendanceSection.tsx:102`의 `rounded-lg font-bold`는 P·PO에 이미 있음.
- `ApprovalsView.tsx:53` `disabled:hover:bg-primary-60`은 중복 지정이다(frontend 검토 Q4: Tailwind 4 변형 순서상 `disabled`가 `hover`보다 뒤라 `disabled:bg-primary-60`만으로 충분. 빌드 CSS로는 미확인). 반대로 배경이 바뀌지 않는 아웃라인 계열(S·PO·DO)은 `disabled:hover:bg-white`가 **필요**하다.

### 5.5 radius

- 대부분 8(`rounded-lg`) — 09 §2.3 "컨트롤 radius 8" 준수.
- 4(`rounded`): Pagination(09 §6에 "radius 4"로 기록), StatusFilterButtons(09 §6 기록), 무테 아이콘 3종, 텍스트 버튼 포커스 링, SortableTh. → 09 §2.3의 radius 8 규칙과 09 §6 기록이 서로 다르다(DOC 이슈 §9).
- full: 사용자 메뉴 BT66(아바타와 맞춤).

### 5.6 모바일

| 항목 | 현황 |
|---|---|
| 전폭 | BT01·02·03·07·08 항상, BT10 `sm` 미만만, 모달 footer D4. BT09·BT11은 모바일에서도 폭 자동(같은 검색인데 BT10과 다름) |
| 크기 변경 | BT05만(44→48). BT06은 padding만 |
| 터치 영역 | 36 미만: 텍스트 버튼(20, BT04·16·32·33·34·38·40), BT63(28), 휴가 배지 BT37(24), 막대 BT39(24), compact 페이지 번호(32×36). WCAG 2.2 2.5.8(AA) 최소 24×24 기준으로는 **BT04·16·32·33·34·38·40(높이 20)이 미달 가능**(주변 간격 예외 적용 여부는 화면별 확인 필요) |
| 360 검증 | 모달 footer는 D15에서 확인됨. 표 내부 버튼 줄바꿈(`flex-wrap gap-2`)은 BT22~31 모두 있음 |

---

## 6. 공통 클래스 재사용 현황

| 구분 | 건수(V1~V7, 57건 중) | 해당 |
|---|---|---|
| 공통 클래스만(◎) | 24 | 모달 footer 20(BT42~61) + T 4(BT04·32·33·38) |
| 공통 + 인라인 크기(○) | 9 | BT01·02·03·05·06·09·10·11·77 |
| 공통 + 로컬 상수·상태 재정의(△) | 16 | BT07·08·12·19~31 |
| 로컬만(✕) | 8 | BT16·17·18·34·40·62·63·64 |

V8~V11(23건)은 전부 로컬 클래스이며 공통 Button 대상이 아니다(포커스 규칙은 BT39·40을 빼면 모두 F/Fi로 일치).
→ **공통 클래스가 "색"으로는 49/57(86%) 재사용되지만, "크기까지" 공통인 것은 모달 footer 20건(35%)뿐이다.**

공통 Button 대상 54건 기준(✕ 중 BT16·34·40 제외): ◎ 24 / ○ 9 / △ 16 / ✕ 5(BT17·18·62·63·64). 이 중 BT63은 이행하지 않는다(실제 이행 53건).

---

## 7. 개선 필요점 (우선순위)

| # | 내용 | 근거 | 우선 | 결정(v3) |
|---|---|---|---|---|
| I1 | 크기(sm/md/lg)를 공통으로 제공해 호출부 조합을 없앤다 | §5.1·§5.2·§5.4 | 높음 | B1 `Button`+`buttonClass()`, B4 sm px 12, B5 lg px 24, B6 토큰, B16 `className` 배치 전용(ESLint), B17 `fullWidth` 없음 |
| I2 | disabled를 모든 variant에 내장 | §5.3 | 높음 | 새 `Button`에 내장. `form.tsx` 상수는 무변경 후 단계 8 삭제(B15) |
| I3 | 44px 사용처 4건의 기준 | §5.2 | 중간 | B3 44 폐지(休暇申請·部署を追加·出勤·退勤 lg 48, 条件をクリア md 40) |
| I4 | 아이콘 버튼 공통화(테두리형·무테형), 월 이동 크기 통일 | §4.7·§5.1 | 중간 | B8 월 이동 버튼만 40, B9 ghost(모달 X·벨) radius 8. Notice X는 이행 안 함 |
| I5 | 검색 버튼 3곳의 아이콘·모바일 폭 통일 | §5.1 | 중간 | B14 lg·아이콘 없음·`sm` 미만 전폭 |
| I6 | 표 안 수정·반려 버튼 variant 기준 | BT25·27·29 | 중간 | B10 수정 = `primaryOutline`+Pencil, B11 却下 현행 유지 |
| I7 | 텍스트 버튼(12px·offset) 정리, 표 안 이름 스타일 기준 | BT34·40 | 낮음 | B12 이동 링크 = `text`, BT34·BT40은 대상 외로 현행 유지 |
| I8 | 터치 영역 24 미만 요소 확인 | §5.6 | 중간 | B7 36 / 40 / 24(필요한 곳만 padding), 계획서 단계 7에서 측정 |
| I9 | BT03 제출 중 활성 상태 | §4.1 | 낮음 | 이번 범위 밖(동작 변경, 기록만) |
| I10 | 미사용 코드: `Tabs.tsx`, Notice `onClose` X | BT63·80 | — | 정리하지 않음(기록만, CLAUDE.md §3) |

active 스타일은 추가하지 않는다(B13). B2 variant 이름은 기존 상수명 유지.

---

## 8. 버튼이 아닌 클릭 요소 (참고, 이번 표준 대상 외)

| ID | 위치 | 내용 | 메모 |
|---|---|---|---|
| N1 | `components/layout/AppShell.tsx:139` | 드로어 배경 `div onClick` (`aria-hidden`) | Esc·메뉴 선택으로도 닫히므로 키보드 대안 있음 |
| N2 | `PendingApprovalsSection.tsx:110` | `tr onClick`(행 클릭) — 키보드는 안쪽 BT34로 | 마우스 보조 |
| N3 | `AttendanceSheetView.tsx:159` | `tr tabIndex=0 aria-selected onKeyDown` | `tr`에 `aria-selected`는 grid/treegrid role 밖에서 ARIA상 유효하지 않을 수 있음 → 접근성 별도 검토 |
| N4 | `AttendanceSheetView.tsx:229` | 타임라인 `tr onClick` | N3 행과 같은 선택 동작의 마우스 보조 |

---

## 9. 문서와 코드의 불일치 (DOC 이슈)

| # | 내용 |
|---|---|
| X1 | `primaryOutlineButtonClass`(`form.tsx:60-61`)가 09 §6 표에 없다(context.md에도 "09 §6 미기록"으로 표시). 사용처 BT08·BT29 |
| X2 | 09 §2.3 "버튼 radius 8"과 09 §6 Pagination·StatusFilterButtons "radius 4"가 공존. 예외 여부가 문서에 명시되지 않음 |
| X3 | 09 §6 `textButtonClass` 설명은 "로그아웃 등 보조 링크성 동작"이나 실제로는 `<Link>`(CardLink·사원명)에도 쓰인다 |
| X4 | 09 §6 `Tabs`는 구현 기록이 있으나 사용처가 없다 |
| X5 | 09 §3 Button의 "Light(Primary 40)" 변형은 코드에 없다 |
| X6 | 09 §6 `Modal` 행의 footer 판정 표기 "CSS `:has()`"는 실제로 Tailwind `has-[>:only-child]`·`has-[>:nth-child(3)]`(`Modal.tsx:134`)이다. 의미는 같고 표기만 다르다(E9) |

---

## 10. 변경 이력

| 버전 | 날짜 | 내용 |
|---|---|---|
| v1 | 2026-11-13 | 최초 작성(80건 전수 조사) |
| v2 | 2026-11-13 | frontend 검토(`.claude/work/button-audit/frontend-review.md`) 반영. E1 무테 아이콘 3벌이 같은 값이라는 기술 정정(§5.4) / E2 공통 Button 대상을 54건(이행 53건)으로 명시(§1.2·§2·§6) / E3 로컬 클래스를 "15곳·식별자 23개 + 인라인 3곳"으로 정정하고 `Modal.tsx:115`·`Notice.tsx:105`·`Sidebar.tsx:102` 추가(§3.1) / E4 BT01 `mt-1` / E5 BT10 래퍼 정렬 / E6 월 이동 간격·라벨 차이(§4.3) / E9 footer 판정 표기(X6) / E10 `rowButtonClass`가 `whitespace-nowrap`을 가진 유일한 클래스(§3.1). Q4 결과를 §5.4에 반영. E7·E8은 계획서, E1의 설계 영향은 PATTERNS에서 정정 |
| v3 | 2026-11-13 | **사용자 결정 B1~B17 반영**(전부 권장안). §7 개선 필요점에 "결정" 열을 추가해 각 항목의 결정을 연결. §4.3 월 이동 차이 문구를 B8 결정(버튼만 통일)으로 정리. 조사 수치는 변경 없음 |
