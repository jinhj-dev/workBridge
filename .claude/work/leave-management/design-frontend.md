# design-frontend: 휴가관리 통합 (SCR-004 탭 3개 + 디자인 시스템 개편)

## 참조 문서·이미지 (해당 섹션만)
- 디자인 기준(최우선): `.claude/work/leave-management/refs/02-pc-leave-calendar.png`(PC 캘린더), `03-mobile-leave-calendar.png`(모바일 캘린더), `01-pc-leave-history.png`(自分の休暇 요약·필터·표). 브랜드명·로고·가상 데이터는 복사하지 않음(로고는 기존 `Logo`)
- `docs/03_SCREEN_LIST.md` Common UI Rules(상태 처리·목록·모달·전역 내비게이션)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2(신청 모달)·§4(동작)·§5·§6, `SCR-005_LEAVE_APPROVAL.md` §3~§10(승인 규칙·문구)
- `docs/09_DESIGN_SYSTEM.md` §2(토큰), §5-6(참조 디자인 예외), §6(공용 컴포넌트)
- API 계약 상세: `design-backend.md`

## 1. 라우팅·탭 구조
- 경로 기반 탭. 신규 `app/(app)/leaves/layout.tsx`(클라이언트 `LeaveManagementLayout`)가 PageHeader + NavTabs + `LeaveApplyModal`을 소유하고 children이 탭 본문
  - `/leaves` 自分の休暇(기본) / `/leaves/calendar` 休暇カレンダー / `/leaves/approvals` 承認
  - 탭은 `<Link>`(클라이언트 전환, 새로고침 없음, 뒤로/앞으로 자연 지원). 기존 `/leaves/approvals?scope=all`(대시보드·벨 링크) 그대로 호환
- 承認 탭 표시: ADMIN이면 항상. 그 외는 `GET /leaves/pending-approval?scope=mine&status=PENDING,APPROVED,REJECTED&limit=1`의 `totalCount > 0`. 판정 전에는 탭을 숨기고, `/leaves/approvals` 직접 접근 시 판정 전 스켈레톤 → 거짓이면 `router.replace('/leaves')`(토스트 없음). 조회 실패 시 숨김
- 신청 성공 후 갱신: layout이 Context(`useLeaveDataVersion()` → `{version, bump}`)를 제공. 신청 성공 시 토스트(SCR-004 §4.1 문구) + `bump()`. 自分の休暇는 balance·history 재조회(필터 초기화 규칙은 SCR-004 §4.1 대신 "필터 유지, 1페이지"로 단순화), 캘린더는 재조회(즉시 승인 건 반영)
- `AppShell` 가드 변경 없음

## 2. 전역 내비게이션
- `Sidebar.tsx`: `休暇承認` 항목 삭제. 메뉴 = ホーム·出勤簿·休暇管理(+관리자 메뉴 유지). 승인 대기 카운터 배지는 `休暇管理` 항목으로 이동. 활성 판정은 `/leaves`와 `/leaves/*` 모두 休暇管理(`pathname === href || pathname.startsWith(href + '/')`, `/dashboard` 등은 기존과 동일)
- `MobileTabBar.tsx`: 休暇承認 탭 삭제 → 4탭(ホーム·出勤簿·休暇管理·メニュー), 빨간 점은 休暇管理로 이동, 활성 판정 동일 규칙. 이미지 하단 탭 스타일(활성 = `primary-30` 둥근 배경 + 아이콘·라벨 `primary-100`, 높이 유지)
- `TopBar.tsx` 벨 링크 `/leaves/approvals` 유지(비승인자는 위 replace로 /leaves)
- 社員情報·各種設定은 화면이 없어 추가하지 않음(사용자 확정)

## 3. 디자인 토큰 개편 (`globals.css` `@theme`, 이미지 우선)
| 항목 | 변경 |
|---|---|
| Primary 100~30 | **변경 없음(사용자 결정: 기존 색 유지)**. 이미지의 인디고(#4B33E6)는 쓰지 않고, 이미지에서 인디고가 쓰인 자리(버튼·활성 탭·링크·선택일·하단 탭 활성·아이콘)는 기존 `primary-*` 토큰으로 대응. `globals.css`의 `--color-primary-*` 값 수정 금지 |
| 휴가 분류 색(신규) | `leave-paid-bg #E7E3FC` / `leave-paid-fg #3A28B5`(PAID·OTHER 막대·배지), `leave-special-bg #E2F5E7` / `leave-special-fg #1D7A3C`(SPECIAL) |
| 요일 색(신규) | `calendar-sunday` = `danger-100` 값 재사용(별칭), `calendar-saturday #2F5BEA` |
| 텍스트 | 신규 `text-page-title` 28/36 Bold(PageHeader 제목, `md` 미만 22/30) |
| Radius | 컨트롤(버튼·입력·셀렉트·검색창) 4 → **8**(`form.tsx` 클래스 수정, 전 화면 적용), 배지 pill 유지, 카드 16 유지 |
| Shadow | 기존 `shadow-card-soft` 재사용(카드·캘린더·목록) |
| 버튼 높이 | Primary 대형(신청 버튼) 48 / 기본 44 / 소형 36 |
- 색 외 이미지 요소(레이아웃·radius·카드·표·캘린더·배지·탭·하단 탭 스타일)는 이미지 최우선 그대로 적용
- 영향 검토(필수): radius 변경 후 대시보드·출근부·부서관리·전체근태·로그인·비밀번호 화면을 1440/375 캡처해 이전과 비교(겹침·잘림·radius 일관성). 문제가 있으면 임의로 고치지 말고 캡처와 함께 frontend.md에 보고

## 4. 신규·변경 공용 컴포넌트
| 컴포넌트 | 내용 |
|---|---|
| 신규 `components/PageHeader.tsx` `PageHeader({title,icon?,action?})` | 이미지 제목 행: 32px primary 아이콘 + `text-page-title` + 우측 action. `sm` 미만에서도 한 줄(버튼 축소) |
| 신규 `components/NavTabs.tsx` `NavTabs({label,items:{href,label,badge?}[]})` | 경로 탭. 높이 52, 간격 32(`sm` 미만 20), 16/24 Medium(`md` 이상 18/28), 활성 Bold `primary-100` + 하단 3px `rounded-full` 라인, 비활성 `general-80`, 하단 구분선 `general-40`. `<nav aria-label>` + `aria-current="page"`. 넘치면 탭 행만 가로 스크롤(페이지 가로 스크롤 금지) |
| 수정 `components/Tabs.tsx` | 같은 시각 규칙(3px 라인·Bold 활성) 적용, API 불변 |
| 신규 `components/SearchInput.tsx` `SearchInput({id,label,value,onChange,placeholder})` | 좌측 돋보기 아이콘, 높이 44, radius 8, `input-border`. 라벨은 `sr-only` |
| 신규 `components/leave/LeaveCategoryBadge.tsx` | category → 문구·색(PAID 有給休暇 / SPECIAL 特別休暇 / OTHER 休暇), `compact`이면 모바일 칩(아이콘 + 休暇/特別休暇) |
| 신규 `components/leave/MonthNavigator.tsx` | `‹ 2026年11月 ›`(아이콘 버튼 40×40 테두리 radius 8, `aria-label` 前月/翌月) |
| 수정 `components/table.ts` | `bandThClass`·`bandTdClass` 추가(헤더 `general-30` 띠·radius 8, 행 56, 하단 1px `general-40`) — 이미지 표 스타일. 기존 export 불변 |
| 수정 `form.tsx` | radius 8, `primaryButtonClass` 그림자 없음 유지 |
- 기존 재사용: `Card`, `Badge`, `LeaveStatusBadge`, `StatCard`, `Select`, `DateRangeFields`, `Pagination`, `Modal`, `Skeleton`/`SkeletonLines`, `SectionError`, `LeaveApplyModal`, `LeaveDetailModal`(initialStep), `useApiQuery`, `useMediaQuery`, `usePendingApprovalCount`, `lib/calendar.ts`(`shiftMonth`, `formatMonthLabel`)

## 5. 自分の休暇 (`/leaves`, `LeavesView` 개편)
- 요약 카드 1장(이미지 01): 3구획 — 有給休暇残日数(`remainingDays`, 아이콘 + `text-stat`) / 今年の取得日数(`approvedDays` + 「/ 付与日数 N日」) / 承認待ち(`pendingDays`). `md` 미만 세로 3행. API-LEAVE-006
- 필터 카드: 申請期間(`DateRangeFields`, 미입력 = 전체) · 休暇種別 `Select`(すべて+5종) · ステータス `Select`(すべて+4) · [検索](primary). 검색 클릭 시 URL 반영·1페이지. URL: `appliedFrom`, `appliedTo`, `leaveType`, `status`, `page`(기본값 미기재, 이전 `year`는 무시). `parseLeavesQuery` 확장(단일 값만 유효, 기존 쉼표 다중 값은 첫 값 사용)
- 이력 표(`bandThClass`): 申請日 / 休暇期間 / 休暇種別 / 取得日数 / ステータス(`LeaveStatusBadge soft`) / 操作([詳細] → `LeaveDetailModal`, 취소 포함). 신청일 내림차순, 20건 페이지네이션. `md` 미만 카드 목록. Empty: 기존 문구
- `LeaveHistoryList.tsx` 개편, `LeaveFilterButtons`는 이 화면에서 더 이상 사용하지 않음(다른 사용처 없으면 삭제하고 보고)

## 6. 休暇カレンダー (`/leaves/calendar`, 신규 `LeaveCalendarView`)
- URL: `month`(기본 이번 달, 미기재), `departmentId`, `name`, `empId`, `date`(모바일 선택일), `view=month`(모바일 월 전체 목록). 월 이동·부서 변경은 `push`, 이름·사원번호 입력은 300ms 디바운스 후 `replace`
- 조회 1회: `GET /leaves/calendar?month&departmentId&name&empId` → 캘린더와 목록이 **같은 응답**을 사용(일치 보장). 부서 옵션 `GET /departments`(「全ての部署」 + 목록)
- 순수 함수 신규 `lib/leave-calendar.ts`: `buildMonthGrid(month)`(일요일 시작 6주 이하, 월 밖 날짜 표시용), `layoutWeekLanes(items, weekDates, maxLanes)`(주 단위로 월 안 구간만 잘라 연속 막대 lane 배치, 숨겨진 건수 → 날짜별 `+N件`), `itemsOnDate(items, date)`, `formatLeavePeriod(item)`(`11/13（水）～11/15（金）`, 반차 「午前」「午後」), `calendarDayCount(item)`(달력 일수, 모바일 「（3日間）」, 반차 「（半日）」)
- 공통 셀 규칙: 일요일·공휴일 날짜 `calendar-sunday`, 토요일 `calendar-saturday`, 월 밖 날짜 `general-60` 숫자·일정 미표시, 오늘 숫자 원형 강조(`primary-100`), 공휴일명은 PC 셀 숫자 옆 10/14(넘치면 말줄임)·모바일은 `title`/sr-only

### 6-1. PC (`xl` 이상 2열, `md`~`xl` 미만 세로 배치)
- 상단 행: MonthNavigator + 부서 Select(폭 272) | 우측 SearchInput 名前検索·社員番号検索(각 폭 300, `xl` 미만은 줄바꿈 grid)
- 좌: 캘린더 카드(헤더 요일 행 + 6주 그리드, 셀 최소 높이 100). 막대 = 이름 + 반차 「（午前）」, 높이 24, radius 6, 분류 색. 셀당 최대 2 lane, 나머지 `+N件`(텍스트 버튼). 막대 클릭 → `LeaveDayModal`(그 건 1개), `+N件` 클릭 → `LeaveDayModal`(그 날짜 전원)
- 우: `Card` 「休暇予定一覧 YYYY年MM月」 + 표(社員番号(회색 칩)·氏名(Bold, 아바타 아이콘)·部署·休暇期間·休暇種別 `LeaveCategoryBadge`), 시작일 오름차순(서버 순서), 카드 높이 = 캘린더 높이, 표 영역 내부 세로 스크롤 + sticky 헤더(키보드 스크롤 위해 `tabIndex=0`·`aria-label`). 하단 안내 「ⓘ 承認済みの休暇が表示されます。」
- 신규 `components/leave/LeaveDayModal.tsx`: `Modal`로 날짜·건 목록(氏名·社員番号·部署·期間·種別). API 호출 없음

### 6-2. 모바일 (`md` 미만, 320~430에서 가로 스크롤 없음)
- 순서: TopBar → PageHeader(제목 「休暇管理」 + [＋ 休暇申請]) → NavTabs → MonthNavigator(가운데) → 필터 행(부서 Select flex-1 + [検索] 토글 버튼, 조건 입력 시 점 표시) → 토글 펼침 시 名前検索·社員番号検索 2개 입력(세로) → 캘린더 카드 → 범례(「休暇（有給休暇など）」「特別休暇（慶弔・リフレッシュなど）」) → 휴가자 목록 카드 → MobileTabBar
- 셀: 7열 균등(`grid-cols-7`, `min-w-0`), 높이 64, 날짜 14/20 Medium. 일정은 1 lane만 칩(아이콘 + 「休暇」/「特別休暇」, 375 미만은 아이콘만) + 나머지 `+N件`. 이름은 표시하지 않음(폭). 셀 전체가 버튼(`aria-label` 「11月13日 休暇 2名」 = 날짜별 인원 확인 가능), 선택일 `primary-100` 1.5px 테두리 + `primary-30` 배경
- 선택일 기본: 표시 월에 오늘이 있으면 오늘, 없으면 1일. 날짜 선택 시 `date` 반영·목록 갱신
- 목록 카드: 제목 「11月13日（木）の休暇予定」 + 인원 칩 「N名」 + 우측 세그먼트 [選択日 | 月全体](`view`). 항목: 아바타 + 氏名(Bold) / 「社員番号：00001 | 開発部」 / `LeaveCategoryBadge` / 「期間 2026/11/13（木）～11/15（土）（3日間）」. Empty: 「この日の休暇予定はありません。」, 월 전체 Empty: 「該当する休暇予定はありません。」

### 6-3. 상태
- Loading: 캘린더·목록 스켈레톤(월 이동 중에는 이전 데이터 유지 `keepPreviousData`), Error: 각 영역 `SectionError`, 필터 결과 0건: 캘린더는 빈 그리드 + 목록 Empty 「条件に一致する休暇予定はありません。」

## 7. 承認 (`/leaves/approvals`, `ApprovalsView` 개편)
- ADMIN 보기 전환(`Tabs` mine/all) 유지. 요약 카드 3개(`StatCard` icon형): 承認待ち / 承認済み / 却下 — 각 `status=X&limit=1` totalCount. 카드 클릭 = 상태 필터 선택(선택 카드 `primary-100` 테두리, `aria-pressed`)
- URL: `scope`, `status`(PENDING 기본·미기재 / APPROVED / REJECTED), `page`. 목록 `GET /leaves/pending-approval?scope&status&page&limit=20`
- 표 컬럼: 申請日 / 社員番号 / 氏名 / 部署 / 休暇期間 / 休暇種別(`messages.leave.types`, 실제 종류) / 取得日数 / ステータス / 操作. `scope=all`이면 承認者 열 추가(기존 유지). 操作: PENDING은 [詳細][承認][却下](본인 신청은 承認·却下 비활성), 그 외 [詳細]만
- `md` 미만: 직원별 카드(氏名+社員番号, 部署, 期間, 種別, `LeaveStatusBadge`, [詳細]). 승인·반려는 `LeaveDetailModal` 안에서만(카드에 승인·반려 버튼 없음)
- 처리 후: 목록·건수 재조회 + `usePendingApprovalCount().refresh()`. 409/403 처리는 SCR-005 §10 그대로. Empty 문구: 상태별 신규(承認待ち는 기존 문구 유지)

## 8. 문구·타입
- `messages/ja.ts`: `leaveManagement`(제목·탭 3개), `leaveCalendar`(검색 placeholder 「名前検索」「社員番号検索」「全ての部署」, 목록 제목, 안내, 범례, Empty, 「+{n}件」, 「{n}名」, 세그먼트), `leaveCategory`(有給休暇·特別休暇·休暇), approvals 요약·상태 Empty 추가, nav에서 `approvals` 메뉴 문구 정리. 하드코딩 금지
- `lib/api/types.ts`: `LeaveCalendarResponse`, `LeaveCalendarItem`, `LeaveCategory`, `HalfDay`

## 9. 생성·수정 파일
- 신규: `app/(app)/leaves/layout.tsx`, `LeaveManagementLayout.tsx`, `LeaveDataVersion.tsx`(Context), `app/(app)/leaves/calendar/page.tsx`, `calendar/LeaveCalendarView.tsx`, `calendar/CalendarFilters.tsx`, `calendar/MonthLeaveCalendar.tsx`(PC·모바일 셀 렌더 분기), `calendar/LeaveScheduleTable.tsx`, `calendar/DayLeaveList.tsx`, `components/PageHeader.tsx`, `NavTabs.tsx`, `SearchInput.tsx`, `components/leave/LeaveCategoryBadge.tsx`, `MonthNavigator.tsx`, `LeaveDayModal.tsx`, `lib/leave-calendar.ts`
- 수정: `app/globals.css`, `components/form.tsx`, `table.ts`, `Tabs.tsx`, `layout/Sidebar.tsx`, `layout/MobileTabBar.tsx`, `app/(app)/leaves/page.tsx`, `LeavesView.tsx`, `LeaveHistoryList.tsx`, `leaves/approvals/page.tsx`, `ApprovalsView.tsx`, `lib/leave-days.ts`, `lib/api/types.ts`, `messages/ja.ts`
- 테스트: 위 신규 컴포넌트·`lib/leave-calendar.ts`·변경 View의 `*.test.tsx`, Playwright `e2e/leave-management.spec.ts`·`e2e/leave-visual.spec.ts`(test-plan 참조), 기존 `leaves.spec.ts`·`approvals.spec.ts`·`AppShell.test.tsx`·`dashboard*.spec.ts`의 사이드바 休暇承認 의존 부분 수정

## 문서 갱신 예정 (구현 후 frontend.md에 확정 기재)
- 03: 화면 목록(SCR-004 탭 3개, SCR-005 통합), 전역 내비게이션 표·하단 탭 4개·배지 위치, Screen Flow
- 04: SCR-004 전면 개정(탭·캘린더 PC/모바일·자分の休暇 필터), SCR-005를 承認 탭 명세로 개정(또는 SCR-004로 흡수 표시)
- 09: §2 토큰(휴가 분류 색·요일 색·`text-page-title`·radius 8, Primary는 변경 없음), §3 App Shell 하단 탭, §5에 이번 이미지 우선 결정 추가, §6 신규 컴포넌트 행
- 10: 로드맵 항목 갱신
