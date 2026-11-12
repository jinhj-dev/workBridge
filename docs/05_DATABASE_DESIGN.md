# 05. Database Design

> 업무 규칙은 02_REQUIREMENTS.md를 기준으로 한다. 이 문서는 저장 구조와 제약만 정의한다.

## 0. 공통 규칙

### 키와 공통 컬럼

- PK는 UUID(v4)이며 애플리케이션(Prisma `@default(uuid())`)이 생성한다. DB 기본값이 없으므로 seed나 raw SQL로 INSERT할 때는 id를 직접 지정한다.
- `created_at`: DB 기본값 `now()`.
- `updated_at`: DB 기본값 `now()`이며, Prisma `@updatedAt`이 갱신한다. raw SQL로 UPDATE할 때는 `updated_at = now()`를 명시적으로 SET한다.

### 외래 키

- 모든 FK는 `ON DELETE RESTRICT`, `ON UPDATE CASCADE`이다(UUID PK는 변경하지 않으므로 ON UPDATE는 실질적으로 동작하지 않는다).
- users는 물리 삭제하지 않는다. 사용자는 비활성화(`is_active = false`)로만 처리한다(FR-USER-002).
- departments는 소속 활성 사원이 0명일 때만 ADMIN이 물리 삭제한다. 소속 비활성 사원은 같은 트랜잭션에서 未所属 부서로 이동한 뒤 삭제한다(FR-DEPT-001, §8). 감사 컬럼(`created_by`/`updated_by`/`deleted_at`)은 두지 않는다.

### ENUM

PostgreSQL 네이티브 ENUM 타입으로 정의한다. 값을 추가할 때는 `ALTER TYPE ... ADD VALUE`를 사용한다. 값의 삭제나 이름 변경은 타입 재작성이 필요하므로 피한다.

| 타입 | 값 | 사용 컬럼 |
|---|---|---|
| user_role | ADMIN / EMPLOYEE | users.role |
| leave_type | ANNUAL / HALF_AM / HALF_PM / SPECIAL / OTHER | leaves.leave_type |
| leave_status | PENDING / APPROVED / REJECTED / CANCELLED | leaves.status |

### CHECK 제약의 관리

- Prisma Schema로 표현할 수 없으므로 마이그레이션 SQL에 직접 작성한다(`prisma migrate dev --create-only`로 생성한 뒤 편집).
- `prisma db push`는 마이그레이션 SQL을 실행하지 않아 CHECK가 빠진다. 테스트 DB를 포함한 모든 DB는 마이그레이션(`migrate dev` / `migrate deploy`)으로만 구성한다.

## 1. Table: departments

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 부서 ID |
| code | VARCHAR(20) | | NO | 부서 코드. 영숫자·하이픈 1~20자, 대문자로 정규화하여 저장(형식 검증은 애플리케이션, FR-DEPT-001) |
| name | VARCHAR(100) | | NO | 부서명 |
| description | VARCHAR(500) | | YES | 부서 설명. 앞뒤 공백 제거, 빈 문자열은 NULL로 저장(애플리케이션, FR-DEPT-001) |
| manager_id | UUID | | YES | 부서 책임자 사용자 ID. 활성 사원만 지정(검증은 애플리케이션, FR-DEPT-001) |
| created_at | TIMESTAMPTZ | | NO | 생성일 |
| updated_at | TIMESTAMPTZ | | NO | 수정일 |

### Constraints

- code: UNIQUE
- name: UNIQUE
- manager_id: FK → users.id. UNIQUE 없음(한 사원이 여러 부서의 책임자를 겸임할 수 있다)

description·manager_id는 마이그레이션 `add_departments_description_manager`에서 추가했다. 기존 행은 둘 다 NULL(백필 없음)이며, 未所属도 NULL로 유지한다.

### 시스템 부서 (未所属)

- code `UNASSIGNED`, name `未所属`인 부서를 시스템 부서로 둔다. 플래그 컬럼 없이 고정 코드로 구분한다(백엔드 상수 `SYSTEM_DEPARTMENT_CODE`).
- 마이그레이션과 seed가 항상 생성한다. 수정·삭제할 수 없다(FR-DEPT-001). 활성 사원의 배정도 허용한다.
- 부서 삭제 시 비활성 사원의 이동 대상이며, 마이그레이션 시 부서가 없던 기존 사원의 이동 대상이었다.

부서는 ADMIN이 부서 관리 화면(SCR-010)에서 등록·수정·삭제한다. 초기 데이터(seed)는 未所属(UNASSIGNED), 総務部(GA), 開発部(DEV), 営業部(SALES), 人事部(HR)이며, 초기 ADMIN은 総務部 소속이다.

## 2. Table: users

관련 요구사항: FR-AUTH-001, FR-AUTH-003, FR-USER-001, FR-USER-002

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 사용자 ID |
| name | VARCHAR(100) | | NO | 이름 |
| emp_id | VARCHAR(50) | | NO | 사원번호(로그인 ID). 숫자만, 앞뒤 공백을 제거하여 저장(형식 검증은 애플리케이션, FR-USER-001) |
| password_hash | VARCHAR(255) | | NO | 비밀번호 해시 |
| role | user_role | | NO | 권한 |
| approval_required | BOOLEAN | | NO | 휴가 승인 필요 여부 (기본 true) |
| is_active | BOOLEAN | | NO | 계정 활성 여부 (기본 true) |
| must_change_password | BOOLEAN | | NO | 비밀번호 변경 필요 여부 (기본 true) |
| department_id | UUID | | NO | 부서 ID (모든 사원은 1개 부서에 소속) |
| hire_date | DATE | | NO | 입사일 (Asia/Tokyo 기준 날짜). 기본값 없음 |
| created_at | TIMESTAMPTZ | | NO | 생성일 |
| updated_at | TIMESTAMPTZ | | NO | 수정일 |

### Constraints

- emp_id: UNIQUE
- department_id: FK → departments.id
- 활성 ADMIN이 최소 1명 존재해야 한다(서비스 계층에서 검증, FR-USER-002). 동시성 처리는 §8을 따른다.

hire_date는 마이그레이션 `add_users_hire_date`에서 기존 행을 `2026-01-01`로 채운 뒤 NOT NULL로 바꿨다. seed 초기 ADMIN과 E2E 계정도 같은 고정값 `2026-01-01`을 쓴다.

## 3. Table: refresh_tokens

관련 요구사항: FR-AUTH-002, FR-AUTH-003

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 토큰 ID |
| user_id | UUID | | NO | 사용자 ID |
| token_hash | VARCHAR(255) | | NO | Refresh Token의 SHA-256 해시(16진수) |
| expires_at | TIMESTAMPTZ | | NO | 만료 시간 (발급 시각 + 7일) |
| revoked_at | TIMESTAMPTZ | | YES | 무효화 시간(로그아웃, 갱신, 비밀번호 변경, 계정 비활성화) |
| created_at | TIMESTAMPTZ | | NO | 생성일 |

### Constraints

- token_hash: UNIQUE
- user_id: FK → users.id

### 저장 규칙

- 토큰은 256bit 난수이다. 쿠키 값의 SHA-256 해시로 행을 조회하므로 솔트를 넣은 해시(bcrypt 등)는 쓰지 않는다.
- 유효한 토큰: `revoked_at IS NULL AND expires_at > now()`.
- 갱신(회전): 사용한 토큰에 `revoked_at`을 기록하고 새 토큰 행을 INSERT한다. 같은 트랜잭션에서 `WHERE id = ? AND revoked_at IS NULL` 조건부 UPDATE로 처리하며, 0건이면 갱신에 실패한다.
- 비밀번호 변경: 현재 요청에서 사용 중인 토큰을 제외한 해당 사용자의 유효한 토큰을 모두 무효화한다.
- 계정 비활성화: 해당 사용자의 유효한 토큰을 모두 무효화한다.
- 정리: 로그인 시 해당 사용자의 만료되었거나 무효화된 토큰 행을 삭제한다.

## 4. Table: attendance

관련 요구사항: FR-ATT-001 ~ FR-ATT-005

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 근태 ID |
| user_id | UUID | | NO | 사용자 ID |
| work_date | DATE | | NO | 근무일 (Asia/Tokyo 기준 출근 날짜) |
| clock_in | TIMESTAMPTZ | | NO | 출근 시간 |
| clock_out | TIMESTAMPTZ | | YES | 퇴근 시간 |
| modified_by | UUID | | YES | 관리자 수정자 ID |
| modified_at | TIMESTAMPTZ | | YES | 관리자 수정 시간 |
| created_at | TIMESTAMPTZ | | NO | 생성일 |
| updated_at | TIMESTAMPTZ | | NO | 수정일 |

### Constraints

- user_id + work_date: UNIQUE
- user_id: FK → users.id
- modified_by: FK → users.id
- clock_out은 NULL 허용
- CHECK: clock_out IS NULL OR clock_out > clock_in
- CHECK: clock_out IS NULL OR clock_out <= clock_in + INTERVAL '24 hours'
- CHECK: (clock_in AT TIME ZONE 'Asia/Tokyo')::date = work_date
- CHECK: (modified_by IS NULL) = (modified_at IS NULL)

### 근태 상태 (저장하지 않고 계산)

| 상태 | 조건 |
|---|---|
| 근무 중 | work_date = 오늘 AND clock_out IS NULL |
| 퇴근 완료 | clock_out IS NOT NULL |
| 퇴근 누락 | work_date < 오늘 AND clock_out IS NULL |
| 미출근 | 해당 근무일에 기록이 없음(행 없음, 당일 화면 표시용) |

"오늘"은 Asia/Tokyo 기준 날짜이다(§9).

## 5. Table: leave_grants

관련 요구사항: FR-LEAVE-006

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 부여 ID |
| user_id | UUID | | NO | 사용자 ID |
| year | SMALLINT | | NO | 연도 |
| granted_days | NUMERIC(4,1) | | NO | 부여 연차 일수 (0.5 단위) |
| created_at | TIMESTAMPTZ | | NO | 생성일 |
| updated_at | TIMESTAMPTZ | | NO | 수정일 |

### Constraints

- user_id + year: UNIQUE
- user_id: FK → users.id
- CHECK: granted_days >= 0 AND granted_days * 2 = FLOOR(granted_days * 2)

## 6. Table: leaves

관련 요구사항: FR-LEAVE-001 ~ FR-LEAVE-005

| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 휴가 신청 ID |
| user_id | UUID | | NO | 신청자 ID |
| approver_id | UUID | | YES | 승인자 ID (즉시 승인 건은 NULL) |
| leave_type | leave_type | | NO | 휴가 종류 |
| start_date | DATE | | NO | 휴가 시작일 |
| end_date | DATE | | NO | 휴가 종료일 |
| days | NUMERIC(4,1) | | NO | 신청 일수 (주말 제외, 반차 0.5. 신청 시 계산하여 저장) |
| reason | VARCHAR(500) | | NO | 신청 사유 |
| status | leave_status | | NO | 신청 상태 |
| processed_by | UUID | | YES | 승인/반려/취소 처리자 ID |
| processed_at | TIMESTAMPTZ | | YES | 승인/반려/취소 처리 시간 |
| reject_reason | VARCHAR(500) | | YES | 반려 사유 |
| created_at | TIMESTAMPTZ | | NO | 신청일 |
| updated_at | TIMESTAMPTZ | | NO | 수정일 |

### Constraints

- user_id: FK → users.id
- approver_id: FK → users.id
- processed_by: FK → users.id
- CHECK: start_date <= end_date
- CHECK: EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM end_date) (연도를 걸치는 신청 금지)
- CHECK: leave_type NOT IN (HALF_AM, HALF_PM) OR start_date = end_date
- CHECK: (leave_type IN (HALF_AM, HALF_PM) AND days = 0.5) OR (leave_type NOT IN (HALF_AM, HALF_PM) AND days >= 1 AND days = FLOOR(days))
- CHECK: approver_id IS NULL OR approver_id <> user_id
- CHECK: status = PENDING이면 approver_id IS NOT NULL, processed_by와 processed_at은 NULL
- CHECK: status가 APPROVED / REJECTED / CANCELLED이면 processed_by와 processed_at은 NOT NULL
- CHECK: status = REJECTED이면 reject_reason IS NOT NULL
- CHECK: status <> REJECTED OR approver_id IS NOT NULL

### 상태별 저장 규칙

| 경우 | status | approver_id | processed_by | processed_at |
|---|---|---|---|---|
| 승인 필요 사용자의 신청 | PENDING | 지정한 승인자 | NULL | NULL |
| 승인 불필요 사용자의 신청 (즉시 승인) | APPROVED | NULL | 신청자 | 신청 시각 |
| 승인자 승인 / ADMIN 대리 승인 | APPROVED | 유지 | 실제 처리자 | 처리 시각 |
| 승인자 반려 / ADMIN 대리 반려 | REJECTED | 유지 | 실제 처리자 | 처리 시각 |
| 신청자 취소 | CANCELLED | 유지 | 신청자 | 취소 시각 |
| 계정 비활성화로 인한 취소 | CANCELLED | 유지 | 비활성화를 수행한 ADMIN | 비활성화 시각 |

- 즉시 승인 건은 상태와 관계없이 `approver_id IS NULL`로 판별한다(API의 `autoApproved`).
- 취소 가능한 즉시 승인 건은 `approver_id IS NULL AND status = 'APPROVED' AND start_date > 오늘`이다(FR-LEAVE-004).
- 연도별 집계(잔여 연차, 이력의 `year` 필터)는 `start_date`의 연도를 기준으로 한다. 연도를 걸치는 신청은 없으므로 `end_date`의 연도와 같다.

## 7. Index

- departments(code) — UNIQUE 제약으로 생성
- departments(manager_id) — FK 열. 사원 비활성화 시 책임자 해제(`WHERE manager_id = $1`) 조회용
- attendance(user_id, work_date) — UNIQUE 제약으로 생성
- attendance(work_date)
- users(emp_id) — UNIQUE 제약으로 생성
- users(department_id)
- leaves(user_id, status)
- leaves(approver_id, status)
- leaves(start_date, end_date)
- leave_grants(user_id, year) — UNIQUE 제약으로 생성
- refresh_tokens(user_id)
- refresh_tokens(token_hash) — UNIQUE 제약으로 생성

## 8. Data Integrity

- 참조하는 사용자, 부서는 반드시 존재해야 한다(FK).
- 동일 사용자의 동일 근무일 중복 기록을 방지한다.
- 잔여 연차는 별도로 저장하지 않고 leave_grants와 leaves로 계산한다(FR-LEAVE-001, FR-LEAVE-006).
- 승인, 반려, 취소는 `WHERE status = 'PENDING'` 등 현재 상태 조건부 UPDATE로 처리하고, 영향받은 행이 0건이면 충돌로 응답한다(NFR-004). 퇴근 등록도 `WHERE clock_out IS NULL` 조건부 UPDATE로 처리한다.

### 사용자 단위 잠금

- 잠금은 `SELECT ... FROM users WHERE id = $1 FOR NO KEY UPDATE`로 건다. `FOR UPDATE`는 쓰지 않는다. 다른 테이블의 FK 검사가 거는 `FOR KEY SHARE`와 충돌하여, 서로를 승인자로 지정한 동시 신청에서 데드락이 날 수 있기 때문이다.
- Prisma API로 표현할 수 없으므로 interactive transaction(`$transaction(async (tx) => ...)`) 안에서 `tx.$queryRaw`로 실행한다.

### 휴가 신청 처리 순서 (NFR-004)

한 트랜잭션 안에서 다음 순서로 처리한다.

1. 신청자 users 행을 잠근다.
2. 잠근 행에서 다시 읽은 `is_active`, `approval_required`로 판단한다(잠금 전에 읽은 값을 쓰지 않는다).
3. 날짜 중복을 검사한다.
4. 잔여 연차를 검사한다.
5. INSERT한다.

### 부여 연차 수정 (FR-LEAVE-006)

- 대상 사용자 users 행을 잠근 뒤(휴가 신청과 같은 방식), 해당 연도의 사용 일수(APPROVED + PENDING의 차감 일수)를 계산하여 새 부여 일수가 그보다 작으면 거부한다.

### 마지막 활성 ADMIN 보호 (FR-USER-002)

- ADMIN의 비활성화 또는 EMPLOYEE 변경은 트랜잭션 안에서 `SELECT id FROM users WHERE role = 'ADMIN' AND is_active FOR NO KEY UPDATE`로 활성 ADMIN 행을 모두 잠근 뒤, 애플리케이션에서 건수를 세어 판단한다(FOR UPDATE 계열은 집계 함수와 함께 쓸 수 없다).

### 부서 삭제 (FR-DEPT-001)

한 트랜잭션(READ COMMITTED) 안에서 다음 순서로 처리한다. 잠금 순서는 부서 행 → 사원 행으로 고정한다.

1. `SELECT code FROM departments WHERE id = $1 FOR UPDATE`로 부서 행을 잠근다. 없으면 404.
2. code가 `UNASSIGNED`이면 거부한다(409 PROTECTED_DEPARTMENT).
3. 잠금 획득 후 소속 활성 사원 수를 다시 센다. 1명 이상이면 거부한다(409 DEPARTMENT_HAS_MEMBERS).
4. 소속 비활성 사원을 未所属 부서로 이동한다(`updated_at` 갱신).
5. 부서를 DELETE한다. FK 위반(P2003)이면 트랜잭션 전체를 롤백하고(4의 이동도 취소) 409 DEPARTMENT_HAS_MEMBERS로 응답한다.

- 사용자 단위 잠금과 달리 `FOR UPDATE`를 쓴다. 다른 트랜잭션이 사원을 이 부서로 등록·이동할 때 FK 검사가 거는 `FOR KEY SHARE`를 **막는 것이 목적**이기 때문이다. 상대가 먼저 커밋하면 3에서 그 사원이 보여 409가 되고, 이쪽이 먼저 잠그면 상대의 FK 검사가 삭제 커밋 후 실패한다.
- 삭제 중 비활성 사원이 재활성화되면(부서 FK 변경이 없어 부서 잠금과 충돌하지 않음) 4의 UPDATE 대상에서 빠지고 5에서 FK 위반이 되어 롤백된다.
- `manager_id`는 부서 → 사원 방향 FK이므로 책임자가 지정되어 있어도 삭제를 막지 않는다(행과 함께 사라진다).

### 부서 등록·수정의 책임자 지정 (FR-DEPT-001)

`managerId`에 사원 ID를 지정한 경우에만 한 트랜잭션 안에서 다음 순서로 처리한다(null 지정·생략 시 잠금 없음). 잠금 순서는 부서 삭제와 같이 부서 행 → 사원 행이다.

1. (수정만) `SELECT code FROM departments WHERE id = $1 FOR UPDATE`로 부서 행을 잠근다. 없으면 404, `UNASSIGNED`이면 409 PROTECTED_DEPARTMENT(책임자 검사보다 먼저).
2. `SELECT is_active FROM users WHERE id = $2 FOR NO KEY UPDATE`로 사원 행을 잠근다(사용자 단위 잠금. 동시 비활성화와 직렬화). 없거나 비활성이면 400 INVALID_MANAGER. 소속 부서는 보지 않는다.
3. 부서를 INSERT/UPDATE한다. 코드·이름 중복은 409.

- 사원 비활성화 시 책임자 해제(FR-USER-002)는 비활성화 트랜잭션 안에서 `UPDATE departments SET manager_id = NULL ... WHERE manager_id = $1`로 처리한다(API-USER-004 미구현으로 아직 구현되지 않음). 사원의 부서 이동은 manager_id를 바꾸지 않는다.
- 사용자는 물리 삭제하지 않으므로 RESTRICT FK가 운영에서 문제가 되지 않는다. 테스트 데이터 정리(`TestDataTracker.cleanup()`)는 users 삭제 전에 대상 사원을 가리키는 manager_id를 NULL로 바꾼다.

## 9. 날짜·시간과 타입 처리

- 기준 시간대는 Asia/Tokyo이다. DB 컨테이너의 시간대는 UTC이므로 SQL에서 `CURRENT_DATE`나 `now()::date`를 쓰지 않는다.
- "오늘"은 애플리케이션의 공통 유틸리티 하나에서 Asia/Tokyo 기준으로 계산하여 파라미터로 전달한다. SQL에서 계산해야 하는 경우에는 `(now() AT TIME ZONE 'Asia/Tokyo')::date`를 쓴다.
- DATE 컬럼(work_date, start_date, end_date, hire_date)은 Prisma에서 UTC 자정의 JS `Date`로 다뤄진다. 애플리케이션 내부에서는 `'YYYY-MM-DD'` 문자열로 다루고, DB 입출력 시에만 변환한다.
  - 저장: `new Date('YYYY-MM-DD' + 'T00:00:00Z')`
  - 조회: `date.toISOString().slice(0, 10)`
- 출근 등록 시 clock_in과 work_date는 같은 시각 값 하나에서 계산한다.
- NUMERIC 컬럼(granted_days, days)과 그 집계 결과는 Prisma에서 `Decimal`로 반환된다. API 응답으로 매핑할 때 `toNumber()`로 number로 변환한다(0.5 단위이므로 정밀도 손실 없음).
