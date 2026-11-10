# design-frontend — 出勤簿 UI/UX 수정 (attendance-sheet-ui)

> 결정 항목은 `decisions.md` U1~U11. 사용자 승인 완료: U10만 B(날짜 형식 `1日（日）`), 나머지는 ★추천안.

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md` §4 月間表(열 정의·행 배경 우선순위·마지막 bullet의 가로 스크롤 규칙)
- `docs/09_DESIGN_SYSTEM.md` §2.1 색상(의미별 매핑), §2.3 간격·형태(표·배지), §5 확정된 결정(대비), §6 `Badge`·`table.ts`·`attendance/attendanceStatus.ts`·`WorkTimeline` 행
- `docs/03_SCREEN_LIST.md` 공통 UI 규칙(변경 없음, 확인용)

## 범위
- 대상: md(768px) 이상에서 마운트되는 `AttendanceSheetView`의 月間表만. `AttendanceView` 분기·md 미만 `AttendanceHistoryView`·현재 일시 카드·月間集計·API 호출은 변경 없음.
- 태블릿(768~1023)은 같은 出勤簿가 뜨므로 U2 안전망으로 깨짐만 막는다.
- 백엔드·API·DB·`lib/api/types.ts` 변경 금지. 근태 계산·`toTimelineSegments` 로직 변경 금지.

## 1. 레이아웃 (U1-A, U2-A, U3-A, U4-A)
구조(범례 아래, `aria-busy`/`opacity-60` 래퍼 안):
```
div.flex.items-start.overflow-x-auto            ← 안전망(U2). 평소엔 넘치지 않음
├ div.shrink-0.border-r-2.border-general-60     ← 왼쪽 영역 + 구분선(U6). 스크롤 안 함
│  table[aria-label=出勤簿] 日付…申請 8열 (thead h-11 / tbody 행 h-9)
└ div[role=region][aria-label=時間帯][tabIndex=0].min-w-40.flex-1.overflow-x-auto  ← 그래프만 스크롤
   table.w-full.min-w-120  時間帯 1열 (thead h-11: sr-only 時間帯 + WorkTimelineAxis / tbody 행 h-9: WorkTimeline)
```
- 정렬 규칙: 두 표 모두 `border-collapse`, 헤더는 `thClass`, 본문 셀은 새 `compactTdClass`(아래)로 **같은 높이**. 왼쪽 모든 셀은 줄바꿈 금지(`whitespace-nowrap`, 申請의 `flex-wrap` → `flex-nowrap`)로 행이 늘어나지 않게 한다. 두 영역은 `items-start`로 위쪽 정렬 → 오른쪽 가로 스크롤바는 마지막 행 아래에만 생기고 행 위치에 영향 없음.
- 세로 스크롤은 페이지 스크롤 그대로(내부 세로 스크롤 없음) → 좌우 행이 함께 움직인다.
- 구분선: 왼쪽 영역의 `border-r-2`. 왼쪽 영역은 스크롤하지 않으므로 고정되고, 높이 = 헤더~마지막 행. 안전망 스크롤 시에는 전체와 함께 이동(허용).
- 日付 열의 기존 `sticky left-0`과 `rowTone().sticky`는 안전망 스크롤(태블릿)에서 날짜를 남기기 위해 **유지**.
- 페이지 래퍼 `mx-auto flex max-w-7xl flex-col gap-6` → `max-w-7xl` 제거(U3, 이 화면만).
- 행 수: 두 표 모두 `sheet.data.days`를 같은 순서로 map(28~31일 자동 대응). key는 `day.date`.
- 오른쪽 행: `<tr onClick={선택}>` + 같은 배경 클래스(`rowTone(day, selected).row`), `tabIndex`·`aria-selected`·키보드 처리는 왼쪽 행에만.
- 그래프 바 세로 중앙: `WorkTimeline`(h-6, 바 `top-1/2 -translate-y-1/2`)을 h-9 셀의 기본 `vertical-align: middle`로 중앙 정렬. `WorkTimeline` 자체는 수정하지 않는다.
- `WorkTimeline`의 `label`은 날짜를 앞에 붙인 문구(`s.timelineDayLabel(date, label)` 신규)로 전달.

권장 구현: `DayRow`를 왼쪽 행 컴포넌트(`SheetDayRow`)와 오른쪽 행 컴포넌트(`TimelineRow`)로 나누고, 공통 계산(`rowTone`, 선택 핸들러)은 부모에서 전달. 파일 분리는 하지 않아도 됨(한 파일 유지 가능).

## 2. 행 높이 (U5-A)
- `components/table.ts`에 `compactTdClass` 추가: `tdClass`와 같고 높이만 `h-9`(36px). 기존 `tdClass`(52px)는 SCR-008 등 공용이므로 변경 금지.
- 헤더는 `thClass`(44) 그대로. 배지 높이 24 유지, 글자 14px 유지.

## 3. 勤務パターン Pill (U7-A, U8-A, U11-A)
- 상태값과 스타일 분리:
  - `lib/attendance-sheet.ts`: `export type WorkPatternKind = 'NORMAL' | 'DAY_OFF' | 'HOLIDAY' | 'LEAVE'` + `workPatternOf(day: SheetDay): { kind: WorkPatternKind; leaveType?: LeaveType }`(우선순위 승인 종일휴가 > HOLIDAY > WEEKEND > NORMAL, 기존 `workPattern`·`approvedFullDayLeave` 로직을 옮김. `isGreyRow`도 이걸 사용 가능)
  - `components/attendance/workPattern.ts`(신규, `attendanceStatus.ts`와 같은 형태): `WORK_PATTERN_BADGE: Record<WorkPatternKind, BadgeVariant>` = NORMAL `neutral` / DAY_OFF `danger` / HOLIDAY `danger` / LEAVE `success`
  - 문구: NORMAL `s.normalDay`(通常) / DAY_OFF `s.dayOff`(休日) / HOLIDAY `s.holiday`(祝日) / LEAVE `messages.leave.types[leaveType]`(변경 없음)
- `components/Badge.tsx`: 선택 prop `shape?: 'rounded' | 'pill'`(기본 `rounded` = 현행 `rounded px-2`, `pill` = `rounded-full px-3`). 높이 `h-6`, `text-sm/5 font-medium`, variant 색은 `BADGE_VARIANT_CLASS` 그대로. 기존 사용처 무변경.
- 사용: `<Badge variant={WORK_PATTERN_BADGE[kind]} shape="pill">{label}</Badge>`. 새 근무패턴은 `WorkPatternKind`·`WORK_PATTERN_BADGE`·문구 3곳 추가로 확장.

## 4. 申請 표시명 (U9-A)
- 표시 계층 전용 분류: `lib/attendance-sheet.ts`에 `export type SheetRequestKind = 'LEAVE'`(주석: 출장 기능 추가 시 `'BUSINESS_TRIP'` 추가). 현재 신청 데이터는 `SheetLeave`뿐이므로 휴가 배지는 `'LEAVE'` 고정.
- `messages.attendance.sheet.requestKinds: { LEAVE: '休暇' }`(신규, `Record<SheetRequestKind, string>` 형태). 출장 문구 `出張`은 기능이 생길 때 추가(지금 추가하지 않음).
- 배지: `s.leaveBadge(s.requestKinds.LEAVE, status)` → `休暇 承認済み`, aria-label `s.leaveBadgeLabel(s.requestKinds.LEAVE, status)`. 배지 variant(`LEAVE_STATUS_BADGE`)·radius(기본 rounded)·클릭 시 `LeaveDetailModal` 동작 그대로. `leaveType`·API 데이터는 건드리지 않음.

## 5. 日付 형식·일요일 표시 (U10-B)
- 형식: `lib/attendance-sheet.ts` `formatSheetDate(ymd): string`의 출력을 `${Number(day)}日（${weekday}）`로 변경(전각 괄호 U+FF08/U+FF09, 월 없음, 앞자리 0 없음). 예 `2026-11-01` → `1日（日）`, `2026-11-14` → `14日（土）`. 시그니처·이름 유지, 요일은 기존 `messages.calendar.weekdays`, 문자열·UTC만 사용(TZ 비의존 유지). 위 주석 `// 11/2(月)`도 새 형식으로.
- 사용처는 `AttendanceSheetView.tsx` 日付 셀 1곳 + 이번에 추가하는 `timelineDayLabel`의 날짜 인자(같은 함수 사용 → `2日（月） 09:00〜18:00 勤務…`). 새 포맷 함수나 `lib/format.ts` 변경 없음.
- 바꾸지 않는 것: `formatClockOut`(자정 넘김 `2026/11/05 02:00`), `formatMonthLabel`, `CurrentDateTimeCard`, `LeaveDetailModal`, md 미만 `AttendanceHistoryView`(`formatWorkDate`), 관리자 화면 — 모두 `formatSheetDate`를 쓰지 않는다.
- 색: `dateColorClass`(일·공휴일 `text-danger-100`, 토 `text-primary-100`) 변경 없음. 日付 셀의 `whitespace-nowrap`·`tabular-nums` 유지.

## 6. 구분선 (U6-A)
- 왼쪽 영역 래퍼 `border-r-2 border-general-60`. 헤더 하단선(general-40 2px)·행 하단선과 겹쳐도 세로선이 끊기지 않게 래퍼(표 밖)에 둔다.

## 7. 문구(ja.ts `messages.attendance.sheet`)
- 추가: `requestKinds: { LEAVE: '休暇' }`, `timelineDayLabel: (date: string, label: string) => \`${date} ${label}\``
- 기존 `leaveBadge`·`leaveBadgeLabel`·`timeline` 재사용.

## 상태·로딩·에러
- 변경 없음(Loading `SkeletonLines`, Error `SectionError`, 월 이동 중 `opacity-60`·`aria-busy`는 두 영역을 감싼 기존 래퍼에 유지).

## 파일
| 구분 | 경로 |
|---|---|
| 수정 | `frontend/src/app/(app)/attendance/AttendanceSheetView.tsx` |
| 수정 | `frontend/src/components/Badge.tsx`(shape prop) |
| 수정 | `frontend/src/components/table.ts`(compactTdClass) |
| 수정 | `frontend/src/lib/attendance-sheet.ts`(WorkPatternKind, workPatternOf, SheetRequestKind, formatSheetDate 형식) |
| 수정 | `frontend/src/messages/ja.ts` |
| 신규 | `frontend/src/components/attendance/workPattern.ts` |
| 테스트 | `AttendanceSheetView.test.tsx`(수정), `lib/attendance-sheet.test.ts`(추가), `frontend/e2e/attendance-sheet-layout.spec.ts`(신규) — test-plan.md |

참고(재사용): `components/attendance/attendanceStatus.ts`(매핑 파일 형태), `components/leave/LeaveDetailModal.tsx`(`LEAVE_STATUS_BADGE`), `components/attendance/WorkTimeline.tsx`, `components/Tooltip.tsx`, `e2e/dashboard-leave-calendar.spec.ts`(스크린샷 캡처 패턴), `e2e/attendance.spec.ts`(로그인·뷰포트 패턴).

## 문서 갱신 예정(구현 후 frontend.md에 확정 내용 기록)
- 04 SCR-003 §4: 좌우 분리·그래프 영역만 가로 스크롤·구분선·행 높이 36·勤務パターン Pill 색·申請 `休暇 {상태}`·日付 행의 `11/2(月)` 형식 → `2日（月）`
- 09 §2.3(표 compact 행 36, Pill 배지), §6(`Badge` shape, `table.ts` compactTdClass, `attendance/workPattern.ts`, 출근부 유틸 `formatSheetDate(ymd)` 설명 `11/2(月)` → `2日（月）`)
- 08 SCR-003 행(레이아웃 E2E), 10 로드맵
