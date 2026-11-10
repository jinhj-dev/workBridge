# frontend: SCR-003 出勤簿

## 생성·수정·삭제 파일 (모두 frontend/)
- 수정 `src/app/(app)/attendance/page.tsx`, `src/lib/api/types.ts`(AttendanceSheet·SheetDay·SheetSummary 등), `src/messages/ja.ts`(nav.attendance·attendance.title=`出勤簿`, `attendance.sheet.*` 신설, `empty`·`emptyFiltered`·`statusHint` 삭제), `src/lib/date-range.ts`(+test: `parseMyHistoryQuery`·`MyHistoryQuery` 삭제)
- 신규 `AttendanceSheetView.tsx`, `CurrentDateTimeCard.tsx`, `MonthlySummarySection.tsx`(+ `.test.tsx` 2개), `components/attendance/WorkTimeline.tsx`(+test, `WorkTimelineAxis` 같은 파일), `lib/attendance-sheet.ts`(+test: `parseSheetMonth`, `formatSheetDate`, `toTimelineSegments`)
- 삭제 `AttendanceHistoryView(.test).tsx`, `components/attendance/StatusFilterButtons(.test).tsx`, `e2e/attendance-status.spec.ts`(참조 grep 확인 후)
- `e2e/attendance.spec.ts`는 변경 불필요(h1=`t.title`→出勤簿, 오늘 행에 `勤務中` 배지 1건으로 기존 검증이 그대로 성립)
- 공휴일 라이브러리 미설치(package.json 변경 없음). 공휴일은 `dayType`/`holidayName`만 사용

## 구현 화면 / 사용 시스템 컴포넌트
- SCR-003 出勤簿 (`/attendance`, `?month=YYYY-MM`). Page Header(月 이동·今月), CurrentDateTimeCard(출퇴근 버튼 없음), 月間表, 月間集計
- 사용: `Card`, `Badge`, `Tooltip`, `SkeletonLines`, `Skeleton`, `SectionError`, `table.ts`, `form.tsx`(`secondaryButtonClass`), `attendanceStatus.ts`, `LeaveDetailModal`/`LEAVE_STATUS_BADGE`, `lib/calendar.ts`, `useApiQuery`(keepPreviousData), `tokyoToday`, `formatTokyoTime`/`formatClockOut`/`formatWorkMinutes`/`formatDays`
- 토큰: 기존 색·`shadow-card`·`text-h4/h6`만 사용(hex·px 하드코딩 없음, 새 색 없음)

## 새로 만든 시스템 컴포넌트
- `components/attendance/WorkTimeline.tsx`: `WorkTimeline({segments,markerMinute?,label})`, `WorkTimelineAxis()`

## 화면 리스트/설계와 다른 점
- 선택 행 표시: 설계의 "왼쪽 안쪽 2px primary-100"은 impeccable의 측면 띠 금지(>1px)에 걸려 `bg-primary-30`만 사용
- 休憩時間 Tooltip: 행마다 두면 탭 정지점이 22개가 되어 헤더의 `休憩時間` 한 곳에만 둠(각 행에는 `計算値` 라벨)
- 勤務中/退勤漏れ 행의 時間帯: 막대 대신 출근 시각 위치에 점(marker)만 표시(설계에 명시 없던 부분)
- `Chevron` SVG는 LeaveCalendarSection과 중복(공용 추출은 범위 밖이라 보류)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: `components/attendance/WorkTimeline.tsx`(`WorkTimeline`, `WorkTimelineAxis`) 행 추가. 용도 24시간 막대(0~1440분, 2시간 눈금), props `segments{startMinute,endMinute,kind:'work'|'break'}[]`·`markerMinute?`·`label`, work `primary-100`/break `general-50`/눈금 `general-40`, 막대 높이 12, 1440 초과 절단, 접근성 `role="img"`+`aria-label`, 축 라벨 `aria-hidden`. 같은 표의 `StatusFilterButtons` 행 삭제(삭제됨), `attendanceStatus.ts` 설명의 "SCR-003" 유지. 유틸 목록에 `lib/attendance-sheet.ts`(`parseSheetMonth`, `formatSheetDate`, `toTimelineSegments`, `weekdayIndex`) 추가, `date-range.ts`의 `parseMyHistoryQuery` 언급 삭제
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md`: 구성 전면 교체(위 구성 + 행 규칙: 공휴일 행 회색·日付 빨강·勤務パターン `祝日`·備考 공휴일명, 판정은 API 값, 승인 종일휴가 회색, 반차는 배지만). 상태 필터·기간 검색·페이지네이션 삭제. "md 미만 카드 목록" → "같은 표를 가로 스크롤(日付 sticky, 時間帯 min 480)". 메뉴·제목 `出勤簿`
- `docs/03_SCREEN_LIST.md`: SCR-003 명칭·메뉴 `出勤簿`. SCR-003만 공휴일을 휴일 취급, SCR-002 캘린더·SCR-004 일수는 공휴일=평일(후속 과제)
- `.claude/work/context.md`: 삭제된 `StatusFilterButtons`·`parseMyHistoryQuery` 언급 제거, `attendance/`에 WorkTimeline·`lib/attendance-sheet.ts` 추가
- 백엔드 스크립트 `db:e2e-attendance-fixture`는 삭제한 `attendance-status.spec.ts` 전용이라 현재 미사용(삭제 여부는 backend/architect 판단)

## impeccable 점검 후 고친 점
- 측면 띠 제거(위), Tooltip 탭 정지점 축소(위), 시각 카드에서 `aria-label` 제거(날짜·시각 텍스트를 그대로 읽게), 日付 sticky 셀이 퇴근 누락 행(반투명 배경)에서 내용이 비치지 않도록 `bg-white`+그라데이션 레이어로 불투명화, 今月 버튼 disabled 스타일 명시

## 검증
- `tsc --noEmit`, `eslint src e2e`, `npm run build` 통과. vitest 29파일 423건 통과(신규: attendance-sheet 14·WorkTimeline 4·CurrentDateTimeCard 4·AttendanceSheetView 약 17)
- Playwright(e2e)는 실행하지 않음(개발 DB·백엔드 필요)
- 화면 확인: 생략 (도구 없음)

## 임시 처리 / 백엔드 요청
- 없음. 수록 범위(~2050) 밖 월은 공휴일이 표시되지 않음(정상)

## Fix 1 (review Round 1, frontend 담당)
- 수정: `AttendanceSheetView.tsx`(`min-w-[480px]`→`min-w-120`, `z-[1]`→`z-1`; `today`를 60초마다 갱신해 자정을 넘겨도 오늘 강조·今月 disabled·기본 월이 따라가게 함, unmount 시 타이머 정리), `MonthlySummarySection.tsx`(`isStale` prop 추가: 월 이동 중 `opacity-60`+`aria-busy`), `components/leave/LeaveFilterButtons.tsx`(삭제된 `StatusFilterButtons` 참조 주석 제거)
- `tr`의 `aria-selected`는 유지: 설계 지정 사항이고 기존 테스트가 이 속성을 검증함. `aria-current` 전환은 설계·테스트 갱신이 필요해 후속 과제로 남김
- 문서 갱신 예정 보완:
  - `docs/09_DESIGN_SYSTEM.md` §6 `LeaveFilterButtons` 행(211행): "`StatusFilterButtons`와 같음" 표기를 값으로 풀어 적는다. 동작은 토글 버튼 복수 선택·선택 없음=전체, 스타일은 `h-10 rounded border px-4 text-sm/5`, 선택 `border-general-100 font-bold`+체크 표시, 미선택 `border-transparent font-medium hover:border-general-50`, 선택 배경 `BADGE_VARIANT_CLASS[variantOf(v)]`, 접근성은 `labelId`로 그룹 라벨·`describedBy` 안내문·focus-visible `outline-primary-100`. 그 뒤에 `StatusFilterButtons` 행 삭제(위 기존 항목)
  - `docs/10_DEVELOPMENT_ROADMAP.md:154`(§2 #10 E2E 하네스 정비): `e2e/attendance-status.spec.ts` 6건 실패 항목 제거(spec 삭제로 해소). 183행 이력의 "attendance-status 6"은 과거 기록이라 유지. 남는 항목은 `leaves.spec.ts` 관련만
  - `.claude/work/context.md`: 명령어의 `db:e2e-attendance-fixture` 설명은 backend 쪽에서 스크립트를 삭제하면 함께 제거(남기면 "현재 미사용"으로 수정)
- 검증: `tsc --noEmit`, `eslint src` 통과. vitest `src/app/(app)/attendance`·`src/components` 12파일 140건 통과

## 추가 요구 1: 모바일 구버전 레이아웃 (M1~M7, 경계 md 768px)
- 신규(frontend/): `src/lib/useMediaQuery.ts`(`useSyncExternalStore`, 서버 스냅샷 `null`), `src/app/(app)/attendance/AttendanceView.tsx`(+`.test.tsx` 3건: md 이상/미만/change 전환), `AttendanceLoading.tsx`(page fallback과 판정 전 공용 스피너)
- 수정: `attendance/page.tsx`(`AttendanceView`·`AttendanceLoading` 사용), `messages/ja.ts`(`attendance.empty`·`emptyFiltered`·`statusHint`만 복원), `lib/date-range.ts`(+test: `MyHistoryQuery`·`parseStatuses`·`parseMyHistoryQuery`와 주석 2곳 복원, 테스트 describe 복원)
- 복원(main 그대로, 치환 없음): `AttendanceHistoryView(.test).tsx`, `components/attendance/StatusFilterButtons(.test).tsx`, `e2e/attendance-status.spec.ts`(M7: `test.use({ viewport: 390x844 })` 추가). 테스트 기대값은 모두 `messages` 참조라 `勤怠管理`→`出勤簿` 치환 불필요(주석 내 `勤怠管理` 문자열은 main 그대로)
- 백엔드: fixture 스크립트·`package.json` 스크립트는 이미 복원 상태 확인. fixture가 import하는 `assertLocalDatabaseUrl`·`seedE2eAdminAttendance`는 e2e-account-data.ts에 존재. 추가 수정 없음
- 사용 시스템 컴포넌트: 기존 뷰들의 구성 그대로(DateRangeFields, StatusFilterButtons, Pagination, Card, Badge 등), Spinner. 새 시스템 컴포넌트 없음(공용 훅 `useMediaQuery`만)
- 화면 리스트와 다른 점: 없음. `attendance.sheet.*`·`attendance.title=出勤簿` 유지
- 문서 갱신 예정: design-frontend.md "문서 갱신 예정" 목록 그대로(04 SCR-003 좁은 폭 절·Query·API-ATT-004, 03 SCR-003 행, 08 §7, 02 FR-ATT-003, context.md `useMediaQuery`·`parseMyHistoryQuery`, 09 유틸 `lib/useMediaQuery.ts`). 이전 갱신(docs-update.md)으로 **이미 docs/·context.md에 반영된 삭제분을 아래 4건으로 되돌림(재기재)**한다(담당: architect/문서 담당):
  1. 09 §6 `StatusFilterButtons` 행 복원 (`LeaveFilterButtons` 풀어쓰기는 유지 가능)
  2. context.md 명령어에 `db:e2e-attendance-fixture` 재기재 (backend.md 추가 요구 1과 중복 기재 무방)
  3. 10_DEVELOPMENT_ROADMAP.md:191의 "`StatusFilterButtons`·`AttendanceHistoryView`·`e2e/attendance-status.spec.ts`·`db:e2e-attendance-fixture` 삭제"를 "md 미만은 구 화면 유지(복원)"로 정정하고, §2 #10의 attendance-status 실패 항목("spec 삭제로 해소")을 Playwright 실행 결과에 맞게 재기재
  4. 04 SCR-003의 "상태 필터·기간 검색·페이지네이션·카드 목록 삭제" 서술을 좁은 폭(md 미만) 절로 복원 (삭제분 복원임을 명시)
- impeccable 점검: 복원 코드는 main 그대로이므로 수정 없음. 전환 시 한쪽만 마운트, 판정 전 `role="status"` 스피너로 hydration 불일치·깜빡임 방지
- 검증: `tsc --noEmit`, `eslint src e2e`, `npm run build` 통과. vitest 32파일 470건 통과
- 화면 확인: 생략 (도구 없음, 375px/1280px 브라우저 확인 불가). Playwright 미실행
- 주의: `backend/package-lock.json` 변경은 이전부터 있던 것(이번 작업과 무관)
