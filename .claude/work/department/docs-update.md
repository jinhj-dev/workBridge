# 부서 관리 — 프로젝트 문서 반영 결과

기준: backend.md·frontend.md "문서 갱신 예정"(Fix 1 포함), decisions.md Q1~Q10(Q9-A, Q10-A). 반영 전 실제 코드(departments 모듈·DTO·마이그레이션·initial-data·schema, SCR-010 화면·모달·ja.ts·Sidebar)와 대조했다.

## 반영한 문서·섹션
- `docs/02_REQUIREMENTS.md`
  - FR-USER-001: 부서 필수(未所属 지정 가능) 한 줄 추가
  - FR-USER-002: 부서 없음으로 변경 불가 한 줄 추가
  - FR-DEPT-001 부서 관리(관리자) 신설
- `docs/03_SCREEN_LIST.md`
  - 화면 표: SCR-010 부서 관리(/admin/departments, 관리자, FR-DEPT-001)
  - Common UI Rules > 목록: 검색 버튼 문구 「照会」(기간 조회)·「検索」(키워드 검색) 규칙
  - 전역 내비게이션: 부서 관리(사원 관리와 전체 근태 사이)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 신규(구성·모달·삭제·검증·API·예외. 문구는 ja.ts 일본어 원문, 검색 버튼 「検索」 명시)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`: §4 부서 열 "없으면 -" 삭제, §5 등록 모달 부서 필수 O·초기 미선택, §6 부서 필수 메시지, §9 부서 목록 실패 시 등록 버튼 비활성
- `docs/04_SCREEN_SPECIFICATIONS/SCR-007_USER_DETAIL.md`: §3.1 부서 필수 O, §6 부서 필수 메시지
- `docs/05_DATABASE_DESIGN.md`
  - §0 외래 키: departments 물리 삭제 규칙(활성 0명일 때, 비활성 사원 未所属 이동)
  - §1 departments: code 컬럼·UNIQUE, "시스템 부서(未所属)" 소절, seed 설명 갱신(범위 밖 문구 삭제)
  - §2 users.department_id NOT NULL
  - §8 "부서 삭제" 소절(FOR UPDATE 목적, 처리 순서, 잠금 순서 부서→사원)
- `docs/06_API_SPECIFICATION.md`
  - §0 UserSummary, §1 API-AUTH-001: `departmentName` non-null
  - §5 API-USER-002 departmentId 필수, API-USER-004 null 거부
  - §5 DepartmentDetail·입력 규칙, API-DEPT-002~006 신규(Query 제약, code 오름차순, 404 「部署が見つかりません。」, 에러 코드 4종)
- `docs/08_TEST_PLAN.md`: §5.6 부서 관리 IT-DEPT-01~20 신설, §6 권한 매트릭스에 `/admin/departments` 행
- `docs/09_DESIGN_SYSTEM.md`: §4 제목 SCR-001~010, SCR-010 행(SCR-006과 같은 구성 ○). §6 변경 없음
- `docs/10_DEVELOPMENT_ROADMAP.md`: §1 #8 요구사항에 FR-DEPT-001·프론트 진행 중, §2 #2 마이그레이션·seed·DB 테스트, §2 #8 API-DEPT-002~006 [x]·SCR-010 [ ](Playwright 미실행), §2 #10 화면 테스트에 SCR-010, §3 갱신 이력 1행
- `.claude/work/context.md`: 공용 모듈(departments·TestDataTracker), e2e 계정 DEV 부서 필요, 문서 맵 SCR 범위

## 반영하지 않은 것과 이유
- `docs/07_ARCHITECTURE.md`(admin 컨트롤러 추가): 07에는 모듈·컨트롤러 목록이 없다. §3 Role Guard 문구("`/admin/*` Controller에 `@AdminOnly()`")가 이미 AdminDepartmentsController(`@AdminOnly()` + `admin/departments`)를 포함하므로 갱신 불필요
- 06 "에러 코드 표에 4건 추가": 06 §0 표는 공통 에러 코드 전용이고 업무 에러는 각 API 표에 둔다. 4건은 API-DEPT-004~006 표에 기재
- 10 SCR-010 [x]: Playwright 미실행이므로 §0 규칙에 따라 [ ] 유지(SCR-004와 같은 처리). 백엔드는 unit 222·e2e 313건 통과(임시 DB)로 [x]
- 08 §7 화면 테스트 SCR-010 행, §2 "SCR-001~009" 표기, 05 §7 인덱스의 departments(code): 갱신 예정에 없어 추가하지 않음(후속 판단 필요) → 2차 반영에서 사용자 결정으로 반영

## 2차 반영
기준: backend.md Fix 2·Fix 3 "문서 갱신 예정"(충돌 시 Fix 3 우선), 사용자 결정 3건, test-report.md Run 3·4. 대조한 코드: `admin-departments.controller.ts`(ParseUUIDPipe → 400 VALIDATION_ERROR, details field `id`), `departments.service.ts`(`escapeLikePattern`), `departments.repository.ts`(未所属 부재 시 500), `test/admin-departments.e2e-spec.ts`, `frontend/e2e/departments.spec.ts`(4건), SCR-010 Vitest 2파일(25건), 마이그레이션 `departments_code_key`, `backend/package.json`

### 반영한 문서·섹션
- `docs/06_API_SPECIFICATION.md` §5
  - API-DEPT-002 Query: `%`·`_`·`\`도 문자 그대로 일치
  - API-DEPT-003: "(`:id`가 UUID 형식이 아닌 경우 포함)" 삭제, 400 VALIDATION_ERROR 줄 추가, `:id` 형식 오류 응답 형식(003·005·006 공통, message·details 일본어 원문) 추가
  - API-DEPT-005 표: 404 괄호 삭제, 400 사유에 `:id` UUID 형식 오류 추가
  - API-DEPT-006 표: 404 괄호 삭제, 400 VALIDATION_ERROR 행, 500 INTERNAL_SERVER_ERROR 행(未所属 부재, 롤백) 추가
- `docs/08_TEST_PLAN.md`
  - §2 컴포넌트·흐름 테스트: SCR-001~010
  - §5.6: IT-DEPT-07을 404(정상 UUID)로 한정, IT-DEPT-07b(UUID 형식 아님 → 400) 신설, IT-DEPT-05b(와일드카드 문자 그대로 검색) 신설. 번호는 재배치하지 않고 기존 `IT-CAN-02b`와 같은 접미사 방식 사용(기존 번호 참조 유지)
  - §7: SCR-010 행 추가(Vitest·Playwright 테스트 관점 기준)
- `docs/05_DATABASE_DESIGN.md` §7: `departments(code) — UNIQUE 제약으로 생성`
- `docs/10_DEVELOPMENT_ROADMAP.md`
  - §2 #8 SCR-010 [x](Vitest 25건, Playwright 4건 임시 DB 통과). §0 "테스트 실행 결과 확인" 충족. 도메인 #8·§1 요약은 API-USER·SCR-006/007이 남아 진행 중 유지
  - §2 #10 화면 테스트: SCR-010 완료로 변경
  - §2 #10 "E2E 하네스 정비" [ ] 신설: 범위 밖 Playwright 실패 7건(attendance-status 6, leaves 1). 테스트·품질 도메인의 미완 작업이므로 별도 항목으로 기록
  - §3 갱신 이력 1행

### 반영하지 않은 것·확인 필요
- 08 §5.6에서 IT-DEPT-07b는 상세·수정·삭제 3종을 한 행으로 묶었다(e2e도 3건이지만 같은 검증)
- 06 API-LEAVE-004·005·008(289·298·326행)의 "(`:id`가 UUID 형식이 아닌 경우 포함)"은 휴가 API라 범위 밖. 그대로 둠
- 05 §7에는 기존 `departments(name)` UNIQUE(init 마이그레이션 `departments_name_key`)도 빠져 있으나 이번 결정 범위가 아니어서 추가하지 않음
- 문서·코드 불일치: 10 §3 갱신 이력(2026-11-10 휴가 신청 행)에 "`db:e2e-leaves-reset` 추가"라고 적혀 있으나 이 브랜치의 `backend/package.json`과 `backend/prisma/`에 해당 스크립트·파일이 없다. 이력은 고치지 않고 "E2E 하네스 정비" 항목에 사실만 적음

## 병합 반영 (feature/add-hiredate)
기준: 이 문서(부서 관리), `.claude/work/employee-hire-date/docs-update.md`·docs-proposal.md. 원칙은 양쪽 모두 유지, 사원 등록·수정은 입사일 필수 + 부서 필수. 마이그레이션 순서는 `backend/prisma/migrations/` 실제 폴더(init → split_leaves_rejected_check → 20261110144731_add_users_hire_date → 20261110150000_department_code_and_required_user_department)와 대조했다.

### 충돌 해결
- `docs/02_REQUIREMENTS.md`
  - FR-USER-001: 입사일 기간 검색·등록 항목 입사일(add-hiredate) + 입사일 필수 줄 + 부서 필수 줄(department) 모두 유지
  - FR-USER-002: 수정 항목에 입사일(add-hiredate) + "부서 없음으로 바꿀 수 없다"(department)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`
  - §4 목록: 입사일 열 추가, 부서 열은 department 쪽("항상 표시", "없으면 -" 제거)
  - §5 등록 모달: 입사일 Date 필수 행 + 부서 Select 필수 O·초기 미선택(department). add-hiredate의 "부서 X"는 버림
- `docs/04_SCREEN_SPECIFICATIONS/SCR-007_USER_DETAIL.md`
  - §3.1: 입사일 Date 필수 행 + 부서 Select 필수 O(department)
  - §6: 입사일 필수·부서 필수 메시지 두 행 모두
- `docs/05_DATABASE_DESIGN.md` §2 users: department_id NOT NULL(department) + hire_date 행(add-hiredate). 05에는 마이그레이션 순서 목록이 없어 순서 기술은 추가하지 않음(§2 hire_date 메모는 자동 병합으로 유지)
- `docs/06_API_SPECIFICATION.md`
  - API-USER-002: 필수 목록에 hireDate·departmentId 모두 포함("departmentId 선택" 버림), 未所属 지정 가능 + hireDate 규칙 줄
  - API-USER-004: Request 필드에 hireDate 포함, hireDate 검증 줄 + `departmentId: null` 거부 줄
- `docs/10_DEVELOPMENT_ROADMAP.md` §3 갱신 이력: HEAD 쪽 4행(휴가 2행·부서 2행)과 입사일 1행 모두 유지. 입사일 행은 마이그레이션 순서에 맞춰 휴가 행 뒤, 부서 관리 행 앞에 배치

### 충돌 외 추가 수정
- `docs/10_DEVELOPMENT_ROADMAP.md` §2 #2 마이그레이션 목록(자동 병합, department 쪽 문구)에 `add_users_hire_date`가 빠져 있어 `init`, `split_leaves_rejected_check`, `add_users_hire_date`, `department_code_and_required_user_department` 순으로 추가. "마지막은 departments.code…" 문구는 실제 순서와 맞아 유지

### 08_TEST_PLAN.md 자동 병합 확인
- §5.6 IT-DEPT-*, §6 `/admin/departments` 행, §7 SCR-010 행(department)과 §7 SCR-006·SCR-007 "입사일 필수 검증"(add-hiredate)이 함께 있으며 모순 없음. 수정하지 않음
- 참고: §7 SCR-006·007 행에는 부서 필수 검증이 없다. 부서 관리 쪽 갱신 예정에 없던 항목이라 추가하지 않음(필요 시 후속 판단)
- 사용자 결정으로 반영: §7 SCR-006·SCR-007 행에 "부서 필수 검증(미선택 시 「部署を選択してください。」)"을 "입사일 필수 검증" 바로 뒤에 추가(SCR-006 §5·§6, SCR-007 §3.1·§6 기준). §7 표에는 상태 열·구현 여부 표기가 없어 검증 항목만 추가

### 확인
- `docs/` 전체에서 `^(<<<<<<<|=======|>>>>>>>)` grep 0건
- 코드 변경 없음, merge 커밋 없음
