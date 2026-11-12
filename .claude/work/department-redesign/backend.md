# backend — 부서 관리 화면 재구성 (SCR-010)

## 변경 파일 (모두 backend/)
- `prisma/schema.prisma`, 신규 `prisma/migrations/20261112090612_add_departments_description_manager/migration.sql`
- `src/modules/departments/` : `dto/department-fields.ts`, `create-department.dto.ts`, `update-department.dto.ts`, `admin-department-query.dto.ts`, 신규 `dto/manager-candidates-query.dto.ts`, `admin-departments.controller.ts`, `departments.service.ts`, `departments.repository.ts`, `department.mapper.ts`
- 테스트: `departments.service.spec.ts`, `dto/department-dto.spec.ts`, `test/admin-departments.e2e-spec.ts`(신규 describe 12건), `test/db/db-helpers.ts`(cleanup이 users 삭제 전 managerId NULL 처리)

## DB 마이그레이션 (적용 완료)
- 내용: departments에 `description VARCHAR(500) NULL`, `manager_id UUID NULL`(FK→users.id RESTRICT/CASCADE), 인덱스 `departments_manager_id_idx`. 기존 행은 NULL, 데이터 삭제·변경 없음. SQL에 기존 FK 재생성 없음(확인함)
- 개발 DB: `cd backend && npx prisma migrate deploy`(또는 `npm run db:migrate:deploy`) — **적용함**. 이후 `npx prisma generate`(실행함)
- 테스트 DB: `cd backend && npm run db:migrate:test` — **적용함**
- 롤백: 두 컬럼·인덱스·FK DROP

## API 요약 (전부 ADMIN, 비로그인 401 / EMPLOYEE 403)
- `DepartmentDetail`에 `description: string|null`, `manager: {id,empId,name}|null` 추가 (002~005 공통)
- 입력: `description` 앞뒤 공백 제거·빈 문자열→null·최대 500자(초과 400 VALIDATION_ERROR), `managerId` UUID|null(형식 오류 400, field `managerId`)
- API-DEPT-002: Query `sort`(code|name|memberCount|updatedAt, 기본 code)·`order`(asc|desc, 기본 asc), 동률 code 오름차순, memberCount는 활성 사원 기준(raw SQL, 값은 바인딩). 잘못된 값 400
- API-DEPT-004/005: `managerId` 지정 시 활성 사원 아니면 400 `INVALID_MANAGER`「部署責任者には有効な社員を指定してください。」. 005는 description·managerId만으로도 유효(null 포함). 未所属 PATCH는 INVALID_MANAGER보다 먼저 409 PROTECTED_DEPARTMENT. 잠금 순서 부서(FOR UPDATE) → 사원(FOR NO KEY UPDATE)
- API-DEPT-007 `GET /admin/departments/summary` → `{departmentCount(未所属 제외), memberCount(전체 활성)}`
- API-DEPT-008 `GET /admin/departments/:id/members?page&limit` → 페이지네이션 `[{id,empId,name}]` 활성만 empId 오름차순. 400(:id)/404
- API-DEPT-009 `GET /admin/departments/manager-candidates?keyword` → `UserSummary[]` 활성 사원(본인·ADMIN 포함) empId 오름차순 최대 100건. keyword 100자 초과 400
- 라우트는 `summary`·`manager-candidates`를 `:id`보다 먼저 선언
- 부서 삭제: 책임자가 있어도 영향 없음(테스트로 확인). 쿠키/토큰 처리 변경 없음

## API 문서와 다른 점
- 없음

## 문서 갱신 예정
- `docs/05_DATABASE_DESIGN.md` §1 departments: description, manager_id(FK users RESTRICT, UNIQUE 없음=겸임 허용) / §7 Index `departments(manager_id)` / §8 등록·수정 시 잠금 순서 부서→사원
- `docs/06_API_SPECIFICATION.md` §5 `DepartmentDetail`·입력 규칙, API-DEPT-002(sort·order), 004·005(managerId, 400 INVALID_MANAGER), API-DEPT-007·008·009 신규, API-USER-004 비고(비활성화 시 책임자 자동 해제, 미구현 / 부서 이동은 영향 없음)
- `docs/02_REQUIREMENTS.md` FR-DEPT-001(정렬·설명·책임자 R1·R4·R5), FR-USER-002(비활성화 시 책임자 해제, 부서 이동은 유지) / `docs/08_TEST_PLAN.md` 5.6 TC 추가

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. 신규 에러 코드 `INVALID_MANAGER`. 책임자 해제는 `managerId: null`, 미변경은 필드 생략
- 후보 목록은 상한 100건 고정이므로 검색(keyword) 기반 UI 필요

## 검증
- tsc·lint·build 통과, unit 320건, e2e 397건 전부 통과(개발 DB 마이그레이션 적용 후 실행)
- 미구현(설계대로): 사원 비활성화 시 책임자 자동 해제(API-USER-004 미구현)

## context.md 정정
- 없음 (`departments/` 항목에 description·manager·summary·members·manager-candidates 추가 권장)

## Fix 1
- `departments.repository.ts` findPageByMemberCount: id 조회(raw SQL)와 count를 `Promise.all` → `$transaction([...])`로 변경(다른 정렬 경로와 스냅샷 일관성 통일)
- 문서 갱신 예정 추가: `docs/10_DEVELOPMENT_ROADMAP.md` — 부서 관리 재설계(설명·책임자·정렬·요약·소속 사원·책임자 후보) 완료 항목을 구현 검증 후 갱신 (plan.md 항목, 문서 반영 단계에서 architect가 처리)
