# 근태 관리 — 백엔드 설계

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/06_API_SPECIFICATION.md` — §0 페이지네이션·공통 Error·공통 객체 `Attendance`, §3 API-ATT-004·005·006, §5 API-DEPT-001
- `docs/02_REQUIREMENTS.md` — FR-ATT-003, FR-ATT-004, FR-ATT-005, §3 업무 규칙
- `docs/05_DATABASE_DESIGN.md` — §4 attendance(제약·근태 상태 계산), §7 Index, §9 날짜·시간 처리
- `docs/07_ARCHITECTURE.md` — §3 인증·Guard 구성
- `docs/08_TEST_PLAN.md` — §5.2 IT-ATT-07~12, §6 권한 매트릭스

## 데이터 모델
- 스키마·마이그레이션 변경 없음. `attendance.modified_by` / `modified_at`은 이미 있음(`prisma/schema.prisma` `Attendance`)
- 인덱스는 기존 `attendance(user_id, work_date)` UNIQUE와 `attendance(work_date)`로 충분(본인 조회는 앞의 것, 전체 조회는 뒤의 것)

## 공통 객체 변경 (DOC_ISSUES 확정분)
`Attendance`에 `modifiedAt` 추가. ATT-001~006 응답 모두에 포함한다.
```json
{ "id": "uuid", "user": { "...UserSummary" }, "workDate": "2026-11-07",
  "clockIn": "2026-11-07T09:00:00+09:00", "clockOut": "2026-11-07T18:00:00+09:00",
  "workMinutes": 540, "status": "DONE", "modifiedAt": "2026-11-09T10:12:00+09:00" }
```
- 관리자가 수정하지 않은 기록은 `modifiedAt: null`. 수정자 ID는 응답에 넣지 않는다(화면에서 쓰지 않음)

## API 계약

### API-ATT-004 내 근태 이력 — `GET /api/v1/attendance` · USER
- Query: `startDate`, `endDate`(`YYYY-MM-DD`, 선택), `page`, `limit`(`paginationQuerySchema`)
- 기본값: `startDate` 생략 시 도쿄 기준 이번 달 1일, `endDate` 생략 시 도쿄 기준 오늘(각각 따로 적용)
- 조건: `user_id = 토큰의 사용자`. 사용자 지정 파라미터는 받지 않는다(zod 스키마에 없는 키는 무시)
- 정렬: `workDate desc`(사용자당 근무일 1건이므로 2차 정렬 불필요)
- Response 200: `Page<Attendance>`
- 에러
  - 400 VALIDATION_ERROR: 날짜 형식 오류(`2026-13-01`, `2026/11/01` 등), page·limit 범위 위반
  - 400 INVALID_DATE_RANGE: `startDate > endDate` → `開始日は終了日より後にできません。` / 양끝 포함 일수 > 366 → `照会期間は最大1年です。`

### API-ATT-005 전체 근태 조회 — `GET /api/v1/admin/attendance` · ADMIN
- Query: `name`(앞뒤 공백 제거, 빈 문자열이면 무시, 최대 100자), `departmentId`(UUID), `startDate`, `endDate`, `status`(`WORKING`/`DONE`/`MISSING_CLOCK_OUT`), `page`, `limit`
- 기간 기본값·검증·에러는 ATT-004와 같음
- 조건
  - `name`: `user.name contains (insensitive)`
  - `departmentId`: `user.departmentId = ?`. 없는 부서면 빈 목록(200)
  - `status` (today = 도쿄 오늘, `toDbDate`)
    - WORKING: `workDate = today AND clockOut IS NULL`
    - DONE: `clockOut IS NOT NULL`
    - MISSING_CLOCK_OUT: `workDate < today AND clockOut IS NULL`
  - 비활성 사용자의 기록도 포함한다
- 정렬: `[{ workDate: 'desc' }, { user: { name: 'asc' } }, { id: 'asc' }]`
- Response 200: `Page<Attendance>`
- 에러: 400 VALIDATION_ERROR(형식 오류, UUID가 아닌 departmentId, 정의되지 않은 status) / 400 INVALID_DATE_RANGE / 401 / 403 FORBIDDEN(비관리자) / 403 PASSWORD_CHANGE_REQUIRED

### API-ATT-006 근태 수정 — `PATCH /api/v1/admin/attendance/:id` · ADMIN
Request
```json
{ "clockIn": "2026-11-07T09:00:00+09:00", "clockOut": "2026-11-07T18:00:00+09:00" }
```
- `clockIn`: 필수, ISO-8601 일시(오프셋 필수, `z.iso.datetime({ offset: true })`)
- `clockOut`: 필수 키, 같은 형식 또는 `null`(퇴근 없음)
- Response 200: 수정 후 `Attendance`
- 에러
  - 400 VALIDATION_ERROR: 형식 오류, 키 누락
  - 400 INVALID_TIME_RANGE(`出退勤時刻を確認してください。`): 다음 중 하나라도 해당
    1. `toTokyoDate(clockIn) !== 기록의 workDate`
    2. `clockOut !== null && clockOut <= clockIn`
    3. `clockOut !== null && clockOut - clockIn > 24시간`(정확히 24시간은 허용, 05 §4 CHECK와 같음)
  - 404 NOT_FOUND: UUID가 아닌 id, 기록 없음
  - 401 / 403 FORBIDDEN / 403 PASSWORD_CHANGE_REQUIRED

### API-DEPT-001 부서 목록 — `GET /api/v1/departments` · USER
- Response 200: `[{ "id": "uuid", "name": "開発チーム" }]`, `name asc`. 페이지네이션 없음

## 처리 로직
- 기간 해석·검증: 순수 함수 `resolveDateRange({ startDate?, endDate? }, today): { startDate, endDate }` — 기본값을 채운 뒤 순서·길이 검증, 위반 시 `AppException('INVALID_DATE_RANGE', 400, ...)`. 양끝 포함 일수는 `(toDbDate(end) - toDbDate(start)) / 86400000 + 1`
- 시각 검증: 순수 함수 `assertValidTimeRange({ workDate, clockIn, clockOut })` — 위 1~3 규칙, 위반 시 INVALID_TIME_RANGE
- "오늘"은 반드시 `Clock.now()` → `toTokyoDate`(05 §9). SQL에서 `CURRENT_DATE` 금지
- 목록 조회: `findMany` + `count`를 `$transaction([...])`로 같은 where로 실행, `toPage`로 응답. `toSkipTake` 사용
- 수정 순서: id UUID 검사(`z.guid()`, 실패 시 `NotFoundException`) → `findById` → 없으면 404 → `assertValidTimeRange` → `update({ clockIn, clockOut, modifiedBy: admin.id, modifiedAt: clock.now() })` → 응답 매핑(today 기준 상태)
  - 잠금 없음: 동시 수정은 나중 값이 남는다. 사용자의 퇴근 등록은 기존 `WHERE clock_out IS NULL` 조건부 UPDATE이므로 관리자가 퇴근을 넣은 뒤에는 ALREADY_CLOCKED_OUT이 된다
  - 업데이트 시점에 행이 사라진 경우(P2025)는 물리 삭제가 없으므로 처리하지 않는다
- 매퍼: `toAttendanceResponse`에 `modifiedAt: row.modifiedAt ? formatTokyoDateTime(row.modifiedAt) : null` 추가, `ATTENDANCE_SELECT`에 `modifiedAt: true` 추가

## 보안 요구사항
- 본인 이력 컨트롤러는 `@CurrentUser().id`만 서비스로 넘긴다. Query DTO에 `userId` 같은 필드를 만들지 않는다(IT-ATT-11)
- `AdminAttendanceController`는 클래스에 `@AdminOnly()`(대시보드 `admin-dashboard.controller.ts`와 같은 방식)
- `/departments`는 USER 권한(전역 JwtAuthGuard만). 부서명 외 정보 노출 금지
- `name` 검색은 Prisma 파라미터 바인딩(`contains`)만 사용, raw SQL 금지
- 에러 message에 내부 정보(SQL, 스택) 포함 금지 — 기존 AllExceptionsFilter 경로 유지. DB CHECK 위반이 새어 나오면 500이 되므로 서비스 검증이 반드시 먼저 실행되어야 한다

## 파일
수정
- `backend/src/modules/attendance/attendance.repository.ts` — SELECT에 modifiedAt, `findPageByUser`, `findPage`(관리자 where 조립 포함), `findById`, `updateTimes`
- `backend/src/modules/attendance/attendance.mapper.ts`(+ `.spec.ts`) — `modifiedAt`
- `backend/src/modules/attendance/attendance.service.ts` — `listMine(userId, query)`, `listAll(query)`, `update(adminId, id, dto)`
- `backend/src/modules/attendance/attendance.controller.ts` — `@Get()` 추가(기존 `today`·`clock-in`·`clock-out` 유지)
- `backend/src/modules/attendance/attendance.module.ts` — AdminAttendanceController 등록
- `backend/src/app.module.ts` — DepartmentsModule 등록
- `backend/test/attendance.e2e-spec.ts` — ATT-004, `modifiedAt` 필드 확인
- `backend/test/e2e-helpers.ts` — `insertAttendance`에 `modifiedBy`·`modifiedAt` 선택 인자

신규
- `backend/src/modules/attendance/admin-attendance.controller.ts` — `@Controller('admin/attendance')`, `GET`, `PATCH ':id'`
- `backend/src/modules/attendance/attendance-rules.ts`(+ `attendance-rules.spec.ts`) — `resolveDateRange`, `assertValidTimeRange`, `MAX_RANGE_DAYS = 366`
- `backend/src/modules/attendance/dto/attendance-history-query.dto.ts` — `paginationQuerySchema.extend({ startDate, endDate })`(`z.iso.date().optional()`)
- `backend/src/modules/attendance/dto/admin-attendance-query.dto.ts` — 위 + `name`, `departmentId`(`z.guid()`), `status`
- `backend/src/modules/attendance/dto/update-attendance.dto.ts`
- `backend/src/modules/departments/departments.{controller,service,repository,module}.ts`
- `backend/test/admin-attendance.e2e-spec.ts`, `backend/test/departments.e2e-spec.ts`

참고할 기존 파일
- `backend/src/modules/leaves/leaves.controller.ts`(`@Query({ schema })`), `leaves.service.ts`(`uuidSchema`·`NotFoundException`), `leaves.repository.ts`(페이지 조회)
- `backend/src/modules/leaves/dto/pending-approval-query.dto.ts`, `common/pagination/pagination.ts`, `common/time/tokyo-date.ts`, `common/time/clock.ts`
- `backend/src/modules/dashboard/admin-dashboard.controller.ts`(`@AdminOnly()`)

## 문서 갱신 예정 (구현 후 backend.md에 확정 내용 기록)
- 06 §0 `Attendance`에 `modifiedAt`, §3 ATT-004 기본 기간·VALIDATION_ERROR·기간 계산, ATT-005 name·비활성 포함, ATT-006 `clockOut: null` 허용·404 조건
