# 대시보드 — 백엔드 설계

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/06_API_SPECIFICATION.md` — §0 공통 규칙(공통 객체 `UserSummary`·`Leave`·`Attendance`, 페이지네이션), API-DASH-001, API-ATT-001~003, API-LEAVE-004, 006, 007, 008, 009
- `docs/02_REQUIREMENTS.md` — FR-ATT-001, FR-ATT-002, FR-LEAVE-001(잔여 연차·차감 일수 표), FR-LEAVE-002, FR-LEAVE-003, FR-LEAVE-005, FR-LEAVE-006, FR-DASH-001
- `docs/05_DATABASE_DESIGN.md` — §4 attendance(근태 상태 계산), §6 leaves(상태별 저장 규칙), §8 Data Integrity(조건부 UPDATE), §9 날짜·시간과 타입 처리
- `docs/07_ARCHITECTURE.md` — §3 Authentication(Role Guard, 리소스 권한은 Service)

## 데이터 모델
- 스키마·마이그레이션 변경 없음. 기존 `Attendance`, `Leave`, `LeaveGrant`, `User`, `Department` 사용

## 공통 기반 (신규)
### 시계와 도쿄 날짜 (05 §9, 08 §3)
- `src/common/time/clock.ts`: `abstract class Clock { abstract now(): Date }`, `SystemClock`(실제 시각)
- `src/common/time/time.module.ts`: `@Global()` 모듈, `{ provide: Clock, useClass: SystemClock }` export. AppModule에 등록
- `src/common/time/tokyo-date.ts` (순수 함수)
  - `toTokyoDate(instant: Date): string` → `'YYYY-MM-DD'`(Asia/Tokyo)
  - `toDbDate(ymd: string): Date` / `fromDbDate(date: Date): string` (05 §9의 변환 규칙)
  - `formatTokyoDateTime(instant: Date): string` → `2026-11-08T09:01:00+09:00`(초 단위, 06 §0)
  - `tokyoYear(instant: Date): number`
- SQL에서 `CURRENT_DATE`·`now()::date` 금지. "오늘"은 항상 Service에서 `toTokyoDate(clock.now())`로 만들어 Repository에 전달

### 페이지네이션 (06 §0)
- `src/common/pagination/pagination.ts`: zod `paginationQuerySchema`(`page` 기본 1·정수≥1, `limit` 기본 20·정수 1~100, query 문자열 coerce), `toPage<T>(items, totalCount, page, limit)` → `{items, page, limit, totalCount, totalPages}`(`totalPages = ceil(totalCount/limit)`, 0건이면 0)

### 공통 매퍼
- `src/common/mappers/user-summary.ts`: `toUserSummary(user + department)` → `{id, name, empId, departmentName}`(부서 없으면 `null`)

### Role Guard (07 §3)
- `src/modules/auth/decorators/admin-only.decorator.ts`: `@AdminOnly()` (SetMetadata)
- `src/modules/auth/guards/admin.guard.ts`: 메타데이터가 있으면 `request.user.role === 'ADMIN'`이 아니면 `ForbiddenException`(필터가 403 FORBIDDEN으로 변환). user 없으면 401(fail-closed, PasswordChangeGuard와 같은 방식)
- `JwtAuthGuard`: 인증 → `PasswordChangeGuard` → `AdminGuard` 순서로 호출(기존 "Guard는 하나, 순서는 코드로 고정" 방식 유지). `AuthModule` providers에 추가
- 경로 문자열(`/admin`) 매칭은 쓰지 않는다(Express 라우팅이 대소문자 무시라 우회 가능). 모든 `/admin/*` 컨트롤러는 클래스에 `@AdminOnly()`를 붙인다

## API 계약
06과 동일하게 구현한다. 아래는 이번 구현에서 정할 세부사항만 적는다. 모두 06에 있는 엔드포인트(신규 없음). 권한 표기는 06 그대로.

### API-DASH-001 `GET /admin/dashboard/summary` · ADMIN
- 응답: `{ "date": "2026-11-09", "clockedInCount": 42, "notClockedInCount": 5, "onLeaveCount": 3, "pendingLeaveCount": 7 }`
- 집계 정의 (today = 도쿄 오늘, 대상은 `is_active = true` 사용자만, 역할 무관)
  - clockedInCount: today에 attendance 행이 있는 활성 사용자 수
  - onLeaveCount: `status = APPROVED AND start_date <= today <= end_date`인 휴가가 있는 활성 사용자 수(종류 무관, 반차 포함, 사용자 단위 중복 제거)
  - notClockedInCount: today attendance 없음 AND 위 휴가 없음인 활성 사용자 수
  - pendingLeaveCount: 전체 `status = PENDING` 건수(신청자·승인자 활성 여부 무관)
- 에러: 401, 403 FORBIDDEN(비ADMIN), 403 PASSWORD_CHANGE_REQUIRED
- 쿼리 4개는 Prisma `count`로(필요한 컬럼만). N+1 금지

### API-ATT-001 `POST /attendance/clock-in` · USER → 201 `Attendance`
- now = clock.now(), workDate = toTokyoDate(now). clock_in과 work_date는 같은 now에서 계산(05 §9)
- 이미 today 행이 있으면 409 `ALREADY_CLOCKED_IN`. 동시 요청은 INSERT의 UNIQUE(user_id, work_date) 위반(P2002)을 잡아 같은 409로 변환
- 이전 근무일 미퇴근 기록이 있어도 허용(FR-ATT-001)

### API-ATT-002 `POST /attendance/clock-out` · USER → 200 `Attendance`
- `updateMany WHERE user_id = me AND work_date = today AND clock_out IS NULL` SET clock_out = now (조건부 UPDATE, 05 §8)
- 0건이면 today 행을 조회: 없음 → 409 `NOT_CLOCKED_IN`, clock_out 있음 → 409 `ALREADY_CLOCKED_OUT`
- 이전 근무일 행은 대상이 아니다(FR-ATT-002)

### API-ATT-003 `GET /attendance/today` · USER → 200 `Attendance` 또는 `null`
- 행이 없으면 **본문이 JSON 리터럴 `null`**(Content-Type application/json)이어야 한다. Nest가 null 반환 시 빈 본문을 보내므로 컨트롤러에서 명시적으로 처리할 것(e2e에서 `res.text === 'null'` 확인)

### Attendance 매핑 (06 §0 `Attendance`)
- `workMinutes`: clock_out 있으면 `floor((clockOut - clockIn) / 60000)`, 없으면 null
- `status`: clock_out 있음 → `DONE` / work_date = today → `WORKING` / 그 외 → `MISSING_CLOCK_OUT` (05 §4). 순수 함수로 분리해 단위 테스트
- `clockIn`·`clockOut`은 `formatTokyoDateTime`, `workDate`는 `fromDbDate`

### API-LEAVE-006 `GET /leaves/balance?year=` · USER
- `year`: 선택, 기본 `tokyoYear(clock.now())`. 정수 2000~2100, 범위 밖·비정수는 400 VALIDATION_ERROR (DOC_ISSUES)
- grantedDays: leave_grants(me, year), 없으면 0
- approvedDays / pendingDays: 본인 휴가 중 `leave_type IN (ANNUAL, HALF_AM, HALF_PM)` AND `EXTRACT(YEAR FROM start_date) = year`(= `start_date`가 `year-01-01`~`year-12-31`, 범위 조건으로 조회) AND status별 `days` 합계
- remainingDays = granted − approved − pending
- Decimal은 `toNumber()`로 변환(05 §9). 계산은 순수 함수로 분리해 UT-LV-07~09 단위 테스트

### API-LEAVE-007 `GET /leaves/pending-approval?scope=&page=&limit=` · USER
- `scope`: `mine`(기본) / `all`. 그 외 값은 400 VALIDATION_ERROR. `all`을 비ADMIN이 호출하면 403 FORBIDDEN(Service에서 판단, 07 §3)
- mine: `approver_id = me AND status = PENDING` / all: `status = PENDING`
- 정렬: `created_at DESC, id DESC`. 응답: 페이지네이션(`Leave[]`)
- `user`·`approver`는 department까지 include 하여 한 쿼리로 조회(N+1 금지). `findMany` + `count`

### API-LEAVE-004 `GET /leaves/:id` · USER(신청자·할당된 승인자·ADMIN)
- :id가 UUID 형식이 아니면 404 NOT_FOUND(Prisma 오류로 500이 나지 않게, DOC_ISSUES)
- 없음 → 404, 권한 없음 → 403 FORBIDDEN (존재 확인 후 권한 확인)

### API-LEAVE-008 `PATCH /leaves/:id/approve` · USER(할당된 승인자 또는 ADMIN)
- 처리 순서: ① 조회(없으면 404) ② 권한: 신청자 본인이면 403(ADMIN 포함), `approver_id ≠ me` 이고 ADMIN도 아니면 403 ③ `updateMany WHERE id AND status = PENDING` SET status=APPROVED, processed_by=me, processed_at=now ④ 0건 → 409 `ALREADY_PROCESSED` ⑤ 갱신 후 다시 조회해 `Leave` 반환
- 즉시 승인 건(approver_id NULL)은 ADMIN이면 ③에서 0건 → 409(IT-APV-09), 비ADMIN이면 ②에서 403
- 잔여 연차·중복 재검사 없음(FR-LEAVE-002)
- 권한 판정은 순수 함수 `canProcessLeave(leave, user)`로 분리(프론트 버튼 표시 조건과 동일 규칙)

### API-LEAVE-009 `PATCH /leaves/:id/reject` · USER
- Body `{ "rejectReason": "..." }` — zod: 문자열, 앞뒤 공백 제거 후 1~500자. 실패 시 400 VALIDATION_ERROR + details[{field:"rejectReason"}]
- 나머지 순서·에러는 approve와 같고, SET에 status=REJECTED, reject_reason 추가

### Leave 매핑 (06 §0 `Leave`)
- `autoApproved = approver_id IS NULL`, `processedBy`는 처리자 `UserSummary` 또는 null(06 예시가 null뿐이라 형태 미정 → `UserSummary`로 정함, DOC_ISSUES), `processedAt`·`createdAt`은 `formatTokyoDateTime`, `days`는 number
- processedBy 객체화를 위해 processor 관계도 include

## 에러 message (일본어, AppException)
- ALREADY_CLOCKED_IN 「本日の出勤はすでに登録されています。」/ NOT_CLOCKED_IN 「本日の出勤記録がありません。」/ ALREADY_CLOCKED_OUT 「本日の退勤はすでに登録されています。」/ ALREADY_PROCESSED 「すでに処理された申請です。」 (SCR-002 §7 의미 기준, 문구는 구현 시 조정 가능)

## 보안 요구사항
- 모든 신규 API는 전역 JwtAuthGuard 하에 있음(@Public 금지). mustChangePassword 사용자는 403 PASSWORD_CHANGE_REQUIRED(데코레이터 추가 금지)
- 본인 데이터만: attendance·balance는 `@CurrentUser().id`로만 조회. 요청에서 userId를 받지 않는다
- 휴가 상세·승인·반려의 리소스 권한은 Service에서 검증(프론트 표시 여부와 무관)
- 응답에 password_hash 등 users 민감 컬럼이 섞이지 않게 `select`/매퍼로 필요한 필드만 반환

## 파일
신규
- `src/common/time/clock.ts`, `tokyo-date.ts`, `tokyo-date.spec.ts`, `time.module.ts`
- `src/common/pagination/pagination.ts`, `pagination.spec.ts`
- `src/common/mappers/user-summary.ts`
- `src/modules/auth/decorators/admin-only.decorator.ts`, `src/modules/auth/guards/admin.guard.ts`
- `src/modules/attendance/` attendance.module.ts, attendance.controller.ts, attendance.service.ts, attendance.repository.ts, attendance.mapper.ts, attendance.service.spec.ts, attendance.mapper.spec.ts
- `src/modules/leaves/` leaves.module.ts, leaves.controller.ts(`balance`·`pending-approval`을 `:id`보다 먼저 선언), leaves.service.ts, leaves.repository.ts, leave.mapper.ts, leave-rules.ts(`calculateBalance`, `canProcessLeave`), leave-rules.spec.ts, leaves.service.spec.ts, dto/leave-balance-query.dto.ts, dto/pending-approval-query.dto.ts, dto/reject-leave.dto.ts
- `src/modules/dashboard/` dashboard.module.ts, admin-dashboard.controller.ts(`@Controller('admin/dashboard')` + `@AdminOnly()`), dashboard.service.ts, dashboard.repository.ts
- `test/attendance.e2e-spec.ts`, `test/leaves.e2e-spec.ts`, `test/admin-dashboard.e2e-spec.ts`
수정
- `src/app.module.ts`(TimeModule, AttendanceModule, LeavesModule, DashboardModule)
- `src/modules/auth/guards/jwt-auth.guard.ts`, `src/modules/auth/auth.module.ts`, `src/modules/auth/guards/guards.spec.ts`
- `test/db/db-helpers.ts`(필요 시 `createLeave`·`createAttendance`·`createLeaveGrant` 헬퍼 추가. cleanup은 이미 대응)

참고할 기존 파일
- `src/modules/auth/auth.controller.ts`·`auth.service.ts`·`auth.repository.ts`(계층 분리, AppException 사용)
- `src/modules/auth/guards/password-change.guard.ts`(Guard 작성 방식)
- `src/common/pipes/validation.pipe.ts`, `src/modules/auth/dto/*.dto.ts`(zod DTO, `@Body({ schema })` — Query에도 같은 방식이 되는지 확인하고 없으면 동일 방식으로 `@Query({ schema })` 지원 추가)
- `test/auth.e2e-spec.ts`(Test 모듈 구성, 로그인 토큰 획득)

## 문서 갱신 예정 (구현 후 backend.md에 확정 내용 기록)
- 06: API-LEAVE-006 year 범위, :id 비UUID → 404, API-ATT-003 null 본문, `Leave.processedBy` 형태
- 10: §4 Role Guard, §5 ATT-001~003·시계 유틸, §6 LEAVE-004·006, §7 LEAVE-007~009, §9 DASH-001
