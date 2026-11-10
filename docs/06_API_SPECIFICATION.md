# 06. API Specification

> 업무 규칙은 02_REQUIREMENTS.md를 기준으로 한다. NestJS Swagger로 API 문서를 자동 생성하며, 이 문서는 계약(경로, 권한, 입출력, 에러)의 기준이다.

## 0. 공통 규칙

### 기본

- Base URL: `/api/v1`
- 형식: JSON, 필드명은 camelCase
- 날짜: `YYYY-MM-DD`, 일시: ISO-8601(`+09:00`)
- 인증: `Authorization: Bearer {accessToken}`. Refresh Token은 httpOnly 쿠키(`refreshToken`)로 전달한다.
- 권한 표기: `PUBLIC`(인증 불필요) / `USER`(로그인한 모든 사용자) / `ADMIN`
- 비밀번호 변경이 필요한 사용자(`mustChangePassword = true`)는 `/auth/*`를 제외한 API 호출 시 `403 PASSWORD_CHANGE_REQUIRED`를 받는다.

### 페이지네이션

Query: `page`(기본 1), `limit`(기본 20, 최대 100)

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "totalCount": 135,
  "totalPages": 7
}
```

### 공통 Error Response

> 이 문서의 `message` 예시는 의미를 나타내는 기준이다. 실제 구현은 일본어 `message`를 반환한다.

```json
{
  "statusCode": 409,
  "code": "LEAVE_CONFLICT",
  "message": "해당 기간에 이미 신청된 휴가가 있습니다.",
  "details": []
}
```

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | 입력값 검증 실패(`details`에 필드별 사유) |
| 401 | UNAUTHORIZED | 인증 실패 또는 토큰 만료 |
| 403 | FORBIDDEN | 권한 없음 |
| 403 | PASSWORD_CHANGE_REQUIRED | 비밀번호 변경 필요 |
| 404 | NOT_FOUND | 대상 없음 |
| 409 | ALREADY_PROCESSED | 이미 처리되어 상태 변경 불가 |
| 500 | INTERNAL_SERVER_ERROR | 서버 오류 |

### 공통 객체

`UserSummary`
```json
{ "id": "uuid", "name": "홍길동", "empId": "00001", "departmentName": "개발팀" }
```

`Leave`
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "name": "홍길동", "empId": "00001", "departmentName": "개발팀" },
  "approver": { "id": "uuid", "name": "김승인", "empId": "00002", "departmentName": "개발팀" },
  "leaveType": "ANNUAL",
  "startDate": "2026-11-10",
  "endDate": "2026-11-11",
  "days": 2,
  "reason": "개인 사유",
  "status": "PENDING",
  "autoApproved": false,
  "processedBy": null,
  "processedAt": null,
  "rejectReason": null,
  "createdAt": "2026-11-08T10:00:00+09:00"
}
```
- 즉시 승인 건은 `approver = null`, `autoApproved = true`이다.
- `processedBy`는 처리자(승인·반려·취소한 사용자)의 `UserSummary` 또는 `null`(PENDING)이다. 즉시 승인 건은 신청자이다.

`Attendance`
```json
{
  "id": "uuid",
  "user": { "id": "uuid", "name": "홍길동", "empId": "00001", "departmentName": "개발팀" },
  "workDate": "2026-11-08",
  "clockIn": "2026-11-08T09:01:00+09:00",
  "clockOut": null,
  "workMinutes": null,
  "status": "WORKING",
  "modifiedAt": null
}
```
- status: `WORKING`(근무 중) / `DONE`(퇴근 완료) / `MISSING_CLOCK_OUT`(퇴근 누락)
- `modifiedAt`: 관리자가 마지막으로 수정한 일시(API-ATT-006) 또는 `null`(수정 이력 없음). 수정자 ID는 노출하지 않는다.

---

## 1. 인증 (Auth)

### API-AUTH-001: 로그인
- `POST /auth/login` · PUBLIC · FR-AUTH-001

Request
```json
{ "empId": "00001", "password": "password1" }
```
Response 200 (Refresh Token은 Set-Cookie)
```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid", "name": "홍길동", "empId": "00001", "role": "EMPLOYEE",
    "departmentName": "개발팀", "approvalRequired": true, "mustChangePassword": false
  }
}
```
| HTTP | Code | 설명 |
|---|---|---|
| 401 | INVALID_CREDENTIALS | 사원번호 또는 비밀번호 불일치 |
| 403 | ACCOUNT_DISABLED | 비활성 계정. 비밀번호가 맞은 뒤에만 반환한다(계정 존재 여부 노출 방지, FR-AUTH-001) |

### API-AUTH-002: 토큰 갱신
- `POST /auth/refresh` · PUBLIC(Refresh Token 쿠키 필요) · FR-AUTH-002
- Response 200: `{ "accessToken": "jwt" }`. 사용한 Refresh Token을 무효화하고 새 Refresh Token을 Set-Cookie로 발급한다(회전, 유효 기간 7일).
- 401 UNAUTHORIZED: 토큰 없음, 만료, 무효화, 비활성 계정

### API-AUTH-003: 로그아웃
- `POST /auth/logout` · USER · FR-AUTH-002
- Response 204. Refresh Token을 무효화하고 쿠키를 삭제한다.

### API-AUTH-004: 내 정보
- `GET /auth/me` · USER · FR-AUTH-001
- Response 200: 로그인 응답의 `user`와 같은 구조

### API-AUTH-005: 비밀번호 변경
- `PATCH /auth/password` · USER(비밀번호 변경 필요 사용자도 호출 가능) · FR-AUTH-003

Request
```json
{ "currentPassword": "old", "newPassword": "newPass123" }
```
Response 204

| HTTP | Code | 설명 |
|---|---|---|
| 400 | INVALID_CURRENT_PASSWORD | 현재 비밀번호 불일치 |
| 400 | PASSWORD_POLICY_VIOLATION | 비밀번호 규칙 위반 또는 현재 비밀번호와 동일 |

---

## 2. 대시보드 (Dashboard)

### API-DASH-001: 관리자 오늘 현황
- `GET /admin/dashboard/summary` · ADMIN · FR-DASH-001

Response 200
```json
{ "date": "2026-11-08", "clockedInCount": 42, "notClockedInCount": 5, "onLeaveCount": 3, "pendingLeaveCount": 7 }
```
- 개인 영역은 API-ATT-003, API-LEAVE-006, API-LEAVE-007을 조합하여 표시한다.

---

## 3. 근태 (Attendance)

### API-ATT-001: 출근 등록
- `POST /attendance/clock-in` · USER · FR-ATT-001
- Request Body 없음 (서버 시간 기준)
- Response 201: `Attendance`

| HTTP | Code | 설명 |
|---|---|---|
| 409 | ALREADY_CLOCKED_IN | 당일 출근 기록이 이미 있음 |

### API-ATT-002: 퇴근 등록
- `POST /attendance/clock-out` · USER · FR-ATT-002
- Request Body 없음
- Response 200: `Attendance`

| HTTP | Code | 설명 |
|---|---|---|
| 409 | NOT_CLOCKED_IN | 당일 출근 기록이 없음 |
| 409 | ALREADY_CLOCKED_OUT | 이미 퇴근 등록됨 |

### API-ATT-003: 오늘 근태
- `GET /attendance/today` · USER · FR-ATT-001, FR-ATT-002
- Response 200: `Attendance` 또는 `null`(미출근. 본문은 JSON 리터럴 `null`, `Content-Type: application/json`)

### API-ATT-004: 내 근태 이력
- `GET /attendance` · USER · FR-ATT-003
- Query: `startDate`, `endDate`(`YYYY-MM-DD`), `status`, `page`, `limit`
- `status`: `WORKING` / `DONE` / `MISSING_CLOCK_OUT`을 쉼표로 구분해 여러 개 지정할 수 있다(예: `DONE,MISSING_CLOCK_OUT`). 지정한 상태 중 하나라도 일치하는 기록을 반환하고, 생략하면 전체 상태를 반환한다. 중복 값은 하나로 본다. 상태 조건은 API-ATT-005와 같다
- 기본 기간: `startDate` 생략 시 이번 달 1일, `endDate` 생략 시 오늘(둘 다 Asia/Tokyo 기준, 각각 따로 적용)
- 대상은 항상 토큰의 본인이다(사용자 지정 파라미터 없음).
- Response 200: 페이지네이션(`Attendance[]`), 근무일 내림차순

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | 날짜 형식 오류, `status` 값 오류(허용 값이 아니거나 빈 값), `page`·`limit` 범위 오류 |
| 400 | INVALID_DATE_RANGE | 시작일이 종료일보다 늦음, 또는 기간이 양끝 포함 366일 초과 |

### API-ATT-005: 전체 근태 조회
- `GET /admin/attendance` · ADMIN · FR-ATT-004
- Query: `name`(앞뒤 공백 제거 후 최대 100자, 대소문자 무시 부분 일치), `departmentId`(UUID), `startDate`, `endDate`, `status`(`WORKING` / `DONE` / `MISSING_CLOCK_OUT`), `page`, `limit`
- 기본 기간과 기간 규칙은 API-ATT-004와 같다. 비활성 사용자의 기록도 포함한다.
- Response 200: 페이지네이션(`Attendance[]`), 근무일 내림차순 후 사원명 오름차순(동순위는 id 오름차순)

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | 날짜·`departmentId`·`status`·`name` 길이·`page`·`limit` 형식 오류 |
| 400 | INVALID_DATE_RANGE | API-ATT-004와 같음 |
| 403 | FORBIDDEN | ADMIN이 아님 |

### API-ATT-006: 근태 수정
- `PATCH /admin/attendance/:id` · ADMIN · FR-ATT-005

Request
```json
{ "clockIn": "2026-11-07T09:00:00+09:00", "clockOut": "2026-11-07T18:00:00+09:00" }
```
Response 200: `Attendance`

| HTTP | Code | 설명 |
|---|---|---|
| 400 | INVALID_TIME_RANGE | 퇴근 시간이 출근 시간보다 이르거나, 출근 시간이 근무일(Asia/Tokyo)을 벗어나거나, 퇴근 시간이 출근 후 24시간을 넘음 |
| 404 | NOT_FOUND | 근태 기록 없음 |

---

## 4. 휴가 (Leaves)

### API-LEAVE-001: 휴가 신청
- `POST /leaves` · USER · FR-LEAVE-001

Request
```json
{
  "leaveType": "ANNUAL",
  "startDate": "2026-11-10",
  "endDate": "2026-11-11",
  "reason": "개인 사유",
  "approverId": "uuid"
}
```

Validation
- leaveType: 필수, `ANNUAL` / `HALF_AM` / `HALF_PM` / `SPECIAL` / `OTHER`
- startDate, endDate: 필수, `endDate >= startDate`, 같은 연도, 반차는 `startDate = endDate`. 시작일이 과거여도 허용한다
- reason: 필수, 앞뒤 공백 제거 후 1~500자(공백 제거한 값을 저장)
- approverId: 신청자의 `approvalRequired = true`이면 필수, `false`이면 입력하지 않음(보내면 무시)

Response 201: `Leave`
- 승인 필요 사용자는 `status = PENDING`, 승인 불필요 사용자는 `status = APPROVED`, `autoApproved = true`

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | 필수값 누락, 길이 초과 |
| 400 | INVALID_DATE_RANGE | 날짜 범위 오류, 연도를 걸치는 기간, 반차 기간 오류 |
| 400 | NO_WORKING_DAYS | 신청 기간이 모두 주말 |
| 400 | APPROVER_REQUIRED | 승인 필요 사용자가 승인자 미지정 |
| 400 | INVALID_APPROVER | 승인자가 UUID 형식이 아니거나, 본인이거나, 존재하지 않거나, 비활성 |
| 401 | UNAUTHORIZED | 잠근 신청자 행이 없거나 비활성 |
| 409 | LEAVE_CONFLICT | PENDING 또는 APPROVED 휴가와 날짜 중복 |
| 422 | INSUFFICIENT_LEAVE_BALANCE | 잔여 연차 초과 |

### API-LEAVE-002: 승인자 후보 목록
- `GET /leaves/approvers` · USER · FR-LEAVE-001
- Query: `keyword`(선택, 앞뒤 공백 제거 후 최대 100자. 이름은 대소문자 무시 부분 일치, 사원번호는 부분 일치. 빈 값이면 조건 없음)
- Response 200: `UserSummary[]` (본인과 비활성 사용자 제외), 사원번호 오름차순
- 400 VALIDATION_ERROR: `keyword`가 100자 초과

### API-LEAVE-003: 내 휴가 이력
- `GET /leaves/me` · USER · FR-LEAVE-005
- Query: `year`(선택, 휴가 시작일의 연도, 2000~2100 정수. 생략하면 전체 연도), `status`, `leaveType`, `page`, `limit`
- `status`: `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`를 쉼표로 구분해 여러 개 지정할 수 있다. 지정한 상태 중 하나라도 일치하는 휴가를 반환하고, 생략하면 전체 상태를 반환한다. 중복 값은 하나로 본다
- `leaveType`: `ANNUAL` / `HALF_AM` / `HALF_PM` / `SPECIAL` / `OTHER`를 쉼표로 구분해 여러 개 지정할 수 있다. 규칙은 `status`와 같다
- 조건 결합: `year` AND `status`(그룹 내 OR) AND `leaveType`(그룹 내 OR). 예: `?year=2026&status=PENDING,APPROVED&leaveType=HALF_AM,HALF_PM`
- Response 200: 페이지네이션(`Leave[]`), 신청일 내림차순(동순위는 id 내림차순)
- 400 VALIDATION_ERROR: `year`·`page`·`limit` 값 오류, `status`·`leaveType` 값 오류(허용 값이 아니거나 빈 값. 예: `status=`, `status=PENDING,`). `status`·`leaveType` 오류의 `details[].field`는 배열 요소 위치가 붙은 `status.N`·`leaveType.N` 형식(예: `PENDING,X` → `status.1`, 빈 값 → `status.0`)

### API-LEAVE-004: 휴가 상세
- `GET /leaves/:id` · USER(신청자, 할당된 승인자, ADMIN만) · FR-LEAVE-005
- Response 200: `Leave`
- 403 FORBIDDEN, 404 NOT_FOUND(`:id`가 UUID 형식이 아닌 경우 포함)

### API-LEAVE-005: 휴가 취소
- `PATCH /leaves/:id/cancel` · USER(신청자만) · FR-LEAVE-004
- Response 200: `Leave` (`status = CANCELLED`)

| HTTP | Code | 설명 |
|---|---|---|
| 403 | FORBIDDEN | 신청자가 아님(ADMIN 포함) |
| 404 | NOT_FOUND | 휴가 없음(`:id`가 UUID 형식이 아닌 경우 포함) |
| 409 | NOT_CANCELLABLE | PENDING이 아니고, 시작일이 오늘보다 뒤인 즉시 승인 건도 아님 |

### API-LEAVE-006: 내 휴가 현황(잔여 연차)
- `GET /leaves/balance` · USER · FR-LEAVE-001, FR-LEAVE-006
- Query: `year`(기본: Asia/Tokyo 기준 올해, 2000~2100 정수. 그 외는 400 VALIDATION_ERROR)

Response 200
```json
{ "year": 2026, "grantedDays": 15, "approvedDays": 3.5, "pendingDays": 1, "remainingDays": 10.5 }
```

### API-LEAVE-007: 승인 대기 목록
- `GET /leaves/pending-approval` · USER · FR-LEAVE-003
- Query: `scope`(`mine` 기본 / `all`은 ADMIN만), `page`, `limit`
- Response 200: 페이지네이션(`Leave[]`), 신청일 내림차순(동순위는 id 내림차순)
- `scope=mine`: approverId = 로그인 사용자, status = PENDING
- `scope=all`: 모든 PENDING (ADMIN이 아니면 403)
- `scope`가 `mine` / `all` 외이면 400 VALIDATION_ERROR

### API-LEAVE-008: 휴가 승인
- `PATCH /leaves/:id/approve` · USER(할당된 승인자 또는 ADMIN) · FR-LEAVE-002
- Request Body 없음
- Response 200: `Leave`

| HTTP | Code | 설명 |
|---|---|---|
| 403 | FORBIDDEN | 할당된 승인자도 ADMIN도 아님, 또는 본인 신청 |
| 404 | NOT_FOUND | 휴가 없음(`:id`가 UUID 형식이 아닌 경우 포함) |
| 409 | ALREADY_PROCESSED | PENDING이 아님(다른 사용자가 먼저 처리함) |

### API-LEAVE-009: 휴가 반려
- `PATCH /leaves/:id/reject` · USER(할당된 승인자 또는 ADMIN) · FR-LEAVE-002

Request
```json
{ "rejectReason": "업무 일정상 불가" }
```
- rejectReason: 필수, 앞뒤 공백 제거 후 1~500자(공백 제거한 값을 저장)
- Response 200: `Leave`
- 에러는 API-LEAVE-008과 같고, 추가로 400 VALIDATION_ERROR가 있다.

---

## 5. 사원 관리 (Admin Users)

### API-USER-001: 사원 목록
- `GET /admin/users` · ADMIN · FR-USER-001
- Query: `name`, `empId`, `departmentId`, `role`, `approvalRequired`(true/false), `isActive`(true/false), `page`, `limit`
- `isActive`를 생략하면 활성·비활성 전체를 반환한다. 화면 기본값("활성")은 화면이 `isActive=true`를 명시적으로 보낸다(SCR-006).
- Response 200: 페이지네이션
```json
{ "id": "uuid", "name": "홍길동", "empId": "00001", "departmentId": "uuid", "departmentName": "개발팀",
  "role": "EMPLOYEE", "approvalRequired": true, "isActive": true, "createdAt": "2026-01-02T09:00:00+09:00" }
```

### API-USER-002: 사원 등록
- `POST /admin/users` · ADMIN · FR-USER-001

Request
```json
{ "name": "홍길동", "empId": "00001", "initialPassword": "Temp1234", "departmentId": "uuid",
  "role": "EMPLOYEE", "approvalRequired": true }
```
- name, empId, initialPassword, role, approvalRequired 필수 / departmentId 선택
- Response 201: 사원 상세(API-USER-003과 같은 구조). `isActive = true`, `mustChangePassword = true`

| HTTP | Code | 설명 |
|---|---|---|
| 409 | DUPLICATE_EMP_ID | 사원번호 중복 |
| 400 | INVALID_DEPARTMENT | 존재하지 않는 부서 |

### API-USER-003: 사원 상세
- `GET /admin/users/:id` · ADMIN · FR-USER-002
- Response 200: 목록 항목 + `mustChangePassword`, `updatedAt`, `pendingApprovalCount`(이 사용자에게 할당된 PENDING 건수), `leaveGrants: [{ "year": 2026, "grantedDays": 15 }]`
- 404 NOT_FOUND

### API-USER-004: 사원 수정
- `PATCH /admin/users/:id` · ADMIN · FR-USER-002
- Request(변경할 필드만): `name`, `empId`, `departmentId`, `role`, `approvalRequired`, `isActive`
- Response 200: 사원 상세
- `isActive`를 false로 바꾸면 FR-USER-002의 비활성화 처리를 같은 트랜잭션에서 수행한다.

| HTTP | Code | 설명 |
|---|---|---|
| 409 | DUPLICATE_EMP_ID | 사원번호 중복 |
| 400 | INVALID_DEPARTMENT | 존재하지 않는 부서 |
| 409 | LAST_ADMIN | 마지막 활성 ADMIN의 비활성화 또는 강등 |

### API-USER-005: 부여 연차 등록/수정
- `PUT /admin/users/:id/leave-grants/:year` · ADMIN · FR-LEAVE-006
- Request: `{ "grantedDays": 15 }` (0 이상, 0.5 단위)
- Response 200: `{ "year": 2026, "grantedDays": 15 }`

| HTTP | Code | 설명 |
|---|---|---|
| 409 | GRANT_BELOW_USED | 해당 연도의 사용 일수(APPROVED + PENDING)보다 적은 값 |

### API-DEPT-001: 부서 목록
- `GET /departments` · USER · (부서 선택용)
- Response 200: `[{ "id": "uuid", "name": "개발팀" }]`
