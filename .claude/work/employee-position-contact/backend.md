# backend 구현 결과: 사원 役職·連絡先 (employee-position-contact)

## 생성·수정한 파일 (모두 backend/)
- 신규: `prisma/migrations/20261112113554_add_job_titles_and_users_contact/migration.sql` (CREATE TYPE → job_titles+UNIQUE(name) → users 2컬럼 → FK RESTRICT/CASCADE. 다른 차이 없음, 데이터 INSERT 없음)
- 수정: `prisma/schema.prisma`, `prisma/initial-data.ts`(JOB_TITLES, createMany skipDuplicates, `createdJobTitleCount`), `prisma/seed.ts`(역할 로그 1줄), `src/modules/departments/departments.repository.ts`(findMembersPage select), `department.mapper.ts`(DepartmentMember), `prisma/sample-users-data.ts`, `prisma/e2e-account-data.ts`
- 테스트: `prisma/initial-data.spec.ts`, `sample-users-data.spec.ts`, `e2e-account-data.spec.ts`, `test/db/db-helpers.ts`(createJobTitle, cleanup 순서), `test/db/schema.e2e-spec.ts`, `test/db/seed.e2e-spec.ts`, `test/db/e2e-accounts.e2e-spec.ts`, `test/admin-departments.e2e-spec.ts`
- 확인만: `user-summary.ts`는 변경 없음(연락처 미노출). `sample-users.ts`·`e2e-accounts.ts`는 건수만 출력(변경 없음)

## API 요약
- API-DEPT-008 `GET /api/v1/admin/departments/:id/members` (ADMIN): 항목에 `jobTitle`({id,name,tone: GRAY|BLUE|VIOLET|PINK} 또는 null)·`contactEmail`(string 또는 null) 추가. 키는 항상 포함. 그 외 요청·정렬·에러(400/401/403/404) 변경 없음.
- 쿠키/토큰 변경 없음. 다른 API(`USER_SUMMARY`, /departments, 로그인 등)에는 추가하지 않음.

## 구현 시 결정 (설계와의 차이는 없음)
- sample-users: 기존 행 갱신은 passwordHash `updateMany` 유지 + 행별 `update`로 jobTitleId·contactEmail 갱신(트랜잭션 내). 역할 지정: 5명에 1명 null(20명), 나머지는 JOB_TITLES 순환.
- 헬퍼 확장에 맞춰 seed e2e·e2e-accounts e2e도 수정(설계의 수정 목록 외): seed e2e는 createdJobTitleCount 기대값·정리 추가, e2e-accounts e2e는 'マネージャー'가 테스트 DB에 없으면 생성.
- 이 작업에서 prettier가 무관한 3개 파일을 바꿔 git checkout으로 되돌림(변경 없음).

## DB 적용 결과
- 마이그레이션: 개발 DB(workbridge)·테스트 DB(workbridge_test) 모두 적용 완료.
- 개발 DB 실행 전 → 후 (행 수): users 103→103, departments 5→5(신규 0), job_titles 0→4. seed 코드 확인: 부서·역할 모두 createMany skipDuplicates, 활성 ADMIN이 있으면 ADMIN 건너뜀이라 기존 데이터 변경 없음. 실제 로그도 부서 0건·ADMIN 미등록.
- 샘플 사원 10001~10100: 100행 유지(신규 0), 역할 부여 0→80, 연락처 0→100. 이 외 사원의 jobTitleId는 변경 없음(범위 밖 0건 확인). 패스워드는 기존 스크립트 동작대로 재해시(100명).
- E2E 900001·900002: 2행 유지, 재초기화(900001 = マネージャー·e2e-admin@example.com, 900002 = null). SEED 계정(00001) 무변경.
- 비밀번호 값은 출력·기록하지 않음.

## 검증
- `npx tsc --noEmit` 통과, `npm run lint` 통과, `npm test` 22파일 323건 통과, `npm run test:e2e` 15파일 411건 통과.

## 문서 갱신 예정 (design-backend.md 「문서 갱신 예정」과 동일, 구현 결과 기준)
- 05: §0 ENUM 표에 `job_title_tone`(GRAY·BLUE·VIOLET·PINK, 기본 GRAY) / job_titles 절 신규(id UUID PK, name VARCHAR(50) UNIQUE, tone 기본 GRAY, created_at, updated_at, 감사 컬럼 없음) / §2 users에 `job_title_id`(UUID NULL, FK→job_titles.id RESTRICT/CASCADE, 인덱스 없음)·`contact_email`(VARCHAR(254) NULL, UNIQUE 없음) / seed 초기 직책 4개(マネージャー:VIOLET, リーダー:BLUE, エンジニア:GRAY, デザイナー:PINK)와 "현재 seed로만 관리" / §7 job_titles(name) UNIQUE만
- 06: API-DEPT-008 응답 예시에 jobTitle·contactEmail 추가 / API-USER-001·003 응답, 002·004 Request에 jobTitleId·contactEmail("구현 시 적용", 미구현 API) / 직책 목록 API는 미정
- 02: FR-DEPT-001 "소속 활성 사원 목록(사원번호·이름·役職·連絡先)", FR-USER-001·002 입력 항목에 役職(선택)·連絡先(선택, 이메일 형식·254자 이하·빈 값 NULL), 직책 마스터는 seed 등록

## 프론트엔드가 알아야 할 것
- 환경변수·CORS·인증 변경 없음. `tone` → Badge variant 매핑(GRAY=neutral, BLUE=info, VIOLET=violet, PINK=pink)은 프론트 담당.
- `contactEmail`은 개인정보이므로 로그·콘솔에 출력하지 않을 것.

## context.md 정정
- 공용 모듈에 추가: `prisma/initial-data.ts` `JOB_TITLES`, `TestDataTracker.createJobTitle()`. `db:sample-users`는 이제 역할·연락처도 갱신(선행 조건: `db:seed`로 역할 등록). `db:e2e-accounts`도 역할 필요(선행: `db:seed`).

## Fix 1 (review.md Round 1, 담당 backend)
- [낮음] `prisma/sample-users.ts` 4행 주석·33행 로그를 "パスワード・役職・連絡先" 갱신 문구로 수정 (건수만 출력 유지).
- [낮음] `prisma/seed.ts` 1행, `prisma/initial-data.ts` 89행 주석에 役職 추가 ("部署・役職・初期 ADMIN").
- [중간] 문서 갱신 예정에 08·10 추가:
  - 08 (`docs/08_*`): 5.6 IT-DEPT-33 개정(응답 항목에 jobTitle·contactEmail 키 포함), IT-DEPT-37 신규(공개 범위: 다른 API에 contactEmail·jobTitle 미노출 회귀 방지), DB 스키마 테스트에 job_titles(UNIQUE name)·users.job_title_id FK RESTRICT·job_title_tone ENUM 항목 추가.
  - 10 (`docs/10_DEVELOPMENT_ROADMAP.md`): 직책 마스터·연락처(employee-position-contact) 진행 상태를 리뷰 통과 후 직접 검증하여 갱신.
- 검증: `npx tsc --noEmit`, `npm run lint`, `npm test`(22파일 323건) 통과. DB 데이터·테스트 파일 변경 없음.

## Fix 2 — API-DEPT-008 hireDate 추가
- 수정: `backend/src/modules/departments/departments.repository.ts`(`findMembersPage`가 hireDate select 후 `fromDbDate`로 `YYYY-MM-DD` 변환), `department.mapper.ts`(`DepartmentMember.hireDate: string`), `backend/test/admin-departments.e2e-spec.ts`(키 목록·값 검증, IT-DEPT-37에 hireDate 비노출 확인 추가: 책임자 후보·/departments·/auth/me)
- DB 변경 없음. DATE 컬럼이라 도쿄 변환 없이 기존 규칙(`fromDbDate`)을 사용. 다른 API는 변경 없음.
- API: GET /admin/departments/:id/members 항목 = id, empId, name, jobTitle|null, contactEmail|null, `hireDate`(YYYY-MM-DD, 항상 존재). 에러 코드 변경 없음.
- 검증: tsc·lint 통과, 단위 323건 통과, admin-departments e2e 61건 통과. `npm run build` 후 포트 6000 서버에서 E2E 관리자로 호출해 hireDate 반환 확인(예: "2020-08-12").
- API 문서와 다른 점: 없음(문서가 후행 갱신 대상).
- 문서 갱신 예정:
  - docs/06_API_SPECIFICATION.md API-DEPT-008: 응답 항목에 `hireDate`(string, YYYY-MM-DD, 入社日) 추가. 다른 API(UserSummary 등)에는 없음 명시
  - docs/02_REQUIREMENTS.md FR-DEPT-001: 所属社員確認 표시 항목에 入社日 추가(ADMIN 전용 공개 범위)
  - docs/08_TEST_PLAN.md: 해당 TC(API-DEPT-008 목록)에 hireDate 반환 검증, IT-DEPT-37에 hireDate 비노출(책임자 후보·/departments·/auth/me) 추가
- 프론트: `frontend/src/lib/api/types.ts`의 멤버 타입에 `hireDate: string` 추가 필요(담당 frontend).
