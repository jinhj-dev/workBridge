# design-backend: 휴가관리 통합 (API-LEAVE-010 신규, API-LEAVE-003·007 확장)

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/06_API_SPECIFICATION.md` §0 공통 규칙, §4 API-LEAVE-003·007·004(권한 기준), API-DEPT-001
- `docs/02_REQUIREMENTS.md` FR-LEAVE-001(휴가 종류·반차), FR-LEAVE-002·003(승인 권한), FR-LEAVE-005(상세 열람 제한)
- `docs/05_DATABASE_DESIGN.md` §6 leaves, §7 Index, §9 날짜·시간 처리
- `docs/07_ARCHITECTURE.md` 계층·Guard
- 이전 캘린더 설계(삭제됨, 참고만): `.claude/work/leave-calendar/design-backend.md`, `decisions.md`

## 데이터 모델
- **DB 변경·마이그레이션 없음.** 기존 인덱스 사용: `leaves(start_date, end_date)`(월 겹침), `leaves(approver_id, status)`(승인 목록), `leaves(user_id, status)`.
- 연도 걸침 신청은 금지(CHECK)이지만 월 걸침은 가능 → 월 조회는 겹침 조건 `start_date <= 월말 AND end_date >= 월초`.

## API 계약

### API-LEAVE-010 (신규): 공유 휴가 캘린더
- `GET /leaves/calendar` · USER(로그인한 모든 사용자, ADMIN·EMPLOYEE 동일 응답)
- Query
  - `month`: 선택, `YYYY-MM`(연도 2000~2100, 월 01~12). 생략 시 Asia/Tokyo 기준 이번 달(`Clock`+`toTokyoDate`, SQL `CURRENT_DATE` 금지)
  - `departmentId`: 선택, UUID 형식. 존재하지 않는 부서면 `items: []`(에러 아님)
  - `name`: 선택, 앞뒤 공백 제거 후 최대 100자, 이름 대소문자 무시 부분 일치. 빈 값은 조건 없음
  - `empId`: 선택, 앞뒤 공백 제거 후 최대 50자, 사원번호 부분 일치. 빈 값은 조건 없음
  - 조건 결합: 모두 AND
- 대상: `status = APPROVED`, `users.is_active = true`, 휴가 기간이 해당 월과 겹침. 휴가 종류 전부(반차 포함)
- Response 200 (페이지네이션 없음 — 월 캘린더가 전체를 필요로 함. NFR-002 예외로 문서 반영)
```json
{
  "month": "2026-11",
  "holidays": [{ "date": "2026-11-03", "name": "文化の日" }],
  "items": [
    {
      "name": "山田 太郎", "empId": "00001", "departmentName": "開発部",
      "startDate": "2026-11-13", "endDate": "2026-11-15",
      "category": "PAID", "halfDay": null
    }
  ]
}
```
- **응답 필드는 위가 전부다.** `id`(leave·user), `reason`, `days`, `leaveType` 원값, `status`, `approver`, `processedBy`, `rejectReason`, `createdAt`은 넣지 않는다(SELECT 단계에서 읽지 않음).
- `category`: ANNUAL·HALF_AM·HALF_PM → `PAID` / SPECIAL → `SPECIAL` / OTHER → `OTHER`(화면은 「休暇」로만 표시하는 마스킹 분류)
- `halfDay`: HALF_AM → `"AM"`, HALF_PM → `"PM"`, 그 외 `null`
- `holidays`: `japaneseHolidaysInRange(월초, 월말)`(`common/time/japanese-holiday.ts`)의 해당 월 공휴일, 날짜 오름차순. 필터와 무관하게 항상 포함
- 정렬: `startDate` 오름차순 → `empId` 오름차순 → `endDate` 오름차순 → `halfDay`(AM 먼저)
- 에러: 400 `VALIDATION_ERROR`(`details[].field` = `month`/`departmentId`/`name`/`empId`), 401, 403 `PASSWORD_CHANGE_REQUIRED`(전역 Guard)

### API-LEAVE-007 (확장): 승인 목록 — `status` 추가
- `GET /leaves/pending-approval` · 기존 권한 그대로(scope=all은 ADMIN만, 아니면 403)
- 추가 Query `status`: `PENDING` / `APPROVED` / `REJECTED`를 쉼표로 복수 지정(`my-leaves-query.dto.ts`의 `commaSeparatedEnum` 재사용·공용화). **생략 시 `PENDING`**(기존 호출 — 사이드바 배지·대시보드 — 동작 불변). `CANCELLED`·기타 값은 400 VALIDATION_ERROR(`status.N`)
- 조회 조건: `scope=mine` → `approverId = 본인 AND status IN (...)` / `scope=all` → `approverId IS NOT NULL AND status IN (...)`(즉시 승인 건 제외. PENDING만이면 기존과 같은 결과)
- 정렬·응답(`Page<Leave>`) 그대로. 승인자 본인 할당분의 `Leave` 전체 필드 반환은 FR-LEAVE-005(할당된 승인자 열람 가능)와 일치
- 건수 3종(承認待ち/承認済み/却下)은 프론트가 `status=X&limit=1`의 `totalCount`로 조회(신규 집계 API 없음)
- 承認 탭 표시 판정: 프론트가 `scope=mine&status=PENDING,APPROVED,REJECTED&limit=1`의 `totalCount > 0`(ADMIN은 항상 표시)

### API-LEAVE-003 (확장): 내 휴가 이력 — 신청일 범위
- 추가 Query `appliedFrom`, `appliedTo`: 선택, 실재하는 `YYYY-MM-DD`(`common/validation/date-schema.ts` `dateSchema` 재사용). 양끝 포함, 한쪽만 지정 가능. **신청일(created_at)의 도쿄 날짜** 기준: `created_at >= appliedFrom 00:00+09:00 AND created_at < (appliedTo+1일) 00:00+09:00`(`tokyo-date.ts` 변환 사용)
- `appliedFrom > appliedTo`이면 400 VALIDATION_ERROR(field `appliedTo`)
- 기존 `year`·`status`·`leaveType`·정렬은 그대로 유지(호환). 프론트는 더 이상 `year`를 보내지 않음

## 처리 로직
- Controller(`leaves.controller.ts`): `@Get('calendar')`를 `:id`보다 **먼저** 선언(기존 주석 규칙). `@Query({ schema: leaveCalendarQuerySchema })` → `leavesService.getCalendar(query)`만 호출
- Service(`leaves.service.ts`)
  - `getCalendar(query)`: month 결정 → `monthRange(month)`(`common/time/calendar-rules.ts`) → Repository `findApprovedInRange` → `toCalendarItem` 매핑 + 공휴일 Map → 배열 변환
  - `listPendingApproval`: `query.status ?? ['PENDING']`를 Repository로 전달
  - `listMine`: `appliedFrom/To` → `createdAtFrom/createdAtTo(Date)` 변환 후 전달
- Repository(`leaves.repository.ts`)
  - 신규 `findApprovedInRange({ start, end, departmentId?, name?, empId? })`: `leave.findMany({ where: { status: 'APPROVED', startDate: { lte: end }, endDate: { gte: start }, user: { isActive: true, departmentId?, name: { contains, mode: 'insensitive' }?, empId: { contains }? } }, select: { leaveType, startDate, endDate, user: { select: { name, empId, department: { select: { name } } } } }, orderBy: [{ startDate: 'asc' }, { user: { empId: 'asc' } }, { endDate: 'asc' }, { leaveType: 'asc' }] })` — 쿼리 1회, `reason` 미조회
  - `findPending` → `statuses: LeaveStatus[]` 받도록 변경(`scope=all`이면 `approverId: { not: null }` 추가)
  - `findByUser`에 `createdAtFrom?`, `createdAtTo?`(lt) 조건 추가
- 순수 함수 신규 `leaves/leave-calendar-rules.ts`: `toCalendarCategory(leaveType)`, `toHalfDay(leaveType)`, `CalendarItem`/`CalendarResponse` 타입. 단위 테스트 포함
- DTO 신규 `dto/leave-calendar-query.dto.ts`(month 정규식 + 범위, departmentId `z.uuid()`, name/empId `trim().max()` 빈 문자열→undefined). `commaSeparatedEnum`은 `dto/comma-separated-enum.ts`로 분리해 두 DTO가 import

## 보안 요구사항
- 캘린더 응답은 위 7필드 + 공휴일만. PENDING·REJECTED·CANCELLED·비활성 사원 건이 목록·건수로 드러나지 않을 것
- 사유·잔여 일수·승인 메모·반려 이력은 SELECT하지 않는다(매핑 실수 방지)
- 검색어는 Prisma 파라미터 바인딩만(`$queryRaw` 문자열 결합 금지). 로그에 검색어·사원 정보를 남기지 않음
- 승인 목록 확장은 권한 판정 코드(`scope=all` ADMIN 검사, `canViewLeave`, approve/reject 검증)를 변경하지 않는다

## 생성·수정 파일
- 신규 `backend/src/modules/leaves/dto/leave-calendar-query.dto.ts`, `dto/comma-separated-enum.ts`, `leave-calendar-rules.ts`, `leave-calendar-rules.spec.ts`
- 수정 `leaves.controller.ts`, `leaves.service.ts`, `leaves.repository.ts`, `dto/my-leaves-query.dto.ts`, `dto/pending-approval-query.dto.ts`
- 신규 e2e `backend/test/leave-calendar.e2e-spec.ts`, 수정 기존 승인·이력 e2e(아래 test-plan)
- 신규 개발 DB 픽스처 `backend/prisma/e2e-leave-calendar-fixture.ts` + `package.json` `db:e2e-leave-calendar-fixture`: 샘플 사원(10001~10012, `db:sample-users` 선행)의 지정 월(인자 `--month=YYYY-MM`, 기본 이번 달) 휴가를 삭제 후 재생성 — APPROVED(종일·연속·월 걸침·AM·PM·SPECIAL·OTHER, 한 날짜 5명 이상), PENDING·REJECTED·CANCELLED 각 1건, 일부는 E2E 관리자 900001을 승인자로 지정(承認 탭 건수용). localhost만·production 거부(`assertLocalDatabaseUrl`)

## 참고할 기존 파일
- `backend/src/modules/leaves/dto/my-leaves-query.dto.ts`(commaSeparatedEnum), `dto/leave-balance-query.dto.ts`
- `backend/src/common/time/calendar-rules.ts`(`monthRange`), `japanese-holiday.ts`, `tokyo-date.ts`, `clock.ts`
- `backend/src/modules/attendance/attendance-sheet.service.ts`(월·공휴일 조립 예)
- `backend/prisma/e2e-attendance-fixture.ts`, `e2e-account-data.ts`, `sample-users-data.ts`
- `backend/test/e2e-helpers.ts`(`insertLeave`, `FixedClock`), `test/db/db-helpers.ts`

## 문서 갱신 예정 (구현 후 backend.md에 확정 기재)
- 06 §4: API-LEAVE-010 추가, API-LEAVE-007 `status`, API-LEAVE-003 `appliedFrom/To`
- 02: FR-LEAVE-005에 공유 캘린더 공개 규칙(대상·공개 필드·category 마스킹), FR-LEAVE-003에 처리 완료 목록(status) 조회 범위
- 08: IT 케이스·권한 매트릭스에 API-LEAVE-010 추가
