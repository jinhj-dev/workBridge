# design-backend — 사원 관리(SCR-006 재설계)·役職 관리·사원 등록

## 참조 문서 (해당 섹션만 읽는다)
- `docs/06_API_SPECIFICATION.md` §0 공통 규칙(페이지네이션·에러), §5 API-USER-001~004, API-DEPT-008(`jobTitle` 형식)
- `docs/02_REQUIREMENTS.md` FR-USER-001, FR-USER-002, FR-AUTH-003(비밀번호 규칙)
- `docs/05_DATABASE_DESIGN.md` §0 ENUM(job_title_tone), §2 users, §2-1 job_titles, §8 「사용자 단위 잠금」「마지막 활성 ADMIN 보호」「부서 삭제」
- `docs/07_ARCHITECTURE.md` 계층 구조·Guard
- 패턴 참고 코드: `backend/src/modules/departments/`(admin controller·service·repository·mapper·dto 구성, P2002 제약 이름 판별 `duplicateFieldOf`, `escapeLikePattern`), `common/pagination/pagination.ts`, `common/time/tokyo-date.ts`·`calendar-rules.ts`(`monthRange`), `common/security/credentials.ts`, `modules/leaves/leaves.repository.ts`(사용자 잠금 raw SQL)

## 중요: 기존 구현 없음
API-USER-001~004는 문서만 있고 코드가 없다(`backend/src/modules/`에 users 모듈 없음). 이번에 **신규 구현**한다. 직책(job_titles)도 seed만 있고 API가 없다.

## 데이터 모델 / 마이그레이션
- `JobTitleTone` enum에 값 4개 추가: `LAVENDER`, `GREEN`, `YELLOW`, `ORANGE` (최종: GRAY·BLUE·VIOLET·PINK·LAVENDER·GREEN·YELLOW·ORANGE)
- 마이그레이션 `prisma/migrations/<timestamp>_extend_job_title_tone/migration.sql`: `ALTER TYPE "job_title_tone" ADD VALUE 'LAVENDER';` 등 4줄만. 테이블·기존 행 변경 없음(기존 4개 직책·tone 그대로 보존). 롤백은 enum 재작성이 필요하므로 새 값을 쓰는 행이 없을 때만 가능 — backend.md에 기록
- schema.prisma 주석 갱신: `JobTitle`은 "관리자가 등록·수정·삭제(API-JOB-*), seed는 초기 4개"
- 그 외 컬럼·인덱스 추가 없음. 직책 정렬 컬럼(sort_order)은 만들지 않는다(정렬: createdAt asc → name asc)

## 공통 결정
- 社員 상태 `employmentStatus`(저장하지 않고 계산, 기준일 = `Clock` 도쿄 오늘)
  - `ACTIVE`(在籍中): isActive = true AND hireDate <= 오늘
  - `UPCOMING`(入社予定): isActive = true AND hireDate > 오늘
  - `INACTIVE`(無効): isActive = false
  - 「休職中」은 데이터가 없으므로 만들지 않는다
- 社員番号 자동 채번(`emp-id-generator.ts`, 순수 함수 + repository 조회)
  - 규칙: `^[0-9]{5}$`인 기존 empId의 최댓값 + 1을 5자리 0채움. 없으면 `00001`. 결과가 99999 초과면 null(채번 불가) → API-USER-007은 `empId: null`, AUTO 등록은 409 `EMP_ID_EXHAUSTED`
  - 근거: 초기 ADMIN `00001`, 샘플 `10001~10100`이 5자리. E2E 계정 `900001`(6자리)은 대상 외. 개발 DB 예상 다음 번호 `10101`, 운영(초기 ADMIN만) `00002`
  - 화면의 「WB+4桁」은 로그인 규칙(`EMP_ID_PATTERN` 숫자만)과 맞지 않아 쓰지 않는다
  - 동시성: 등록 트랜잭션 안에서 `SELECT pg_advisory_xact_lock(<고정 상수 키>)` → 최댓값 조회 → INSERT. 직접 입력 등록과 같은 번호로 충돌(P2002 `users_emp_id_key`)하면 AUTO는 최대 3회 재채번, MANUAL은 409 DUPLICATE_EMP_ID
- 초기 비밀번호(plan.md 결정 1, 문서 FR-USER-001·API-USER-002 방식): **관리자가 社員追加 모달에서 직접 입력**
  - 규칙은 기존 `common/security/password-policy.ts` `checkPasswordPolicy`(FR-AUTH-003: 8자 이상·영문+숫자·72바이트 이하)를 재사용. DTO에서 `z.string().max(128)` + superRefine으로 `checkPasswordPolicy` 결과를 VALIDATION_ERROR details(field `initialPassword`)로 반환. 누락은 「初期パスワードを入力してください。」
  - 앞뒤 공백은 제거하지 않는다(비밀번호 변경과 같은 취급)
  - bcrypt(`BCRYPT_COST`) 해시만 저장, `mustChangePassword = true`
  - 평문은 **API 응답·로그·예외 message에 넣지 않는다**(요청 바디 로깅 금지). 재발급·메일 발송 기능은 만들지 않는다
- 검색 LIKE 이스케이프: `departments.service.ts`의 `escapeLikePattern`을 `common/validation/like-pattern.ts`로 옮겨 departments·users가 함께 쓴다(동작 불변)
- FK 위반(P2003) 제약 이름 판별: `users_department_id_fkey` → 400 INVALID_DEPARTMENT, `users_job_title_id_fkey` → 400 INVALID_JOB_TITLE(등록·수정) / 409 JOB_TITLE_IN_USE(직책 삭제). 제약 이름은 마이그레이션 SQL로 확인

## API 계약

공통: prefix `/api/v1`, 모든 엔드포인트 **ADMIN 전용**(`@AdminOnly()`), 에러 형식 `{statusCode, code, message, details}`, 날짜 `YYYY-MM-DD`, 일시 ISO-8601 `+09:00`. message는 일본어(아래 문구 그대로).

### 공통 객체
`JobTitleRef` (API-DEPT-008과 같은 형식)
```json
{ "id": "uuid", "name": "マネージャー", "tone": "VIOLET" }
```
- `tone`: `GRAY | BLUE | VIOLET | PINK | LAVENDER | GREEN | YELLOW | ORANGE`

`UserListItem`
```json
{ "id": "uuid", "empId": "10001", "name": "山田 太郎", "hireDate": "2026-04-01",
  "departmentId": "uuid", "departmentName": "開発部",
  "role": "EMPLOYEE", "approvalRequired": true, "isActive": true,
  "employmentStatus": "ACTIVE",
  "jobTitle": { "id": "uuid", "name": "エンジニア", "tone": "GRAY" },
  "contactEmail": "yamada@example.com",
  "createdAt": "2026-01-02T09:00:00+09:00" }
```
- `jobTitle`·`contactEmail`은 항상 키 포함, 미설정이면 `null`. `departmentName`은 non-null

`UserDetail` = `UserListItem` + 
```json
{ "mustChangePassword": true, "updatedAt": "2026-11-14T10:00:00+09:00",
  "pendingApprovalCount": 0, "leaveGrants": [{ "year": 2026, "grantedDays": 15 }] }
```
- `pendingApprovalCount`: 이 사원이 승인자로 지정된 PENDING 휴가 수. `leaveGrants`: year 내림차순, 없으면 `[]`. `grantedDays`는 number

`JobTitle` (직책 관리)
```json
{ "id": "uuid", "name": "マネージャー", "tone": "VIOLET", "userCount": 12,
  "createdAt": "2026-11-12T09:00:00+09:00", "updatedAt": "2026-11-12T09:00:00+09:00" }
```
- `userCount`: 이 직책을 참조하는 사원 수(활성·비활성 모두. FK RESTRICT 기준과 같다)

### API-USER-001: 사원 목록 (문서 있음 + Query 확장)
- `GET /admin/users`
- Query(모두 선택): 
  - 신규 `keyword`: 앞뒤 공백 제거 후 최대 100자. empId·name·contactEmail 중 하나라도 부분 일치(대소문자 무시, `%`·`_`·`\`는 문자 그대로). 빈 값은 조건 없음
  - 신규 `jobTitleId`: UUID
  - 신규 `status`: `ACTIVE | UPCOMING | INACTIVE`(위 정의)
  - 문서 기존: `name`, `empId`, `departmentId`(UUID), `role`(`ADMIN|EMPLOYEE`), `approvalRequired`(`true|false`), `isActive`(`true|false`), `hireDateFrom`, `hireDateTo`, `page`(기본 1), `limit`(기본 20, 최대 100)
  - 모든 조건은 AND
- 정렬: hireDate asc → empId asc (문서 그대로)
- 200: `{ items: UserListItem[], page, limit, totalCount, totalPages }`
- 400 VALIDATION_ERROR: 형식 오류(필드명 details), `hireDateFrom > hireDateTo`(field `hireDateFrom`, 「開始日は終了日より後にできません。」), keyword 100자 초과(「検索キーワードは 100 文字以内で入力してください。」)

### API-USER-006: 사원 요약 (신규)
- `GET /admin/users/summary`
- 200: `{ "employeeCount": 120, "adminCount": 8, "hiredThisMonthCount": 3 }`
  - `employeeCount`: 활성(isActive = true) 사원 수(入社予定 포함, API-DEPT-007 memberCount와 같은 기준)
  - `adminCount`: 활성이고 `role = ADMIN`인 사원 수(役職이 아니라 인증 Role 기준)
  - `hiredThisMonthCount`: 활성이고 hireDate가 도쿄 기준 이번 달(1일~말일)인 사원 수
  - 검색 조건과 무관

### API-USER-007: 다음 자동 채번 예정 번호 (신규)
- `GET /admin/users/next-emp-id`
- 200: `{ "empId": "10101" }` — 예정 번호일 뿐 예약하지 않는다(최종 번호는 등록 시 확정). 채번 불가(99999 초과)면 `{ "empId": null }`
- 에러 없음(권한 에러 제외)

### API-USER-002: 사원 등록 (문서 있음 + 요청 변경)
- `POST /admin/users`
- Request
```json
{ "empIdMode": "AUTO", "empId": null, "name": "山田 太郎", "initialPassword": "Temp1234",
  "jobTitleId": "uuid", "contactEmail": "yamada@example.com", "departmentId": "uuid",
  "hireDate": "2026-12-01", "role": "EMPLOYEE", "approvalRequired": true }
```
- 필드 규칙(검증 실패는 400 VALIDATION_ERROR, details field·message)
  - `empIdMode` 필수 `AUTO | MANUAL`
  - `empId`: MANUAL이면 필수. 앞뒤 공백 제거 후 `EMP_ID_PATTERN`(숫자 1~50자리). 누락 「社員IDを入力してください。」, 형식 「社員IDは数字(50 桁以内)で入力してください。」. AUTO이면 무시(null·생략 허용)
  - `name` 필수, 앞뒤 공백 제거 후 1~100자, 제어 문자(줄바꿈·탭 등) 불가. 「社員名を入力してください。」/「社員名は 100 文字以内で入力してください。」/「社員名に使用できない文字が含まれています。」(수정 API도 같다)
  - `jobTitleId` 필수 UUID(등록 시 필수 — 신규 정책). 「役職を選択してください。」
  - `contactEmail` 필수, 앞뒤 공백 제거 후 이메일 형식·254자 이하(등록 시 필수 — 신규 정책, 중복 허용은 기존 그대로). 누락 「メールアドレスを入力してください。」, 형식 「メールアドレスの形式が正しくありません。」
  - `departmentId` 필수 UUID(未所属 허용). 「部署を選択してください。」
  - `hireDate` 필수, `dateSchema`(실재 날짜, 미래 허용). 「入社日を選択してください。」
  - `role` 필수 `ADMIN | EMPLOYEE`, `approvalRequired` 필수 boolean(화면은 기본 EMPLOYEE·true를 보낸다)
  - `initialPassword` 필수 문자열(최대 128자 입력 거부). `checkPasswordPolicy` 위반 시 details field `initialPassword`, message는 그 반환값(「パスワードは8文字以上で、英字と数字を含めてください。」/「パスワードは72バイト以内で入力してください。」). 누락 「初期パスワードを入力してください。」
  - 알 수 없는 필드는 zod strict로 400
- 처리: 해시 계산(트랜잭션 밖) → 트랜잭션(advisory lock → 채번 → INSERT, isActive = true, mustChangePassword = true)
- 201: `UserDetail`(평문 비밀번호·해시 **미포함**)
- 판정 순서: 입력 검증(400) → INSERT 시 FK·UNIQUE 위반 판별

| HTTP | Code | message |
|---|---|---|
| 400 | VALIDATION_ERROR | 「入力内容に誤りがあります。」 + details |
| 400 | INVALID_DEPARTMENT | 「部署を選び直してください。」 |
| 400 | INVALID_JOB_TITLE | 「役職を選び直してください。」 |
| 409 | DUPLICATE_EMP_ID | 「この社員IDは既に使用されています。」(MANUAL만) |
| 409 | EMP_ID_EXHAUSTED | 「社員IDを自動で採番できません。直接入力してください。」(AUTO만) |

### API-USER-003: 사원 상세 (문서 있음)
- `GET /admin/users/:id` → 200 `UserDetail`
- 400 VALIDATION_ERROR(`:id` UUID 아님, details field `id` 「社員 ID の形式が正しくありません。」), 404 NOT_FOUND 「社員が見つかりません。」

### API-USER-004: 사원 수정 (문서 있음)
- `PATCH /admin/users/:id`
- Request(변경할 필드만, 최소 1개 — 빈 객체 400): `name`, `empId`, `jobTitleId`(UUID 또는 null=해제), `contactEmail`(문자열 또는 null, 빈 문자열은 null), `departmentId`(null 불가), `hireDate`(null 불가), `role`, `approvalRequired`, `isActive`. 검증 문구는 API-USER-002와 같다. 비밀번호는 변경할 수 없다(`initialPassword` 등은 strict로 400)
- 200: `UserDetail`
- 처리(한 트랜잭션)
  - 대상 사원 행 잠금(`FOR NO KEY UPDATE`, 05 §8). 없으면 404
  - 대상이 활성 ADMIN이고 `isActive:false` 또는 `role:EMPLOYEE`이면 활성 ADMIN 전체 잠금 후 건수 판정 → 1명이면 409 LAST_ADMIN
  - `isActive` true → false 전환 시(FR-USER-002 비활성화 처리): ① 이 사원이 신청한 PENDING 휴가를 CANCELLED(processedBy = 요청 ADMIN, processedAt = 현재) ② 이 사원이 책임자인 모든 부서 `manager_id = NULL` ③ 이 사원의 미폐기 refresh token `revoked_at = 현재` ④ 할당된 다른 사원의 PENDING은 그대로
  - false → true(재활성화)는 플래그만 변경

| HTTP | Code | message |
|---|---|---|
| 400 | VALIDATION_ERROR | 형식·빈 객체·`departmentId:null`·`hireDate:null` |
| 400 | INVALID_DEPARTMENT / INVALID_JOB_TITLE | 위와 같음 |
| 404 | NOT_FOUND | 「社員が見つかりません。」 |
| 409 | DUPLICATE_EMP_ID | 위와 같음 |
| 409 | LAST_ADMIN | 「最後の管理者は無効化・権限変更できません。」 |

- 화면의 「削除」는 이 API에 `{ "isActive": false }`를 보내는 논리 삭제(무효화)다. 물리 삭제 API는 만들지 않는다(05 서두 "사용자는 물리 삭제하지 않는다")

### API-JOB-001: 직책 목록 (신규)
- `GET /admin/job-titles` → 200 `JobTitle[]`(페이지네이션 없음), createdAt asc → name asc

### API-JOB-002: 직책 등록 (신규)
- `POST /admin/job-titles`, Request `{ "name": "人事", "tone": "GREEN" }`
  - `name` 필수, 앞뒤 공백 제거 후 1~50자. 「役職名を入力してください。」/「役職名は 50 文字以内で入力してください。」
  - `tone` 필수(8값). 「色を選択してください。」
- 201 `JobTitle`(userCount 0)
- 409 DUPLICATE_JOB_TITLE_NAME 「この役職名は既に登録されています。」(P2002 `job_titles_name_key`)

### API-JOB-003: 직책 수정 (신규)
- `PATCH /admin/job-titles/:id`, Request `{ name?, tone? }`(최소 1개)
- 200 `JobTitle`. 400 VALIDATION_ERROR(`:id` 형식 「役職 ID の形式が正しくありません。」·빈 객체), 404 NOT_FOUND 「役職が見つかりません。」, 409 DUPLICATE_JOB_TITLE_NAME
- 이름·색 변경은 사원의 Role·권한·인증에 영향 없음(users 행을 건드리지 않음)

### API-JOB-004: 직책 삭제 (신규)
- `DELETE /admin/job-titles/:id` → 204
- 사용 중(참조 사원 1명 이상, 비활성 포함)이면 409 JOB_TITLE_IN_USE 「この役職を使用している社員が存在するため、削除できません。」. 사전 건수 확인 + DELETE의 P2003도 같은 409로 변환(동시 배정 대비)
- 400(`:id` 형식), 404 NOT_FOUND

### 라우트 순서
`summary`·`next-emp-id`는 `:id`보다 먼저 선언한다(departments의 `summary`와 같은 방식).

## 보안 요구사항
- 모든 엔드포인트 `@AdminOnly()`. EMPLOYEE 403, 비로그인 401, mustChangePassword 403 PASSWORD_CHANGE_REQUIRED(기존 Guard)
- 초기 비밀번호: 관리자 입력값을 `checkPasswordPolicy`로 서버 검증(화면 검증만 믿지 않음), bcrypt 해시만 저장, mustChangePassword=true. 평문은 응답·로그·예외 message·검증 오류 details(값 에코 금지)에 넣지 않는다. 요청 바디 로깅 금지. 응답에 해시 미포함
- 사원명 제어 문자 거부(표시 위조 방지)
- zod `.strict()`로 알 수 없는 필드 거부(`passwordHash`·`mustChangePassword` 등 주입 방지)
- 검색은 Prisma 파라미터(raw SQL이면 `Prisma.sql` 바인딩만). LIKE 이스케이프
- 応答에 passwordHash·refresh token 미포함. contactEmail은 ADMIN API에서만(API-DEPT-008 방침 유지)
- 직책 변경이 Role에 영향 없음(별도 컬럼)

## 생성·수정 파일
신규
- `backend/prisma/migrations/<timestamp>_extend_job_title_tone/migration.sql`
- `backend/src/modules/users/users.module.ts`, `admin-users.controller.ts`, `users.service.ts`, `users.repository.ts`, `user.mapper.ts`
- `backend/src/modules/users/employment-status.ts`(상태 계산·where 조건 생성), `emp-id-generator.ts`(다음 번호 계산 순수 함수)
- `backend/src/modules/users/dto/admin-user-query.dto.ts`, `create-user.dto.ts`, `update-user.dto.ts`, `user-fields.ts`(공용 zod 필드)
- `backend/src/modules/job-titles/job-titles.module.ts`, `admin-job-titles.controller.ts`, `job-titles.service.ts`, `job-titles.repository.ts`, `job-title.mapper.ts`, `dto/job-title.dto.ts`
- `backend/src/common/validation/like-pattern.ts`(`escapeLikePattern` 이동)
- `backend/prisma/e2e-users-cleanup.ts`(개발 DB 전용·localhost만·production 거부. 이름이 `E2E社員` 로 시작하는 사원(근태·휴가·부여 연차·refresh token 포함, 부서 책임자 해제 후)과 이름이 `E2E役職`로 시작하는 직책을 물리 삭제. Playwright 정리용)
수정
- `backend/prisma/schema.prisma`(enum 4값·주석), `backend/src/app.module.ts`(모듈 등록), `backend/src/modules/departments/departments.service.ts`(import 경로만), `backend/package.json`(script `db:e2e-users-cleanup`만, 의존성 추가 없음)
참고: `departments/*`, `leaves/leaves.repository.ts`(잠금·조건부 UPDATE), `auth/auth.repository.ts`(refresh token), `auth/auth.service.ts`(해시·정책 사용 방식), `common/security/password-policy.ts`(`checkPasswordPolicy` 재사용, 수정 없음), `common/mappers/user-summary.ts`, `prisma/initial-data.ts`(`JOB_TITLES`)

## 문서 갱신 예정(backend.md에 기록할 것)
02 FR-USER-001·002(자동 채번·役職/メール 등록 필수·상태 정의·削除=무효화, 초기 비밀번호는 기존대로 관리자 입력), 신규 FR(직책 관리) / 05 §0 enum·§2-1(관리 API·정렬) / 06 API-USER-001~004 개정·006·007·API-JOB-001~004 신규·API-DEPT-008 tone 값 / 08 TC / 10

승인 피드백 Round 1: 초기 비밀번호를 응답 표시 → 등록 관리자 메일 발송으로 변경(메일 모듈·MAIL_* 환경 변수·Mailpit 추가), API-USER-007을 `registration-info`(nextEmpId·passwordMailTo)로 변경, API-USER-002 응답 `initialPassword` 삭제·`passwordMail` 추가·409 ADMIN_EMAIL_NOT_SET, API-USER-008 재발급 신규, 사원명 제어 문자 거부
승인 피드백 Round 2: 초기 비밀번호를 문서대로 관리자 입력(`initialPassword` 필수, `checkPasswordPolicy` 재사용)으로 되돌림. 메일 모듈·MAIL_* 환경 변수·Mailpit·`passwordMail`·ADMIN_EMAIL_NOT_SET·API-USER-008·`initial-password.ts` 삭제. API-USER-007은 `GET /admin/users/next-emp-id` → `{empId: string|null}`으로 확정(채번 불가는 409가 아니라 null). 사원명 제어 문자 거부는 유지
