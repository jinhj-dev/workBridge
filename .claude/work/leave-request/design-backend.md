# design-backend: 휴가 신청·조회·취소

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/06_API_SPECIFICATION.md` → §0 "공통 Error Response", "공통 객체"(`Leave`), "페이지네이션" / §4 "API-LEAVE-001", "API-LEAVE-002", "API-LEAVE-003", "API-LEAVE-005"
- `docs/02_REQUIREMENTS.md` → FR-LEAVE-001, FR-LEAVE-004, FR-LEAVE-005, NFR-004
- `docs/05_DATABASE_DESIGN.md` → §6 "Table: leaves"(Constraints, 상태별 저장 규칙), §8 "사용자 단위 잠금", "휴가 신청 처리 순서", §9
- `docs/08_TEST_PLAN.md` → §4 UT-LV-01~09, §5.3 IT-LV-01~17, §5.4 IT-CAN-01~05

## 데이터 모델
- 변경 없음. `leaves`·`users`·`leave_grants` 테이블과 CHECK 제약은 init 마이그레이션에 이미 있다. **마이그레이션 만들지 않는다.**
- DB CHECK가 최종 방어선이지만, 모든 규칙은 애플리케이션에서 먼저 검사해 정해진 에러 코드로 응답한다(CHECK 위반으로 500이 나면 안 됨).

## API 계약 (06 §4와 일치, 모두 06에 있음. 신규 엔드포인트 없음)
라우트 선언 순서: `balance`, `pending-approval`, `approvers`, `me`(고정 경로) → `:id` 계열. `POST /leaves`는 클래스 루트.

### API-LEAVE-001 `POST /leaves` · USER
요청: `{ "leaveType": "ANNUAL", "startDate": "2026-11-10", "endDate": "2026-11-11", "reason": "私用", "approverId": "uuid" }`
응답 201: `Leave`(즉시 승인이면 `status=APPROVED, autoApproved=true, approver=null, processedBy=신청자`)

zod(`dto/create-leave.dto.ts`, 실패 시 400 VALIDATION_ERROR + details):
- `leaveType`: enum 5종 필수
- `startDate`/`endDate`: 필수, `YYYY-MM-DD` 형식이며 실제 존재하는 날짜(형식 오류는 VALIDATION_ERROR)
- `reason`: 문자열 필수, **trim 후 1~500자**(trim한 값 저장, rejectReason과 같은 방식. DOC_ISSUE)
- `approverId`: 선택 문자열(형식은 zod에서 검사하지 않음 → 아래 서비스 규칙)

서비스 규칙(순서대로, 트랜잭션 전 = 순수 함수):
1. `startDate > endDate` → 400 `INVALID_DATE_RANGE`
2. 연도가 다름 → 400 `INVALID_DATE_RANGE`
3. 반차(HALF_AM/HALF_PM)인데 `startDate ≠ endDate` → 400 `INVALID_DATE_RANGE`
4. `days = countLeaveDays(type, start, end)`(토·일 제외, 반차 0.5, 공휴일 미제외). 0이면 400 `NO_WORKING_DAYS`
- 시작일이 과거여도 허용한다(문서에 제한 없음. DOC_ISSUE로 보고)

트랜잭션(05 §8 "휴가 신청 처리 순서" 그대로):
1. `SELECT is_active, approval_required FROM users WHERE id = $1 FOR NO KEY UPDATE`(`tx.$queryRaw` 태그드 템플릿, 문자열 연결 금지)
2. 행 없음 또는 `is_active = false` → `UnauthorizedException`(401, 가드와 같은 처리)
3. 잠근 행의 `approval_required`로 판단
   - true: `approverId` 없음/빈 문자열 → 400 `APPROVER_REQUIRED`. UUID 형식 아님·본인·존재하지 않음·비활성 → 400 `INVALID_APPROVER`(승인자 행은 잠그지 않고 tx 안에서 조회만)
   - false: `approverId`는 무시(null로 저장)
4. 날짜 중복: 본인 + status IN (PENDING, APPROVED) + `start_date <= 새 end AND end_date >= 새 start`인 행을 조회 → `isLeaveConflict`로 판정. 같은 날의 HALF_AM↔HALF_PM 조합만 비충돌(같은 종류 반차끼리, 반차↔종일은 충돌) → 409 `LEAVE_CONFLICT`
5. 잔여 연차: 차감 대상(ANNUAL/HALF_AM/HALF_PM)일 때만. 시작일 연도의 부여일(없으면 0) − 같은 연도 APPROVED+PENDING 차감 일수 합 < days → 422 `INSUFFICIENT_LEAVE_BALANCE`, message에 잔여 일수 포함(예: `年次休暇の残日数が不足しています。(残り 2.5 日)`)
6. INSERT. `now = clock.now()`를 한 번만 구해 `createdAt`에 명시 저장. 승인 필요: `status=PENDING, approverId`. 즉시 승인: `status=APPROVED, approverId=null, processedBy=신청자, processedAt=now`
7. 트랜잭션 밖에서 `findById`로 다시 읽어 `toLeaveResponse`

### API-LEAVE-002 `GET /leaves/approvers` · USER
- Query(`dto/approvers-query.dto.ts`): `keyword` 선택, trim 후 최대 100자(초과 400 VALIDATION_ERROR). 빈 값이면 조건 없음
- 조건: `is_active = true AND id <> 본인`. keyword가 있으면 이름(대소문자 무시) 또는 사원번호 **부분 일치**
- 정렬: 사원번호 오름차순. 페이지네이션 없음(06 그대로 `UserSummary[]`)
- `USER_SUMMARY_SELECT`/`toUserSummary` 재사용

### API-LEAVE-003 `GET /leaves/me` · USER
- Query(`dto/my-leaves-query.dto.ts`): `paginationQuerySchema.extend({ year: 2000~2100 정수 선택, status: LeaveStatus 4종 선택 })`. 범위·enum 밖은 400 VALIDATION_ERROR. `year` 생략 시 전체 연도
- 조건: `userId = 본인`(파라미터로 다른 사용자 지정 불가), year는 `start_date`의 연도(`toDbDate('YYYY-01-01')`~`'YYYY-12-31'`)
- 정렬 `createdAt desc, id desc`. 응답 `Page<LeaveResponse>`(`toPage`)

### API-LEAVE-005 `PATCH /leaves/:id/cancel` · USER(신청자만)
- 본문 없음. 응답 200 `Leave`(status=CANCELLED)
- 순서: 404(UUID 아님 포함, 기존 `findLeaveOrThrow`) → 신청자 아님 403(`ForbiddenException`, ADMIN도 403) → 조건부 UPDATE → 0건이면 409 `NOT_CANCELLABLE` → 재조회
- 조건부 UPDATE(05 §8): `WHERE id AND user_id = 본인 AND (status = 'PENDING' OR (status = 'APPROVED' AND approver_id IS NULL AND start_date > 오늘))`, `오늘 = toTokyoDate(clock.now())`를 `toDbDate`로 전달(SQL의 CURRENT_DATE 금지)
- SET `status=CANCELLED, processedBy=본인, processedAt=now`(approverId·rejectReason 유지)
- 404 행은 06에 없지만 다른 :id API와 같게 둔다(DOC_ISSUE)

## 에러 message (일본어, 프론트가 그대로 보여주는 것)
| code | message 예 |
|---|---|
| INVALID_DATE_RANGE | 사유별: `終了日は開始日より前にできません。` / `年をまたぐ休暇は年ごとに分けて申請してください。` / `半休は開始日と終了日を同じ日にしてください。` |
| NO_WORKING_DAYS | `申請期間に勤務日がありません。` |
| APPROVER_REQUIRED | `承認者を選択してください。` |
| INVALID_APPROVER | `承認者を選び直してください。` |
| LEAVE_CONFLICT | `その期間にはすでに申請された休暇があります。` |
| INSUFFICIENT_LEAVE_BALANCE | 위 5 참조(잔여 일수 포함) |
| NOT_CANCELLABLE | `取り消せない状態です。` |

## 보안 요구사항
- 모든 엔드포인트는 전역 JwtAuthGuard(USER). 대상 사용자는 항상 `@CurrentUser().id`에서만 정한다(요청 본문·Query의 사용자 ID 받지 않음)
- 취소는 서비스 403 + UPDATE의 `user_id` 조건으로 이중 차단
- 신청 판단은 잠근 행에서 다시 읽은 값만 사용(토큰·AuthUser의 `approvalRequired` 사용 금지)
- raw SQL은 잠금 1건만, 태그드 템플릿으로 바인딩
- 승인자 후보 응답은 `UserSummary` 필드만(역할·활성 여부·해시 노출 금지)

## 생성·수정 파일
수정
- `backend/src/modules/leaves/leaves.controller.ts` — 4개 핸들러 추가(`create`, `listApprovers`, `listMine`, `cancel`)
- `backend/src/modules/leaves/leaves.service.ts` — `create`, `listApprovers`, `listMine`, `cancel`
- `backend/src/modules/leaves/leaves.repository.ts` — 잠금 트랜잭션 실행(예: `createWithUserLock(userId, work)` 형태로 tx 안 조회·INSERT 메서드를 콜백에 제공하고, 판단은 서비스에서), `findApprovers`, `findByUser`(페이지), `cancelIfCancellable`(updateMany, 건수 반환). 기존 `sumDeductibleDaysByStatus`·`findGrantedDays`의 where 조건은 tx 버전에서 재사용
- `backend/src/modules/leaves/leave-rules.ts` — `countLeaveDays`, `validateLeavePeriod`(INVALID_DATE_RANGE 사유 반환), `isLeaveConflict`, `DEDUCTIBLE_LEAVE_TYPES`(repository에서 이동 가능)
- `backend/src/modules/leaves/leave-rules.spec.ts` — 규칙 단위 테스트 추가
- `backend/prisma/e2e-account-data.ts` — `resetE2eAdminLeaves(prisma)`(900001이 **신청자인** leaves만 삭제. `resetE2eAdminAttendance`와 같은 방식)
- `backend/package.json` — `db:e2e-leaves-reset` 스크립트
신규
- `backend/src/modules/leaves/dto/create-leave.dto.ts`, `dto/my-leaves-query.dto.ts`, `dto/approvers-query.dto.ts`
- `backend/prisma/e2e-leaves-reset.ts`(`e2e-attendance-reset.ts` 복제 형태: localhost만·production 거부)
- `backend/test/leave-requests.e2e-spec.ts`(신청·이력·후보·취소. 기존 `leaves.e2e-spec.ts`는 승인 계열이라 분리)

참고할 기존 파일
- `leaves.service.ts`의 `process`/`findLeaveOrThrow`(404→403→조건부 UPDATE→409 패턴), `dto/pending-approval-query.dto.ts`, `dto/leave-balance-query.dto.ts`, `dto/reject-leave.dto.ts`(trim)
- `modules/attendance/attendance-rules.ts`, `common/time/tokyo-date.ts`(`toTokyoDate`, `tokyoYear`, `toDbDate`, `fromDbDate`), `auth/auth.repository.ts`(interactive transaction 예)
- `test/e2e-helpers.ts`(FixedClock `2026-11-09` 월요일, `insertLeave`, `insertLeaveGrant`), `test/db/db-helpers.ts`, `prisma/e2e-attendance-reset.ts`

## 문서 갱신 예정
- 06 API-LEAVE-001: reason trim, approverId 형식 오류 = INVALID_APPROVER, 잠금 후 비활성 401
- 06 API-LEAVE-002: keyword 매칭(이름·사원번호 부분 일치, 최대 100자), 정렬(사원번호 오름차순)
- 06 API-LEAVE-003: year·status 검증(400), year 생략 시 전체
- 06 API-LEAVE-005: 404 행 추가
- context.md 명령어: `db:e2e-leaves-reset`
- 10_DEVELOPMENT_ROADMAP §6 백엔드 체크
