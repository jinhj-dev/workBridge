# 부서 관리 — 백엔드 설계

## 참조 문서
- `docs/05_DATABASE_DESIGN.md` §0 키와 공통 컬럼·외래 키, §1 Table: departments, §2 Table: users, §7 인덱스, §8 잠금(`FOR NO KEY UPDATE` 관례)
- `docs/06_API_SPECIFICATION.md` §0 공통 규칙(페이지네이션·공통 Error Response), §5 사원 관리(API-USER-002·004, API-DEPT-001)
- `docs/07_ARCHITECTURE.md` Role Guard(`@AdminOnly()`)
- `docs/02_REQUIREMENTS.md` FR-USER-001·002 (부서 필드)
- 결정 사항: `decisions.md` (Q1~Q8 확정, Q9·Q10은 권장안 가정)

## 기존 문서·코드와의 차이 (이번 설계가 바꾸는 것)
| 항목 | 기존 | 이번 설계 |
|---|---|---|
| 부서 관리 | 범위 밖, seed로만 등록(05 §1) | ADMIN이 CRUD |
| 물리 삭제 | departments는 물리 삭제하지 않음(05 §0) | 활성 사원 0명일 때 물리 삭제(비활성 사원은 未所属로 이동) |
| departments 컬럼 | id, name(UNIQUE), created_at, updated_at | + `code` VARCHAR(20) NOT NULL UNIQUE |
| 시스템 부서 | 없음 | 未所属(code `UNASSIGNED`). 항상 존재, 수정·삭제 불가 |
| users.department_id | NULL 허용, 사원 등록 시 선택 | NOT NULL, 등록·수정 시 필수 |
| GET /departments | `[{id,name}]`, 이름 오름차순 | 변경 없음(未所属 포함) |
코드 현황: `modules/departments/`에는 GET /departments만 있다. `modules/users`(API-USER-*)는 미구현.

## 1. 데이터 모델 (schema.prisma)
```prisma
model Department {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(20)   // 신규. 대문자 정규화 후 저장
  name      String   @unique @db.VarChar(100)  // 기존 유지(Q2-A)
  createdAt / updatedAt (기존 그대로)
  users User[]
}
model User {
  departmentId String     @map("department_id") @db.Uuid   // String? → String
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  @@index([departmentId])  // 기존 유지 (소속 건수 집계·SCR-006 필터에 사용)
}
```
- onDelete: Restrict 유지(05 §0). Cascade·SetNull은 쓰지 않는다(SetNull은 NOT NULL과 모순, Cascade는 사원 삭제가 되어 금지). 비활성 사원 이동은 애플리케이션이 명시적으로 수행
- 시스템 부서 구분: 플래그 컬럼 없이 고정 코드 상수 `SYSTEM_DEPARTMENT_CODE = 'UNASSIGNED'`(`modules/departments/department.constants.ts`, seed도 import). 사용자 입력 코드도 UNIQUE라 다른 부서가 이 코드를 가질 수 없다
- 인덱스: `departments(code)`·`departments(name)`은 UNIQUE가 생성. 추가 인덱스 없음(`users(department_id)`로 활성 건수 집계 충분, 부서당 사원 수가 적음)
- 목록 정렬은 code 오름차순
- `created_by`/`updated_by`/`deleted_at`은 추가하지 않는다(Q6)

## 2. 마이그레이션 `prisma/migrations/<ts>_department_code_and_required_user_department/migration.sql`
`prisma migrate dev --create-only`로 만든 뒤 아래 순서로 직접 편집한다(한 트랜잭션).
1. `ALTER TABLE departments ADD COLUMN code VARCHAR(20)` (NULL 허용으로 추가)
2. seed 부서 코드 부여: 総務部→`GA`, 開発部→`DEV`, 営業部→`SALES`, 人事部→`HR` (`UPDATE ... WHERE name = ...`)
3. 나머지(테스트 잔여 등): `created_at, id` 순 row_number로 `'D' || lpad(n, 4, '0')`
4. 未所属 부서를 **항상** 만든다: 이미 이름 `未所属`인 행이 있으면 그 행의 code를 `UNASSIGNED`로, 없으면 `INSERT INTO departments(id, code, name, created_at, updated_at) VALUES (gen_random_uuid(), 'UNASSIGNED', '未所属', now(), now())` (id는 명시 생성, 05 §0). 3에서 이 행에 붙은 `D` 코드는 덮어쓴다(3·4 순서를 바꿔 4를 먼저 해도 된다)
5. `UPDATE users SET department_id = (UNASSIGNED id), updated_at = now() WHERE department_id IS NULL`
6. `ALTER TABLE departments ALTER COLUMN code SET NOT NULL` + `CREATE UNIQUE INDEX departments_code_key ON departments(code)`
7. `ALTER TABLE users ALTER COLUMN department_id SET NOT NULL`
- 이미 적용된 `init` 마이그레이션은 수정하지 않는다. 배포 전(10 §11 대기)이므로 대상은 개발·테스트 DB뿐
- 롤백: 역 마이그레이션 SQL(`DROP NOT NULL`, `DROP INDEX`, `DROP COLUMN code`)을 PR 설명에 기록. 未所属 부서는 남아도 무해
- 마이그레이션 전후 확인: `department_id IS NULL` 0건, 코드 중복 0, `UNASSIGNED` 1건

## 3. seed·스크립트
- `prisma/initial-data.ts`: `DEPARTMENT_NAMES` → `DEPARTMENTS = [{code:'UNASSIGNED',name:'未所属'},{code:'GA',name:'総務部'},...]`(未所属 코드는 상수 import). createMany skipDuplicates 유지. 초기 ADMIN은 `GA`에 소속(`department: { connect: { code: 'GA' } }`). seed.ts 출력 문구의 `DEPARTMENT_NAMES.length` 참조 수정
- `prisma/e2e-account-data.ts`: `departmentId: null` → seed 부서 `DEV` id 조회 후 지정. 없으면 "先に npm run db:seed ..." 에러(기존 ADMIN 확인과 같은 방식)

## 4. API 계약 (전부 신규, ADMIN, `@AdminOnly()` + `@Controller('admin/departments')`)
공통 객체 `DepartmentDetail`:
```json
{ "id": "uuid", "code": "DEV", "name": "開発部", "memberCount": 12, "inactiveMemberCount": 2,
  "isSystem": false,
  "createdAt": "2026-11-10T09:00:00+09:00", "updatedAt": "2026-11-10T09:00:00+09:00" }
```
- `memberCount`: 소속 **활성** 사원 수(`is_active = true`). 삭제 가능 판단 기준(Q4-B)
- `inactiveMemberCount`: 소속 비활성 사원 수. 삭제 시 未所属로 이동되는 인원(확인 모달 안내용)
- `isSystem`: `code === 'UNASSIGNED'`이면 true

| ID | 메서드·경로 | 요청 | 응답 | 에러 |
|---|---|---|---|---|
| API-DEPT-002 목록 | GET /admin/departments | Query `code`(부분 일치, 대소문자 무시, 최대 20자), `name`(부분 일치, 최대 100자), `page`, `limit` | 200 페이지네이션 `DepartmentDetail[]`, code 오름차순 | 400 VALIDATION_ERROR |
| API-DEPT-003 상세 | GET /admin/departments/:id | - | 200 `DepartmentDetail` | 404 NOT_FOUND(형식 오류 UUID 포함) |
| API-DEPT-004 등록 | POST /admin/departments | `{ "code": "DEV", "name": "開発部" }` 둘 다 필수 | 201 `DepartmentDetail`(카운트 0) | 400 VALIDATION_ERROR / 409 DUPLICATE_DEPARTMENT_CODE / 409 DUPLICATE_DEPARTMENT_NAME |
| API-DEPT-005 수정 | PATCH /admin/departments/:id | `code`, `name` 중 변경할 것(최소 1개) | 200 `DepartmentDetail` | 400 / 404 / 409 CODE·NAME 중복 / 409 PROTECTED_DEPARTMENT |
| API-DEPT-006 삭제 | DELETE /admin/departments/:id | - | 204 본문 없음 | 404 / 409 DEPARTMENT_HAS_MEMBERS / 409 PROTECTED_DEPARTMENT |

입력 검증(zod, `dto/*.dto.ts`):
- code: trim → `^[A-Za-z0-9-]{1,20}$` → `toUpperCase()` 후 저장·중복 비교
- name: trim → 1~100자
- PATCH 빈 객체 → 400 VALIDATION_ERROR. 알 수 없는 필드는 기존 DTO 관례를 따른다
- 등록·수정으로 code `UNASSIGNED`를 쓰려 하면 UNIQUE 충돌로 409 DUPLICATE_DEPARTMENT_CODE(별도 처리 불필요)

에러 message(일본어, AppException):
| code | HTTP | message |
|---|---|---|
| DUPLICATE_DEPARTMENT_CODE | 409 | この部署コードは既に使用されています。 |
| DUPLICATE_DEPARTMENT_NAME | 409 | この部署名は既に使用されています。 |
| DEPARTMENT_HAS_MEMBERS | 409 | 所属する社員が存在するため、部署を削除できません。 |
| PROTECTED_DEPARTMENT | 409 | 未所属部署は変更・削除できません。 |
| NOT_FOUND | 404 | 部署が見つかりません。 |

## 5. 처리 로직
### 목록·상세
- `findMany` + `_count: { select: { users: { where: { isActive: true } } } }`로 활성 수, 같은 페이지 id들에 대해 `user.groupBy({ by: ['departmentId'], where: { departmentId: { in }, isActive: false }, _count })` 1회로 비활성 수(총 쿼리 3개 고정, N+1 없음). 목록·전체 건수는 `$transaction`

### 등록·수정
- 수정: 대상 조회 → 없으면 404, `code === UNASSIGNED`면 409 PROTECTED_DEPARTMENT → UPDATE
- 사전 중복 조회 없이 INSERT/UPDATE하고 Prisma P2002의 `meta.target`(code/name)으로 409 코드를 구분. UPDATE 중 P2025 → 404

### 삭제 (하나의 트랜잭션, 격리 수준 READ COMMITTED 기본값 + 부서 행 잠금)
1. `SELECT id, code FROM departments WHERE id = $1 FOR UPDATE` → 없으면 404
2. `code = 'UNASSIGNED'` → 409 PROTECTED_DEPARTMENT
3. **잠금 획득 후** 활성 수 재확인: `SELECT count(*) FROM users WHERE department_id = $1 AND is_active` > 0 → 409 DEPARTMENT_HAS_MEMBERS
4. 未所属 id 조회(`code = 'UNASSIGNED'`). 없으면 시스템 오류(500, 마이그레이션·seed가 보장)
5. `UPDATE users SET department_id = 未所属, updated_at = now() WHERE department_id = $1 AND NOT is_active`
6. `DELETE FROM departments WHERE id = $1`. P2003(FK) → 409 DEPARTMENT_HAS_MEMBERS(트랜잭션 전체 롤백, 이동도 취소)

동시성 분석
- 다른 트랜잭션이 사원을 이 부서로 등록·이동: INSERT/UPDATE의 FK 검사가 부서 행에 `FOR KEY SHARE`를 걸며, 1의 `FOR UPDATE`와 충돌한다.
  - 상대가 먼저 커밋 → 1이 커밋을 기다린 뒤 3의 새 스냅샷(READ COMMITTED는 문장마다 스냅샷)에 그 사원이 보여 409
  - 우리가 먼저 잠금 → 상대 FK 검사가 대기하다 삭제 커밋 후 실패(사원 API에서는 400 INVALID_DEPARTMENT로 변환, 사원 관리 구현 시 적용)
- 다른 트랜잭션이 이 부서의 비활성 사원을 재활성화(부서 FK 변경 없음 → 부서 잠금과 충돌하지 않음): 5의 UPDATE는 행 잠금 대기 후 조건을 재평가하므로 재활성화된 사원은 이동되지 않고, 6에서 FK 위반 → 409로 롤백. 결과는 정합
- SERIALIZABLE은 쓰지 않는다(재시도 로직이 필요해지고, 위 잠금으로 충분)
- `FOR UPDATE`를 부서 행에 쓰는 이유: 05 §8은 users 행에 `FOR NO KEY UPDATE`를 쓰지만, 여기서는 FK 검사의 `FOR KEY SHARE`를 **막는 것이 목적**이므로 `FOR UPDATE`가 맞다. 잠금 순서는 부서 → 사원 행으로 고정. 사원 수정 트랜잭션은 사원 행 → (변경 대상) 부서 순이지만 이 부서로 옮기는 사원은 5의 대상(현재 이 부서 소속)이 아니므로 순환 대기가 생기지 않는다. 그래도 PostgreSQL 데드락(40P01)이 나면 기존 전역 필터대로 500
- Prisma에서 1·3·5는 `tx.$queryRaw`/`$executeRaw`(파라미터 바인딩) 또는 3·5는 `tx.user.count`/`updateMany`로 구현. 전부 Repository 안에서 `$transaction(async (tx) => ...)` 하나로 처리

### 사원 측 (사원 관리 구현 시 적용, 06 갱신 대상, Q1-A)
- API-USER-002 `departmentId` 필수, API-USER-004 `departmentId: null` 거부(400 VALIDATION_ERROR), 존재하지 않는 부서 400 INVALID_DEPARTMENT(기존). 未所属 배정은 허용(Q10-A)
- UserSummary·로그인 응답 `departmentName`은 문서상 non-null로 표기(Q8, 코드 타입은 그대로)

## 6. 보안
- 클래스에 `@AdminOnly()`. EMPLOYEE 403 FORBIDDEN, 비밀번호 변경 필요 403 PASSWORD_CHANGE_REQUIRED(전역 Guard)
- 응답에 사원 개인정보를 넣지 않는다(건수만)
- raw SQL은 tagged template(파라미터 바인딩)만 사용
- GET /departments(USER)는 기존대로 id·name만

## 7. 파일
생성
- `backend/src/modules/departments/admin-departments.controller.ts`
- `backend/src/modules/departments/department.constants.ts` (`SYSTEM_DEPARTMENT_CODE`)
- `backend/src/modules/departments/department.mapper.ts` (`toDepartmentDetail`, 일시 변환은 `common/time/tokyo-date.ts`)
- `backend/src/modules/departments/dto/admin-department-query.dto.ts`, `create-department.dto.ts`, `update-department.dto.ts`
- `backend/src/modules/departments/departments.service.spec.ts` (단위)
- `backend/prisma/migrations/<ts>_department_code_and_required_user_department/migration.sql`
- `backend/test/admin-departments.e2e-spec.ts`
수정
- `backend/prisma/schema.prisma`(헤더 주석의 "ユーザー・部署は物理削除しない" 문구도 갱신), `prisma/initial-data.ts`, `prisma/seed.ts`, `prisma/e2e-account-data.ts`
- `backend/src/modules/departments/departments.module.ts`·`.service.ts`·`.repository.ts`
- `backend/test/db/db-helpers.ts`: `createUser`에 departmentId가 없으면 tracker 전용 부서를 1회 만들어 지정. `createDepartment(overrides?)`에 고유 code(`T${uniqueSuffix()}` 대문자, 20자 이내). cleanup 시 tracker 사원이 未所属으로 이동돼 있어도 사원 먼저 삭제하므로 순서 변경 불필요
- `backend/test/db/schema.e2e-spec.ts`, `test/db/seed.e2e-spec.ts`(DEPARTMENTS에 未所属 포함·ADMIN 소속), `test/db/e2e-accounts.e2e-spec.ts`(`departmentId: null` 기대값)
- `backend/src/common/mappers/user-summary.ts`: Prisma 타입이 non-null이 되어 lint 지적 시에만 정리(Q8)
참고 기존 파일
- `modules/attendance/admin-attendance.controller.ts`(Admin Controller), `attendance.service.ts`(UUID 형식 검사 → 404), `modules/leaves/leaves.repository.ts`(트랜잭션·행 잠금 raw SQL 패턴), `common/pagination/pagination.ts`, `common/exceptions/app.exception.ts`, `modules/leaves/dto/*`(zod DTO)
