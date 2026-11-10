# test-plan — 出勤簿 UI/UX 수정 (attendance-sheet-ui)

근거: `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md` §4, `docs/08_TEST_PLAN.md` SCR-003 행, `decisions.md` U1~U11(승인 완료, U10 = B `1日（日）`). 백엔드 테스트 변경 없음.

## 0. U10 형식 변경으로 갱신할 기존 테스트 기대값 (기대값만 바꾸고 검증 의도는 유지)
- `frontend/src/lib/attendance-sheet.test.ts`
  - 54행 `'11/2(月)'` → `'2日（月）'`, 55행 `'11/14(土)'` → `'14日（土）'`(테스트명 `shouldFormatMonthDayWithWeekday` → `shouldFormatDayWithFullWidthWeekday`)
  - 125행(TZ 비의존 테스트) `'11/2(月)'` → `'2日（月）'`
- `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx`: 날짜 문자열 `11/N(曜)` 전부(150~510행, `findByText`·`rowOf`·`cellsOf`·`getByRole('cell', { name })`)를 `N日（曜）`로. 대상 날짜: `11/1(日)`·`11/2(月)`·`11/3(火)`·`11/4(水)`·`11/5(木)`·`11/7(土)`·`11/10(火)`·`11/11(水)` → `1日（日）`·`2日（月）`·`3日（火）`·`4日（水）`·`5日（木）`·`7日（土）`·`10日（火）`·`11日（水）`. `rowOf` 등 헬퍼가 날짜 문자열을 조합한다면 그 헬퍼만 고친다.
- 영향 없음(변경 금지): `lib/format.test.ts`(`formatWorkDate` `2026/11/07(土)`), `AdminAttendanceView.test.tsx`·`AttendanceEditModal.test.tsx`(`2026/11/08(日)`), `AttendanceHistoryView.test.tsx`·`AttendanceView.test.tsx`, 기존 E2E `attendance.spec.ts`·`attendance-status.spec.ts`(sheet 날짜 문자열 미사용 — grep 확인)

## 1. 단위 — `frontend/src/lib/attendance-sheet.test.ts` (추가)
| ID | 시나리오 | 기대 |
|---|---|---|
| L0 | `formatSheetDate` 새 형식 | `2026-11-01` → `1日（日）`, `2026-11-30` → `30日（月）`, `2026-02-28` → `28日（土）`. 결과에 `/`·반각 `(`·`)` 없음, 전각 `（`(U+FF08)·`）`(U+FF09) 포함. TZ(UTC·Asia/Tokyo·America/Los_Angeles) 무관 동일 |
| L1 | `workPatternOf` 우선순위 | 승인 종일휴가(ANNUAL/SPECIAL/OTHER) → `LEAVE`+leaveType / HOLIDAY → `HOLIDAY` / WEEKEND → `DAY_OFF` / WEEKDAY → `NORMAL` |
| L2 | 승인 반차·PENDING 휴가만 있는 평일 | `NORMAL`(LEAVE 아님) |
| L3 | 공휴일 + 승인 종일휴가 | `LEAVE` |

## 2. 컴포넌트 — `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx` (수정·추가, jsdom: 레이아웃 수치는 검증 불가 → 구조·클래스로 확인)
| ID | 시나리오 | 기대 |
|---|---|---|
| C1 | 申請 배지 문구 | ANNUAL·HALF_AM·HALF_PM·SPECIAL·OTHER 모두 `休暇 {상태}`(예 `休暇 承認済み`, `休暇 申請中`). `有給休暇 承認済み` 등 종류명 배지 없음 |
| C2 | 申請 배지 aria-label·클릭 | `休暇 承認済み の詳細を開く` 버튼 클릭 → 해당 leaveId로 LeaveDetailModal 열림, 행 선택 불변(기존 시나리오 갱신) |
| C3 | 勤務パターン 휴가 종류명 유지 | 승인 종일휴가 행의 勤務パターン은 `有給休暇`(변경 없음) |
| C4 | `休日` Pill | 토·일 행 勤務パターン이 `休日`, 요소에 `rounded-full`·`bg-danger-30` |
| C5 | `通常` Pill | 평일 `通常`, `rounded-full`·`bg-general-40`·`text-general-80`, 높이 클래스(`h-6`)·padding(`px-3`)이 `休日`과 동일 |
| C6 | `祝日`·휴가 Pill | `祝日` → `bg-danger-30` pill / 승인 종일휴가 → `bg-success-40` pill |
| C7 | 날짜 형식·일요일 색 | 日付 셀 텍스트가 `1日（日）` 형식(`11/1(日)` 없음). 일요일 셀 `text-danger-100`(`1日（日）`), 공휴일 `text-danger-100`(`3日（火）`), 토요일 `text-primary-100`(`7日（土）`), 평일 `text-general-100`. 일요일 행의 다른 셀(勤務パターン 이외 일반 셀)에 `text-danger-100` 없음 |
| C7b | 다른 날짜 표기 불변 | 자정 넘김 퇴근 행의 退勤時刻이 기존 `formatClockOut` 표기(`2026/11/05 02:00` 형식) 그대로, 월 라벨 `2026年11月` 그대로 |
| C8 | 좌우 분리 구조 | 표 2개(`出勤簿`·時間帯 영역). `region` `時間帯`에 `overflow-x-auto`·`tabIndex=0`. 왼쪽 영역 래퍼에 `border-r-2`·`border-general-60`, 왼쪽 표 자체는 `overflow-x-auto` 래퍼 안의 스크롤 영역이 아님 |
| C9 | 행 수 일치(28/29/30/31) | `days` 길이 28·29·30·31 fixture 각각 왼쪽 tbody 행 수 = 오른쪽 tbody 행 수 = 일수 |
| C10 | 행 높이 클래스 | 양쪽 본문 셀이 `h-9`(compactTdClass), 헤더 `h-11` |
| C11 | 오른쪽 행 클릭 선택 | 오른쪽 그래프 행 클릭 → 같은 날짜 왼쪽 행 `aria-selected=true`, 양쪽 배경 `bg-primary-30` |
| C12 | 그래프 이름 | 퇴근 완료 행 `role=img` 이름이 날짜로 시작(`2日（月） 09:00〜18:00 勤務…`) |
| C13 | 회귀 | 기존 27개 시나리오(행 값·회색 행·퇴근 누락 강조·툴팁·備考·월 이동·오늘 강조·집계) 모두 통과. 기대값은 C1 문구와 §0 날짜 형식만 갱신 |

Badge 기본(shape 미지정)이 기존 `rounded px-2` 그대로인지: 다른 화면 테스트 회귀(전체 `npm test`)로 확인.

## 3. E2E — `frontend/e2e/attendance-sheet-layout.spec.ts` (신규, Playwright)
**전제(실행 가능)**: 개발 DB·백엔드(현재 6000에서 기동, 프론트 `BACKEND_URL`이 이를 가리킴)·프론트(3000, `reuseExistingServer`로 재사용) 기동 중. 셸에 `E2E_ADMIN_PASSWORD=test0000`·`E2E_INITIAL_PASSWORD=test0000`(backend/.env에도 설정) → globalSetup이 E2E 계정을 초기화하고 로그인 테스트가 실행된다. `PLAYWRIGHT_BASE_URL`은 지정하지 않는다(지정 시 초기화 안 함). **E1~E12는 반드시 실행하고 결과(통과 수·스크린샷 경로)를 보고한다.** 그래도 skip되면 원인(환경변수 미전달 등)을 밝혀 "미검증"으로 보고하고 통과로 보고하지 않는다. E2E 관리자 900001로 로그인(기존 `attendance.spec.ts` 패턴). 읽기 전용(데이터 생성·삭제 없음) — 근태 데이터가 없는 달도 행·Pill·일요일·정렬 검증은 가능.

실행 명령(frontend/, 대상 파일만 지정): `npx playwright test e2e/attendance-sheet-layout.spec.ts e2e/attendance.spec.ts e2e/attendance-status.spec.ts`. **`npm run test:e2e`(전체)는 쓰지 않는다** — `e2e/leaves.spec.ts`가 main에 이미 없는 `db:e2e-leaves-reset` 스크립트를 호출해 실패하는 기존 문제가 있어 이번 범위 밖이다(수정하지 않고, 실패해도 이번 기능의 실패로 보지 않음. 보고에 "범위 밖 기존 결함"으로 한 줄 기재).

뷰포트 1920×1080, 1440×900, 1366×768 각각:
| ID | 시나리오 | 기대 |
|---|---|---|
| E1 | 페이지 가로 스크롤 없음 | `document.documentElement.scrollWidth <= clientWidth` |
| E2 | 그래프 영역만 스크롤 | 1920: region `時間帯`의 `scrollWidth <= clientWidth`(스크롤 없음, 그래프 폭 ≥ 480). 1366·1440: 넘치면 region만 `scrollWidth > clientWidth`, 바깥 안전망 래퍼는 `scrollWidth <= clientWidth` |
| E3 | 왼쪽 고정 | region `scrollLeft`를 끝까지 이동 후 왼쪽 표의 boundingBox x·폭 불변, 날짜 셀 화면 안에 보임, 구분선 x 불변 |
| E4 | 행 정렬 | 모든 i에 대해 왼쪽 tbody tr[i]와 오른쪽 tr[i]의 `top`·`height` 차 ≤ 1px(스크롤 전후, 페이지 세로 스크롤 후에도) |
| E5 | 행 높이 | 본문 행 높이 36±1px |
| E6 | 구분선 | 왼쪽 영역 `border-right-width` 2px, 색 `rgb(161, 167, 196)`, 영역 높이 = 왼쪽 표 높이(헤더~마지막 행) |
| E7 | 날짜 형식·일요일 색 | `?month=2026-11`: 日付 셀 `1日（日）`·`8日（日）`(exact) 존재, color `rgb(240, 20, 47)`. `7日（土）` color는 primary-100. `11/1(日)` 형식 텍스트 없음 |
| E8 | Pill | `休日` 배경 `rgb(253, 231, 234)`, `通常` 배경 `rgb(230, 233, 244)`, 둘 다 border-radius ≥ 높이/2, 높이 동일 |
| E9 | 월 일수 | `?month=2026-02`(28)·`2028-02`(29)·`2026-11`(30)·`2026-10`(31): 양쪽 행 수 = 일수, E1·E4 성립 |
| E10 | 창 크기 변경 | 1920 → 1366 → 1920 리사이즈 후 E1·E4 성립 |
| E11 | 태블릿 깨짐 방지 | 1024×768, 768×1024: 페이지 가로 스크롤 없음(E1), 행 정렬(E4). 바깥 안전망 스크롤은 허용 |
| E12 | 스크린샷 | 3개 해상도 + 태블릿 전체 화면 캡처를 `testInfo.outputPath`로 저장(`e2e/dashboard-leave-calendar.spec.ts` 패턴) |

확대·축소: 브라우저 줌은 Playwright로 직접 재현하기 어려우므로 E10(폭 변경)으로 대체하고, 필요 시 `deviceScaleFactor` 변경 컨텍스트로 E4만 추가 확인. 수행 못 하면 미검증으로 보고.

`休暇` 표시(E2E): 900001에 휴가 데이터가 없을 수 있으므로 C1~C2(컴포넌트)로 대체. E2E에서 데이터를 만들지 않는다.

## 4. 회귀·정적 검증 (frontend/)
- `npx tsc --noEmit`, `npm run lint`, `npm test`(전체), `npm run build`
- 기존 E2E `e2e/attendance.spec.ts`(1440 출근부 → 390 이력 전환)·`e2e/attendance-status.spec.ts`(390) 통과 — §3 명령으로 함께 실행(자격 증명 사용 가능). `e2e/leaves.spec.ts`는 범위 밖(§3)
- md 미만 `AttendanceHistoryView`·`AttendanceView.test.tsx` 변경 없음 확인
