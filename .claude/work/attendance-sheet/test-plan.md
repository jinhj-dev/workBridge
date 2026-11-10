# test-plan: 出勤簿

근거: `design-backend.md`(API-ATT-007 계약·계산 규칙), `design-frontend.md`(SCR-003 구성), `decisions.md`(★안), `docs/03_SCREEN_LIST.md` Common UI Rules, `docs/08_TEST_PLAN.md`(기존 TC 형식·권한 매트릭스).

## 1. 단위 — `backend/src/modules/attendance/attendance-sheet-rules.spec.ts`
| 시나리오 | 기대 |
|---|---|
| legalBreakMinutes 경계: 拘束 0, 360, 361, 380, 405, 406, 480, 525, 526, 535, 540, 541, 1440 | 0, 0, 1, 20, 45, 45, 45, 45, 46, 55, 60, 60, 60 |
| 実働 = 拘束 − 휴게: 9:00~18:00(540) | 휴게 60(D−480), 実働 480 |
| 9:00~15:00(360) | 휴게 0, 実働 360 |
| 9:00~16:00(420) | 휴게 45, 実働 375 |
| 휴게 위치: 9:00~18:00 | 13:00~14:00(start = 9:00 + floor((540−60)/2)) |
| 深夜: 18:00~翌02:00(480분, 휴게 45 → 21:37~22:22) | 22:00~02:00 240분 − 휴게 겹침 22분 = 218 |
| 深夜: 04:00~13:00 | 04:00~05:00 60분(휴게 겹침 없음) |
| 時間外: 평일 実働 510 | 30 / 토·일 実働 510 → 0, holidayWork에 510 |
| WORKING·MISSING_CLOCK_OUT | breakTime null, 実働 null, 합계 제외 |
| paidLeaveDays: ANNUAL 2일(평일)+HALF_AM 1건, 같은 날 AM+PM, SPECIAL | 2.5 / AM+PM 1 / SPECIAL 0 |
| 주말을 포함한 ANNUAL(금~월) | 토·일 행 leaves 비어 있음, 일수 2 |
| scheduledWorkDays: 입사일이 월 중간 | 입사일 이후 평일만 |
| 월 일수: 2026-02(28), 2028-02(29), 12월 | days 길이 일치 |
| 공휴일 Map 주입: 2026-11-03(火) 공휴일 | dayType `HOLIDAY`, holidayName 그대로 |
| 토요일 공휴일(가짜 Map) | dayType `HOLIDAY`(WEEKEND보다 우선), leaves 비어 있음(요일 기준 제외) |
| 공휴일 근무 実働 510 | overtime 0, holidayWork에 510 |
| scheduledWorkDays: 평일 공휴일 2일 있는 달 | 평일 수 − 2(입사일 이후만) |
| 평일 공휴일을 포함한 APPROVED ANNUAL(월~수, 화=공휴일) | 화요일 행에도 leaves 포함, paidLeaveDays 3(FR-LEAVE-001 차감과 일치) |

## 1-2. 단위 — `backend/src/common/time/japanese-holiday.spec.ts`
| 시나리오 | 기대 |
|---|---|
| 2026-11 범위 | `2026-11-03 → 文化の日`, `2026-11-23 → 勤労感謝の日` |
| 振替休日 포함 월(구현자가 라이브러리 데이터에서 실제 사례 선택) | 振替休日 포함 |
| 공휴일 없는 달(2026-06) | 빈 Map |
| 수록 범위 밖 연도(구현자가 확인한 최대 연도 + 1) | 빈 Map, 예외 없음 |
| `TZ=UTC`와 `TZ=Asia/Tokyo` | 같은 키(날짜 밀림 없음) |

## 2. API 통합 — `backend/test/attendance-monthly.e2e-spec.ts` (FixedClock, 실제 테스트 DB)
| 시나리오 | 기대 |
|---|---|
| month 생략 | 200, 도쿄 이번 달 |
| month=2026-11, 본인 근태 3건·휴가(PENDING·APPROVED·REJECTED·CANCELLED) | 200, days 30개, leaves에 PENDING·APPROVED만, 값이 단위 규칙과 일치 |
| 다른 사용자의 근태·휴가가 같은 달에 있음 | 응답에 포함되지 않음 |
| 전월 말일 23:00 출근 → 이번 달 02:00 퇴근 | 전월 응답에만 포함 |
| 월 경계를 걸친 휴가(10/30~11/2) | 11월 응답에 11/2만 |
| month=2026-11(실제 라이브러리) | 11/3·11/23 `HOLIDAY` + 일본어 이름, scheduledWorkDays = 평일 21 − 2 = 19(입사일이 그 전일 때) |
| month=2026-13, 2026-1, 1999-12, abc | 400 VALIDATION_ERROR, `details[].field=month` |
| 미인증 | 401 / mustChangePassword | 403 PASSWORD_CHANGE_REQUIRED |
| 조회 전후 attendance·leaves 행 비교 | 변경 없음(updated_at 포함) |
| 기존 API-ATT-004/005의 workMinutes | 拘束 값 그대로(회귀) |
| 공휴일을 포함한 휴가 신청·잔여(API-LEAVE-*)와 대시보드 API-DASH-002/003 | 기존대로 공휴일을 평일로 계산(회귀, 변경 없음 확인) |

## 3. 컴포넌트 — Vitest + Testing Library
- `WorkTimeline.test.tsx`: 9:00~18:00 + 휴게 13:00~14:00 → work 2개·break 1개 세그먼트의 left/width %(37.5%, 등), 1440 초과 잘림, `aria-label` 문구, segments 없음이면 눈금만.
- `lib/attendance-sheet.test.ts`: ISO(+09:00) → 분 변환, 자정 넘김 클리핑, 로컬 TZ와 무관(TZ 환경 바꿔 확인).
- `CurrentDateTimeCard.test.tsx`(fake timers): 초기 표시(연·월日·요일·HH:mm, 도쿄 기준), 분 경계 통과 후 갱신, unmount 시 타이머 정리.
- `AttendanceSheetView.test.tsx`(apiFetch mock):
  - h1 `出勤簿`, 월 라벨, [前月]/[翌月]/[今月] → URL `?month=` 변경과 해당 월 API 호출, 이번 달이면 [今月] disabled, 잘못된 `?month=`는 이번 달
  - 행 수 = 그 달 일수, 데이터 없는 날도 행 존재
  - 토·일 행·APPROVED 종일휴가 행 회색 클래스, 반차는 기본 배경 + 배지, 퇴근 누락 행 강조 + 툴팁
  - `dayType: HOLIDAY` 행: 회색 클래스(주말과 동일), 日付 `danger-100`, 勤務パターン `祝日`, 備考에 holidayName(+`管理者修正` 동시 표시), 공휴일+승인 종일휴가는 휴가 종류명
  - 요약 所定労働日数에 "祝日は考慮していません" 주석이 없음, 라벨 `休日労働時間(土日・祝日)`
  - 프론트가 공휴일을 자체 판정하지 않음: mock 응답에서 11/3을 `WEEKDAY`로 주면 회색이 아님
  - 휴게 열 `計算値` 표시, 実働·退勤(자정 넘김 날짜) 표시
  - 申請 배지 클릭 → LeaveDetailModal 열림
  - 행 클릭/Enter → 선택 상태(`aria-selected`), 초기 선택 = 오늘
  - 요약 값 표시, 所定労働時間·欠勤日数 미표시, 잔여 연차 API 실패 시 그 항목만 `—`
  - Loading 스켈레톤, Error → [再試行]
  - **出勤·退勤 버튼이 없음**(`getByRole('button', {name: '出勤'})` 없음)
- Sidebar 테스트: 메뉴 `出勤簿` 표시, `/attendance` 링크.

## 4. E2E — Playwright
- `frontend/e2e/attendance.spec.ts` 수정: 대시보드에서 출근 후 `/attendance` → h1 `出勤簿`, 오늘 행에 `勤務中` 배지.
- `attendance-status.spec.ts`: 상태 필터 삭제에 따라 제거 또는 출근부 시나리오(월 이동·오늘 행·자정 넘김 표시)로 교체.

## 5. 회귀
- backend 전체 unit·e2e, frontend 전체 unit 통과.
- SCR-002 대시보드 출퇴근·휴가 캘린더, SCR-004 휴가 관리, SCR-005 승인, SCR-008 전체 근태(명칭 `全体勤怠管理` 유지, 勤務時間 값 불변) 기존 테스트 통과.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`(backend·frontend).

---

## 추가 요구 1: 모바일 구버전 레이아웃

근거: decisions.md M1~M7, design-frontend.md "추가 요구 1". jsdom에는 `matchMedia`가 없으므로 테스트에서 `window.matchMedia`를 mock(matches 값과 `change` 리스너 발화 제어)한다. 기존 `AttendanceSheetView.test.tsx`는 뷰를 직접 렌더하므로 영향 없음.

### A-1. 단위 — `frontend/src/lib/useMediaQuery.test.ts`
| 시나리오 | 기대 |
|---|---|
| matches=true / false로 마운트 | true / false 반환 |
| `change` 이벤트로 matches 변경 | 새 값으로 재렌더 |
| unmount | `removeEventListener` 호출(리스너 정리) |
| 서버 렌더(`renderToString`) | `null`(미판정) |

### A-2. 컴포넌트 — `frontend/src/app/(app)/attendance/AttendanceView.test.tsx`(apiFetch mock)
| 시나리오 | 기대 |
|---|---|
| `(min-width: 768px)` matches=true | 出勤簿 표(月間表) 표시, apiFetch 호출 경로가 `/attendance/monthly`·`/leaves/balance`뿐(`/attendance?` 호출 없음) |
| matches=false | 기간 검색·상태 필터 표시, 호출이 `/attendance?…`(API-ATT-004)뿐(`/attendance/monthly` 호출 없음) |
| 두 경우 모두 | h1 `出勤簿` |
| matches=false → `change`로 true | 구 화면이 사라지고 출근부 표시, URL(router) 변경 호출 없음 |
| 판정 전(서버 렌더) | 스피너(`role="status"`)만, apiFetch 호출 없음 |
| `?month=2026-10&status=DONE` 같은 혼합 Query | 데스크톱은 2026-10 출근부, 모바일은 상태 DONE 필터(각자 자기 키만 해석) |

### A-3. 복원 테스트 (main 그대로, 통과해야 함)
- `AttendanceHistoryView.test.tsx`, `StatusFilterButtons.test.tsx`, `lib/date-range.test.ts`의 `parseMyHistoryQuery` describe.
- 기대값 수정은 h1/메뉴 문자열 `勤怠管理` → `出勤簿`만 허용(그 외 변경 시 tester가 이유를 test-report에 기록).

### A-4. E2E — Playwright
- `e2e/attendance-status.spec.ts`(main 복원 + `test.use({ viewport: { width: 390, height: 844 } })`): main의 상태 필터·URL 유지 시나리오 그대로. 사전 조건 `npm run db:e2e-attendance-fixture`(복원 스크립트). 하네스 원인으로 실패하면 원인 분리해 보고(로드맵 §2 #10 기존 실패 이력).
- `e2e/attendance.spec.ts` 1건 추가: 데스크톱 폭에서 `/attendance` → 月間表 표시 → `page.setViewportSize({ width: 390, height: 844 })` → 기간 검색 폼 표시·月間表 없음, 오늘 기록 카드에 `勤務中`.
- 360px 폭에서 구 화면 가로 스크롤 없음(09 §5-3 최소 360px) — 수동 또는 위 e2e에서 `scrollWidth <= clientWidth` 확인.

### A-5. 회귀
- frontend 전체 unit(기존 出勤簿·WorkTimeline·CurrentDateTimeCard 포함), lint, tsc, build. backend는 fixture 스크립트 복원뿐이므로 `npx tsc --noEmit`·lint와 `prisma/e2e-account-data.spec.ts` 통과 확인.
- SCR-008(`DateRangeFields`·`date-range.ts` 공용)의 기존 테스트 통과.
