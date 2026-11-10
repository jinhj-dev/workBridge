# design-frontend: SCR-003 出勤簿

> 전제: decisions.md의 확정안(사용자 승인 완료, D5는 B = 공휴일 표시).
> **공휴일은 프론트에서 판정하지 않는다.** 공휴일 라이브러리를 frontend에 설치하지 않고, API-ATT-007의 `dayType === 'HOLIDAY'`·`holidayName`만 사용한다(행 스타일과 백엔드 합계의 기준을 하나로).

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md`(현행. 이번에 구성 전면 변경)
- `docs/03_SCREEN_LIST.md` "Common UI Rules"(상태 처리, 목록·URL Query, 전역 내비게이션, 표시 언어)
- `docs/09_DESIGN_SYSTEM.md` §2(토큰), §5-3(반응형), §6(구현된 공용 컴포넌트)
- API 계약: `design-backend.md`

## 화면
- **SCR-003 出勤簿** — URL `/attendance`(변경 없음), 권한 공통.
- 명칭(D13-A): `messages.nav.attendance` → `出勤簿`, `messages.attendance.title` → `出勤簿`(페이지 h1·metadata title). SCR-008(`全体勤怠管理`/`全体勤怠`)·대시보드 `勤怠状況`은 변경하지 않음. Breadcrumb은 앱에 없으므로 추가하지 않음.

## 구성 (위→아래, `mx-auto max-w-7xl flex-col gap-6`)
1. **Page Header**: h1 `出勤簿`(text-h5 Bold) + 조회 월 라벨(`formatMonthLabel`, 예 `2026年11月`) + [前月][翌月] 아이콘 버튼(`secondaryButtonClass`, `aria-label`) + [今月] 버튼(이번 달이면 disabled). 월은 URL `?month=YYYY-MM`(없거나 형식 오류면 이번 달, 03 목록 규칙의 URL 유지). 월 이동은 `shiftMonth`.
2. **CurrentDateTimeCard**(신규, 화면 전용): 흰 카드(`shadow-card`, radius 6). 왼쪽 작은 글씨 `2026年` / `11月10日(火)`, 오른쪽 큰 숫자 `09:14`(text-h4 Bold, `tabular-nums`) — 날짜와 시각을 크기·위치로 분리. Asia/Tokyo 기준(`Intl.DateTimeFormat` timeZone). 다음 분 경계에 맞춰 `setTimeout` → 이후 60초 `setInterval`로 갱신, unmount 시 정리. `<time dateTime>` 사용, 매분 읽기 방지를 위해 `aria-live` 없음. **출근·퇴근 버튼 없음.**
3. **Card `出勤簿`(月間表)**: `overflow-x-auto` 래퍼 안 `<table>`(`thClass`/`tdClass`). 열: 日付 / 勤務パターン / 出勤時刻 / 退勤時刻 / 休憩時間 / 実働時間 / 備考 / 申請 / 時間帯. 時間帯 열 `min-w-[480px]`, 日付 열 `sticky left-0`(배경 상속). 헤더의 時間帯 칸에는 `WorkTimelineAxis`(0~24, 2시간 간격 눈금 라벨). 표 위 또는 아래 범례: 勤務(작업 색)·休憩(計算値) 색 견본.
4. **MonthlySummarySection**(Card `月間集計`): `StatCard`가 아닌 정의 목록(`<dl>`) 그리드(`sm:grid-cols-2 lg:grid-cols-4`). 항목: 所定労働日数(주석 없음 — 공휴일 제외 평일, 백엔드 값 그대로) / 実労働日数 / 実労働時間 / 時間外労働時間 / 深夜労働時間 / 休日労働時間(土日・祝日) / 有給休暇取得日数 / `{year}年 有給残日数`. 所定労働時間·欠勤日数는 표시하지 않음(D9·D11).

## 행 규칙
| 열 | 표시 |
|---|---|
| 日付 | `11/2(月)` 형식, 토 `primary-100`·일 및 `HOLIDAY` `danger-100` 글자(MonthCalendar 규칙 + 공휴일은 일요일과 같은 색). 요일 색은 날짜 문자열에서, 공휴일 여부는 `dayType`에서. 오늘은 `aria-current="date"` + Bold |
| 勤務パターン | 우선순위: 승인 종일휴가 → 휴가 종류명(`messages.leave.types`) > `HOLIDAY` → `祝日` > `WEEKEND` → `休日` > `通常`(D6·D5) |
| 出勤時刻 | `formatTokyoTime(clockIn)`, 없으면 빈칸 |
| 退勤時刻 | `formatClockOut(date, clockOut)`(자정 넘김은 날짜 포함). WORKING/MISSING은 상태 배지(`ATTENDANCE_STATUS_BADGE`, MISSING은 기존 `Tooltip` missingHint) |
| 休憩時間 | `formatWorkMinutes(breakTime.minutes)` + 작은 보조 라벨 `計算値`(`text-xs general-80`). `Tooltip`: 「実際の休憩記録はありません。労働基準法の最低休憩時間から計算した値です。」 |
| 実働時間 | `formatWorkMinutes(actualWorkMinutes)` |
| 備考 | `holidayName`(있으면, 예 `文化の日`) + `modifiedAt` 있으면 `管理者修正`(기존 문구). 둘 다면 `文化の日・管理者修正`처럼 한 줄 |
| 申請 | `leaves` 각각 `Badge`(종류 + 상태, 상태 variant는 `LEAVE_STATUS_BADGE`). 버튼으로 감싸 클릭 시 `LeaveDetailModal`(leaveId). 모달에서 취소 등 처리 후 `reload()` |
| 時間帯 | `WorkTimeline` |
- 데이터 없는 날도 같은 행 높이(52) 유지, 빈 칸은 빈 문자열(—를 남발하지 않음), 時間帯는 눈금선만.
- 배경 우선순위: 선택 > 퇴근 누락(`MISSING_ROW_CLASS`) > 회색(`WEEKEND`·`HOLIDAY`, APPROVED 종일휴가: `bg-general-30`, 주말과 같은 클래스) > 기본 흰색.
- 평일 공휴일에 휴가가 있으면(기존 휴가 규칙상 차감됨) 申請 배지를 그대로 표시한다 — 백엔드가 `leaves`를 넣어 주는 대로 표시하고 프론트에서 거르지 않는다. 승인 반차는 기본 배경 + 申請 배지만(D8).
- 선택: 행 클릭 또는 Enter/Space(행에 `tabIndex=0`, `aria-selected`) → `bg-primary-30` + 왼쪽 안쪽 2px `primary-100` 표시. 초기 선택은 오늘(그 달에 있을 때). 선택은 표시 전용(URL 미반영).

## 신규 시스템 컴포넌트
- `components/attendance/WorkTimeline.tsx` — 재사용 24시간 막대(요구사항 6). props `{ segments: { startMinute: number; endMinute: number; kind: 'work' | 'break' }[]; markerMinute?: number; label: string }`. 0~1440분 축, 2시간 간격 세로 눈금선(`general-40`), 막대 높이 12, 위치·폭은 `%` 계산. work `primary-100`, break `general-50`(대비 확보), 1440 초과는 잘라냄. 컨테이너 `role="img"` + `aria-label`(예 `09:00〜18:30 勤務、13:15〜14:15 休憩`). 휴가 표시용 kind는 만들지 않음.
- `components/attendance/WorkTimelineAxis.tsx`(같은 파일 export 가능) — 눈금 라벨 0,2,…,24.
- 이유: 09 §6에 시간축 차트가 없고, 요구사항이 재사용 컴포넌트를 명시함. 새 색상 추가 없음(기존 토큰만).

## 상태·데이터
- `useApiQuery<AttendanceSheet>('/attendance/monthly?month=')` + `useApiQuery<LeaveBalance>('/leaves/balance?year=')`(요약의 잔여만, 실패 시 그 항목만 `—`).
- Loading: 표 영역 `SkeletonLines`, 요약 Skeleton. Error: `SectionError`(다시 시도). 월 이동 중에는 `keepPreviousData`로 이전 표를 흐리게(`opacity-60`, `aria-busy`) — 기존 AttendanceHistoryView와 같은 방식.
- 400 VALIDATION_ERROR는 URL 해석 단계에서 이번 달로 대체하므로 정상 흐름에서 발생하지 않음.
- ISO → 축 분 변환: `lib/attendance-sheet.ts` 신규(`toTimelineSegments(day)`: 도쿄 기준 work_date 0시부터 분, break 구간을 work 사이에 끼움). 문자열·UTC 연산만(로컬 TZ 비의존, `lib/calendar.ts`와 같은 원칙).

## 반응형
- `lg` 이상 최적화. 좁은 폭에서도 카드 목록으로 바꾸지 않고 같은 표를 가로 스크롤(日付 sticky). → SCR-003 명세의 "md 미만 카드 목록" 규칙을 이 방식으로 교체(문서 갱신 대상).

## 파일
- 수정 `frontend/src/app/(app)/attendance/page.tsx`(새 View 사용)
- 신규 `frontend/src/app/(app)/attendance/AttendanceSheetView.tsx` + `.test.tsx`
- 신규 `frontend/src/app/(app)/attendance/CurrentDateTimeCard.tsx` + `.test.tsx`
- 신규 `frontend/src/app/(app)/attendance/MonthlySummarySection.tsx`
- 신규 `frontend/src/components/attendance/WorkTimeline.tsx` + `.test.tsx`
- 신규 `frontend/src/lib/attendance-sheet.ts` + `.test.ts`
- 수정 `frontend/src/lib/api/types.ts`(AttendanceSheet, SheetDay(`dayType: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'`, `holidayName: string | null`), SheetSummary)
- `frontend/package.json` 변경 없음(공휴일 라이브러리 추가 금지). 라이브러리 버전·라이선스·수록 연도 확인은 backend 담당이며, frontend는 backend.md 기록을 보고 수록 범위 밖 월에서 공휴일이 표시되지 않는 것이 정상임을 인지만 한다.
- 수정 `frontend/src/messages/ja.ts`(nav.attendance, attendance.* 새 문구 — `祝日`·`休日労働時間(土日・祝日)` 포함. 사용하지 않게 된 키는 삭제)
- 삭제(고아 정리, D12): `AttendanceHistoryView.tsx`·`.test.tsx`, `components/attendance/StatusFilterButtons.tsx`·`.test.tsx`, `lib/date-range.ts`의 `parseMyHistoryQuery`(SCR-008이 쓰는 나머지는 유지) — 삭제 전 참조 grep 확인
- e2e: `frontend/e2e/attendance-status.spec.ts`(상태 버튼 전용) 삭제 또는 출근부 검증으로 교체, `frontend/e2e/attendance.spec.ts` 83~85행(h1·WORKING 행) 새 화면에 맞게 수정. 백엔드 스크립트 `db:e2e-attendance-fixture`는 attendance-status.spec 전용 → 교체 시 재사용 가능, 삭제 시 보고만

## 문서 갱신 예정 (frontend.md에 이어서 기록)
- 04 SCR-003: 공휴일 행 규칙(회색·日付 색·勤務パターン `祝日`·備考 공휴일명), 공휴일 판정은 API 값 기준.
- 03 / 02: SCR-003만 공휴일을 휴일 취급하고 SCR-002 대시보드 캘린더·SCR-004 휴가 일수는 "공휴일=평일" 그대로라는 화면 간 차이를 명시(후속 과제).

## 재사용
- `Card`, `Badge`, `Tooltip`, `SkeletonLines`, `SectionError`, `table.ts`, `form.tsx` 버튼 클래스, `attendanceStatus.ts`, `LeaveDetailModal`/`LEAVE_STATUS_BADGE`, `lib/calendar.ts`(`shiftMonth`, `formatMonthLabel`), `lib/format.ts`, `lib/api/useApiQuery.ts`, `lib/date-range.ts` `tokyoToday`

---

# 추가 요구 1: 모바일 구버전 레이아웃

> 근거: decisions.md "추가 요구 1"(M1~M7 추천안 기준, 승인 후 확정), `docs/09_DESIGN_SYSTEM.md` §5-3(브레이크포인트·화면별 좁은 폭 배치는 화면명세에 기록), §6. 구 화면 명세는 현 docs에 없으므로 `git show main:docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md`를 참조(읽기만).
> 위 본 기능 설계 중 "반응형" 절과 "파일"의 삭제 항목은 이 절로 대체된다.

## 화면 (SCR-003 出勤簿, /attendance — ID·라우트 변경 없음)
| 폭 | 표시 | 호출 API |
|---|---|---|
| 판정 전(서버 렌더·hydration 직후) | page Suspense fallback과 같은 스피너(`role="status"` + `messages.common.loading`) | 없음 |
| md(768) 미만 | main의 `AttendanceHistoryView` 그대로(기간 `DateRangeFields`·상태 `StatusFilterButtons`·md 미만 카드 목록·`Pagination`). h1은 `messages.attendance.title` = `出勤簿`(M4) | API-ATT-004 `GET /attendance` |
| md 이상 | 현 `AttendanceSheetView`(변경 없음, 가로 스크롤 유지 M5) | API-ATT-007, API-LEAVE-006 |

- 둘 중 **하나만 마운트**한다(CSS 숨김 병행 렌더 금지, M1).
- 구 뷰 내부의 md 분기(표/카드)는 이제 항상 카드 쪽만 보이지만 main 코드 그대로 둔다(M6, 수정하지 않음).

## 신규
- `frontend/src/lib/useMediaQuery.ts` — `useMediaQuery(query: string): boolean | null`
  - `useSyncExternalStore(subscribe, () => matchMedia(query).matches, () => null)`. subscribe는 `matchMedia(query).addEventListener('change', cb)` / 해제. `null` = 서버·hydration 단계의 미판정.
  - 위치는 `lib/useSyncedState.ts`와 같은 방식(공용 훅). 09 §6 유틸 목록에 추가.
- `frontend/src/app/(app)/attendance/AttendanceView.tsx`(`'use client'`) — `const isDesktop = useMediaQuery(DESKTOP_QUERY)`; `null` → 스피너, `true` → `AttendanceSheetView`, `false` → `AttendanceHistoryView`. `DESKTOP_QUERY = '(min-width: 768px)'`(Tailwind `md`와 같은 값임을 주석으로 명시, 일본어).
- 스피너 마크업은 page fallback과 중복되므로 같은 폴더에 작은 `AttendanceLoading` 컴포넌트로 빼서 page·AttendanceView가 공용(새 시스템 컴포넌트 아님).

## 수정
- `page.tsx`: `<AttendanceSheetView />` → `<AttendanceView />`, fallback → `<AttendanceLoading />`. metadata 그대로.
- `messages/ja.ts`: 구 뷰가 쓰던 키(`attendance.empty`·`emptyFiltered`·`statusHint` 등 — main 코드가 참조하는 키를 grep으로 확정)만 다시 추가. `attendance.title`은 `出勤簿` 유지. `attendance.sheet.*` 등 현재 키는 건드리지 않는다.
- `lib/date-range.ts`: `parseMyHistoryQuery`·`MyHistoryQuery`를 main 내용 그대로 다시 추가. `lib/date-range.test.ts`도 해당 describe만 복원.

## 복원 (`git show main:<path>`, 내용 그대로)
- `src/app/(app)/attendance/AttendanceHistoryView.tsx` + `.test.tsx`
- `src/components/attendance/StatusFilterButtons.tsx` + `.test.tsx`
- `e2e/attendance-status.spec.ts`(M7: 파일 상단에 모바일 뷰포트 `test.use` 추가 — 현재 기본 1280 폭에서는 출근부가 보이므로 필수)
- 복원 후 차이: 구 테스트·e2e가 h1/메뉴 `勤怠管理`를 문자열로 기대하면 `出勤簿`로만 고친다. 그 외 기대값 변경 금지.
- `LeaveFilterButtons.tsx`의 주석(이번에 `StatusFilterButtons` 언급 제거)은 되돌리지 않는다(동작 무관).

## 백엔드(개발 스크립트만, API·DB 변경 없음)
- 복원 `backend/prisma/e2e-attendance-fixture.ts`, `backend/package.json` scripts에 `db:e2e-attendance-fixture` 재추가(main 값 그대로). 의존성 변경 없음 → lock 변경 없어야 함.
- 이번 브랜치에서 `backend/prisma/e2e-account-data.ts`(.spec)가 수정됐으므로 fixture가 import하는 export가 남아 있는지 확인. 없으면 fixture 쪽을 최소 수정하고 frontend.md에 기록.
- `e2e/attendance-status.spec.ts`가 fixture를 어떻게 호출하는지(main 기준) 그대로 둔다.

## 상태·접근성
- 전환 시 뷰가 새로 마운트되며 상태는 초기화(M3-2). URL은 바꾸지 않는다(M3).
- 스피너 단계는 매우 짧지만 `role="status"`로 읽힌다(기존 fallback과 동일).

## 문서 갱신 예정 (frontend.md에 이어서 기록)
- 04 SCR-003: 기본 정보 URL에 md 미만 Query(`startDate`·`endDate`·`status`·`page`), 관련 요구사항 FR-ATT-003 추가. 신규 절 "좁은 폭(md 미만) 표시" — main 명세의 구 화면 구성·상태 필터·카드 목록·페이지네이션·문구를 복원하고 제목만 `出勤簿`. 폭 판정 전 스피너, 한쪽만 표시, 전환 시 URL 미변환·상태 초기화. §4 마지막 줄 → "md 이상에서 폭이 부족하면 같은 표를 가로 스크롤". §6 API에 API-ATT-004(md 미만).
- 03: SCR-003 행 설명에 "md 미만은 기간별 이력 목록"·FR-ATT-003 추가, 목록 검색 버튼 문구 규칙에 SCR-003(md 미만) 언급 복원.
- 09 §6: `StatusFilterButtons` 행 복원(main 내용), 유틸에 `lib/useMediaQuery.ts` 추가.
- 08: §7 SCR-003 검증 항목에 폭별 표시·구 화면 항목 복원, e2e attendance-status(모바일) 기재.
- 10: SCR-003 항목에 "md 미만 구 화면" 반영, E2E 하네스 항목(attendance-status 결과에 따라).
- 02 FR-ATT-003: 화면 표기(SCR-003 md 미만, API-ATT-004)만 추가.
- context.md: 명령어 `db:e2e-attendance-fixture` 복원, 공용 모듈에 `useMediaQuery`·`StatusFilterButtons`·`parseMyHistoryQuery`.
