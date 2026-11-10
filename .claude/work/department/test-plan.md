# 부서 관리 — 테스트 계획

근거: `design-backend.md` §4 에러 코드·§5 삭제 트랜잭션, `design-frontend.md` 화면 흐름, `decisions.md`(Q4-B 활성 사원만 셈), `docs/08_TEST_PLAN.md` §5·§6(권한 매트릭스)·§7 형식.

## 1. DB 통합 (`backend/test/db/schema.e2e-spec.ts` 추가)
| ID | 시나리오 | 기대 |
|---|---|---|
| DB-DEPT-01 | 같은 code로 2건 INSERT | `departments_code_key` UNIQUE 위반 |
| DB-DEPT-02 | department_id 없이 users INSERT | NOT NULL 위반 |
| DB-DEPT-03 | 사원이 있는 부서 DELETE(직접) | `users_department_id_fkey` 위반(기존 케이스 유지) |
| DB-DEPT-04 | 마이그레이션 후 상태 | users.department_id NULL 0건, `UNASSIGNED` 부서 1건 |
- seed(`seed.e2e-spec.ts`): 未所属 포함 5개 부서가 code와 함께 생성, 재실행 시 0건, 초기 ADMIN이 GA 소속
- E2E 계정(`e2e-accounts.e2e-spec.ts`): 900001/900002가 DEV 소속, seed 전 실행 시 에러

## 2. 단위 (`departments.service.spec.ts`, DTO 스키마)
- code 정규화: `" dev "` → `DEV`, `dev-01` 허용, `開発`·`a_b`·21자·빈 문자열 거부
- name: trim 후 0자 거부, 101자 거부, 100자 허용
- PATCH 빈 객체 거부
- P2002 target이 code/name일 때 각각 DUPLICATE_DEPARTMENT_CODE/NAME으로 변환
- 삭제·수정 대상 code가 UNASSIGNED → PROTECTED_DEPARTMENT
- 삭제: 활성 count>0 → DEPARTMENT_HAS_MEMBERS, delete 중 P2003 → DEPARTMENT_HAS_MEMBERS, 대상 없음 → NOT_FOUND
- mapper: `isSystem`은 code가 UNASSIGNED일 때만 true

## 3. API 통합 (`backend/test/admin-departments.e2e-spec.ts`)
| ID | 시나리오 | 기대 |
|---|---|---|
| IT-DEPT-01 | ADMIN 등록 `{code:" dev9 ",name:"開発9部"}` | 201, code `DEV9`, memberCount 0, inactiveMemberCount 0, isSystem false |
| IT-DEPT-02 | 등록 시 기존 code(대소문자만 다름) / `unassigned` | 409 DUPLICATE_DEPARTMENT_CODE |
| IT-DEPT-03 | 등록 시 기존 name | 409 DUPLICATE_DEPARTMENT_NAME |
| IT-DEPT-04 | 필수 누락·형식 오류 | 400 VALIDATION_ERROR, details에 field |
| IT-DEPT-05 | 목록: code·name 부분 일치, code 오름차순, 페이지네이션 형식 | 200 |
| IT-DEPT-06 | 목록·상세 카운트: 활성 2·비활성 1 소속 | memberCount 2, inactiveMemberCount 1 |
| IT-DEPT-07 | 상세 존재하지 않는 id / UUID 형식 아님 | 404 NOT_FOUND |
| IT-DEPT-08 | 수정 name만 / code만 | 200, updatedAt 갱신 |
| IT-DEPT-09 | 수정 시 다른 부서의 code·name | 409 각각 |
| IT-DEPT-10 | 수정 빈 객체 | 400 |
| IT-DEPT-11 | 소속 0명 삭제 | 204, 이후 상세 404 |
| IT-DEPT-12 | 활성 사원 1명(+비활성 1명) 소속 삭제 | 409 DEPARTMENT_HAS_MEMBERS, 부서 유지, 비활성 사원 부서 **변경 없음**(롤백 확인) |
| IT-DEPT-13 | 비활성 사원만 2명 소속 삭제 | 204, 두 사원의 department_id = 未所属 id, updated_at 갱신, 다른 부서 사원은 변경 없음 |
| IT-DEPT-14 | 삭제된 부서 재삭제 | 404 |
| IT-DEPT-15 | 未所属 삭제 / 未所属 code·name 수정 | 409 PROTECTED_DEPARTMENT, 변경 없음 |
| IT-DEPT-16 | 경합: 트랜잭션 A가 사원 INSERT(대상 부서)를 커밋 전 보류한 상태에서 DELETE 요청 → A 커밋 | DELETE는 A 커밋까지 대기 후 409 DEPARTMENT_HAS_MEMBERS (부서 잠금 후 재확인) |
| IT-DEPT-17 | 경합: DELETE 트랜잭션이 부서 잠금을 잡은 상태에서 사원 INSERT(대상 부서) | INSERT는 대기 후 FK 위반, 부서는 삭제됨 |
| IT-DEPT-18 | 기존 GET /departments 응답이 id·name만, 未所属 포함(회귀) | 200 (기존 departments.e2e-spec 유지) |
- 경합 테스트 구현: `createTestPrisma()`로 별도 클라이언트를 만들어 `$transaction` 안에서 `pg_sleep` 또는 Promise로 커밋을 지연시키고, 그 사이 HTTP DELETE를 보낸다(타임아웃 여유 확보). 재현이 불안정하면 Repository 단위로 두 트랜잭션을 직접 실행하는 통합 테스트로 대체 가능(실패로 보고, skip 금지)
권한 매트릭스(08 §6 형식): `/admin/departments` 전 메서드 — 비로그인 401 / EMPLOYEE 403 FORBIDDEN / mustChangePassword 403 PASSWORD_CHANGE_REQUIRED / ADMIN 허용

## 4. 컴포넌트 (Vitest + Testing Library)
`DepartmentsView.test.tsx`
- 초기 로딩 스켈레톤 → 목록 렌더(コード·名称·所属社員数·更新日), 보조 문구 표시
- Empty 문구, 조회 실패 시 SectionError → [再試行] 재조회
- 검색 시 URL Query 반영·1페이지 이동, URL Query로 초기 조건 복원
- isSystem 행: 「システム」 배지, [編集][削除] 없음
- memberCount>0 [削除] → API 미호출 + 에러 토스트(삭제 불가 문구). inactiveMemberCount만 있으면(memberCount=0) 확인 모달로 진행
- 확인 모달: inactiveMemberCount>0이면 「無効の社員 N 名は…」 표시, 0이면 미표시
- 확인 → 204 → 성공 토스트·재조회
- 삭제 409(HAS_MEMBERS·PROTECTED)·404 → 모달 닫기 + 서버 message 토스트 + 재조회
`DepartmentFormModal.test.tsx`
- 미입력·형식 오류 필드 메시지, 요청 중 버튼 비활성(중복 제출 방지)
- 409 CODE/NAME → 해당 필드 아래 메시지
- 수정 모드 초기값 표시, 성공 시 onSaved 호출
Sidebar/AppShell
- ADMIN에게 「部署管理」가 社員管理와 全体勤怠 사이에 표시, EMPLOYEE에게 미표시
- EMPLOYEE가 `/admin/departments` 접근 → `/dashboard` + 「アクセス権限がありません。」(기존 가드 회귀)

## 5. E2E (Playwright `frontend/e2e/departments.spec.ts`, 개발 DB)
- ADMIN 로그인 → 사이드바 部署管理 → 등록(고유 code) → 목록에 표시 → 이름 수정 → 삭제 → 목록에서 사라짐
- 활성 사원이 있는 seed 부서(GA, 초기 ADMIN 소속)의 [削除] → 삭제 불가 토스트, 행 유지
- 未所属 행에 [編集][削除]가 없음
- EMPLOYEE(900002)로 `/admin/departments` 접근 → 대시보드 이동
- 생성 데이터는 테스트 끝에 삭제(고유 code 접두사 `E2E-`). 비활성 사원 이동 시나리오는 사원 관리 API가 없어 E2E 대상에서 제외(API 통합 IT-DEPT-13으로 검증)

## 6. 실행 명령
- backend `npm run db:migrate:test` 후 `npm test`, `npm run test:e2e`, 단일 `npx vitest run --config ./vitest.config.e2e.ts test/admin-departments.e2e-spec.ts`
- frontend `npm test`, 단일 `npx vitest run src/app/(app)/admin/departments/DepartmentsView.test.tsx`, `npm run test:e2e`
- 회귀: 기존 backend e2e 전체(TestDataTracker.createUser 기본 부서 변경 영향), frontend 전체
