# design-backend: 사원 役職(직책 마스터)·連絡先 추가 (employee-position-contact)

plan.md 확정 사항(Q1~Q5, R1~R4 — 모두 사용자 승인 완료) 기준.

## 참조 문서
- `docs/05_DATABASE_DESIGN.md` §0 「외래 키」「ENUM」, §1(seed 설명 형식), §2 Table: users, §7 Index
- `docs/06_API_SPECIFICATION.md` §5 「API-DEPT-008: 부서 소속 사원 목록」, 「API-USER-001」~「API-USER-004」(문서 항목 추가만)
- `docs/02_REQUIREMENTS.md` FR-DEPT-001(소속 활성 사원 목록), FR-USER-001·002
- `.claude/rules/database-rules.md` §2·§3·§4·§9·§10·§11·§12

## 데이터 모델
### 신규 ENUM `job_title_tone` (05 §0 ENUM 규칙: PG 네이티브 ENUM, 값 대문자)
- 값: `GRAY` / `BLUE` / `VIOLET` / `PINK` (R3, 레퍼런스 배지 4색) — 프론트 Badge variant `neutral`·`info`·`violet`·`pink`로 매핑. Hex·토큰명은 DB에 두지 않는다(색 계열 이름만)
- Prisma: `enum JobTitleTone { GRAY BLUE VIOLET PINK @@map("job_title_tone") }`

### 신규 테이블 `job_titles`
| 컬럼 | 타입 | PK | NULL | 설명 |
|---|---|---|---|---|
| id | UUID | O | NO | 직책 ID(애플리케이션 생성, 05 §0) |
| name | VARCHAR(50) | | NO | 직책명. 앞뒤 공백 제거·1~50자(애플리케이션) |
| tone | job_title_tone | | NO | 배지 색 톤. 기본 `GRAY` |
| created_at | TIMESTAMPTZ | | NO | 기본 now() |
| updated_at | TIMESTAMPTZ | | NO | 기본 now(), `@updatedAt` |
- Constraints: name UNIQUE(인덱스는 UNIQUE로 생성)
- 표시 순서(`sort_order`)는 두지 않는다 — 이번 범위에 직책 목록을 나열하는 곳이 없음. 관리 화면·선택 박스 구현 때 추가(R1 대안)
- 감사 컬럼 없음(departments와 동일)
- Prisma model `JobTitle` `@@map("job_titles")`, 관계 `users User[]`

### users 컬럼 추가
| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| job_title_id | UUID | YES | 직책 ID. FK → job_titles.id `ON DELETE RESTRICT ON UPDATE CASCADE`(05 §0 공통). NULL = 직책 없음 |
| contact_email | VARCHAR(254) | YES | 連絡先(사내 이메일). 앞뒤 공백 제거·이메일 형식·254자 이하·빈 값 NULL(애플리케이션). UNIQUE 없음(공용 주소 허용), 대소문자 그대로 |
- 기본값 없음, 기존 행 NULL(백필 없음)
- users(job_title_id) 인덱스는 추가하지 않는다: 이번에 job_title_id로 WHERE·JOIN하는 쿼리가 없고(멤버 조회는 users PK→job_titles PK 조인), 직책 삭제 기능도 없음. 관리 화면(삭제 시 RESTRICT 검사·사원 수 집계) 구현 때 추가(R1 대안)
- 이름: `position`은 PG 키워드와 겹쳐 `job_title`, `email`은 로그인·알림 용도로 오해될 수 있어 `contact_email`(로그인 ID는 사원번호, FR-AUTH-001)
- Prisma User: `jobTitleId String? @map("job_title_id") @db.Uuid`, `jobTitle JobTitle? @relation(fields:[jobTitleId], references:[id], onDelete: Restrict, onUpdate: Cascade)`, `contactEmail String? @map("contact_email") @db.VarChar(254)`

### 마이그레이션 `backend/prisma/migrations/<timestamp>_add_job_titles_and_users_contact/migration.sql`
- 순서: CREATE TYPE `job_title_tone` → CREATE TABLE `job_titles`(+ name UNIQUE INDEX) → ALTER TABLE users ADD `job_title_id`, `contact_email` → ADD CONSTRAINT FK. 데이터 INSERT 없음(직책은 seed 담당)
- 기존 데이터 무변경(NULL 컬럼 추가는 메타데이터 변경). 롤백: FK·두 컬럼 DROP → job_titles DROP → TYPE DROP
- `prisma migrate dev --create-only`로 생성 후 다른 차이(기존 FK·CHECK 재생성 등)가 섞이지 않았는지 확인. 기존 마이그레이션은 수정하지 않는다
- 참고: `backend/prisma/migrations/20261112090612_add_departments_description_manager/migration.sql`

## 직책 데이터의 관리 (R2 확정)
- **운영 seed** `backend/prisma/initial-data.ts`: `JOB_TITLES` 상수 추가 — `マネージャー:VIOLET`, `リーダー:BLUE`, `エンジニア:GRAY`, `デザイナー:PINK`(색은 seed가 직책별로 지정, 이름→색 규칙은 코드에 두지 않음). `seedInitialData`에서 departments와 같은 방식 `createMany({ skipDuplicates: true })`(name UNIQUE 기준). 재실행 시 중복 없음, 이미 있는 행의 tone은 덮어쓰지 않음. `SeedResult`에 `createdJobTitleCount` 추가
- `backend/prisma/seed.ts`: 직책 등록 건수 로그 1줄(부서 로그와 같은 형식)
- 초기 ADMIN은 job_title_id·contact_email NULL(운영 seed에 가공 연락처를 넣지 않음)
- 마이그레이션에는 직책을 넣지 않는다(未所属 부서처럼 시스템이 의존하는 행이 아님). 테스트 DB는 migrate만 하므로 테스트는 직접 직책을 만든다
- 직책 추가·이름 변경·삭제 수단은 이번에 없음(관리 화면 없음). 05에 "현재 seed로만 등록" 명시

## API 계약 — API-DEPT-008 (기존, 응답 필드 추가)
- `GET /api/v1/admin/departments/:id/members` · ADMIN · Query `page`, `limit` (변경 없음)
- Response 200 항목:
```json
{ "id": "uuid", "empId": "00001", "name": "山田 太郎",
  "jobTitle": { "id": "uuid", "name": "マネージャー", "tone": "VIOLET" },
  "contactEmail": "yamada@example.com" }
```
- `jobTitle`·`contactEmail`은 항상 키를 포함하고 없으면 `null`. `tone`은 `GRAY|BLUE|VIOLET|PINK`. hireDate·role 등 다른 필드는 추가하지 않는다(Q4)
- 상태 코드·에러(400 VALIDATION_ERROR / 404 NOT_FOUND 「部署が見つかりません。」/ 401 / 403), 정렬 empId 오름차순, 활성 사원만 — 변경 없음

## 처리 로직
- `departments.repository.ts` `findMembersPage` `select`에 `contactEmail: true, jobTitle: { select: { id: true, name: true, tone: true } }` 추가(관계 select, N+1 없음)
- `department.mapper.ts` `DepartmentMember`에 `jobTitle: { id: string; name: string; tone: JobTitleTone } | null; contactEmail: string | null` 추가. tone은 Prisma enum 값을 그대로 문자열로 반환

## 보안 요구사항 (連絡先 = 개인정보)
- 노출 지점은 ADMIN 전용 API-DEPT-008 하나뿐(Q5). `USER_SUMMARY_SELECT`·`toUserSummary`(API-DEPT-009·API-LEAVE-002 등), `/departments`, API-LEAVE-010, 대시보드, `/auth/login`·`/auth/me` 응답에는 추가하지 않는다. Prisma `select` 명시 유지(전체 행 반환·`include` 금지)
- 로그·스크립트 출력에 연락처를 쓰지 않는다(건수만)
- 샘플·테스트 데이터는 가명·`example.com`(RFC 2606)만

## 데이터 스크립트 (개발 DB 전용, 기존 안전장치 유지)
- `backend/prisma/sample-users-data.ts`: `SampleUser`에 `jobTitleName: string | null`, `contactEmail: string`(번호에서 결정, 난수 없음)
  - jobTitleName: `JOB_TITLES` 이름 순환(initial-data에서 import), 5명에 1명 null
  - contactEmail: `user{empId}@example.com`
  - `insertSampleUsers`: 트랜잭션 전에 `jobTitle.findMany({ select: { id, name } })`로 이름→id 맵. 없는 이름이면 「役職 X が存在しないため…先に npm run db:seed」 에러(부서와 같은 방식)
  - 신규 행은 두 값 포함 생성. **기존 샘플 행(10001~10100)도 jobTitleId·contactEmail 갱신**(사원별 값이라 트랜잭션 안에서 행별 `update`, 최대 100건; passwordHash 일괄 갱신은 유지). 머리 주석·함수 주석 「他の列は変更しない」를 실제 동작에 맞게 수정. 결과 `updatedCount` 의미도 주석에 반영
- `backend/prisma/e2e-account-data.ts`: `E2eAccountDefinition`에 `jobTitleName: string | null`, `contactEmail: string | null`. admin(900001) = `'マネージャー'`·`'e2e-admin@example.com'`, initial(900002) = `null`·`null`. 트랜잭션 안에서 직책 id 조회(없으면 「先に npm run db:seed」 에러), upsert `data`에 `jobTitleId`·`contactEmail` 포함 → 재초기화마다 같은 값
- `backend/test/db/db-helpers.ts`: `TestDataTracker.createJobTitle(overrides?)`(고유 name 자동 부여, `uniqueSuffix`), cleanup에서 users 삭제 **후** job_titles 삭제(FK RESTRICT 순서). `createUser(overrides)`는 Prisma 타입으로 `jobTitleId`·`contactEmail`을 받음

## 생성·수정할 파일
- 신규: `backend/prisma/migrations/<timestamp>_add_job_titles_and_users_contact/migration.sql`
- 수정: `backend/prisma/schema.prisma`, `backend/prisma/initial-data.ts`(+`initial-data.spec.ts`), `backend/prisma/seed.ts`, `backend/src/modules/departments/departments.repository.ts`, `department.mapper.ts`, `backend/prisma/sample-users-data.ts`(+`.spec.ts`), `backend/prisma/e2e-account-data.ts`(+`.spec.ts`), `backend/test/db/db-helpers.ts`, `backend/test/db/schema.e2e-spec.ts`, `backend/test/admin-departments.e2e-spec.ts`
- 확인만(변경 없음): `backend/src/common/mappers/user-summary.ts`, `backend/prisma/sample-users.ts`·`e2e-accounts.ts`(출력이 건수만인지)

## 문서 갱신 예정 (backend.md에 구현 결과 기준으로 기록)
- 05: §0 ENUM 표에 `job_title_tone`(GRAY·BLUE·VIOLET·PINK, 기본 GRAY), job_titles 테이블 절 신규(번호 배치는 문서 반영 시 결정, 기존 절 번호를 바꾸지 않는 방식 권장), §2 users 두 컬럼·FK·마이그레이션 설명, seed 초기 직책 4개와 "현재 seed로만 관리", §7 인덱스는 job_titles(name) UNIQUE만
- 06: API-DEPT-008 응답 예시·설명 / API-USER-001·003 응답, API-USER-002·004 Request에 `jobTitleId`(존재하는 직책 id 또는 null)·`contactEmail`(검증 규칙, 400 VALIDATION_ERROR) — 미구현 API이므로 "구현 시 적용" 명시. 직책 목록 API는 미정으로 남김
- 02: FR-DEPT-001 "소속 활성 사원 목록(사원번호·이름·役職·連絡先)", FR-USER-001·002 입력 항목에 役職(직책 목록에서 선택, 선택)·連絡先(선택)과 규칙, 직책 마스터는 seed로 등록
