# design-frontend: dashboard-renewal

> 결정은 `decisions.md`(D1~D19 확정, D20 결정 필요 — 프런트는 D20 결과와 무관하게 캘린더를 삭제한다).

## 참조 문서
- `docs/03_SCREEN_LIST.md` SCR-002 행, §Common UI Rules(상태 처리·모달·전역 내비게이션·표시 언어), §Screen Flow
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` 전체(§3-3 근태, §3-4 휴가, §3-5 승인 대기, §4 동작, §5 권한, §7 상태)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005`(승인·반려 흐름, 모달 단계) — 대시보드 모달도 같은 흐름
- `docs/09_DESIGN_SYSTEM.md` §2(토큰), §2.3(카드·배지·아이콘 24), §4 SCR-002 행, §5(확정 결정 3·4), §6(공용 컴포넌트)
- 참고 이미지: 8.png(관리자 데스크톱), 9.png(관리자 모바일), 10.png(일반 데스크톱), 11.png(일반 모바일)

## 화면
- SCR-002 대시보드 `/dashboard`. 셸(TopBar·Sidebar·AppShell·햄버거 드로어)은 변경하지 않는다(D16).

## 배치 (D1·D19)
- 헤더 → (ADMIN) 통계 3개 행(`sm` 이상 3열, 미만도 3열 압축) → 카드 그리드.
- 카드 그리드: `xl`(1280) 이상 `grid-cols-2`(간격 24), 미만 1열. DOM 순서 = 데스크톱 순서, 2열 자동 흐름:
  1. 承認待ちの申請(표시 대상일 때만, D8) 2. 今日の出勤状況 3. 全社の出勤状況(ADMIN) 4. 今月の勤務状況 5. 休暇の残り日数 6. 各部署の状況 7. 直近の申請履歴
  - 直近은 앞 카드 수가 짝수면 `xl:col-span-2`(ADMIN = 6장 뒤 전폭 → D1 배치와 일치, 일반 사원 비승인자 = 4장 뒤 전폭, 승인자 사원 = 5장 뒤라 1칸).
  - ADMIN 결과: 承認待ち|今日 → 全社|今月 → 休暇|部署 → 直近(전폭) = D1.
  - 10.png의 今月/休暇 세로 묶음은 재현하지 않는다(같은 그리드 규칙 유지).
- 1열 순서(ADMIN, 9.png): 통계 → 全社 → 承認待ち → 今日 → 今月 → 休暇 → 部署 → 直近. `order-*` + `xl:order-none`으로만 조정. EMPLOYEE는 DOM 순서 그대로.
- 같은 카드·같은 조회를 PC/모바일 공유. `useMediaQuery` 분기·이중 마운트 금지. 휴가 캘린더 카드 없음(D3).

## 카드별 구성

### 헤더 `DashboardHeader` (신규)
- `<h1>` 「{인사말}、{name}さん」, 부제 「今日も一日、よろしくお願いします。」(`general-80`), 날짜(`formatTodayLabel`, `CalendarIcon`) — `sm` 이상 오른쪽, 미만 아래. 인사말 `lib/greeting.ts` `greetingOf(now: Date)`(도쿄 5–10 / 11–17 / 그 외).

### 통계 카드 (ADMIN) `AdminStatsSection` (신규, `AdminSummarySection` 대체)
- `StatCard` 재사용 + 선택 prop `icon?`·`unit?`. 全社員数=`totalEmployeeCount`名, 本日の出勤者=`clockedInCount`名, 承認待ちの申請=`pendingLeaveCount`件(href `/leaves/approvals?scope=all`).
- 데이터: 부모의 API-DASH-001 조회 결과(全社 카드와 공유, 1회 조회).

### 承認待ちの申請 — `PendingApprovalsSection` 내용 교체 (D8)
- 표시 조건(부모 `DashboardView`가 판단):
  - ADMIN: 항상 표시, `scope=all&limit=5`.
  - EMPLOYEE: `usePendingApprovalCount().count > 0`일 때만 마운트, `scope=mine&limit=5`. `count`가 0·null이면 렌더하지 않음(로딩 스켈레톤도 없음).
- prop `scope: 'all' | 'mine'`. 제목 「承認待ちの申請（{totalCount}件）」(같은 응답의 `totalCount`). action 「すべて見る」 → ADMIN `/leaves/approvals?scope=all`, EMPLOYEE `/leaves/approvals`.
- `md` 이상 표: 社員名 / 部署 / 休暇種別(Badge `info`) / 期間(`formatPeriod`) / chevron. `md` 미만 목록: 이름·부서, 종류 배지, 기간·일수(9.png). 행 클릭·키보드(이름 버튼)로 열기는 기존 방식 유지.
- 행 클릭 → 기존 `LeaveDetailModal`(prop 추가 없음). [承認]·[却下] 노출은 모달의 기존 `canProcess` 그대로, 승인 확인·반려 사유(필수 500자) 단계와 409 처리도 기존 그대로. 프런트는 버튼 노출만, 권한 판정은 서버.
- `onProcessed`: 목록 reload + 사이드바 배지 `refresh()`(기존) + 부모 콜백(ADMIN summary reload, department-status reload). 승인자 사원이 마지막 건을 처리하면 배지 0 → 카드가 사라진다(처리 성공 토스트는 전역 `Toast`이므로 유지되는지 구현 시 확인).
- Empty(ADMIN만 해당): 「承認待ちの申請はありません。」

### 今日の出勤状況 — `AttendanceSection` 내용 교체 (D10)
- 아이콘 영역(`primary-30` 원 + `primary-100` SVG, `aria-hidden`), 상태 Badge(기존 `STATE_BADGE`), 出勤時刻(큰 숫자, 출근 전 「--:--」), 구분선, 「退勤予定（目安）」 = 출근 + 9시간(출근 전 「--:--」). 退勤済み이면 실제 「退勤時刻」도 표시.
- 진행 막대 「今日の勤務進捗」: `role="progressbar"`, `aria-valuenow` 0~100. 계산은 `lib/work-progress.ts`:
  - `EXPECTED_WORK_MINUTES = 540`(実労働 8시간 + 휴게 60분)
  - `expectedClockOut(clockIn: string): Date`
  - `workProgressPercent(clockIn: string | null, until: Date): number` — (until − clockIn)/540분, 0~100 클램프, 정수 내림. clockIn null이면 0.
  - until: 근무 중 = 현재 시각(근무 중일 때만 60초 간격 갱신), 退勤済み = `clockOut`.
- 버튼 1개(다음 동작): 未出勤 → Primary [出勤する], 勤務中 → White [退勤する], 退勤済み → 비활성 [退勤済み]. 확인 모달·`submittingRef`·409 재조회는 기존 그대로.
- 성공 시 `onClocked()` → 부모가 summary·department-status·monthly 재조회.

### 全社の出勤状況 (ADMIN) `CompanyAttendanceSection` (신규)
- `DonutChart` 가운데 「出勤率」 + `attendanceRate`(소수 1자리, null → 「—」). 범례 出勤 / 未出勤 / 休暇 「{n}名（{p}%）」, `p` = `lib/attendance-rate.ts` `shareOf(count, denominator)`(분모 0 → null → 「—」).
- `isWorkday === false` → 「本日は休日のため、出勤者のみ集計しています。」
- 데이터는 부모 API-DASH-001(통계와 공유). 에러 시 `SectionError` 재시도 = 공유 query.reload.

### 今月の勤務状況 `MonthlyWorkSection` (신규, D11)
- `GET /attendance/monthly`(month 생략). action 「詳細を見る」 → `/attendance`.
- 4칸: 勤務日数 `actualWorkDays`日 / 総労働時間 `actualWorkMinutes` / 残業時間 `overtimeMinutes` / 休日出勤 `holidayWorkMinutes`(시간). 시간 표기 `formatHours`: 「96時間」, 분 있으면 「96時間30分」. 좁으면 2×2.

### 休暇の残り日数 — `LeaveBalanceSection` 내용 교체 (D12)
- action 「休暇履歴を見る」 → `/leaves`. 2칸: 残日数 `remainingDays` | 承認済み `approvedDays`. 부여 0일 안내 유지. 하단 [休暇を申請](`LeaveApplyModal` 기존 흐름, 성공 시 balance·直近 재조회).

### 各部署の状況 `DepartmentStatusSection` (신규, D7)
- `GET /dashboard/department-status`. 표(`thClass`·`compactTdClass`): 部署 / 在籍人数 / 出勤（率） / 休暇 / 未出勤. 비근무일 안내는 全社와 같은 문구.
- action: ADMIN만 「すべて見る」 → `/admin/attendance`. 좁은 폭 `useHorizontalOverflow` 가로 스크롤. Empty 「表示できる部署がありません。」

### 直近の申請履歴 `RecentRequestsSection` (신규, D13)
- `GET /leaves/me?limit=3`. action 「すべて見る」 → `/leaves`. 행: 아이콘 + 휴가 종류, 기간, `LeaveStatusBadge`, chevron. 클릭 → `LeaveDetailModal`(본인 취소 기존 규칙). 취소 후 목록·잔여 재조회. Empty 「申請履歴はありません。」

## 시스템 컴포넌트 재사용 (09 §6 이름)
`Card`, `StatCard`, `Badge`, `LeaveStatusBadge`, `LeaveDetailModal`, `LeaveApplyModal`, `Modal`, `Spinner`, `Skeleton`/`SkeletonLines`, `SectionError`, `Toast`, `table.ts`, `form.tsx`(`primaryButtonClass`·`secondaryButtonClass`·`textButtonClass`), `CalendarIcon`, `useApiQuery`, `useHorizontalOverflow`, `usePendingApprovalCount`, `lib/format.ts`.

## 신규·변경 공용 컴포넌트 (09 §6 갱신 대상)
| 대상 | 내용 | 이유 |
|---|---|---|
| `components/DonutChart.tsx` 신규 | `DonutChart({segments:{value,colorClass,label}[], centerLabel, centerValue, ariaLabel})`. 정적 SVG `circle` stroke-dasharray, 라이브러리 없음, `role="img"`+`aria-label`. 색 出勤 `primary-100`, 未出勤 `general-50`, 休暇 `general-40` | 도넛 미보유(D15) |
| `Badge` variant `info` 추가 | `primary-30` 배경 + `primary-100` 글자 | 휴가 종류 배지, 기존 토큰만 |
| `StatCard` prop `icon?`·`unit?` | 생략 시 기존과 동일 | 통계 카드 |
| `app/(app)/dashboard/icons.tsx` 신규 | 대시보드 전용 인라인 SVG 아이콘(`currentColor`, 24px, `aria-hidden`) | 아이콘 라이브러리 없음 |
- `LeaveDetailModal`은 변경하지 않는다(D8, 이전 설계의 `allowApproval` prop 폐기).

## 상태 흐름
- `DashboardView`: `isAdmin`이면 `useApiQuery('/admin/dashboard/summary')`, 아니면 path null. `usePendingApprovalCount()`로 사원의 承認待ち 표시 여부 결정.
- 재조회 신호: 출퇴근 성공 → summary·department·monthly / 승인·반려 성공 → 承認待ち 목록·배지·summary·department / 휴가 신청·취소 → balance·直近. 기존 `summaryKey`·`calendarSignal`은 삭제.
- 카드별 독립 조회, 실패 시 그 카드만 `SectionError`, 로딩은 카드별 `SkeletonLines`.

## 문구 (`messages/ja.ts` `dashboard` 재구성, 하드코딩 금지)
- greeting, subtitle, stats, pending(title(n), viewAll, empty, 기존 openDetail 등), attendance(title 「今日の出勤状況」, clockInTime, expectedClockOut 「退勤予定（目安）」, clockOutTime 「退勤時刻」, progress 「今日の勤務進捗」, clockInAction, clockOutAction, doneAction, 기존 확인 문구), company, monthly(holidayWork 「休日出勤」 등), leave, departments, recent.
- 미사용 키(기존 summary·calendar·pending 6열 헤더 등) 삭제(D18).

## 호출 API 요약 (상세는 design-backend.md)
| 카드 | API | 대상 |
|---|---|---|
| 통계·全社 | `GET /admin/dashboard/summary`(변경) | ADMIN |
| 承認待ち | `GET /leaves/pending-approval?scope=all&limit=5` / `scope=mine&limit=5` | ADMIN / 승인자 |
| 승인·반려 | 기존 승인·반려 API(모달 내부) | 할당 승인자·ADMIN |
| 今日 | `GET /attendance/today`, `POST /attendance/clock-in`·`clock-out` | 공통 |
| 今月 | `GET /attendance/monthly` | 공통 |
| 休暇 | `GET /leaves/balance` | 공통 |
| 部署 | `GET /dashboard/department-status`(신규) | 공통 |
| 直近·상세 | `GET /leaves/me?limit=3`, `GET /leaves/:id`, 본인 취소 | 공통 |

## 생성·수정·삭제 파일
- 수정: `frontend/src/app/(app)/dashboard/DashboardView.tsx`, `AttendanceSection.tsx`, `LeaveBalanceSection.tsx`, `PendingApprovalsSection.tsx`, `DashboardView.test.tsx`
- 신규: `dashboard/DashboardHeader.tsx`, `AdminStatsSection.tsx`, `CompanyAttendanceSection.tsx`, `MonthlyWorkSection.tsx`, `DepartmentStatusSection.tsx`, `RecentRequestsSection.tsx`, `icons.tsx`
- 신규 공용: `components/DonutChart.tsx`(+test), `lib/greeting.ts`(+test), `lib/attendance-rate.ts`(+test), `lib/work-progress.ts`(+test). `formatHours`는 `lib/format.ts`에 추가
- 수정 공용: `components/StatCard.tsx`, `components/Badge.tsx`, `lib/api/types.ts`(`AdminDashboardSummary` 필드 추가, `DepartmentStatus` 신규, 캘린더 타입 삭제), `lib/format.ts`, `lib/calendar.ts`(`buildMonthWeeks` 삭제)·`calendar.test.ts`, `messages/ja.ts`
- 삭제: `dashboard/AdminSummarySection.tsx`, `dashboard/LeaveCalendarSection.tsx`(+test), `dashboard/LeaveCalendarDayModal.tsx`, `components/calendar/MonthCalendar.tsx`(+test), `frontend/e2e/dashboard-leave-calendar.spec.ts`
- e2e: `frontend/e2e/dashboard.spec.ts`(기대 갱신), 신규 `frontend/e2e/dashboard-renewal.spec.ts`
- 참고: `components/layout/PendingApprovalCount.tsx`, `components/leave/LeaveDetailModal.tsx`(`canProcess`), `components/attendance/attendanceStatus.ts`, `app/(app)/leaves/LeavesView.tsx`(StatCard 회귀), `app/(app)/leaves/approvals/ApprovalsView.tsx`, `app/(app)/attendance/AttendanceSheetView.tsx`(lib/calendar 사용처)

## 문서 갱신 예정 (frontend 구현 후 frontend.md에 기록)
- SCR-002: §3 전면(카드 구성·배치·좁은 폭, §3-6 캘린더 삭제, お知らせ 없음), §4(승인 대기 처리 = 승인자·ADMIN이 모달에서 승인·반려, 출퇴근 단일 버튼, 退勤予定 目安·진행률 규칙, 캘린더 동작 삭제), §5 권한별 표시(承認待ち: ADMIN 전체 / 승인자 본인 할당 / 일반 사원 숨김), §6 API, §7 상태, §8 완료 조건
- 02 FR-DASH-001: 승인 대기 표시 대상·모달 내 승인 가능(원 요청 "대시보드 승인·반려 금지"에서 사용자 변경으로 명시), D10 目安 규칙, 캘린더 삭제, お知らせ 3단계
- 03: SCR-002 행 기능 설명, Screen Flow(`/dashboard ──[승인 대기 항목]──> 휴가 상세 모달(승인·반려)`, 캘린더 흐름 삭제)
- 09: §4 SCR-002 행·§5-4 차트 예외(정적 SVG 도넛), §6 DonutChart·Badge info·StatCard icon/unit 추가, MonthCalendar 행 삭제
