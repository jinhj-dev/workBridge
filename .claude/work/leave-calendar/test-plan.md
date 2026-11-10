# test-plan: 월간 휴가 캘린더

> 근거: design-backend.md(API-DASH-002/003 계약·집계 규칙), design-frontend.md, decisions.md 확정안(전원 공개·이름/부서 + 반차 구분만, APPROVED만, 토·일 제외, 활성만). 요청 원문 8-5 검증 사항 1~10을 ID에 매핑했다(6은 "이름·부서"만, 사유는 제외로 변경).
> 참조: `docs/08_TEST_PLAN.md` §5.5(IT-DASH), §6 권한 매트릭스, §7 화면 테스트

## 1. Backend 단위 (Vitest) — `backend/src/modules/dashboard/leave-calendar-rules.spec.ts`
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| U-01 | `monthRange('2026-11')` / `('2026-02')` / `('2028-02')`(윤년) / `('2026-12')` | 11-01~11-30 / 02-01~02-28 / 02-01~02-29 / 12-01~12-31 |
| U-02 | `isWeekend` 토·일·월 | true / true / false |
| U-03 | `resolveHalfDay`: `[HALF_AM]` / `[HALF_PM]` / `[HALF_AM, HALF_PM]` / `[ANNUAL]` / `[ANNUAL, HALF_AM]` / `[SPECIAL]` / `[OTHER]` | `'AM'` / `'PM'` / `null` / `null` / `null` / `null` / `null` |

## 2. Backend API 통합 (e2e, 실제 테스트 DB) — `backend/test/dashboard-leave-calendar.e2e-spec.ts`
- 데이터: `TestDataTracker`로 사원·부서 생성, `insertLeave`로 휴가 INSERT. DB 전체 집계이므로 **다른 데이터가 없는 먼 월**(예: 2098년)을 쓰거나 기준값 대비 증감으로 검증. `FixedClock`으로 "이번 달" 고정.
- 별도 표기가 없으면 EMPLOYEE 토큰으로 호출한다(전원 공용 API이므로).

| ID | 시나리오 | 기대 결과 | 8-5 |
|---|---|---|---|
| IT-CAL-01 | 평일 1일 APPROVED 1건 | 그 날짜만 `count 1` | 1 |
| IT-CAL-02 | 월~금 5일 APPROVED 연차 | 5일 모두 `count 1` | 7 |
| IT-CAL-03 | 금~다음 주 월 APPROVED 연차(주말 포함) | 금·월만 1, 토·일은 `days`에 없음 | 7 |
| IT-CAL-04 | 월 경계: 1/29~2/3 APPROVED, `month=YYYY-01` / `YYYY-02` | 각 월에 해당 날짜만, 다른 달 날짜 없음 | 4, 7 |
| IT-CAL-05 | 같은 사원 같은 날 HALF_AM + HALF_PM(둘 다 APPROVED) | `count 1` | 8 |
| IT-CAL-06 | 다른 사원 2명이 같은 날 APPROVED | `count 2` | 1 |
| IT-CAL-07 | PENDING / REJECTED / CANCELLED 건만 있는 날 | 각각 `days`에 없음 | 9 |
| IT-CAL-08 | 같은 날 APPROVED 1명 + PENDING 1명 + REJECTED 1명 | `count 1` | 9 |
| IT-CAL-09 | 비활성 사원의 APPROVED 건 | 집계 제외 | - |
| IT-CAL-10 | `month` 생략(Clock 2026-11-10) | `month: "2026-11"` | 1 |
| IT-CAL-11 | `month` = `2026-13`, `2026-1`, `abcd`, `1999-12`, `2101-01` | 400 VALIDATION_ERROR, `details[].field = month` | - |
| IT-CAL-12 | EMPLOYEE / ADMIN 토큰 | 둘 다 200, 같은 응답 | - |
| IT-CAL-13 | 토큰 없음 / mustChangePassword 사용자 | 401 / 403 PASSWORD_CHANGE_REQUIRED (두 API 모두) | - |
| IT-CAL-14 | 월 응답 형태 | `days[]` 요소 키가 정확히 `date`, `count` | - |
| IT-DAY-01 | 다일 APPROVED 연차의 중간 날짜 | 해당 사원 포함. `name`, `departmentName`이 DB와 일치 | 5, 6 |
| IT-DAY-02 | 같은 날 여러 사원 | 전원 포함, 사원번호 오름차순 | 5 |
| IT-DAY-03 | 같은 사원의 HALF_AM + HALF_PM(둘 다 APPROVED) | 1행만, `halfDay: null` | 8 |
| IT-DAY-03a | HALF_AM만 APPROVED / HALF_PM만 APPROVED | `halfDay: "AM"` / `"PM"` | - |
| IT-DAY-03b | ANNUAL 1일, SPECIAL·OTHER 다일 휴가 | 모두 `halfDay: null` | - |
| IT-DAY-03c | 같은 사원 같은 날 HALF_AM(APPROVED) + HALF_PM(PENDING 또는 REJECTED) | 1행, `halfDay: "AM"`(비승인 건은 판정에 쓰지 않음) | 9 |
| IT-DAY-03d | 종일+반차 겹침(ANNUAL과 HALF_PM 둘 다 APPROVED를 직접 INSERT, 신청 API는 거부하므로 헬퍼 사용) | 1행, `halfDay: null` | 8 |
| IT-DAY-04 | 기간 밖 날짜의 휴가, PENDING·REJECTED·CANCELLED 건, 비활성 사원 건 | 포함되지 않음 | 5, 9 |
| IT-DAY-05 | 휴가 없는 평일 / 휴가 기간 안의 토요일 | `items: []` | 10 |
| IT-DAY-06 | 과거 날짜(Clock 이전) | 정상 조회 | - |
| IT-DAY-07 | `date` 누락 / `2026-02-30` / `2026/11/10` | 400 VALIDATION_ERROR, field `date` | - |
| IT-DAY-08 | **최소 노출**: 응답 `items[]` 요소 키가 정확히 `userId`, `name`, `departmentName`, `halfDay`이고 `halfDay`는 `"AM"`·`"PM"`·`null` 중 하나. `reason`·`leaveType`·`startDate`·`endDate`·`status`·`leaveId`·`empId`·`approver` 없음 | 일치(EMPLOYEE·ADMIN 모두) | - |
| IT-DAY-09 | 같은 날 월 API `count`와 상세 `items.length`(반차 사원 포함) | 같음, 반차도 1명 | 1, 5 |
| IT-REG-01 | 휴가 신청(API-LEAVE-001) 날짜 검증 회귀(`dateSchema` 이동) | 기존 e2e 그대로 통과 | - |

## 3. Frontend 단위·컴포넌트 (Vitest + Testing Library)
### `frontend/src/lib/calendar.test.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| FU-01 | `buildMonthWeeks('2026-11')`(1일=일요일) / `('2026-02')` | 첫 칸이 11-01 / 앞 빈칸 수가 요일과 일치, 마지막 주 뒤 빈칸 |
| FU-02 | `shiftMonth('2026-12', 1)` / `('2026-01', -1)` | `2027-01` / `2025-12` |

### `frontend/src/components/calendar/MonthCalendar.test.tsx`
| ID | 시나리오 | 기대 | 8-5 |
|---|---|---|---|
| FC-01 | `today`=2026-11-10 | 10일 버튼만 `aria-current="date"` | 3 |
| FC-02 | 과거 날짜 칸 | 과거 표시 클래스(`bg-general-30`) 적용, 오늘·미래 미적용, 과거 버튼도 enabled | 2 |
| FC-03 | 과거 날짜 클릭 | `onSelectDate('2026-11-03')` 호출 | - |
| FC-04 | 요일 헤더 | 日~土 순서 | - |

### `frontend/src/app/(app)/dashboard/LeaveCalendarSection.test.tsx` (apiFetch mock)
| ID | 시나리오 | 기대 | 8-5 |
|---|---|---|---|
| FS-01 | 월 데이터 `{date:'2026-11-10', count:3}` | 10일 칸에 `3名`, 데이터 없는 날짜는 배지 없음 | 1, 10 |
| FS-02 | [翌月] / [前月] 클릭 | `month=2026-12` / `2026-10`으로 재호출, 라벨 갱신 | 4 |
| FS-03 | 월 조회 실패 | SectionError + [再試行] 클릭 시 재호출 | 10 |
| FS-04 | 로딩 중 | 스켈레톤(`role="status"`) | 10 |
| FS-05 | 날짜 클릭 | 상세 API를 그 날짜로 1회만 호출, 월 API는 재호출하지 않음 | 5 |
| FS-06 | 상세 성공(2명) | 모달에 社員名·所属部署가 2명분 표시, 상태 배지·사유 영역 없음 | 5, 6 |
| FS-06a | 상세 `halfDay` = `AM` / `PM` / `null` | 「午前半休」 / 「午後半休」 라벨 / 라벨 없음 | - |
| FS-07 | 상세 0건 | `この日の休暇取得者はいません。` | 10 |
| FS-08 | 상세 실패 | 모달 안 SectionError, [再試行]으로 재조회 | 10 |
| FS-09 | `refreshSignal` 변경 | 현재 월로 재조회(월 초기화 안 됨) | - |

### `DashboardView.test.tsx` (추가)
| ID | 시나리오 | 기대 |
|---|---|---|
| FD-01 | EMPLOYEE | 캘린더 영역 표시, `/dashboard/leave-calendar` 호출 |
| FD-02 | ADMIN | 캘린더 영역 표시(승인 대기 아래) |
| FD-03 | 승인 대기에서 승인 처리 후(onProcessed) | 캘린더 월 API 재호출 |

## 4. E2E (Playwright, 선택) — `frontend/e2e/dashboard-leave-calendar.spec.ts`
- E2E 관리자 900001과 일반 900002 각각 로그인 → 휴가 캘린더 표시, 오늘 강조, 월 이동, 날짜 클릭 시 모달 표시. 데이터 값은 개발 DB 상태에 의존하므로 구조만 확인. 자격 증명 환경변수가 없으면 기존 관례대로 skip.

## 실행
- backend: `npx vitest run src/modules/dashboard/leave-calendar-rules.spec.ts`, `npm run db:migrate:test` 후 `npx vitest run --config ./vitest.config.e2e.ts test/dashboard-leave-calendar.e2e-spec.ts`, 회귀 `npm run test:e2e`
- frontend: `npx vitest run "src/app/(app)/dashboard/LeaveCalendarSection.test.tsx"` 등, 전체 `npm test`
