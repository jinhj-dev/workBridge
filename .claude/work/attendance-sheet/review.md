VERDICT: APPROVE (Round 5: 높음·중간 없음, 낮음 1)

# review: 出勤簿 (API-ATT-007, SCR-003) — Round 1

## 요약
- Backend: 계약(경로·권한·Query·응답 형식·400 VALIDATION_ERROR `field=month`)이 design-backend.md와 일치. 법정 휴게 표·중앙 배치·深夜(자정 넘김)·時間外(WEEKDAY만)·休日労働(WEEKEND+HOLIDAY)·leaves(요일 기준 토·일 제외, 평일 공휴일 포함)·paidLeaveDays(SPECIAL·OTHER 제외) 모두 D1~D17·D5 규칙대로. 공휴일 래퍼는 문자열 키 직접 조회로 TZ 비의존, rules 모듈은 Map 주입으로 라이브러리 비의존. 모든 쿼리에 userId 조건, leaves 응답은 id·leaveType·status만. 기존 핸들러·mapper·leaves·dashboard 모듈 변경 없음. 버그 없음.
- Frontend: 구성(Page Header·CurrentDateTimeCard·月間表·月間集計), 행 규칙(勤務パターン 우선순위, 日付 색, 備考 결합, 申請 배지 → LeaveDetailModal, 회색·퇴근 누락 배경 우선순위), URL `?month=`, keepPreviousData, 출퇴근 버튼 없음 모두 설계대로. 공휴일은 `dayType`/`holidayName`만 사용(프론트 판정 없음, 라이브러리 미설치). hex·rgb 하드코딩 없음, 시스템 컴포넌트(Card·Badge·Tooltip·Skeleton·SectionError·table.ts·form.tsx) 재사용, 신규 `WorkTimeline`은 `components/attendance/`에 시스템 컴포넌트로 배치.
- `docs/` 직접 수정 없음(git status 확인).
- 차단 사유: 테스트 시나리오 누락(중간 2건), 문서 갱신 예정 누락(중간 1건).

## 이슈

[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx — test-plan §3의 다음 시나리오가 없다: ① 승인 반차 행은 기본 배경(`bg-white`) + 배지 ② 퇴근 누락 행에 `MISSING_ROW_CLASS`가 붙고 배지 hover/focus 시 missingHint 툴팁 ③ 공휴일+`modifiedAt` 행의 備考 `文化の日・管理者修正` ④ 공휴일+승인 종일휴가 행의 勤務パターン = 휴가 종류명 ⑤ mock에서 11/3을 `WEEKDAY`로 주면 회색이 아님(프론트 자체 판정 없음) ⑥ 요약 라벨 `休日労働時間(土日・祝日)`·「祝日は考慮していません」 주석 없음 ⑦ 자정 넘김 퇴근의 날짜 포함 표시 ⑧ 행 수 = `days` 길이 / 각 항목을 테스트로 추가한다. 11/11 케이스는 `getAllByText(/年次休暇/)`가 배지와도 일치하므로 勤務パターン 셀을 특정해 확인한다.
[중간] [담당: tester] [분류: 테스트] backend/test/attendance-monthly.e2e-spec.ts — test-plan §2 누락: mustChangePassword 사용자 403 `PASSWORD_CHANGE_REQUIRED`, 전월 말일 23:00 출근→당월 02:00 퇴근이 전월 응답에만 포함, 월 경계 휴가(10/30~11/2)가 11월에 11/2만, CANCELLED 제외(현재 REJECTED만), 조회 전후 attendance·leaves 행(updated_at 포함) 불변, API-ATT-004 `workMinutes`(拘束) 회귀, 평일 공휴일 휴가의 API-LEAVE·API-DASH-002/003 "공휴일=평일" 회귀 / 시나리오별로 추가한다.
[중간] [담당: frontend] [분류: 문서갱신] .claude/work/attendance-sheet/frontend.md:25 — 09 §6에서 `StatusFilterButtons` 행만 지운다고 적었으나, `LeaveFilterButtons` 행(09:211)이 스타일·접근성을 "`StatusFilterButtons`와 같음"으로만 기술하고 있어 삭제 후 기준이 사라진다. 또 `docs/10_DEVELOPMENT_ROADMAP.md:154`(attendance-status 6건 실패 항목)와 context.md 명령어의 `db:e2e-attendance-fixture` 설명 갱신이 목록에 없다 / LeaveFilterButtons 행에 값을 풀어 적는 것, 로드맵 §2 #10 항목에서 attendance-status 실패 제거(spec 삭제로 해소), context.md 명령어 정리를 "문서 갱신 예정"에 추가한다.
[낮음] [담당: backend] [분류: 컨벤션] backend/package.json:28 외 — `db:e2e-attendance-fixture`는 삭제된 `attendance-status.spec.ts` 전용이라 고아가 됐다(판단은 아래). 이번 변경이 만든 고아이므로 같은 작업에서 삭제를 권장: package.json 스크립트, `prisma/e2e-attendance-fixture.ts`, `prisma/e2e-account-data.ts:193-242`(`E2E_ATTENDANCE_FIXTURE`·`E2eAttendanceFixtureRow`·`buildE2eAttendanceFixture`·`seedE2eAdminAttendance`), `prisma/e2e-account-data.spec.ts`의 해당 describe 2개. `resetE2eAdminAttendance`·`db:e2e-attendance-reset`은 `attendance.spec.ts`가 쓰므로 유지.
[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/components/leave/LeaveFilterButtons.tsx:23 — 주석이 삭제된 `StatusFilterButtons`를 참조 / 참조를 지우거나 동작 설명으로 바꾼다.
[낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/attendance/AttendanceSheetView.tsx:166,213,279,303 — `min-w-[480px]`·`z-[1]` 임의 값 / Tailwind 4 스케일 `min-w-120`·`z-1`로 바꿀 수 있다(값 동일).
[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/attendance/AttendanceSheetView.tsx:229 — `today`를 마운트 시 한 번만 계산해 화면을 연 채 자정을 넘기면 오늘 강조·[今月] disabled·월 기본값이 전날 기준으로 남는다(CurrentDateTimeCard는 갱신됨) / 실사용 영향이 작아 제안으로 남긴다.
[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/attendance/AttendanceSheetView.tsx:369 — 월 이동 중(keepPreviousData) 요약은 이전 달 값인데 흐림 처리가 없고, 연도를 넘을 때 `{year}年 有給残日数` 라벨만 새 연도가 된다 / 요약에도 `sheet.isStale` 흐림(`opacity-60`, `aria-busy`)을 적용한다.
[낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/attendance/AttendanceSheetView.tsx:159 — 일반 `<table>`의 `<tr>`에서 `aria-selected`는 ARIA상 grid/treegrid 행에서만 유효해 보조기기가 읽지 않을 수 있다(설계 지정 사항) / 후속으로 선택 표시를 `aria-current="true"` 등으로 검토.
[낮음] [담당: tester] [분류: 테스트] 단위 보강 제안 — `attendance-sheet-rules.spec.ts`에 공휴일 근무 実働 510 → overtime 0·holidayWork 510, 서비스 단의 2026-02(28)·2028-02(29) 일수 / `CurrentDateTimeCard.test.tsx`에 unmount 시 타이머 정리 / `attendance-sheet.test.ts`의 TZ 독립 확인(구현이 명시 오프셋 파싱이라 위험은 낮음).

## 설계와 다른 점 판단 (frontend.md)
1. 선택 행 왼쪽 2px 띠 제거, `bg-primary-30`만: **타당.** 선택은 표시 전용이고 `aria-selected`·포커스 outline이 있다. 다만 회색 행(`general-30`)과 색 차이만으로 구분되므로, 필요하면 1px 이하 inset ring 정도는 추가 가능(제안, 이슈 아님). 04 SCR-003 갱신 시 이 표현으로 적는다.
2. 休憩 Tooltip을 헤더 한 곳에만: **타당.** 행마다 `計算値` 라벨과 범례 `休憩(計算値)`가 있어 정보 손실이 없고, 31개 탭 정지점 증가를 막는다.
3. 勤務中/退勤漏れ 행 時間帯에 출근 위치 점(marker): **타당 — 사실상 설계 일치.** decisions.md D16이 "막대 없음(출근 마커만)"으로 이미 정하고 있다. 09 §6 WorkTimeline 설명에 `markerMinute` 표시 규칙(`primary-100` 원, 크기 12)을 적으면 된다.
- `Chevron` SVG 중복(LeaveCalendarSection과): 2곳뿐이고 공용 추출은 범위 밖 — 보류 타당.

## `db:e2e-attendance-fixture` 판단
- 현재 참조처는 package.json 스크립트와 자기 자신·`e2e-account-data.ts`(및 그 spec)뿐이며 소비자(`attendance-status.spec.ts`)는 삭제됐다. 출근부 E2E로 재사용하려면 시나리오(월 이동·자정 넘김 등)를 새로 써야 하고 이번 test-plan §4에서도 필수 아님.
- 결론: **삭제 권장**(위 낮음 이슈). 이번 작업이 만든 고아이므로 CLAUDE.md §3 기준으로 같은 작업에서 정리하는 것이 맞다. 남길 경우에는 최소한 주석(`e2e-attendance-fixture.ts:2`, `e2e-account-data.ts:194`)과 context.md 설명을 "현재 미사용"으로 고친다.

## 확인 범위
- 읽은 문서: context.md, plan·decisions·design-backend·design-frontend·test-plan, backend.md·frontend.md·test-report.md, 09 §6 관련 행
- 읽은 코드: backend `attendance-sheet-rules.ts`(+spec), `attendance-sheet.service.ts`, `japanese-holiday.ts`, `attendance-monthly-query.dto.ts`, `attendance.controller.ts`, `attendance.repository.ts`, `test/attendance-monthly.e2e-spec.ts`, `prisma/e2e-attendance-fixture.ts`, `prisma/e2e-account-data.ts` / frontend `AttendanceSheetView.tsx`(+test), `CurrentDateTimeCard.tsx`, `MonthlySummarySection.tsx`, `WorkTimeline.tsx`, `lib/attendance-sheet.ts`(+test 일부), `page.tsx`, `types.ts`·`ja.ts` 해당 부분, `e2e/attendance.spec.ts`
- Grep: 변경 tsx의 hex/rgb/임의 px, 삭제 모듈 참조 잔존, `messages.attendance` 키 사용처(삭제 후 AdminAttendanceView가 쓰는 키 유지 확인)
- 미검증: Playwright·화면 확인(test-report대로 자격 증명 없음)

---

# Round 2

## Round 1 이슈 처리 결과
| Round 1 이슈 | 결과 |
|---|---|
| [중간][tester] 프론트 시나리오 ①~⑧ 누락 | **해소.** `AttendanceSheetView.test.tsx:341~476`에 반차 흰 행+배지, 퇴근 누락 강조+hover 툴팁, `文化の日・管理者修正`, 공휴일+年休 勤務パターン, WEEKDAY 11/3 비회색, 행 수=days 길이, 자정 넘김 퇴근 날짜, 休日労働 라벨·주석 없음 추가 |
| [중간][tester] 백엔드 e2e 누락 | **해소.** `attendance-monthly.e2e-spec.ts:234~377`: 2026-02/2028-02 일수, 403 `PASSWORD_CHANGE_REQUIRED`, 10/31 23:00→11/1 02:00이 10월에만(180·휴게 0·深夜 180), 10/30~11/2 휴가 월별 분리, CANCELLED 제외, 조회 전후 attendance·leave 전체 행(`updatedAt` 포함) `toEqual` 불변, API-ATT-004 `workMinutes`=180, API-LEAVE balance·API-DASH-002 11/3 회귀. API-DASH-003 회귀는 없지만 DASH-002로 "공휴일=평일" 동작은 확인되므로 이슈로 올리지 않음 |
| [중간][frontend] 문서 갱신 예정 누락 | **해소.** frontend.md Fix 1에 09 `LeaveFilterButtons` 행 값 풀어쓰기(실제 `LeaveFilterButtons.tsx:17~21` 클래스와 일치 확인), 로드맵:154 attendance-status 항목 제거, context.md 명령어 정리 추가. backend.md에도 context.md `db:e2e-attendance-fixture` 설명 삭제 기재 |
| [낮음][backend] fixture 고아 | **해소.** `prisma/e2e-attendance-fixture.ts` 삭제, 관련 export·spec describe 제거. Grep 결과 코드 잔존 참조 없음(문서 `context.md:54`, `09:202`만 — 둘 다 갱신 예정에 포함) |
| [낮음][frontend] LeaveFilterButtons 주석 | **해소.** `LeaveFilterButtons.tsx:23` 동작 설명으로 변경 |
| [낮음][frontend] 임의 값 | **해소.** `min-w-120`, `z-1` |
| [낮음][frontend] 자정 넘김 today | **해소.** 60초 interval + cleanup(`AttendanceSheetView.tsx:230~235`), 같은 날이면 문자열 동일이라 재렌더 없음. 테스트 `shouldMoveTodayHighlightAfterMidnightWithoutReload` |
| [낮음][frontend] 월 이동 중 요약 흐림 | **해소.** `MonthlySummarySection` `isStale` → `aria-busy`+`opacity-60`, 테스트 추가 |
| [낮음][frontend] `tr` aria-selected | **유지(아래 판단)** |
| [낮음][tester] 단위 보강 | **해소.** 공휴일 근무 510, 2월 일수(e2e), 타이머 정리, TZ 독립 |

## aria-selected 유지 판단
- **수용(낮음 유지, 차단 아님).** 선택은 표시 전용(URL·동작에 영향 없음)이고, 시각적으로는 `bg-primary-30`+focus outline, 오늘은 `aria-current="date"`(`:166`)로 이미 전달된다. `role="grid"` 전환이나 `aria-current` 교체는 설계(D·SCR-003) 변경이라 이번 Fix 범위를 넘는 것이 맞다.
- 다만 근거 중 "기존 테스트가 이 속성을 검증함"은 유지 이유로 약하다(테스트는 설계를 따라 갱신하면 된다). 실제 근거는 "설계 지정 사항"이다.
- 후속 과제가 어디에도 기록되지 않았다. frontend.md "문서 갱신 예정"에 `docs/10_DEVELOPMENT_ROADMAP.md`(후속 과제) 항목으로 "SCR-003 선택 행 표현: 일반 table의 `aria-selected` → `aria-current="true"` 또는 grid 패턴 검토"를 남길 것을 제안한다(아래 낮음).

## 신규 이슈
[낮음] [담당: frontend] [분류: 문서갱신] .claude/work/attendance-sheet/frontend.md:44 — `aria-selected` 후속 과제가 기록 위치 없이 "후속 과제로 남김"으로만 적혀 있다 / "문서 갱신 예정"에 로드맵 후속 과제 항목으로 추가.
[낮음] [담당: frontend] [분류: 문서갱신] .claude/work/attendance-sheet/frontend.md:46 — 09 `LeaveFilterButtons` 풀어쓰기의 접근성 항목에 `role="group"`+`aria-labelledby`, 각 버튼 `aria-pressed`, 체크 표시 `aria-hidden`도 함께 적는다(기존 `StatusFilterButtons` 행이 담고 있던 내용).

## 확인 범위 (Round 2)
- 읽은 문서: backend.md·frontend.md "Fix 1", test-report.md "Run 2"
- 읽은 코드: `AttendanceSheetView.tsx`, `MonthlySummarySection.tsx`, `LeaveFilterButtons.tsx`(1~35), `attendance-monthly.e2e-spec.ts`(225~379), `AttendanceSheetView.test.tsx` 테스트 목록
- Grep: 삭제 fixture 심볼·`StatusFilterButtons` 잔존 참조(코드 없음)
- 미검증: `e2e-account-data.ts`·spec 본문은 Grep 결과로만 확인. Playwright·화면 확인은 Run 2에서도 미실행(자격 증명 없음)

---

# Round 3 (추가 요구 1: 모바일 구버전 레이아웃)

## 요약
- `useMediaQuery.ts`: `useSyncExternalStore` + `matchMedia` `change` 구독/해제, 서버 스냅샷 `null` — M1-A·design-frontend 그대로. 클라이언트 스냅샷은 boolean 원시값이라 매 렌더 새 값 문제 없음.
- `AttendanceView.tsx`: `(min-width: 768px)`(M2-A, 일본어 주석으로 md 명시), `null` → `AttendanceLoading`, 한쪽만 마운트(M1). URL 미변환(M3-A), 전환 시 재마운트(M3-2-A), 명칭 `出勤簿` 유지(M4-A, 구 뷰 h1이 `messages.attendance.title`). `page.tsx` metadata 불변, fallback 공용화.
- `AttendanceLoading.tsx`: 기존 fallback 마크업(`role="status"`+Spinner+sr-only `common.loading`) 그대로 추출, 페이지 폴더 내 소형 컴포넌트(설계 지정). 하드코딩 색·px 없음(토큰 `text-primary-100`, `py-10`).
- 단위 테스트: `useMediaQuery.test.ts` 5건, `AttendanceView.test.tsx` 10건이 test-plan A-1·A-2 전 항목(폭별 표시·API 경로 교차 없음·양방향 전환 시 router 미호출·전환 후 중복 호출 없음·SSR 스피너·혼합 Query)을 다룬다. 실제 뷰를 마운트하는 방식이라 의미 있는 assertion.
- 복원분: `AttendanceHistoryView.tsx`·`StatusFilterButtons`·`date-range.ts`(`ATTENDANCE_STATUSES`·`MyHistoryQuery`·`parseStatuses`·`parseMyHistoryQuery`)·`date-range.test.ts`(`parseMyHistoryQuery` describe)·`ja.ts` 키가 존재하고 서로 맞물림(tsc 통과 보고). `LeaveFilterButtons.tsx` 주석은 설계대로 되돌리지 않음.
- 백엔드: backend.md에 fixture·package.json 스크립트·`e2e-account-data.ts`(.spec) 복원과 `git diff main` 결과(package.json은 @holiday-jp 추가만, prisma 차이 없음)가 기록됨. API·DB 변경 없음.
- 차단 사유: 복원한 e2e가 새 레이아웃에서 구조적으로 통과 불가(높음), test-plan A-4 `attendance.spec.ts` 폭 전환 1건 누락(중간), 이미 반영된 docs를 되돌리는 갱신 항목이 "취소"로만 적힘(중간).

## 이슈
[높음] [담당: tester] [분류: 테스트] frontend/e2e/attendance-status.spec.ts:81,116 — 파일 상단 `test.use({ viewport: 390x844 })`를 `openAttendance`의 `page.setViewportSize({ width: 1440, height: 900 })`가 덮어써서 6건 모두 出勤簿(md 이상)가 열리고 상태 버튼 group이 없어 실패한다. 1440 줄만 지워도 `expectRows`가 `getByRole('table')`(구 뷰의 `hidden md:table`, md 미만에서 비표시라 접근성 트리에서 제외)을 찾으므로 역시 실패한다. 즉 md 이상의 구 뷰 표 분기는 이제 어느 폭에서도 보이지 않는 경로라 main 그대로의 spec은 통과할 수 없다 / `setViewportSize(1440)` 제거(또는 390으로)하고 `expectRows`·`getByRole('table').getByText(...)`를 md 미만 카드 목록(`ul` > `li`, 날짜 `span`·상태 Badge) 기준으로 바꾼다. M7·test-plan A-3의 "기대값 수정은 勤怠管理→出勤簿만" 제한을 넘는 변경이므로 이유를 test-report에 기록한다(자격 증명이 없어 미실행이었기 때문에 Run 3에서 드러나지 않음).
[중간] [담당: tester] [분류: 테스트] frontend/e2e/attendance.spec.ts — test-plan A-4의 폭 전환 1건(1440에서 月間表 → `setViewportSize(390x844)` → 기간 검색 폼 표시·月間表 없음·오늘 `勤務中`)과 360px 폭 `scrollWidth <= clientWidth` 확인이 추가되지 않았고 test-report Run 3에도 언급이 없다 / 기존 `shouldShowTodayClockInAsWorkingOnAttendancePage` 뒤(같은 오늘 기록 전제)에 1건 추가한다. 360px 확인은 같은 테스트 안에서 하거나 미실행 사유를 남긴다.
[중간] [담당: frontend] [분류: 문서갱신] .claude/work/attendance-sheet/frontend.md:58 — 이전 갱신 예정(09 §6 `StatusFilterButtons` 행 삭제, context.md `db:e2e-attendance-fixture` 삭제, 로드맵 attendance-status 실패 항목 제거)을 "취소"로 적었지만 docs-update.md대로 **이미 docs/·context.md에 반영된 상태**다(context.md:56에 fixture 명령 없음, 10_DEVELOPMENT_ROADMAP.md:191에 "`StatusFilterButtons`·`AttendanceHistoryView`·`e2e/attendance-status.spec.ts`·`db:e2e-attendance-fixture` 삭제", "§2 #10의 attendance-status 실패 항목은 spec 삭제로 해소"). "취소"로는 문서 담당이 할 일이 없다고 읽힐 수 있다 / "되돌림(재기재)" 항목으로 명시: ① 09 §6 `StatusFilterButtons` 행 복원(LeaveFilterButtons 풀어쓰기는 유지 가능) ② context.md 명령어에 `db:e2e-attendance-fixture` 재기재(backend.md 추가 요구 1에도 있음, 중복 기재는 무방) ③ 로드맵 :191의 삭제 서술을 "md 미만은 구 화면 유지(복원)"로 정정하고 §2 #10 attendance-status 항목을 Playwright 실행 결과에 맞게 재기재 ④ 04 SCR-003의 "상태 필터·기간 검색·페이지네이션·카드 목록 삭제"를 좁은 폭 절로 복원(이미 design-frontend 목록에 있음, "삭제분 복원"임을 명시).
[낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/attendance/AttendanceView.test.tsx:90,141 — 모바일 mock 응답이 `items: []`라 구 뷰의 `<table>`이 애초에 렌더되지 않으므로 `queryByRole('table')` 부재 확인은 "출근부가 없음"을 증명하지 못한다(`prevMonth` 버튼 부재 assertion이 실제 근거). 이력 1건 이상을 넣고 月間表 고유 요소(예: `s.summaryTitle` 등 출근부 전용 텍스트) 부재로 확인하면 의도가 분명해진다.

## 문서와 다른 점·갱신 예정 판단
- frontend.md "화면 리스트와 다른 점: 없음" — 타당(SCR-003 ID·라우트·명칭 불변, M4-A).
- design-frontend "문서 갱신 예정"(04·03·09·08·10·02·context.md)은 실제 코드와 일치: 04에 md 미만 Query(`startDate`·`endDate`·`status`·`page`)와 API-ATT-004, 09 유틸에 `lib/useMediaQuery.ts`. 단 08에는 위 높음 이슈 수정 후의 attendance-status(카드 목록 기준) 내용으로 적어야 한다.
- backend.md "追加要求 1" 문서 갱신 예정(context.md 명령어 복원)은 내용상 정확하나, 이 작업 폴더 문서는 한국어 규칙(문서 한국어)과 달리 일본어로 적혀 있다(차단 아님).
- `docs/` 직접 수정: git status의 docs 변경은 docs-update.md(Round 2 이후 문서 담당 반영분)로 설명되며, 이번 Round 3 구현 에이전트가 docs를 수정한 흔적은 보고서·Grep상 없다(`useMediaQuery`가 docs에 아직 없음).

## 확인 범위 (Round 3)
- 읽은 문서: decisions.md M1~M7, design-frontend.md "추가 요구 1", test-plan.md "추가 요구 1", frontend.md·backend.md "추가 요구 1", test-report.md Run 3, docs-update.md, context.md:50~59, 10_DEVELOPMENT_ROADMAP.md:182~191
- 읽은 코드: `useMediaQuery.ts`(+test), `AttendanceView.tsx`(+test), `AttendanceLoading.tsx`, `page.tsx`, `AttendanceHistoryView.tsx`, `e2e/attendance-status.spec.ts`, `e2e/attendance.spec.ts`(60~158)
- Grep: `MyHistoryQuery`·`parseStatuses`·`ATTENDANCE_STATUSES` 정의/참조, e2e의 `setViewportSize`, docs·context.md의 `StatusFilterButtons`·`useMediaQuery`·`e2e-attendance-fixture`·`attendance-status`
- **미검증: `git diff main -- <path>`에 의한 main 동일성.** 이 리뷰 세션에는 셸 도구가 없어 git 명령을 실행하지 못했다. 복원 파일(`AttendanceHistoryView(.test).tsx`, `StatusFilterButtons(.test).tsx`, `e2e/attendance-status.spec.ts`의 `test.use` 외 부분, `ja.ts`·`date-range(.test).ts` 복원분, `backend/prisma/*`, `backend/package.json`)의 main 동일성은 frontend.md·backend.md 보고에 의존한다. 오케스트레이터가 `git diff main -- frontend/src/app/(app)/attendance/AttendanceHistoryView.tsx frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx frontend/src/components/attendance/StatusFilterButtons.tsx frontend/src/components/attendance/StatusFilterButtons.test.tsx frontend/e2e/attendance-status.spec.ts backend/prisma` 결과(빈 출력, spec은 `test.use` 3줄만)를 확인할 것을 권한다.
- 미검증: Playwright·화면 확인(자격 증명 없음, Run 3 동일).

---

# Round 4 (review Round 3 tester 3건·frontend 1건 수정 확인)

## Round 3 이슈 처리 결과
| Round 3 이슈 | 결과 |
|---|---|
| [높음][tester] attendance-status.spec 구조적 실패 | **대부분 해소, 잔여 1건(아래 중간).** `openAttendance`의 1440 override 제거(`test.use` 390x844 적용), `expectRows`가 `ul.md:hidden > li` 개수 + 각 li의 날짜(`YYYY/MM/DD`, `formatWorkDate`와 형식 일치)·상태 Badge(`exact`)로 바뀌었다. 그러나 제외 검증 7곳은 여전히 `getByRole('table')`라 무의미한 단언으로 남았다 |
| [중간][tester] attendance.spec 폭 전환 1건 | **해소.** `shouldSwitchFromSheetToHistoryLayoutWhenWidthBecomesMobile`(`:89~110`): 1440 月間表(`columnheader` 勤務パターン) → 390 `検索条件` 표시·月間表 없음·카드 `勤務中` 1건 → 360 `scrollWidth > clientWidth` 아님. 출근 테스트 바로 뒤, 퇴근 수정 테스트 앞 배치로 오늘 기록 전제가 맞고 퇴근 수정 테스트의 상태 복원(finally)에 영향 없음 |
| [중간][frontend] 되돌림 항목 | **해소.** frontend.md:58~62에 "이미 반영된 삭제분을 되돌림(재기재)"과 4건(09 §6 행 복원, context.md fixture 재기재, 로드맵 :191 정정·§2 #10 재기재, 04 SCR-003 좁은 폭 절 복원)이 담당(architect/문서 담당)과 함께 명시됨 |
| [낮음][tester] AttendanceView.test 무의미 table 부재 | **해소.** 모바일 mock에 `HISTORY_ITEM` 1건, `listitem` 표시 확인 후 `columnheader` 勤務パターン·`summaryTitle`·`prevMonth` 부재로 출근부 부재를 단언(`:158~164`). 축소 전환 테스트(`:223`)도 같은 근거로 교체. jsdom이 `hidden md:table`을 적용하지 않는다는 교체 사유도 맞다 |

## M7 제한을 넘은 e2e 수정 판단
- **단언 의미 불변, 수용(사용자 추가 승인 불필요).** M7의 취지는 "구 화면 테스트의 기대 내용은 그대로 두고 명칭 차이만 허용"이다. 이번 변경은 ① 뷰포트를 spec 상단 `test.use`(M7이 이미 허용한 390x844)에 맞춘 것, ② 같은 이력 데이터를 md 이상 표 대신 md 미만 카드로 읽는 셀렉터 교체로, 검증 대상(상태별 필터 결과의 건수·순서·날짜·상태, 40일 전 기간 외 제외, `aria-pressed`, API Query `status`·기간, 새로고침 후 유지)은 6건 모두 그대로다. 같은 컴포넌트가 같은 `items`로 표와 카드를 함께 렌더하므로(`AttendanceHistoryView.tsx:145,192`) 데이터 근거도 동일하다.
- 오히려 `expectRows`는 `toHaveCount`로 정확한 건수를 보므로 main의 행 확인보다 약해지지 않았다. test-report Run 4에 이유가 기록돼 있어 M7 이탈의 추적성도 충분하다.
- 메인이 확인한 `git diff main` 결과(복원 파일 main 동일, 차이는 spec `test.use`와 package.json 의존성뿐)로 Round 3의 미검증 항목은 해소. 단, 그 확인 이후 Run 4에서 spec이 다시 수정됐으므로 현재 spec의 main 대비 차이는 `test.use`·`cardList`·`expectRows`·1440 제거·(아래 이슈 수정분)이 된다.

## 이슈
[중간] [담당: tester] [분류: 테스트] frontend/e2e/attendance-status.spec.ts:135,136,147,148,158,159,171 — 제외 검증이 여전히 `page.getByRole('table').getByText(...)`다. 390px에서는 표가 `hidden`이라 `getByRole('table')`이 아무것도 가리키지 않아 `toHaveCount(0)`이 항상 통과하는 무의미한 단언이 됐다. test-report Run 4(:116)는 "제외 검증은 `cardList(page).getByText(...)`로 바꿨다"고 적었지만 실제 코드와 다르다 / 7곳을 `cardList(page).getByText(t.statuses.X, { exact: true })`로 바꾸고(li 안 퇴근 누락 안내문과의 부분 일치를 피하려면 `exact`), test-report 기재를 실제와 맞춘다. `expectRows`의 정확한 건수 확인이 있어 실질 검증 공백은 작지만, 보고와 코드가 어긋나고 단언이 공허하므로 중간.
[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance-status.spec.ts:116 — 주석 "一覧(表)の行"이 카드 목록 기준으로 바뀐 구현과 맞지 않는다 / "一覧(カード)の項目" 등으로 고친다.

## 확인 범위 (Round 4)
- 읽은 문서: test-report.md Run 4, frontend.md:40~67, 이전 review.md
- 읽은 코드: `e2e/attendance-status.spec.ts` 전체, `e2e/attendance.spec.ts`(49~134), `AttendanceView.test.tsx`(Grep: 91~249 해당 단언), `AttendanceHistoryView.tsx`(145, 190~214, 278~280), `ja.ts`(`searchTitle`·`workPattern`)
- 미검증: Playwright 실행(자격 증명 없음, `--list`만 수행됨). 실제 DOM에서 `ul.md\:hidden` 셀렉터·360px 가로 스크롤 결과는 실행으로 확인되지 않았다.

---

# Round 5 (review Round 4 tester 2건 수정 확인)

## Round 4 이슈 처리 결과
| Round 4 이슈 | 결과 |
|---|---|
| [중간][tester] 제외 검증 7곳 `getByRole('table')` | **해소.** `attendance-status.spec.ts:135,136,149,150,162,163,175`(prettier 래핑으로 줄 번호 이동) 7곳 모두 `cardList(page).getByText(t.statuses.X, { exact: true })`로 바뀌었다. 파일 안 `getByRole('table')` 잔존 0건. 각 테스트에서 제외 검증 직전에 `expectRows`가 같은 `cardList`의 li 개수(1 이상)와 각 li의 상태를 확인하므로, `cardList`가 DOM에서 매칭되지 않으면 `expectRows`가 먼저 실패한다 — 따라서 `toHaveCount(0)`은 이제 공허한 단언이 아니다. `exact`로 퇴근 누락 안내문과의 부분 일치도 피했다. 기대 행 목록·순서·API Query 대기 조건은 변경 없음 |
| [낮음][tester] 주석 `:116` | **해소.** `一覧(カード)の行`. 「行」 표현이 남았지만 의미는 통하므로 이슈 아님 |
| test-report 기재 불일치 | **해소.** Run 4 :117에 "정정(Run 5에서 확인)" 항목으로 Run 4 시점 실제 상태(7곳 미변경·빈 단언, 주석 `一覧(表)`)가 명시되어 보고와 코드의 어긋남이 추적 가능해졌다. Run 5는 수정 내용·확인 명령(tsc·eslint·prettier·`--list`·vitest 482)·미실행 사유를 기록 |

## 이슈
[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance-status.spec.ts 전체 — Playwright 실제 실행이 Run 1~5 내내 미실행이다(자격 증명 미설정, Run 5는 확인 명령 권한 거부). `ul.md\:hidden` 셀렉터와 `attendance.spec.ts` 360px 가로 스크롤 확인은 실행으로만 검증된다 / 머지 전 또는 로드맵 §2 #10 갱신 시 `npx playwright test e2e/attendance-status.spec.ts e2e/attendance.spec.ts` 실행 결과로 확정한다(코드 결함이 아니라 환경 사유라 차단하지 않음).

## 확인 범위 (Round 5)
- 읽은 문서: test-report.md Run 4 정정·Run 5, 이전 review.md
- 읽은 코드: `frontend/e2e/attendance-status.spec.ts` 전체
- 미검증: Playwright 실행(위 낮음 이슈)
