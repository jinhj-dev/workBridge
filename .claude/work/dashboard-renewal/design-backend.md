# design-backend: dashboard-renewal

> 결정은 `decisions.md`(D1~D19 확정, D20 결정 필요 — 이 문서는 D20-A 추천 기준).

## 참조 문서
- `docs/02_REQUIREMENTS.md` §FR-DASH-001(오늘 전체 현황·캘린더 정의), §FR-ATT-006(공휴일 후속 과제, 所定労働時間 미취급), §FR-LEAVE-002·003(승인 권한), §NFR-001
- `docs/06_API_SPECIFICATION.md` §2 API-DASH-001·002·003, §3 API-ATT-003·007, §4 API-LEAVE-003·004·006·007 및 승인·반려 API
- `docs/05_DATABASE_DESIGN.md` §9(날짜 처리)
- `docs/07_ARCHITECTURE.md` 인증·Guard 구성(`@AdminOnly()`)

## 데이터 모델
- DB 변경 없음(마이그레이션 없음). users(`is_active`, `hire_date`, `department_id`), attendance(`work_date`), leaves(`status`, `start_date`, `end_date`), departments(`code`, `name`)만 읽는다.

## 집계 규칙 (D4·D5·D6) — 단일 구현
- 오늘 = `toTokyoDate(clock.now())`.
- 근무일 `isWorkday(today)`: 토·일이 아니고 `japaneseHolidaysInRange(today, today)`가 비어 있으면 true.
- 대상자: `is_active AND hire_date <= 오늘`. 全社員数 = 대상자 수(비근무일에도 동일).
- 사용자별 분류(우선순위, 사람당 1회): 出勤(오늘 attendance 행 존재) > 休暇(오늘 포함 APPROVED 휴가, 종류 무관·반차 포함) > 未出勤.
- 비근무일: 休暇·未出勤 0, 出勤만 센다(분류는 SQL, 0 처리는 서비스).
- 出勤率 = 出勤 / (出勤 + 未出勤 + 休暇) × 100, 소수 1자리 반올림(half-up), 분모 0이면 `null`.
- 부서별 집계 1개 쿼리 → 회사 전체는 부서 합계(규칙 중복 금지).
- D10 退勤予定（目安）·진행률은 백엔드 변경 없음. 프런트가 API-ATT-003의 `clockIn`·`clockOut`으로 계산한다(design-frontend.md).

## API 계약

### API-DASH-001: 관리자 오늘 현황 (변경)
- `GET /admin/dashboard/summary` · ADMIN · 경로·권한 유지(`@AdminOnly()`)
```json
{ "date": "2026-11-20", "isWorkday": true, "totalEmployeeCount": 120,
  "clockedInCount": 96, "notClockedInCount": 16, "onLeaveCount": 8,
  "attendanceRate": 80.0, "pendingLeaveCount": 8 }
```
- 신규 필드: `isWorkday`, `totalEmployeeCount`, `attendanceRate`(number|null). 의미 변경: 배타 3분류, 입사 전 제외, 비근무일 未出勤·休暇 0.
- `pendingLeaveCount`: 기존과 같음(전체 PENDING).
- 에러: 401 / 403 FORBIDDEN(EMPLOYEE) / 403 PASSWORD_CHANGE_REQUIRED.

### API-DASH-004: 부서별 오늘 근무 현황 (신규)
- `GET /dashboard/department-status` · USER(EMPLOYEE·ADMIN 같은 응답) · Query 없음
```json
{ "date": "2026-11-20", "isWorkday": true,
  "departments": [
    { "departmentId": "uuid", "departmentName": "営業部", "memberCount": 24,
      "clockedInCount": 20, "onLeaveCount": 2, "notClockedInCount": 2, "attendanceRate": 83.3 } ] }
```
- `memberCount` = 부서 대상자 수. 0명 부서 제외, 「未所属」은 대상자가 있으면 포함(`departmentId: null`). 정렬 부서 `code` 오름차순(未所属은 마지막).
- 응답 필드는 위가 전부(사원 ID·이름·사원번호·휴가 종류 없음, D7).
- 에러: 401 / 403 PASSWORD_CHANGE_REQUIRED.

### API-DASH-002·003: 휴가 캘린더 (삭제, D20-A)
- `GET /dashboard/leave-calendar`, `GET /dashboard/leave-calendar/day` 제거. 호출 화면은 대시보드 캘린더뿐임을 확인(decisions.md D3). 제거 후 404.

### 재사용(변경 없음)
| 용도 | API |
|---|---|
| 본인 오늘 근태·출퇴근 | API-ATT-003 `GET /attendance/today`, API-ATT-001·002 |
| 이번 달 근무 | API-ATT-007 `GET /attendance/monthly`(`summary`) |
| 휴가 잔여 | API-LEAVE-006 `GET /leaves/balance` |
| 최근 신청 | API-LEAVE-003 `GET /leaves/me?limit=3` |
| 승인 대기 미리보기 | API-LEAVE-007 `GET /leaves/pending-approval?scope=all&limit=5`(ADMIN) / `scope=mine&limit=5`(승인자) |
| 상세·승인·반려·취소 | API-LEAVE-004 및 기존 승인·반려·취소 API(서버 권한 검증 그대로) |

## 처리 로직
- `DashboardRepository.countTodayStatusByDepartment(today: string)` → `DepartmentTodayCounts[]`(`departmentId, departmentCode, departmentName, memberCount, clockedInCount, onLeaveCount, notClockedInCount`).
  - `$queryRaw` 1회, 파라미터 바인딩만. 사용자별 `CASE WHEN EXISTS(attendance) THEN 'IN' WHEN EXISTS(approved leave covering today) THEN 'LEAVE' ELSE 'ABSENT' END` → 부서별 `COUNT(*) FILTER (...)`. `${today}::date` 비교로 세션 TZ 비의존. `HAVING COUNT(*) > 0`.
- `DashboardRepository.countPendingLeaves()` → number(기존 `countTodaySummary`의 PENDING count 분리). `countTodaySummary`·`countApprovedLeavesByDay`·캘린더 날짜별 조회 메서드 삭제.
- 순수 규칙 `dashboard/today-status-rules.ts`: `isWorkday(ymd)`, `applyWorkday(counts, workday)`, `attendanceRate(counts): number|null`, `sumStatusCounts(list)`.
- `DashboardService.getSummary()`: 오늘·workday → `$transaction([부서별 집계, PENDING 수])` → 합계 → 응답. `getDepartmentStatus()`: 같은 집계 → 부서별 `applyWorkday`·`attendanceRate`(`departmentCode`는 응답 제외). `getLeaveCalendar`·`getLeaveCalendarDay` 삭제.
- Controller: `admin-dashboard.controller.ts` 응답 타입만 변경. `dashboard.controller.ts`는 캘린더 핸들러 2개 삭제, `@Get('department-status')` 추가(USER).
- 공용 이동(D20-A, 동작 변경 없음):
  - `isWeekend`·`monthRange` → `backend/src/common/time/calendar-rules.ts`(신규, + spec 이관). import 수정: `attendance-sheet-rules.ts`, `attendance-sheet.service.ts`, `today-status-rules.ts`.
  - `leaveCalendarQuerySchema`의 `month` 검증 → `attendance/dto/attendance-monthly-query.dto.ts` 안에 정의(검증 규칙·에러 형식 동일. 기존 IT-ATT 월 형식 검증 테스트로 회귀 확인).

## 보안 요구사항
- API-DASH-001 `@AdminOnly()` 유지. API-DASH-004는 숫자 집계만 반환, 개인 식별 정보 SELECT 금지.
- 승인 대기·승인·반려는 기존 API의 서버 검증에 의존(scope=all은 ADMIN만, 승인·반려는 할당 승인자 또는 ADMIN·본인 신청 불가·409 ALREADY_PROCESSED). 새 권한 로직 없음.
- security 점검 항목: (1) D7 소규모 부서(1~2명) 숫자로 개인 출근·휴가·未出勤 추정 가능 — 사용자 결정으로 공개, 위험·완화 대안 기록. (2) D8 대시보드에서의 승인·반려가 서버 권한 검증을 거치는지, EMPLOYEE `scope=all` 403. (3) D20-A 제거로 타인 이름 공개 범위(API-DASH-003)가 사라졌는지(404).

## 생성·수정·삭제 파일
- 수정: `backend/src/modules/dashboard/dashboard.repository.ts`, `dashboard.service.ts`, `dashboard.controller.ts`, `admin-dashboard.controller.ts`(타입), `backend/src/modules/attendance/attendance-sheet-rules.ts`·`attendance-sheet.service.ts`(import), `attendance/dto/attendance-monthly-query.dto.ts`
- 신규: `backend/src/modules/dashboard/today-status-rules.ts`(+spec), `backend/src/common/time/calendar-rules.ts`(+spec)
- 삭제(D20-A): `dashboard/leave-calendar-rules.ts`(+spec), `dashboard/dto/leave-calendar-query.dto.ts`, `backend/test/dashboard-leave-calendar.e2e-spec.ts`
- 테스트 수정: `backend/test/admin-dashboard.e2e-spec.ts`(새 정의), `backend/test/attendance-monthly.e2e-spec.ts`(`shouldKeepWeekdayHolidayCountedInDashboardCalendar` 삭제). 신규: `backend/test/dashboard-department-status.e2e-spec.ts`
- 참고: `common/time/japanese-holiday.ts`, `tokyo-date.ts`, `clock.ts`, `test/e2e-helpers.ts`(FixedClock), `test/db/db-helpers.ts`, `leaves` 모듈 승인·반려 서비스(권한 검증 확인용)

## 문서 갱신 예정 (backend 구현 후 backend.md에 기록)
- 06: API-DASH-001 응답·의미 변경, API-DASH-004 신규, API-DASH-002·003 삭제(D20-A)
- 02 FR-DASH-001: 오늘 전체 현황 정의(배타 분류·대상자·비근무일·출근율·全社員数), 부서별 현황(숫자만 전 사용자), 캘린더 항목 삭제. FR-ATT-006: 공휴일 후속 과제에서 캘린더 언급 삭제·대시보드 집계는 출근부와 같은 기준 명시
- 08: IT-DASH-02·03 갱신, IT-DASH-04~16 삭제(D20-A), 신규 IT-DASH(부서별 현황·비근무일·입사일)
