# 부서 관리 — 백엔드 구현 결과

## 생성·수정한 파일 (모두 backend/)
생성
- `src/modules/departments/` admin-departments.controller.ts, department.constants.ts, department.mapper.ts, dto/(admin-department-query / create-department / update-department / department-fields), departments.service.spec.ts
- `prisma/migrations/20261110000000_department_code_and_required_user_department/migration.sql` (설계 §2의 1~7단계 그대로, 롤백 SQL은 주석)
- `test/admin-departments.e2e-spec.ts`
수정
- `prisma/schema.prisma`(code 추가, users.department_id 필수, 헤더 주석 갱신), `prisma/initial-data.ts`(DEPARTMENTS, 초기 ADMIN은 GA 소속), `prisma/seed.ts`, `prisma/e2e-account-data.ts`(DEV 부서 지정, 없으면 seed 안내 에러)
- `src/modules/departments/` departments.module/service/repository
- `test/db/db-helpers.ts`(createUser 기본 부서, createDepartment(overrides)+고유 code), `test/db/{schema,seed,e2e-accounts}.e2e-spec.ts`
- `src/modules/attendance/attendance.mapper.spec.ts`: `department: null` 케이스가 non-null 타입 변경으로 tsc 에러 → 해당 입력·기대값 제거(1건). 설계 외 수정
- user-summary.ts는 lint 지적 없어 미수정(Q8)

## API 요약 (전부 ADMIN, `/api/v1/admin/departments`, 쿠키/토큰 변경 없음)
- GET `/` : Query code·name(부분 일치, 대소문자 무시)·page·limit → 200 `{items, page, limit, totalCount, totalPages}`, code 오름차순. 400 VALIDATION_ERROR
- GET `/:id` : 200 DepartmentDetail / 404 NOT_FOUND(UUID 형식 오류 포함)
- POST `/` : `{code,name}` → 201 DepartmentDetail / 400 / 409 DUPLICATE_DEPARTMENT_CODE·NAME
- PATCH `/:id` : code·name 중 최소 1개 → 200 / 400 / 404 / 409 CODE·NAME 중복 / 409 PROTECTED_DEPARTMENT
- DELETE `/:id` : 204 / 404 / 409 DEPARTMENT_HAS_MEMBERS / 409 PROTECTED_DEPARTMENT
- DepartmentDetail: id, code, name, memberCount(활성), inactiveMemberCount, isSystem, createdAt, updatedAt(+09:00)
- 에러 message는 설계 §4 표의 일본어 그대로. 404 message는 「部署が見つかりません。」(Fix 1 이후 실제로 응답에 반영됨)
- EMPLOYEE 403 FORBIDDEN, 비로그인 401. GET `/departments`는 변경 없음(未所属 포함)

## API 문서와 다른 점
- 없음(계약 동일). 구현 세부 차이: UNIQUE 위반 구분에 `meta.target` 대신 `meta.driverAdapterError.cause.constraint.index`(`departments_code_key`/`departments_name_key`)를 사용. adapter-pg 경유 P2002에는 target이 들어오지 않음(schema.e2e-spec 기록과 일치)
- 삭제는 설계 §5대로 부서 `FOR UPDATE` → 활성 수 재확인 → 비활성 이동 → DELETE, FK 위반(P2003)은 롤백 후 409. 수정은 대상 조회(404/보호) 후 UPDATE

## 검증
- `tsc --noEmit`, `npm run lint`, `npm run build` 통과. unit 208건 통과(신규 service spec 포함). e2e 12파일 301건 통과(신규 24건: 권한·등록·목록·상세·수정·삭제·삭제 중 사원 활성화 경합)
- 동시성은 e2e 1건(부서 행 잠금 중 사원 활성화 → 409, 이동 롤백 확인)만 검증. 다중 트랜잭션 부하 테스트는 미실시

## 환경 주의 (중요)
- 공용 Postgres의 `workbridge`(개발)·`workbridge_test` DB에는 다른 브랜치의 마이그레이션 `20261110144731_add_users_hire_date`(users.hire_date NOT NULL, 기본값 없음)가 이미 적용돼 있어, 이 브랜치 코드로는 해당 DB에서 사원 INSERT가 실패한다. 또한 `prisma migrate dev`는 drift로 reset을 요구해 개발 DB에는 마이그레이션을 적용하지 않았다(`workbridge_test`에는 `db:migrate:test`로 이미 적용됨)
- 검증은 임시 DB `workbridge_dept_test`(검증 후 삭제, `.env.test`는 원복)에서 수행. hire_date 브랜치와 병합할 때는 마이그레이션 순서(타임스탬프)와 createUser/seed/e2e 계정의 hire_date 대응을 조정해야 한다
- 개발 DB 반영 시 `db:seed`로 GA 등 코드 부여는 마이그레이션이 담당. e2e 계정은 `db:e2e-accounts` 재실행 시 DEV 부서로 이동

## 문서 갱신 예정 (architect)
- `docs/05_DATABASE_DESIGN.md` §0: "departments는 물리 삭제하지 않음"을 "활성 사원 0명일 때 ADMIN이 물리 삭제, 비활성 사원은 未所属로 이동"으로 변경. §1 departments: `code VARCHAR(20) NOT NULL UNIQUE`(대문자 정규화) 추가, 未所属(code `UNASSIGNED`) 시스템 부서·seed 설명 갱신. §2 users.department_id: NOT NULL. §8 잠금: 부서 삭제 트랜잭션(`FOR UPDATE` 목적과 순서 부서→사원) 추가
- `docs/06_API_SPECIFICATION.md` §5: API-DEPT-002~006(위 표, DepartmentDetail, 에러 코드 DUPLICATE_DEPARTMENT_CODE/NAME·DEPARTMENT_HAS_MEMBERS·PROTECTED_DEPARTMENT) 신규 추가, 에러 코드 표에 4건 추가. API-USER-002 `departmentId` 필수, API-USER-004 null 거부, UserSummary·로그인 `departmentName` non-null 표기
- `docs/02_REQUIREMENTS.md` FR-USER-001·002 부서 필드 필수. 부서 관리 FR 신규(범위 밖 기술 제거)
- `docs/07_ARCHITECTURE.md`: departments 모듈에 admin 컨트롤러 추가
- `docs/10_DEVELOPMENT_ROADMAP.md`: 부서 관리 백엔드 완료 표시(프론트 미완)

## Fix 1 (review Round 1, backend 담당)
- [중간] 404: `departments.service.ts`의 notFoundException을 `AppException('NOT_FOUND', 404, '部署が見つかりません。')`로 변경(NestJS NotFoundException은 AllExceptionsFilter가 message를 「対象が見つかりません。」로 덮어써서). `departments.service.spec.ts`는 NotFoundException 판정을 `toBody()`의 statusCode·code·message 검증으로 교체(낮음 항목의 spec 부분도 함께 반영). e2e 404 message assertion은 tester 담당이라 미수정
- [중간] 문서 갱신 예정 보강: 아래 06 항목 상세화, 08 항목 추가(위 "문서 갱신 예정"에 반영하지 않고 여기 기재)
  - `docs/06_API_SPECIFICATION.md` §5 상세: GET `/admin/departments` Query = code(최대 20자)·name(최대 100자)·page·limit, 부분 일치·대소문자 무시, code 오름차순 정렬. 404는 NOT_FOUND / 「部署が見つかりません。」(UUID 형식 오류 포함)
  - `docs/08_TEST_PLAN.md`: IT-DEPT TC 신규(등록·목록·상세·수정·삭제·권한·삭제 중 사원 활성화 경합·未所属 보호) 추가, 권한 매트릭스에 `/admin/departments`(ADMIN만 허용, EMPLOYEE 403) 행 추가
- [낮음] 마이그레이션 타임스탬프 순서: 코드 변경 없음(병합 시 확인, "환경 주의"에 기재 완료)
- 검증: tsc --noEmit 통과, departments 단위 테스트 2파일 23건 통과, eslint 지적 없음. e2e·DB는 실행하지 않음(개발 DB 보호)

## 프론트엔드가 알아야 할 것
- 환경변수·CORS·인증 헤더 변경 없음. 삭제 가능 판단은 `memberCount === 0`(활성), 확인 모달 안내는 `inactiveMemberCount > 0`, 행 [編集][削除] 숨김은 `isSystem`
- 사원 쪽 부서 필수화(API-USER-*)는 미구현(Q1-A). 사원 API 구현 시 FK 위반을 400 INVALID_DEPARTMENT로 변환

## context.md 정정
- 공용 모듈 목록에 추가: `modules/departments/`는 GET /departments 외에 `admin/departments` CRUD, `department.constants.ts`(SYSTEM_DEPARTMENT_CODE). `TestDataTracker.createDepartment(overrides?)`는 고유 code 자동 부여, `createUser`는 departmentId 미지정 시 tracker 전용 부서 사용. 명령어: e2e 계정은 DEV 부서 필요(seed 후 실행)

## Fix 2 (보안 권고, 낮음 3건)
- 1) 검색어 이스케이프: `departments.service.ts`에 `escapeLikePattern`(`\`, `%`, `_` 앞에 `\` 부여) 추가, `listDetails`에서 code·name에 적용. Prisma `contains`는 와일드카드를 이스케이프하지 않고 Postgres LIKE 기본 이스케이프가 `\`이므로 글자 그대로 부분 일치. 실제 DB 동작은 e2e 미실행(DB 보호)이라 tester가 `%`·`_` 검색 케이스로 확인 필요
- 2) 未所属 부재: `departments.repository.ts` delete 트랜잭션에서 일반 Error 대신 `AppException('INTERNAL_SERVER_ERROR', 500, 'サーバーでエラーが発生しました。')`. 근거: 06 명세/AllExceptionsFilter의 기존 5xx 코드·메시지와 동일(신규 코드 추가 없음), 데이터 부재는 서버 측 구성 오류이므로 4xx/전용 코드 부적절. 상세 원인은 Logger.error(일본어)로만 남기고 응답에는 미노출. 트랜잭션은 throw로 롤백됨
- 3) `:id` 검증: `admin-departments.controller.ts`에 ParseUUIDPipe(exceptionFactory로 AppException) 적용(GET/PATCH/DELETE). 형식 오류 → 400 `VALIDATION_ERROR`, message 「入力内容に誤りがあります。」, details `[{field:'id', message:'部署 ID の形式が正しくありません。'}]`(기존 toValidationException과 동일 형식). 프로젝트에 기존 ParseUUIDPipe 사례는 없음(타 모듈은 서비스에서 404 처리) — 이 컨트롤러에만 적용. Service의 assertUuid·zod import는 중복이라 제거
- 단위 spec: `departments.service.spec.ts`에서 service의 UUID→404 테스트(shouldThrowNotFoundWithoutQueryWhenIdIsNotUuid) 삭제(동작이 컨트롤러로 이동), LIKE 이스케이프 테스트 1건 추가
- **tester 수정 필요**: `test/admin-departments.e2e-spec.ts`에서 malformed ID(예: 'abc')로 GET/PATCH/DELETE 시 404를 기대하는 부분을 400 + code `VALIDATION_ERROR` + details[0].field `id`로 변경. 존재하지 않는 정상 UUID의 404는 그대로. 필요 시 `%`/`_` 검색 e2e 추가
- 검증: tsc --noEmit, eslint(departments), departments 단위 테스트 23건 통과. e2e·DB 미실행
- 문서 갱신 예정: `docs/06_API_SPECIFICATION.md` §5 API-DEPT-003/004/005(:id 있는 3종)에 "id 형식 오류 → 400 VALIDATION_ERROR" 추가하고 "404(UUID 형식 오류 포함)" 문구 삭제. 목록 검색의 code·name은 `%`·`_`도 문자 그대로 부분 일치함을 명기. DELETE 설명/에러 표에 "未所属 部署 부재 시 500 INTERNAL_SERVER_ERROR(구성 오류)" 추가. `docs/08_TEST_PLAN.md` IT-DEPT에 malformed ID 400, 와일드카드 검색 TC 반영

## Fix 3 (review Round 3, 문서 갱신 예정 정정만 — 코드 변경 없음)
- Fix 2의 문서 갱신 예정 중 "`:id` 있는 3종 = API-DEPT-003/004/005" 는 오류. 정정: `:id`가 있는 API는 **API-DEPT-003(상세)/005(수정)/006(삭제)**. API-DEPT-004(등록)는 `:id` 없음(대상 아님)
- `docs/06_API_SPECIFICATION.md` §5 (직접 확인한 위치)
  - 425행(API-DEPT-003 에러 줄): "404 NOT_FOUND 「部署が見つかりません。」(`:id`가 UUID 형식이 아닌 경우 포함)" 에서 괄호 문구 삭제 → 404는 존재하지 않는 id만. 400 VALIDATION_ERROR(`:id`가 UUID 형식 아님) 추가
  - 451행(API-DEPT-005 에러 표 404 행): "부서 없음(`:id`가 UUID 형식이 아닌 경우 포함)" 에서 괄호 삭제 → "부서 없음". 400 VALIDATION_ERROR 행에 `:id` UUID 형식 오류 사유 추가(기존 body 검증과 함께)
  - 462행(API-DEPT-006 에러 표 404 행): 동일하게 괄호 삭제. 400 VALIDATION_ERROR 행(`:id` UUID 형식 오류) 신규 추가. 500 INTERNAL_SERVER_ERROR 행 추가: 未所属(`UNASSIGNED`) 부서 부재 시(서버 구성 오류, 메시지 「サーバーでエラーが発生しました。」)
  - 400 응답 형식: code `VALIDATION_ERROR`, details `[{field:'id', message:'部署 ID の形式が正しくありません。'}]`
  - 목록 검색 code·name은 `%`·`_`도 문자 그대로 부분 일치함을 명기(Fix 2 유지)
- `docs/08_TEST_PLAN.md` 176행 IT-DEPT-07("상세: 존재하지 않는 id / UUID 형식 아님 → 404")을 2행으로 분리: IT-DEPT-07 "상세: 존재하지 않는 id(정상 UUID) → 404 NOT_FOUND 「部署が見つかりません。」" / 신규 행 "상세·수정·삭제: UUID 형식 아닌 id → 400 VALIDATION_ERROR(details[0].field=id)". 번호는 기존 IT-DEPT 뒤 번호 재배치 또는 07a/07b 중 architect가 택일
- 위 Fix 2의 문서 갱신 항목과 충돌 시 이 Fix 3이 우선

## Merge (add-hiredate)
- 충돌 해결 (backend/prisma): schema.prisma(departmentId 필수 + hireDate DATE NOT NULL, relation은 부서 브랜치 유지), initial-data.ts(admin 생성에 department connect(UNASSIGNED 코드) + hireDate), e2e-account-data.ts(departmentId: department.id + hireDate). 모두 양쪽 반영.
- 자동 병합 파일 확인: test/db/db-helpers.ts(createUser가 hireDate 기본값 + 기본 부서 보장), e2e-accounts/seed 스펙 이상 없음. schema.e2e-spec에 마이그레이션 개수·순서 기대값은 없음(수정 불필요).
- 추가 수정: test/admin-departments.e2e-spec.ts newUserData에 hireDate 추가. test/db/schema.e2e-spec.ts의 department_id NULL 거부 raw INSERT에 hire_date 추가(NOT NULL 위반 원인을 department_id로 한정).
- 마이그레이션: 순서 init, split_leaves_rejected_check, add_users_hire_date, department_code_and_required_user_department(4건). 부서 SQL은 users INSERT 없음, department_id NULL 사원 UPDATE만 있어 hire_date 적용 후에도 문제없음(hire_date NOT NULL 열을 건드리지 않음).
- 검증: prisma generate OK, tsc --noEmit OK, eslint OK, vitest unit 통과. DB 마이그레이션/reset 미실행. merge 커밋 없음, 해결 파일 git add 완료(docs/ 6건 미접촉).
