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
- `departmentName`은 항상 값이 있다(non-null). 모든 사원은 1개 부서에 소속된다(05 §2).

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
- `departmentName`은 non-null이다(`UserSummary`와 같음).

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
{
  "date": "2026-11-08",
  "isWorkday": true,
  "totalEmployeeCount": 50,
  "clockedInCount": 42,
  "notClockedInCount": 5,
  "onLeaveCount": 3,
  "attendanceRate": 84.0,
  "pendingLeaveCount": 7
}
```
- `date`: Asia/Tokyo 기준 오늘.
- 대상자: `is_active = true` AND `hire_date <= 오늘`. `totalEmployeeCount`는 대상자 수(비근무일에도 같은 값).
- 대상자 1명은 정확히 1개 분류로 센다(배타, 우선순위 출근 > 휴가 > 미출근, FR-DASH-001).
  - `clockedInCount`: 오늘 `work_date` 근태 기록 있음(근무 중·퇴근 완료 무관)
  - `onLeaveCount`: 출근이 아니고, 오늘을 포함하는 `APPROVED` 휴가 있음(종류 무관, 반차 포함)
  - `notClockedInCount`: 둘 다 아님
- 비근무일(토·일, 일본 공휴일. API-ATT-007과 같은 공휴일 데이터)은 `isWorkday: false`이며 `onLeaveCount`·`notClockedInCount`는 0, `clockedInCount`만 센다.
- `attendanceRate`: 출근 / (출근 + 휴가 + 미출근) × 100, 소수 1자리 반올림. 분모가 0이면 `null`.
- `pendingLeaveCount`: 전체 `PENDING` 휴가 건수.
- 개인 영역은 API-ATT-003, API-ATT-007, API-LEAVE-006, API-LEAVE-007을 조합하여 표시한다.

### API-DASH-004: 부서별 오늘 근무 현황
- `GET /dashboard/department-status` · USER · FR-DASH-001
- Query 없음. 집계 대상·배타 분류·비근무일·출근율 규칙은 API-DASH-001과 같다(全社 값은 이 부서별 값의 합계).

Response 200
```json
{
  "date": "2026-11-08",
  "isWorkday": true,
  "departments": [
    { "departmentId": "uuid", "departmentName": "개발팀", "memberCount": 12, "clockedInCount": 10, "onLeaveCount": 1, "notClockedInCount": 1, "attendanceRate": 83.3 },
    { "departmentId": null, "departmentName": "未所属", "memberCount": 1, "clockedInCount": 0, "onLeaveCount": 0, "notClockedInCount": 1, "attendanceRate": 0 }
  ]
}
```
- 대상자가 0명인 부서는 포함하지 않는다. 정렬은 부서 코드 오름차순이며, 시스템 부서 「未所属」(code `UNASSIGNED`)는 대상자가 있을 때만 `departmentId: null`로 마지막에 둔다.
- 응답 필드는 위가 전부다(숫자만). 사원 ID·이름·사원번호·부서 코드·휴가 종류는 포함하지 않는다. ADMIN에게도 같은 응답이다.
- 에러는 공통 규칙(401, 403 `PASSWORD_CHANGE_REQUIRED`)만 있다.

> API-DASH-002(`GET /dashboard/leave-calendar`)·API-DASH-003(`GET /dashboard/leave-calendar/day`)은 대시보드 휴가 캘린더 삭제와 함께 제거되었다(호출 시 404). 번호는 재사용하지 않는다.

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

### API-ATT-007: 출근부 월간 조회
- `GET /attendance/monthly` · USER · FR-ATT-006
- Query: `month`(선택, `YYYY-MM`, 연도 2000~2100, 월 01~12. 생략 시 Asia/Tokyo 기준 이번 달). 위반 시 400 `VALIDATION_ERROR`(`details[].field = month`).
- 대상은 항상 토큰의 본인이다(사용자 지정 파라미터 없음, API-ATT-004와 같음). 조회 전용이다.

Response 200 (그 달 1일~말일 전 일자, 날짜 오름차순)
```json
{
  "month": "2026-11",
  "days": [
    {
      "date": "2026-11-02",
      "dayType": "WEEKDAY",
      "holidayName": null,
      "attendance": { "id": "uuid", "clockIn": "2026-11-02T09:00:00+09:00", "clockOut": "2026-11-02T18:30:00+09:00", "status": "DONE", "modifiedAt": null },
      "breakTime": { "minutes": 60, "source": "LEGAL_MINIMUM", "start": "2026-11-02T13:15:00+09:00", "end": "2026-11-02T14:15:00+09:00" },
      "actualWorkMinutes": 510,
      "overtimeMinutes": 30,
      "nightMinutes": 0,
      "leaves": [ { "id": "uuid", "leaveType": "HALF_PM", "status": "PENDING" } ]
    },
    { "date": "2026-11-03", "dayType": "HOLIDAY", "holidayName": "文化の日", "attendance": null, "breakTime": null, "actualWorkMinutes": null, "overtimeMinutes": 0, "nightMinutes": 0, "leaves": [] },
    { "date": "2026-11-07", "dayType": "WEEKEND", "holidayName": null, "attendance": null, "breakTime": null, "actualWorkMinutes": null, "overtimeMinutes": 0, "nightMinutes": 0, "leaves": [] }
  ],
  "summary": {
    "scheduledWorkDays": 19,
    "actualWorkDays": 18,
    "actualWorkMinutes": 8640,
    "overtimeMinutes": 120,
    "nightMinutes": 0,
    "holidayWorkMinutes": 0,
    "paidLeaveDays": 1.5
  }
}
```
- `dayType`: 일본 공휴일이면 `HOLIDAY`(토·일과 겹쳐도 `HOLIDAY`) > 토·일이면 `WEEKEND` > 그 외 `WEEKDAY`. 공휴일 판정은 이 API에서만 하며 클라이언트는 이 값을 그대로 쓴다.
- `holidayName`: `HOLIDAY`일 때 일본어 공휴일명, 그 외 `null`. 振替休日은 `こどもの日 振替休日`처럼 원래 공휴일명과 합쳐진 문자열일 수 있고, 国民の休日은 `休日`이다.
- 공휴일 데이터: npm 패키지 `@holiday-jp/holiday_jp`(backend 의존성)의 수록 데이터를 사용한다. 수록 범위는 1970~2050년(최종 2050-11-23)이며 범위 밖 날짜는 공휴일 없음으로 계산한다(에러 아님). 데이터 갱신은 라이브러리 버전 업데이트로만 하므로 정부 발표 반영이 지연될 수 있다.
- `attendance`: `Attendance`에서 `user`·`workDate`·`workMinutes`를 뺀 구조. 근태 기록이 없으면 `null`. `status`는 `Attendance`와 같은 규칙이다.
- `breakTime`: `status = DONE`일 때만 값이 있고 그 외 `null`. 실제 휴게 기록이 없으므로 법정 최저 휴게(労基法 제34조)를 계산한 값이며 `source`는 항상 `"LEGAL_MINIMUM"`이다. 휴게가 0분이면 `start`·`end`는 `null`.
  - 拘束 D분(= API-ATT-004의 `workMinutes`, 분 내림) → 휴게: D ≤ 360 → 0 / 360 < D ≤ 405 → D − 360 / 405 < D ≤ 525 → 45 / 525 < D ≤ 540 → D − 480 / D > 540 → 60
  - 위치는 근무 구간의 정중앙: `start = clockIn + floor((D − 휴게) / 2)분`, `end = start + 휴게`
- `actualWorkMinutes`(実働): 拘束 − 휴게. `DONE`이 아니면 `null`. API-ATT-001~006의 `workMinutes`(拘束)는 바뀌지 않는다.
- `overtimeMinutes`: `WEEKDAY` 행만 `max(0, actualWorkMinutes − 480)`. `WEEKEND`·`HOLIDAY` 행은 0.
- `nightMinutes`: 근무 구간과 22:00~05:00(Asia/Tokyo)의 겹침 − 휴게 구간과의 겹침. 자정을 넘긴 근무도 전체를 계산한다.
- 행은 `work_date` 기준이다. 전월 말일에 출근해 당월에 퇴근한 기록은 전월 응답에만 들어간다.
- `leaves`: 그 날짜를 포함하는 본인 휴가 중 `PENDING`·`APPROVED`(`id`·`leaveType`·`status`만). 토·일(요일 기준) 행에는 넣지 않고, 평일 공휴일 행에는 넣는다(FR-LEAVE-001이 공휴일을 평일로 세므로). `REJECTED`·`CANCELLED`는 제외. 상세는 API-LEAVE-004로 조회한다.
- `summary`(그 달의 `days` 기준):
  - `scheduledWorkDays`: `WEEKDAY` 행 중 입사일(`users.hire_date`) 이후인 날 수(공휴일 제외)
  - `actualWorkDays`: `attendance.status = DONE`인 날 수(`dayType` 무관)
  - `actualWorkMinutes` / `overtimeMinutes` / `nightMinutes`: `days` 합
  - `holidayWorkMinutes`: `WEEKEND`·`HOLIDAY` 행의 `actualWorkMinutes` 합(`overtimeMinutes`와 중복 계상하지 않음)
  - `paidLeaveDays`: `leaves`의 `APPROVED` 휴가 중 `ANNUAL` = 1, `HALF_AM`·`HALF_PM` = 0.5의 합. `SPECIAL`·`OTHER`는 제외
  - 所定労働時間·欠勤日数·잔여 연차는 포함하지 않는다(잔여는 API-LEAVE-006).

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | `month` 형식·범위 오류(`details[].field = month`) |

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
- Query: `year`(선택, 휴가 시작일의 연도, 2000~2100 정수. 생략하면 전체 연도), `status`, `leaveType`, `appliedFrom`, `appliedTo`, `page`, `limit`
- `status`: `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`를 쉼표로 구분해 여러 개 지정할 수 있다. 지정한 상태 중 하나라도 일치하는 휴가를 반환하고, 생략하면 전체 상태를 반환한다. 중복 값은 하나로 본다
- `leaveType`: `ANNUAL` / `HALF_AM` / `HALF_PM` / `SPECIAL` / `OTHER`를 쉼표로 구분해 여러 개 지정할 수 있다. 규칙은 `status`와 같다
- `appliedFrom`, `appliedTo`: 선택, 실재하는 `YYYY-MM-DD`. 신청일(`created_at`)의 Asia/Tokyo 날짜 기준이며 양끝을 포함한다(`created_at >= appliedFrom 00:00+09:00 AND created_at < (appliedTo + 1일) 00:00+09:00`). 한쪽만 지정할 수 있다
- 조건 결합: `year` AND `status`(그룹 내 OR) AND `leaveType`(그룹 내 OR) AND 신청일 범위. 예: `?appliedFrom=2026-01-01&appliedTo=2026-03-31&status=PENDING,APPROVED&leaveType=HALF_AM,HALF_PM`
- `year`는 호환을 위해 유지한다. SCR-004 화면은 더 이상 `year`를 보내지 않는다(신청일 범위 필터로 대체)
- Response 200: 페이지네이션(`Leave[]`), 신청일 내림차순(동순위는 id 내림차순)
- 400 VALIDATION_ERROR: `year`·`page`·`limit` 값 오류, `status`·`leaveType` 값 오류(허용 값이 아니거나 빈 값. 예: `status=`, `status=PENDING,`). `status`·`leaveType` 오류의 `details[].field`는 배열 요소 위치가 붙은 `status.N`·`leaveType.N` 형식(예: `PENDING,X` → `status.1`, 빈 값 → `status.0`). `appliedFrom`·`appliedTo` 형식 오류 또는 실재하지 않는 날짜, `appliedFrom > appliedTo`(`details[].field = appliedTo`)

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
- Query: `scope`(`mine` 기본 / `all`은 ADMIN만), `status`, `page`, `limit`
- `status`: `PENDING` / `APPROVED` / `REJECTED`를 쉼표로 구분해 여러 개 지정할 수 있다. **생략하면 `PENDING`**(기존 호출과 같은 결과). 규칙은 API-LEAVE-003의 `status`와 같다
- Response 200: 페이지네이션(`Leave[]`), 신청일 내림차순(동순위는 id 내림차순)
- `scope=mine`: approverId = 로그인 사용자 AND status IN (`status`)
- `scope=all`: approverId IS NOT NULL(즉시 승인 건 제외) AND status IN (`status`) (ADMIN이 아니면 403). `status`가 PENDING만이면 모든 PENDING과 같다
- SCR-004 承認 탭은 상태별 건수를 `status=X&limit=1`의 `totalCount`로, 탭 표시 판정을 `scope=mine&status=PENDING,APPROVED,REJECTED&limit=1`의 `totalCount > 0`으로 조회한다(별도 집계 API 없음)
- 400 VALIDATION_ERROR: `scope`가 `mine` / `all` 외, `status`가 허용 값이 아니거나 빈 값(`CANCELLED` 포함, `details[].field = status.N`)

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

### API-LEAVE-010: 공유 휴가 캘린더
- `GET /leaves/calendar` · USER(ADMIN·EMPLOYEE 동일 응답) · FR-LEAVE-005
- Query
  - `month`: 선택, `YYYY-MM`(연도 2000~2100, 월 01~12). 생략 시 Asia/Tokyo 기준 이번 달
  - `departmentId`: 선택, UUID 형식. 존재하지 않는 부서면 `items: []`(에러 아님)
  - `name`: 선택, 앞뒤 공백 제거 후 최대 100자. 이름 대소문자 무시 부분 일치. 빈 값이면 조건 없음
  - `empId`: 선택, 앞뒤 공백 제거 후 최대 50자. 사원번호 부분 일치. 빈 값이면 조건 없음
  - 조건 결합: 모두 AND
- 대상: `status = APPROVED` AND 신청자 `is_active = true` AND 휴가 기간이 해당 월과 겹침(`start_date <= 월말 AND end_date >= 월초`). 휴가 종류 전부(반차 포함)
- **페이지네이션 없음**: 월 캘린더와 목록이 그 달 전체를 필요로 하므로 해당 월의 대상 전체를 반환한다(NFR-002 예외)

Response 200
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
- `items`의 필드는 위 7개가 전부다. leave·user `id`, `reason`, `days`, `leaveType` 원값, `status`, 승인자·처리자, `rejectReason`, `createdAt`은 포함하지 않는다(SELECT 단계에서 읽지 않음)
- `category`: `ANNUAL`·`HALF_AM`·`HALF_PM` → `PAID` / `SPECIAL` → `SPECIAL` / `OTHER` → `OTHER`(화면은 「休暇」로만 표시하는 공개용 분류)
- `halfDay`: `HALF_AM` → `"AM"`, `HALF_PM` → `"PM"`, 그 외 `null`
- `startDate`·`endDate`: 신청 기간 그대로다. 월을 걸치는 휴가는 월 밖 날짜일 수 있다
- `holidays`: 해당 월의 일본 공휴일(API-ATT-007과 같은 데이터), 날짜 오름차순. 필터·0건과 무관하게 항상 포함
- 정렬: `startDate` 오름차순 → `empId` 오름차순 → `endDate` 오름차순 → 휴가 종류(같은 날 반차는 AM 먼저)

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | `month`·`departmentId`·`name`·`empId` 형식·길이 오류(`details[].field`는 해당 Query 이름) |

---

## 5. 사원 관리 (Admin Users)

### API-USER-001: 사원 목록
- `GET /admin/users` · ADMIN · FR-USER-001
- Query: `name`, `empId`, `departmentId`, `role`, `approvalRequired`(true/false), `isActive`(true/false), `hireDateFrom`, `hireDateTo`, `page`, `limit`
- `isActive`를 생략하면 활성·비활성 전체를 반환한다. 화면 기본값("활성")은 화면이 `isActive=true`를 명시적으로 보낸다(SCR-006).
- `hireDateFrom`·`hireDateTo`: YYYY-MM-DD, 양끝 포함, 한쪽만 지정 가능. 형식 오류이거나 `hireDateFrom > hireDateTo`이면 400 VALIDATION_ERROR
- 정렬: 입사일 오름차순, 같은 날이면 사원번호 오름차순
- Response 200: 페이지네이션
```json
{ "id": "uuid", "name": "홍길동", "empId": "00001", "hireDate": "2026-04-01", "departmentId": "uuid", "departmentName": "개발팀",
  "role": "EMPLOYEE", "approvalRequired": true, "isActive": true, "createdAt": "2026-01-02T09:00:00+09:00" }
```

### API-USER-002: 사원 등록
- `POST /admin/users` · ADMIN · FR-USER-001

Request
```json
{ "name": "홍길동", "empId": "00001", "initialPassword": "Temp1234", "hireDate": "2026-04-01", "departmentId": "uuid",
  "role": "EMPLOYEE", "approvalRequired": true }
```
- name, empId, initialPassword, hireDate, departmentId, role, approvalRequired 필수. 未所属 부서도 지정할 수 있다
- hireDate: YYYY-MM-DD, 실재하는 날짜, 미래 날짜 허용, 기본값 없음. 누락·형식 오류는 400 VALIDATION_ERROR
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
- Request(변경할 필드만): `name`, `empId`, `hireDate`, `departmentId`, `role`, `approvalRequired`, `isActive`
- `hireDate`를 지정하면 API-USER-002와 같은 규칙으로 검증한다(null 불가)
- `departmentId: null`은 허용하지 않는다(400 VALIDATION_ERROR)
- Response 200: 사원 상세
- `isActive`를 false로 바꾸면 FR-USER-002의 비활성화 처리를 같은 트랜잭션에서 수행한다.
  - 비활성화 처리에는 그 사원이 책임자인 모든 부서(겸임 포함)의 `manager_id`를 NULL로 해제하는 것이 포함된다(05 §8 「부서 등록·수정의 책임자 지정」). 이 API 미구현으로 아직 구현되지 않았다.
  - `departmentId` 변경(부서 이동)은 부서 책임자 지정에 영향을 주지 않는다.

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

`DepartmentDetail` (API-DEPT-002~005 공통)
```json
{ "id": "uuid", "code": "DEV", "name": "開発部", "description": "社内システムの開発",
  "manager": { "id": "uuid", "empId": "00001", "name": "山田 太郎" },
  "memberCount": 12, "inactiveMemberCount": 2,
  "isSystem": false, "createdAt": "2026-11-10T09:00:00+09:00", "updatedAt": "2026-11-10T09:00:00+09:00" }
```
- `description`: 부서 설명. 없으면 `null`
- `manager`: 부서 책임자 `{ id, empId, name }`. 없으면 `null`. 그 외 사원 정보(role·isActive 등)는 넣지 않는다
- `memberCount`: 소속 **활성** 사원 수. 삭제 가능 판단 기준(FR-DEPT-001)
- `inactiveMemberCount`: 소속 비활성 사원 수. 삭제 시 未所属 부서로 이동되는 인원
- `isSystem`: 시스템 부서 未所属(code `UNASSIGNED`)이면 `true`(05 §1)
- 응답에 소속 사원 개인정보는 넣지 않는다(건수만. 책임자는 위 3항목만)

입력 규칙(등록·수정 공통)
- code: 앞뒤 공백 제거 후 영숫자·하이픈 1~20자. 대문자로 정규화하여 저장·중복 비교한다(`dev` → `DEV`)
- name: 앞뒤 공백 제거 후 1~100자
- code `UNASSIGNED`는 이미 사용 중이므로 등록·수정 시 409 DUPLICATE_DEPARTMENT_CODE가 된다
- description: 문자열 또는 null. 앞뒤 공백 제거 후 0~500자, 빈 문자열은 null로 저장. 줄바꿈 허용. 초과 시 400 VALIDATION_ERROR 「説明は 500 文字以内で入力してください。」(field `description`)
- managerId: 사원 ID(UUID) 또는 null(null = 미지정·해제). 형식 오류 시 400 VALIDATION_ERROR 「部署責任者の形式が正しくありません。」(field `managerId`). 지정한 사원이 없거나 비활성이면 400 INVALID_MANAGER 「部署責任者には有効な社員を指定してください。」. 소속 부서·권한은 묻지 않고(본인·ADMIN 포함), 다른 부서 책임자와의 겸임도 허용한다(FR-DEPT-001). 검사는 사원 행을 잠근 뒤 다시 읽은 값으로 한다(05 §8)

### API-DEPT-002: 부서 관리 목록
- `GET /admin/departments` · ADMIN · FR-DEPT-001
- Query: `code`(앞뒤 공백 제거 후 최대 20자), `name`(앞뒤 공백 제거 후 최대 100자), `page`, `limit`, `sort`, `order`. `code`·`name`은 대소문자 무시 부분 일치. `%`·`_`·`\`도 와일드카드가 아닌 문자 그대로 일치한다
  - `sort`: `code` | `name` | `memberCount` | `updatedAt`(기본 `code`), `order`: `asc` | `desc`(기본 `asc`)
  - 동률은 code 오름차순. `memberCount`는 활성 사원 수 기준
- Response 200: 페이지네이션(`DepartmentDetail[]`), 기본 code 오름차순. 未所属 부서도 포함한다
- 400 VALIDATION_ERROR: `code`·`name` 길이, `page`·`limit` 범위 오류, 허용 외 `sort`·`order`(field `sort`·`order`)

### API-DEPT-003: 부서 상세
- `GET /admin/departments/:id` · ADMIN · FR-DEPT-001
- Response 200: `DepartmentDetail`
- 400 VALIDATION_ERROR: `:id`가 UUID 형식이 아님
- 404 NOT_FOUND 「部署が見つかりません。」

`:id` 형식 오류 응답(API-DEPT-003·005·006·008 공통): code `VALIDATION_ERROR`, message 「入力内容に誤りがあります。」, `details: [{ "field": "id", "message": "部署 ID の形式が正しくありません。" }]`

### API-DEPT-004: 부서 등록
- `POST /admin/departments` · ADMIN · FR-DEPT-001

Request
```json
{ "code": "DEV", "name": "開発部", "description": "社内システムの開発", "managerId": "uuid" }
```
- code, name 필수. description·managerId는 선택(생략·null이면 null)
- Response 201: `DepartmentDetail`(`memberCount`·`inactiveMemberCount`는 0)
- 판정 순서: 입력 검증(400 VALIDATION_ERROR) → 책임자 검사(400 INVALID_MANAGER) → INSERT(409 중복)

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | 필수값 누락, 형식·길이 오류 |
| 400 | INVALID_MANAGER | 책임자로 지정한 사원이 없거나 비활성 |
| 409 | DUPLICATE_DEPARTMENT_CODE | 부서 코드 중복(대문자 정규화 후 비교) |
| 409 | DUPLICATE_DEPARTMENT_NAME | 부서명 중복 |

### API-DEPT-005: 부서 수정
- `PATCH /admin/departments/:id` · ADMIN · FR-DEPT-001
- Request(변경할 필드만, 최소 1개): `code`, `name`, `description`, `managerId`. null도 지정으로 본다(`managerId: null` = 책임자 해제, 생략 = 변경 없음)
- Response 200: `DepartmentDetail`
- 未所属 부서는 책임자 검사보다 먼저 409 PROTECTED_DEPARTMENT가 된다

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | `:id`가 UUID 형식이 아님, 형식·길이 오류, 변경할 필드가 없음(빈 객체) |
| 400 | INVALID_MANAGER | 책임자로 지정한 사원이 없거나 비활성 |
| 404 | NOT_FOUND | 부서 없음 |
| 409 | DUPLICATE_DEPARTMENT_CODE | 부서 코드 중복 |
| 409 | DUPLICATE_DEPARTMENT_NAME | 부서명 중복 |
| 409 | PROTECTED_DEPARTMENT | 未所属 부서는 변경할 수 없음 |

### API-DEPT-006: 부서 삭제
- `DELETE /admin/departments/:id` · ADMIN · FR-DEPT-001
- Response 204. 소속 비활성 사원을 未所属 부서로 이동한 뒤 물리 삭제한다(같은 트랜잭션, 05 §8). 책임자가 지정되어 있어도 삭제할 수 있다

| HTTP | Code | 설명 |
|---|---|---|
| 400 | VALIDATION_ERROR | `:id`가 UUID 형식이 아님 |
| 404 | NOT_FOUND | 부서 없음 |
| 409 | DEPARTMENT_HAS_MEMBERS | 소속 활성 사원이 1명 이상(삭제 처리 중 사원이 배정·재활성화된 경우 포함) |
| 409 | PROTECTED_DEPARTMENT | 未所属 부서는 삭제할 수 없음 |
| 500 | INTERNAL_SERVER_ERROR | 未所属(`UNASSIGNED`) 부서가 없음(서버 구성 오류). 「サーバーでエラーが発生しました。」, 트랜잭션 롤백 |

### API-DEPT-007: 부서 요약
- `GET /admin/departments/summary` · ADMIN · FR-DEPT-001
- Response 200: `{ "departmentCount": 7, "memberCount": 120 }`
  - `departmentCount`: 未所属을 **제외한** 부서 수. 검색 조건과 무관
  - `memberCount`: 전체 활성 사원 수(未所属 소속 포함)

### API-DEPT-008: 부서 소속 사원 목록
- `GET /admin/departments/:id/members` · ADMIN · FR-DEPT-001
- Query: `page`, `limit`(공통 페이지네이션)
- Response 200: 페이지네이션(`[{ "id": "uuid", "empId": "00001", "name": "山田 太郎" }]`). 소속 **활성** 사원만, 사원번호 오름차순
- 400 VALIDATION_ERROR: `:id`가 UUID 형식이 아님, `page`·`limit` 범위 오류
- 404 NOT_FOUND 「部署が見つかりません。」

### API-DEPT-009: 부서 책임자 후보
- `GET /admin/departments/manager-candidates` · ADMIN · FR-DEPT-001
- Query: `keyword`(선택, 앞뒤 공백 제거 후 최대 100자. 이름은 대소문자 무시 부분 일치, 사원번호는 부분 일치. 빈 값이면 조건 없음 — API-LEAVE-002와 같은 규칙)
- Response 200: `UserSummary[]` — 활성 사원 전체(요청자 본인·ADMIN 포함, 소속 무관), 사원번호 오름차순, **최대 100건**(고정, Query로 변경 불가)
- 400 VALIDATION_ERROR: `keyword`가 100자 초과
- API-LEAVE-002는 USER 권한·본인 제외라 쓰지 않는다
