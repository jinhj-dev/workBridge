# design-backend — 부서 관리 화면 재구성 (SCR-010)

## 참조 문서
- `docs/06_API_SPECIFICATION.md` §5 `DepartmentDetail`·입력 규칙(등록·수정 공통), API-DEPT-002~006, 공통 타입 `UserSummary`, API-LEAVE-002(후보 검색 규칙 참고)
- `docs/02_REQUIREMENTS.md` FR-DEPT-001, FR-USER-002(비활성화)
- `docs/05_DATABASE_DESIGN.md` §0 외래 키, §1 departments(시스템 부서), §8 사용자 단위 잠금·부서 삭제
- `docs/07_ARCHITECTURE.md` 인증·Guard 구성(AdminOnly)

## 전제 (확정: Q1-C, 部署数 未所属 제외, R1~R5 = plan.md "확정 사항")
- departments에 `description`(설명, 선택)과 `manager_id`(부서 책임자) 추가. 부서 등록·삭제 흐름(05 §8 삭제 트랜잭션)은 그대로.
- 책임자 규칙은 아래 "책임자 규칙"(사용자 확정).
- 모든 신규·변경 API는 `AdminDepartmentsController`(클래스 `@AdminOnly()`). Controller → Service → Repository 유지.

## 데이터 모델 / 마이그레이션 `add_departments_description_manager`
| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| description | VARCHAR(500) | YES | 부서 설명. 앞뒤 공백 제거, 빈 문자열은 NULL로 저장 |
| manager_id | UUID | YES | 부서 책임자. FK → users.id `ON DELETE RESTRICT ON UPDATE CASCADE`(05 §0 공통 규칙) |
- 제약: UNIQUE 없음(R4 겸임 허용). 일반 인덱스 `departments(manager_id)` 추가 — 05 §7의 FK 열 인덱스 관례(users.department_id, leaves.approver_id)와 R2 해제 시 `WHERE manager_id = $1` 조회용
- 기존 데이터: 모든 기존 부서는 두 컬럼 NULL(백필 없음). seed·샘플 스크립트 변경 없음(NULL 유지). 未所属도 NULL
- Prisma: `Department.managerId String? @map("manager_id") @db.Uuid`, `manager User? @relation("DepartmentManager", ..., onDelete: Restrict)`, `@@index([managerId])`, `description String? @db.VarChar(500)`. User↔Department 관계가 2개가 되므로 기존 소속 관계에도 이름(`"DepartmentMembers"`)을 붙인다(DB 변경 없음, 마이그레이션 SQL에 FK 재생성이 나오지 않는지 확인). User 측 `managedDepartments Department[] @relation("DepartmentManager")`
- 롤백: 두 컬럼 DROP(데이터 손실은 이 기능에서 입력한 값뿐)

## 책임자 규칙 (확정)
- R1 자격: **임의의 활성 사원**(소속 부서·role 무관, ADMIN·요청자 본인 포함). 사원 없음·비활성 → 400 `INVALID_MANAGER`. 등록(POST)·수정(PATCH) 모두 `managerId` 지정 가능
- R2 비활성화·퇴직: users는 물리 삭제 없음(05 §0) → 퇴직 = 비활성화. 비활성화 시 그 사원이 책임자인 **모든 부서**(겸임)의 `manager_id`를 **같은 트랜잭션에서 NULL**로 자동 해제
- R3 부서 이동: 자격이 소속과 무관하므로 **해제하지 않는다(책임자 유지)**
- R2의 실행 지점은 API-USER-004(사원 수정)인데 **현재 미구현** → 이번에는 규칙을 문서(02 FR-USER-002, 06 API-USER-004)에만 기록하고, 구현은 사원 관리 기능에서 한다
- 부서 삭제(05 §8): `departments.manager_id`는 부서 → 사원 방향 FK라 책임자가 있어도 부서 삭제를 막지 않는다(행과 함께 사라짐). 기존 삭제 규칙(활성 소속 사원 있으면 409) 그대로, 추가 처리 없음
- R4 겸임: **허용**(한 사원이 여러 부서 책임자 가능, UNIQUE 없음)
- R5 未所属: **지정 불가**. 未所属 PATCH는 기존대로 409 `PROTECTED_DEPARTMENT`(설명도 수정 불가)
- 조회 시 보정(필터링)은 하지 않는다. 쓰기 시점 규칙으로만 일관성 유지

## API 계약

`DepartmentDetail` (API-DEPT-002~005 공통, 변경)
```json
{ "id": "uuid", "code": "DEV", "name": "開発部", "description": "社内システムの開発", 
  "manager": { "id": "uuid", "empId": "00001", "name": "山田 太郎" },
  "memberCount": 12, "inactiveMemberCount": 2, "isSystem": false, "createdAt": "...", "updatedAt": "..." }
```
- `description: string | null`, `manager: {id, empId, name} | null`. 그 외 사원 정보(role·isActive 등)는 넣지 않는다

입력 규칙(추가)
- `description`: 문자열 또는 null. 앞뒤 공백 제거 후 0~500자, 빈 문자열 → null. 줄바꿈 허용. 초과 → 400 VALIDATION_ERROR 「説明は 500 文字以内で入力してください。」(field `description`)
- `managerId`(POST·PATCH): UUID 또는 null(null = 해제·미지정). UUID 형식 오류 → 400 VALIDATION_ERROR(field `managerId`) 「部署責任者の形式が正しくありません。」

### API-DEPT-002 부서 관리 목록 (변경)
- Query 추가: `sort` = `code`|`name`|`memberCount`|`updatedAt`(기본 `code`), `order` = `asc`|`desc`(기본 `asc`). 기존 `code`·`name`·`page`·`limit` 그대로
- 정렬: 지정 키 → 동률은 `code` 오름차순. `memberCount`는 활성 사원 수 기준
- 400 VALIDATION_ERROR: 허용 외 `sort`·`order`(`details[{field:'sort'|'order'}]`)
- Response: 페이지네이션 `DepartmentDetail[]`(description·manager 포함)

### API-DEPT-003 상세 (응답만 변경: description·manager 포함)

### API-DEPT-004 등록 (변경)
- Request `{ "code": "DEV", "name": "開発部", "description": "...", "managerId": "uuid" }` — description·managerId 선택(생략·null 시 null)
- Response 201: `DepartmentDetail`(`memberCount: 0`, manager는 지정 시 `{id,empId,name}`)
- 에러 추가: 400 `INVALID_MANAGER`(API-DEPT-005와 같음). 코드 중복 409와 동시 해당 시 순서는 검증(400 VALIDATION_ERROR) → 책임자 검사 → INSERT(중복 409)

### API-DEPT-005 수정 (변경)
- Request(변경할 필드만, 최소 1개): `code`, `name`, `description`, `managerId`. refine 조건에 description·managerId 포함(`undefined`가 아니면 지정한 것으로 본다. null도 지정)
- 에러 추가: 400 `INVALID_MANAGER` 「部署責任者には有効な社員を指定してください。」 — 사원 없음 / 비활성. 다른 부서 소속·다른 부서 책임자 겸임은 허용. 未所属은 이 검사보다 먼저 409 PROTECTED_DEPARTMENT

### API-DEPT-007 부서 요약 (신규)
- `GET /admin/departments/summary` · ADMIN → `{ "departmentCount": 7, "memberCount": 120 }`
  - `departmentCount`: **未所属 제외** 부서 수(`code <> SYSTEM_DEPARTMENT_CODE`), 검색 조건 무관
  - `memberCount`: 전체 활성 사원 수(기존 설계 유지, 未所属 소속 활성 사원 포함)
- `@Get('summary')`를 `@Get(':id')`보다 먼저 선언

### API-DEPT-008 부서 소속 사원 목록 (신규)
- `GET /admin/departments/:id/members` · ADMIN · Query `page`,`limit`(`paginationQuerySchema`, 최대 100)
- Response 200: 페이지네이션 `[{ "id", "empId", "name" }]` 활성 사원만, `empId` 오름차순
- 400 VALIDATION_ERROR(`:id` 형식) / 404 NOT_FOUND 「部署が見つかりません。」
- 所属社員確認 모달 전용(책임자 후보에는 쓰지 않는다 → API-DEPT-009)

### API-DEPT-009 부서 책임자 후보 (신규)
- 기존 API 검토: API-LEAVE-002(`/leaves/approvers`)는 USER 권한·요청자 본인 제외라 R1(본인 포함) 불충족이고 휴가 용도 / API-USER-001(`/admin/users`)은 미구현이며 role·hireDate 등 반환 과다 → 재사용 안 함
- `GET /admin/departments/manager-candidates` · ADMIN · Query `keyword`(선택, trim 후 최대 100자. 이름 대소문자 무시 부분 일치 OR 사원번호 부분 일치 = API-LEAVE-002와 같은 규칙. 빈 값이면 조건 없음)
- Response 200: `UserSummary[]`(`{id, empId, name, departmentName}`만) — 활성 사원 전체(본인·ADMIN 포함), 사원번호 오름차순, **최대 100건**(`MANAGER_CANDIDATE_LIMIT = 100`, 고정·Query로 변경 불가)
- 400 VALIDATION_ERROR: keyword 100자 초과(field `keyword`)
- `@Get('manager-candidates')`를 `@Get(':id')`보다 먼저 선언

## 처리 로직
- 정렬(`findPage`): `code`·`name`·`updatedAt`은 Prisma `orderBy: [{[sort]: order}, {code:'asc'}]`. `memberCount`는 `_count` orderBy가 비활성까지 세므로 금지 → `$queryRaw`(LEFT JOIN users ON is_active, GROUP BY, `ORDER BY count ${Prisma.sql 고정 ASC/DESC}, d.code ASC`, LIMIT/OFFSET, 기존 ILIKE escape 조건)로 id 목록 → `DEPARTMENT_SELECT`로 조회 후 id 순 재배열. 사용자 문자열 SQL 보간 금지
- `DEPARTMENT_SELECT`에 `description`, `manager: { select: { id, empId, name } }` 추가 → `DepartmentRow`·`toDepartmentDetail` 확장
- 요약: `$transaction([department.count({where:{code:{not:SYSTEM_DEPARTMENT_CODE}}}), user.count({where:{isActive:true}})])`
- 소속 사원: 부서 존재 확인 → 없으면 404 → `user.findMany({where:{departmentId,isActive:true}, select:{id,empId,name}, orderBy:{empId:'asc'}, skip, take})` + count
- 책임자 후보: `user.findMany({where:{isActive:true, ...(keyword ? {OR:[{name:{contains, mode:'insensitive'}},{empId:{contains}}]} : {})}, select:{id,empId,name, department:{select:{name}}}, orderBy:{empId:'asc'}, take: MANAGER_CANDIDATE_LIMIT})` → 기존 UserSummary 매핑(leaves의 `findApprovers` 참고, 공용화는 하지 않음)
- 수정(`update`): `managerId`가 문자열이면 interactive transaction으로 처리. 잠금 순서는 05 §8과 같게 **부서 → 사원**
  1. `SELECT code FROM departments WHERE id=$1 FOR UPDATE` → 없으면 notFound, 未所属이면 protected
  2. `SELECT is_active FROM users WHERE id=$2 FOR NO KEY UPDATE`(05 §8 사용자 단위 잠금, 동시 비활성화와 직렬화) → 없음·비활성이면 `invalidManager`. 소속 부서는 보지 않는다
  3. `department.update` (code·name·description·managerId) → 중복은 기존 duplicate 처리
  - `managerId`가 null이거나 미지정이면 기존 경로(잠금 없음)에 data만 추가해도 된다
- 등록(`create`): `managerId`가 문자열이면 transaction에서 위 2번(사원 잠금·검사) 후 `department.create`. 없으면 기존 경로
- Repository 결과 union에 `{ status: 'invalidManager' }` 추가 → Service가 AppException 400 `INVALID_MANAGER`(create·update 공통)

## 보안 요구사항
- 전 API ADMIN 전용(EMPLOYEE 403, 비로그인 401). 책임자·소속 사원 응답은 id·empId·name만, 후보는 + departmentName만(role·isActive·hireDate 등 반환 금지). 후보는 상한 100건 고정. 로그에 사원 정보 출력 금지
- managerId 검증은 서버에서 잠금 후 재조회한 값으로만 판단(클라이언트 후보 목록을 신뢰하지 않음)
- 정렬 파라미터는 zod enum + SQL 조각 화이트리스트. description은 그대로 저장, 출력은 React 기본 escape(HTML 해석 없음)

## 파일
수정
- `backend/prisma/schema.prisma` + 신규 마이그레이션 `backend/prisma/migrations/<ts>_add_departments_description_manager/migration.sql`
- `backend/src/modules/departments/dto/department-fields.ts`(`departmentDescriptionSchema`, `departmentManagerIdSchema`), `create-department.dto.ts`(description·managerId), `update-department.dto.ts`, `admin-department-query.dto.ts`(sort·order)
- 신규 `backend/src/modules/departments/dto/manager-candidates-query.dto.ts`(keyword, `approvers-query.dto.ts`와 같은 형태)
- `backend/src/modules/departments/admin-departments.controller.ts`(summary, manager-candidates, `:id/members`)
- `backend/src/modules/departments/departments.service.ts`(getSummary, listMembers, listManagerCandidates, create·update의 invalidManager, 정렬 전달)
- `backend/src/modules/departments/departments.repository.ts`(DEPARTMENT_SELECT, findPage 정렬, create·update 트랜잭션, countSummary, findMembersPage, findManagerCandidates)
- `backend/src/modules/departments/department.mapper.ts`(description·manager, DepartmentSummary·DepartmentMember, 후보는 기존 UserSummary 타입 재사용)
- `backend/test/db/db-helpers.ts` — `cleanup()`에서 users 삭제 전에 대상 사원을 가리키는 모든 부서(다른 부서 포함, 겸임)의 `manager_id`를 NULL로(RESTRICT FK 때문에 필수)
- 테스트: `departments.service.spec.ts`, `dto/department-dto.spec.ts`, `backend/test/admin-departments.e2e-spec.ts`
참고: `common/pagination/pagination.ts`, `modules/leaves/` 승인자 검증(`INVALID_APPROVER`, 사용자 잠금 패턴)·`findApprovers`·`dto/approvers-query.dto.ts`

## 문서 갱신 예정(backend.md에 기록)
- 05 §1 departments(description·manager_id·FK, UNIQUE 없음=겸임 허용), §7 Index `departments(manager_id)`, §8 부서 등록·수정 시 사원 잠금 순서
- 06 `DepartmentDetail`·입력 규칙, API-DEPT-002(sort·order)·004·005(managerId·INVALID_MANAGER), API-DEPT-007·008·009 신규, API-USER-004 비고(비활성화 시 책임자 자동 해제, 미구현 / 부서 이동은 영향 없음)
- 02 FR-DEPT-001(정렬·설명·책임자 규칙 R1·R4·R5), FR-USER-002(비활성화 시 책임자 해제, 부서 이동은 유지) / 08 5.6 TC 추가
