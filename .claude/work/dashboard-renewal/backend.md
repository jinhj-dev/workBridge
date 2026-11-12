# backend: dashboard-renewal (1단계)

## 생성·수정·삭제 파일 (backend/ 기준)
- 신규: `src/common/time/calendar-rules.ts`(+spec, isWeekend·monthRange 이동), `src/modules/dashboard/today-status-rules.ts`(+spec)
- 신규 테스트: `test/dashboard-department-status.e2e-spec.ts`
- 수정: `dashboard.repository.ts`(`countTodayStatusByDepartment`, `countPendingLeaves`), `dashboard.service.ts`, `dashboard.controller.ts`(캘린더 핸들러 삭제 + `department-status`), `attendance/attendance-sheet-rules.ts`·`attendance-sheet.service.ts`(import만), `attendance/dto/attendance-monthly-query.dto.ts`(month 검증을 직접 정의, 규칙 동일), `test/admin-dashboard.e2e-spec.ts`, `test/attendance-monthly.e2e-spec.ts`(`shouldKeepWeekdayHolidayCountedInDashboardCalendar` 삭제)
- 삭제: `dashboard/leave-calendar-rules.ts`(+spec), `dashboard/dto/leave-calendar-query.dto.ts`, `test/dashboard-leave-calendar.e2e-spec.ts` (`resolveHalfDay`·`HalfDay`도 함께 사라짐)
- `admin-dashboard.controller.ts`는 변경 불필요(서비스 반환 타입만 바뀜). DB 변경·마이그레이션 없음. 승인·취소 로직 변경 없음.

## API 요약
- `GET /admin/dashboard/summary`(ADMIN): `{date,isWorkday,totalEmployeeCount,clockedInCount,notClockedInCount,onLeaveCount,attendanceRate(number|null),pendingLeaveCount}`. 대상=활성 & 입사일<=오늘, 출근>휴가(APPROVED, 반차 포함)>미출근 배타 분류, 비근무일(토일·일본 공휴일)은 휴가·미출근 0·출근만. 출근율=출근/(출근+휴가+미출근) 소수 1자리 half-up, 분모 0이면 null. 에러 401/403 FORBIDDEN/403 PASSWORD_CHANGE_REQUIRED
- `GET /dashboard/department-status`(로그인 전원, Query 없음): `{date,isWorkday,departments:[{departmentId|null,departmentName,memberCount,clockedInCount,onLeaveCount,notClockedInCount,attendanceRate}]}`. 대상자 0명 부서 제외, 코드순 정렬, 「未所属」(code UNASSIGNED)은 `departmentId:null`로 마지막. 이름·ID·사원번호 없음(e2e로 필드 집합 검증). 에러 401/403 PASSWORD_CHANGE_REQUIRED
- `GET /dashboard/leave-calendar`, `/leave-calendar/day`: 제거(404, e2e 확인)
- 승인 미리보기: 기존 `GET /leaves/pending-approval?scope=all|mine&limit=5` 재사용. scope=all EMPLOYEE 403은 기존 `leaves.e2e-spec`에서 검증 중(변경 없음)
- 쿠키·토큰 처리 변경 없음(Bearer)

## API 문서와 다른 점
- design은 집계 2쿼리를 `$transaction`으로 묶는다고 했으나, `$queryRaw`(async 래핑)와 count를 `Promise.all`로 실행했다. 두 값은 서로 독립(PENDING 총수 vs 오늘 분류)이라 정합성 영향 없음. 그 외 계약은 문서 설계와 동일.
- 발견: 서비스 내부 `applyWorkday`가 입력 객체를 그대로 돌려주면 `departmentCode`가 응답에 샌다(e2e로 포착) → 항상 3항목 새 객체를 반환하도록 수정함.

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §2: API-DASH-001 응답에 `isWorkday`·`totalEmployeeCount`·`attendanceRate` 추가 및 의미 변경(배타 3분류·입사 전 제외·비근무일 0), API-DASH-004 신규(위 형식), API-DASH-002·003 삭제(제거 후 404 명시)
- `docs/02_REQUIREMENTS.md` FR-DASH-001: 오늘 전체 현황 정의(배타 분류·대상자·비근무일·출근율·全社員数), 부서별 현황(숫자만, 전 사용자), 캘린더 항목 삭제. FR-ATT-006: 공휴일 후속 과제의 캘린더 언급 삭제, 대시보드 집계는 출근부와 같은 공휴일 기준
- `docs/08_TEST_PLAN.md`: IT-DASH-02·03 갱신, IT-DASH-04~16 삭제, 신규 IT-DASH(부서별 현황 권한·숫자만·0명 부서 제외·未所属 마지막·비근무일·입사일 미도래·출근율 반올림/null·캘린더 API 404)
- `docs/07_ARCHITECTURE.md` 등 구조 문서에 `leave-calendar-rules.ts` 언급이 있으면 `common/time/calendar-rules.ts`·`dashboard/today-status-rules.ts`로 정정

## 프론트엔드가 알아야 할 것
- 신규 환경변수·CORS 변경 없음. department-status는 EMPLOYEE도 호출 가능. attendanceRate는 null 가능(표시 시 「-」 처리 필요).
- 캘린더 API 제거로 기존 대시보드 캘린더 호출은 404가 되므로 프론트 교체 전에는 해당 호출이 실패한다.

## 검증
- `npx tsc --noEmit`·`npx eslint src test` 오류 없음, unit 21파일 300 통과, e2e 전체(테스트 DB) 14파일 363 통과(admin-dashboard, dashboard-department-status, attendance-monthly 포함). 개발 DB 미사용, 커밋 없음.

## context.md 정정
- 51행: `dashboard.controller.ts`는 이제 `/dashboard/department-status`(API-DASH-004)만 보유, `leave-calendar-rules.ts` 삭제, `isWeekend`·`monthRange`는 `common/time/calendar-rules.ts`, 집계 규칙은 `dashboard/today-status-rules.ts`. `dateSchema`의 공용 사용처에서 leave-calendar DTO 제외(create-leave만).
- 54행: `japaneseHolidaysInRange`는 이제 대시보드 집계(`isWorkday`)도 사용.

## Fix 2 (admin-dashboard e2e 중복 테스트 제거)
- 대상: `backend/test/admin-dashboard.e2e-spec.ts` (구 240~294행 블록 삭제, 296~351행 블록 유지). 테스트 4개 중복(HireDate / AttendanceRate 소수1자리 / 비근무일 it.each / 비근무일 null 출근율).
- 비교 결과: 기대값·검증 수는 동일. 차이는 2곳뿐.
  - HireDate: 삭제분은 `new Date('...T00:00:00Z')`, 유지분은 `toDbDate('2026-11-10')`(상단 import가 이 블록에서만 사용됨).
  - null 출근율: 삭제분은 2026-11-14(다른 테스트 데이터와 겹칠 수 있음), 유지분은 2098-01-04(격리, 설명 주석 포함).
  - 검증 수는 같아 유지분을 택함(더 견고, import 유지).
- 검증: 테스트 DB(workbridge_test, .env.test) 대상 admin-dashboard e2e 1파일 12 통과, `tsc --noEmit`·`eslint src test` 오류 없음. 개발 DB 미사용, 커밋 없음.

## Fix 3 (admin-dashboard e2e 시계 복원 try/finally)
- 대상: `backend/test/admin-dashboard.e2e-spec.ts`. 시계를 바꾸는 테스트 중 try/finally가 없던 2건을 수정(기대값·검증 내용 불변).
  - `shouldKeepTotalEmployeeCountOnNotWorkday`: 시계 설정·fetchSummary를 try, 복원(2026-11-09T09:00+09:00)을 finally로. expect는 try 밖(결과 변수는 `SummaryBody`로 선언).
  - `shouldReturnTokyoDateOfFixedClock`: 같은 패턴이라 동일하게 정리.
- 나머지 시계 사용 테스트(it.each 비근무일, null 출근율 등)는 이미 try/finally였음. 다른 e2e 파일에는 시계 변경 패턴 없음(grep 확인).
- 검증: `tsc --noEmit`·`eslint src test` 오류 없음, admin-dashboard e2e 1파일 14 통과(테스트 DB). 개발 DB 미사용, 커밋 없음.
