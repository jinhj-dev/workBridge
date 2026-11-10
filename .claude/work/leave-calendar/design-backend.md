# design-backend: 월간 휴가 캘린더 (API-DASH-002, API-DASH-003)

> decisions.md 확정안(D1 전원·이름/부서만, D2 APPROVED만, D3 토·일 제외, D4 활성만, D5 API 2개, D8 반차 구분만 추가, D9 전원 동일) 기준.

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/06_API_SPECIFICATION.md` §0 공통 규칙(날짜 형식·에러 응답·권한 표기), §2 API-DASH-001(같은 모듈의 집계 패턴)
- `docs/02_REQUIREMENTS.md` FR-LEAVE-001(주말 제외·공휴일 포함), FR-LEAVE-005(상세 열람 제한 — 이번 API는 상세 필드를 내보내지 않음), FR-DASH-001(휴가 인원 기준: 오늘이 기간에 포함된 APPROVED, 활성 사용자)
- `docs/05_DATABASE_DESIGN.md` §0 ENUM, §6 leaves, §7 Index, §9 날짜·시간 처리
- `docs/07_ARCHITECTURE.md` Guard 구성(전역 JwtAuthGuard → PasswordChange)

## 데이터 모델
- **DB 변경 없음.** 마이그레이션 없음.
- 기존 인덱스 `leaves(start_date, end_date)`를 겹침 조건(`start_date <= :end AND end_date >= :start`)에 사용한다. 연도 걸침 신청이 금지(CHECK)이므로 월 범위 조건은 단순 겹침으로 충분하다.
- 같은 사원이 같은 날 HALF_AM + HALF_PM 두 건(둘 다 APPROVED)을 가질 수 있다(`leave-rules.ts` `isLeaveConflict`가 허용) → 집계·상세 모두 사원 단위 DISTINCT.

## 집계 규칙 (두 API 공통)
- 대상 상태: `APPROVED`만. `PENDING`, `REJECTED`, `CANCELLED` 제외.
- 대상 사원: `users.is_active = true`만.
- 대상 날짜: 휴가 기간(`start_date ~ end_date`, 양끝 포함)에 포함되고 **토·일이 아닌** 날. 공휴일은 평일로 취급.
- 휴가 종류는 전부 포함(반차도 1명).
- 날짜는 Asia/Tokyo 기준 DATE 문자열(`YYYY-MM-DD`). `month` 생략 시 "이번 달"은 `Clock` + `toTokyoDate`로 계산(SQL `CURRENT_DATE` 금지, 05 §9).

## API 계약 (모두 신규, 권한 USER)

### API-DASH-002 (신규): 월간 휴가 캘린더 집계
- `GET /dashboard/leave-calendar` · USER(로그인한 모든 사용자)
- Query: `month`(선택, `YYYY-MM`, 연도 2000~2100, 월 01~12. 생략 시 Asia/Tokyo 기준 이번 달)
- Response 200 (인원이 1명 이상인 날짜만, 날짜 오름차순. 없는 날짜는 0명)
```json
{ "month": "2026-11", "days": [ { "date": "2026-11-10", "count": 3 } ] }
```
- `count`: 그 날짜에 APPROVED 휴가가 있는 활성 사원 수(DISTINCT).

### API-DASH-003 (신규): 날짜별 휴가자 목록
- `GET /dashboard/leave-calendar/day` · USER
- Query: `date`(필수, 실재하는 `YYYY-MM-DD`, 연도 2000~2100)
- Response 200 (페이지네이션 없음: 1일분은 최대 활성 사원 수)
```json
{
  "date": "2026-11-10",
  "items": [
    { "userId": "uuid", "name": "山田太郎", "departmentName": "開発部", "halfDay": null },
    { "userId": "uuid", "name": "佐藤花子", "departmentName": "営業部", "halfDay": "AM" }
  ]
}
```
- **응답 필드는 위가 전부**다. `reason`, `leaveType`, `startDate`, `endDate`, `status`, `leaveId`, `empId`, `approver`, `processedBy`, `rejectReason`은 넣지 않는다(최소 노출, decisions D1·D8).
- `halfDay`(decisions D8): 그 사원의 그날 APPROVED 휴가 종류 목록으로 판정. HALF_AM만 → `"AM"`, HALF_PM만 → `"PM"`, HALF_AM+HALF_PM 둘 다 → `null`, 종일 휴가(ANNUAL·SPECIAL·OTHER)가 하나라도 있으면 → `null`. 휴가 종류 enum은 서버 안에서만 쓰고 내보내지 않는다.
- 사원 단위 DISTINCT(같은 사원의 반차 2건은 1행). `items.length` = 월 API의 같은 날 `count`(반차도 1명).
- 정렬: 사원번호 오름차순(정렬에만 사용, 응답에 미포함), 동순위 `userId` 오름차순.
- 토·일이면 DB 조회 없이 `items: []`.

### 에러 (두 API 공통)
| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | `month` 형식·범위 오류 / `date` 누락·형식 오류·실재하지 않는 날짜(예: `2026-02-30`)·범위 오류. `details[].field`는 `month` / `date` |
| 401 | UNAUTHORIZED | 미인증 |
| 403 | PASSWORD_CHANGE_REQUIRED | 비밀번호 변경 필요(전역 Guard) |

## 처리 로직
- Controller: 신규 `dashboard/dashboard.controller.ts` — `@Controller('dashboard')`, `@AdminOnly` 없음. `@Get('leave-calendar')`, `@Get('leave-calendar/day')`에서 `@Query({ schema })` 검증 후 Service 호출만. `dashboard.module.ts`의 controllers에 추가. 기존 `admin-dashboard.controller.ts`는 변경하지 않는다.
- Service(`dashboard.service.ts`):
  - `getLeaveCalendar(month?)`: 미지정 시 `toTokyoDate(clock.now()).slice(0, 7)`. 월초·월말 계산 → Repository → `{ month, days }`.
  - `getLeaveCalendarDay(date)`: 주말이면 `{ date, items: [] }`. 아니면 Repository → `{ userId, name, departmentName, halfDay: resolveHalfDay(leaves.map(l => l.leaveType)) }` 매핑.
- Repository(`dashboard.repository.ts`):
  - `countApprovedLeavesByDay(start: string, end: string)`: `$queryRaw` 1쿼리. 개요:
    `generate_series($start::date, $end::date, interval '1 day') AS d` JOIN `leaves l ON l.start_date <= d AND l.end_date >= d` JOIN `users u ON u.id = l.user_id AND u.is_active` WHERE `l.status = 'APPROVED'` AND `l.start_date <= $end::date AND l.end_date >= $start::date` AND `EXTRACT(ISODOW FROM d) < 6` GROUP BY d ORDER BY d. `COUNT(DISTINCT l.user_id)`(bigint → `Number()`), 날짜는 `to_char(d, 'YYYY-MM-DD')`. 파라미터는 tagged template 바인딩만(문자열 결합 금지).
  - `findUsersOnApprovedLeave(date: Date)`: Prisma `user.findMany({ where: { isActive: true, leaves: { some: { status: 'APPROVED', startDate: { lte }, endDate: { gte } } } }, select: { id, name, department: { select: { name } }, leaves: { where: <같은 APPROVED·날짜 조건>, select: { leaveType: true } } }, orderBy: [{ empId: 'asc' }, { id: 'asc' }] })` — users 기준 조회라 DISTINCT가 자연히 보장되고, leaves는 `leaveType`만 읽는다(사유 컬럼 미조회). 쿼리 1회(Prisma 관계 조회).
- 순수 함수 `dashboard/leave-calendar-rules.ts`: `monthRange(month) → {start, end}`, `isWeekend(ymd)`(`leave-rules.ts`와 같은 `getUTCDay()` 방식), `resolveHalfDay(leaveTypes: LeaveType[]) → 'AM' | 'PM' | null`(위 판정 규칙). 응답 타입 `HalfDay = 'AM' | 'PM'`.

## 보안 요구사항
- 인증 필수(전역 JwtAuthGuard), 권한은 USER. 비밀번호 변경 필요 사용자는 403(전역 Guard 그대로).
- 응답은 이름·부서·userId·반차 구분(AM/PM/null)·날짜·인원수만. 사유 등은 SELECT 단계에서 읽지 않는다(실수로 매핑되지 않게).
- PENDING·REJECTED·CANCELLED 건의 존재가 인원수나 목록으로 드러나지 않을 것.
- 로그에 사원 정보를 출력하지 않는다.

## 생성·수정 파일
- 신규 `backend/src/modules/dashboard/dashboard.controller.ts`
- 신규 `backend/src/modules/dashboard/dto/leave-calendar-query.dto.ts` — `leaveCalendarQuerySchema`(month), `leaveCalendarDayQuerySchema`(date)
- 신규 `backend/src/modules/dashboard/leave-calendar-rules.ts` (+ `leave-calendar-rules.spec.ts`)
- 신규 `backend/src/common/validation/date-schema.ts` — `create-leave.dto.ts`의 실재 날짜 `dateSchema`를 이동·export
- 수정 `backend/src/modules/leaves/dto/create-leave.dto.ts` — 공용 `dateSchema` import로 교체(동작 변경 없음)
- 수정 `dashboard.module.ts`(컨트롤러 등록), `dashboard.service.ts`, `dashboard.repository.ts`(메서드 추가, 일본어 주석)
- 신규 e2e `backend/test/dashboard-leave-calendar.e2e-spec.ts` (test-plan.md 참조)

## 참고할 기존 파일
- `backend/src/modules/dashboard/admin-dashboard.controller.ts`, `dashboard.repository.ts`(APPROVED·활성 기준 집계 예)
- `backend/src/modules/leaves/dto/leave-balance-query.dto.ts`(Query zod + 연도 범위)
- `backend/src/modules/leaves/leaves.repository.ts` L77 부근(`$queryRaw` 사용 예)
- `backend/src/common/time/tokyo-date.ts`, `clock.ts`
- `backend/test/admin-dashboard.e2e-spec.ts`, `backend/test/e2e-helpers.ts`(`insertLeave`, `FixedClock`)

## 문서 갱신 예정 (구현 후 backend.md에 확정 기재)
- 06 §2에 API-DASH-002, API-DASH-003 추가(권한 USER, 응답 필드 한정 명시)
- 02 FR-DASH-001에 휴가 캘린더 규칙(APPROVED만·토일 제외·활성만·DISTINCT, 전원에게 이름·부서·반차 구분만 공개, halfDay 판정 규칙) 추가, FR-LEAVE-005에 "휴가 캘린더의 이름·부서 공개는 휴가 상세 열람이 아님" 보충
- 08 §5.5 IT-DASH-04~, §6 권한 매트릭스에 두 API(USER) 추가
