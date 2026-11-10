# design-frontend: SCR-002 대시보드 §3-6 휴가 캘린더

> decisions.md 확정안(D1 전원·이름/부서만, D2 APPROVED만, D3 토·일 제외, D5 API 2개, D6 Modal, D7 일요일 시작, D8 반차 라벨만, D9 전원 동일) 기준.

## 참조 문서 (해당 섹션만)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §3(구성), §4 승인 대기 처리, §5 권한별 표시, §7 상태 처리
- `docs/03_SCREEN_LIST.md` Common UI Rules: 상태 처리, 모달, 표시 언어
- `docs/09_DESIGN_SYSTEM.md` §2(토큰), §5-3(반응형), §6(공용 컴포넌트: Card, Modal, Badge, Skeleton/SkeletonLines, SectionError, form 버튼 클래스)

## 화면
- SCR-002 대시보드 `/dashboard` — 하단에 **§3-6 休暇カレンダー** 영역 추가. **ADMIN·EMPLOYEE 모두 같은 내용**으로 표시.
- 위치: `DashboardView`의 `PendingApprovalsSection` 아래, 컨테이너(`max-w-7xl`) 전체 폭 1열.

## 구성
### LeaveCalendarSection (dashboard 전용)
- `Card` 사용. title `休暇カレンダー`, `action`에 월 이동 컨트롤.
- 월 이동 컨트롤: [‹ 前月] `2026年11月`(`aria-live="polite"`) [翌月 ›]. `secondaryButtonClass`(높이 36), 아이콘 버튼이면 `aria-label`(`前月`/`翌月`).
- 초기 월: `tokyoToday(new Date())`(`lib/date-range.ts`)의 `YYYY-MM`. `today`도 같은 값을 1회 계산해 보관.
- 데이터: `useApiQuery<LeaveCalendarMonth>('/dashboard/leave-calendar?month=' + month)`. 월이 바뀌면 path가 바뀌어 재조회. 늦은 응답 무시는 `useApiQuery` 동작을 확인하고, 없으면 path 비교로 무시.
- 상태: loading → 격자 자리에 `Skeleton`(`role="status"` + sr-only) / error → `SectionError onRetry={reload}` / success → `MonthCalendar`.
- 외부 갱신: prop `refreshSignal: number`가 바뀌면 현재 월을 유지한 채 `reload()`.

### MonthCalendar (신규 시스템 컴포넌트, 재사용 목적)
- 경로 `frontend/src/components/calendar/MonthCalendar.tsx`
- 시그니처(안): `MonthCalendar({ month, today, onSelectDate, renderDay?, getDayDescription? })`
  - `month: 'YYYY-MM'`, `today: 'YYYY-MM-DD'`, `onSelectDate(date)`, `renderDay(date) => ReactNode`(칸 안 추가 내용), `getDayDescription(date) => string`(접근성 이름 보충)
  - 월 이동 UI는 포함하지 않는다(사용처 책임).
- 구조: `<table>` + `<thead>` 요일 헤더(日 月 火 水 木 金 土, `th scope="col"`) + 주 단위 `<tr>`. 해당 월이 아닌 앞뒤 칸은 빈 `<td>`.
- 날짜 칸: 칸 전체가 `<button type="button">`. 날짜 숫자(좌상단) + `renderDay` 결과.
  - 크기: `md` 이상 칸 최소 높이 96px(`min-h-24`), `md` 미만 56px. 360px 폭에서 넘치지 않게 `table-fixed w-full`.
  - **오늘**: 날짜 숫자 `primary-100` 원형 배경 + 흰 글자 Bold, 칸 테두리 `primary-100`, `aria-current="date"`.
  - **과거**(date < today): 칸 배경 `general-30`, 숫자 `general-60`, `renderDay` 내용 `opacity-60`. **클릭 가능 유지**(disabled 금지).
  - 오늘·미래: 흰 배경, 숫자 `general-100`. 일요일 숫자 `danger-100`, 토요일 `primary-100`(오늘 표시가 우선).
  - hover `primary-30`, focus-visible outline 2px `primary-100`, 칸 구분선 `general-40`.
- 접근성: 버튼 `aria-label` = `formatDate(date)` + 있으면 `getDayDescription`. 표에 `aria-label`(`2026年11月`). 키보드는 Tab 순서(화살표 이동은 범위 외).
- 순수 날짜 계산 `frontend/src/lib/calendar.ts`: `shiftMonth(month, ±1)`, `buildMonthWeeks(month) → (string|null)[][]`(일요일 시작), `formatMonthLabel(month)`. 문자열 연산과 `Date.UTC`만 사용(로컬 타임존 의존 금지).

### 날짜 칸 내용 (renderDay)
- `days`를 `Map<date, count>`로 변환. 없으면 아무것도 표시하지 않음(0명 미표시).
- 있으면 `Badge variant="dark"`로 `{count}名`. 보조 문구 없음.
- `getDayDescription`: `休暇 {count}名`.

### LeaveCalendarDayModal (dashboard 전용)
- 기존 `Modal` 사용. title `{formatDate(date)}の休暇`. footer [閉じる](`secondaryButtonClass`).
- 열릴 때 `useApiQuery('/dashboard/leave-calendar/day?date=' + date)`. 날짜가 null이면 닫힘·호출 없음(`useApiQuery(null)`).
- 상태: loading `SkeletonLines count={3}` / error `SectionError onRetry` / 0건 `この日の休暇取得者はいません。` / 목록.
- 목록 `<ul>`(항목 구분선 `general-40`): 각 항목 `社員名`(14/20 Medium, `general-100`) + `所属部署`(`general-80`) + `halfDay`가 있으면 `Badge variant="neutral"`로 「午前半休」(AM)/「午後半休」(PM). `halfDay`가 null이면 라벨 없음. 열 헤더 대신 `md` 이상에서 한 줄(이름·부서·라벨), 미만에서 2줄. 상태 배지·사유·반차 외 종류·기간은 표시하지 않음(API에도 없음).
- 라벨 문구는 기존 `messages.leave.types.HALF_AM` / `HALF_PM`(「午前半休」「午後半休」)을 재사용한다(`halfDay` → `AM: HALF_AM, PM: HALF_PM` 매핑).
- 조회 실패는 영역 내 SectionError(03 공통 규칙).
- 모달 폭은 기존 Modal(최대 420) 그대로. 목록이 길면 본문 스크롤(Modal 기존 동작 확인, 없으면 목록에 `max-h` + `overflow-y-auto`).

## 상태 흐름
- `DashboardView`: `calendarSignal` state 추가. `PendingApprovalsSection.onProcessed`(ADMIN 여부와 무관하게 전달; ADMIN이면 summary 갱신도 계속)에서 `calendarSignal + 1`(승인 시 캘린더 반영). `LeaveBalanceSection`에 선택 prop `onApplied?` 추가 → 신청 성공 시 호출 → `calendarSignal + 1`(즉시 승인 사용자 반영).
- `LeaveCalendarSection` 내부 state: `month`, `selectedDate: string | null`. 날짜 클릭 → 모달 열림, 닫기 → null.
- 날짜 클릭으로 월 데이터를 재조회하지 않는다. 상세는 그 날짜 1건만 조회.

## 문구 (`messages/ja.ts` `dashboard.calendar`에 추가, 하드코딩 금지)
`title: '休暇カレンダー'`, `prevMonth: '前月'`, `nextMonth: '翌月'`, `monthLabel(y,m)`→`${y}年${m}月`, `people(n)`→`${n}名`, `dayDescription(n)`→`休暇 ${n}名`, `dayTitle(label)`→`${label}の休暇`, `empty: 'この日の休暇取得者はいません。'`, `employeeName: '社員名'`, `department: '所属部署'`, `close: '閉じる'`(common에 있으면 재사용). 요일 `weekdays: ['日','月','火','水','木','金','土']`는 `calendar` 공용 키로.

## 호출 API (상세는 design-backend.md)
- `GET /dashboard/leave-calendar?month=YYYY-MM` → `{ month, days: [{ date, count }] }`
- `GET /dashboard/leave-calendar/day?date=YYYY-MM-DD` → `{ date, items: [{ userId, name, departmentName, halfDay: 'AM' | 'PM' | null }] }`

## 생성·수정 파일
- 신규 `frontend/src/components/calendar/MonthCalendar.tsx` (+ `MonthCalendar.test.tsx`)
- 신규 `frontend/src/lib/calendar.ts` (+ `calendar.test.ts`)
- 신규 `frontend/src/app/(app)/dashboard/LeaveCalendarSection.tsx`
- 신규 `frontend/src/app/(app)/dashboard/LeaveCalendarDayModal.tsx`
- 신규 테스트 `frontend/src/app/(app)/dashboard/LeaveCalendarSection.test.tsx`
- 수정 `DashboardView.tsx`(섹션 배치·signal), `LeaveBalanceSection.tsx`(선택 prop `onApplied`), `DashboardView.test.tsx`(ADMIN·EMPLOYEE 모두 표시)
- 수정 `frontend/src/lib/api/types.ts`(`LeaveCalendarMonth`, `LeaveCalendarDay`, `LeaveCalendarMember`, `HalfDay = 'AM' | 'PM'`), `frontend/src/messages/ja.ts`

## 재사용할 기존 파일
- `components/Card.tsx`, `Modal.tsx`, `Badge.tsx`, `Skeleton.tsx`, `SectionError.tsx`, `form.tsx`(`secondaryButtonClass`)
- `lib/api/useApiQuery.ts`, `lib/date-range.ts`(`tokyoToday`), `lib/format.ts`(`formatDate`)
- 패턴 참고: `app/(app)/dashboard/AdminSummarySection.tsx`, `PendingApprovalsSection.tsx`

## 문서 갱신 예정 (구현 후 frontend.md에 확정 기재)
- 09 §6에 `components/calendar/MonthCalendar.tsx` 행 추가, `lib/calendar.ts` 유틸 설명 추가
- SCR-002: §2 목적, §3-6 휴가 캘린더(좁은 폭 배치 포함), §4 동작(월 이동·날짜 선택), §5 권한표 행(EMPLOYEE O / ADMIN O), §6 API 행, §7 Empty 문구, §8 완료 조건에 "휴가 캘린더는 전원에게 승인된 휴가자의 이름·부서를 표시(본인 데이터만 표시의 예외)" 추가
- 03 Screen List SCR-002 기능 칸에 "휴가 캘린더" 추가
