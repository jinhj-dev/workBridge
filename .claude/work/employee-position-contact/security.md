SECURITY: PASS

# 보안 점검 결과: 사원 役職·連絡先 (employee-position-contact)

## 점검 요약
- 치명 0 / 높음 0 / 중간 0 / 낮음 1

## 확인한 항목 (문제 없음)
- 노출 범위: contactEmail·jobTitle은 `departments.repository.ts` `findMembersPage`의 명시적 select(id, empId, name, contactEmail, jobTitle{id,name,tone})로만 조회되며, API-DEPT-008에서만 반환된다.
- 다른 응답으로의 유출 없음: `USER_SUMMARY_SELECT`(id/name/empId/department.name), 인증용 `USER_SELECT`(/auth/me·로그인·refresh), 責任者候補, 承認者候補(`findApprovers`), 部署 목록·상세(`DEPARTMENT_SELECT`의 manager는 id/empId/name)는 모두 명시적 select이며 새 컬럼을 포함하지 않는다. 코드 전체에 `include:`로 users를 읽는 곳이 없어 SELECT * 성격의 따라나감이 없다. E2E(admin-departments.e2e-spec.ts 912-947행)가 /departments, /auth/me, 責任者候補에 미노출을 회귀 검증한다.
- 인가: `AdminDepartmentsController` 클래스 전체에 `@AdminOnly()`가 적용되어 `:id/members`도 ADMIN 전용. `:id`는 ParseUUIDPipe로 검증, 페이징은 스키마 검증.
- 로그·에러: departments 모듈의 로그는 고정 문구 1건뿐이며 연락처를 출력하지 않는다. seed·sample 스크립트는 건수만 출력한다.
- SQL: 신규 코드는 Prisma 쿼리(파라미터 바인딩)만 사용. 신규 raw SQL 없음.
- 테스트·샘플 데이터: 연락처는 모두 `@example.com`(RFC 2606)이며 실제 개인정보 없음.
- 프론트 출력: `DepartmentMembersModal.tsx`는 `{member.contactEmail}`, `{member.jobTitle.name}`을 React 텍스트 노드로 출력(자동 이스케이프). `dangerouslySetInnerHTML`·`mailto:` 사용 없음. 역할 tone은 고정 맵(JOB_TITLE_TONE_BADGE)으로 변환된다.
- 마이그레이션: ENUM·테이블 추가와 NULL 허용 컬럼 추가뿐이라 기존 데이터에 영향 없음. FK는 ON DELETE RESTRICT(역할 삭제 시 사원 보호), UNIQUE(name). 데이터 INSERT 없음.

## 이슈
[낮음] [담당: backend] backend/prisma/schema.prisma:120 — contact_email에 형식·UNIQUE 제약이 DB에 없고, 현재 쓰기 API가 없어 악용 경로는 없다(seed·스크립트만 기입). 악용 시나리오: USER 등록/수정 API(미구현)가 추가될 때 검증 없이 저장하면 임의 문자열(HTML 문자열 등)이 저장될 수 있으나, 프론트가 텍스트로만 출력하므로 XSS는 성립하지 않는다. 수정 방향: API-USER-002/004 구현 시 서버에서 이메일 형식·254자·ADMIN 한정 검증을 반드시 적용하고, 그때 mailto 링크를 도입한다면 href에 형식 검증된 값만 사용.

## 권고 (이슈 아님)
- ADMIN이 연락처를 열람한 감사 로그는 현재 요구사항 범위 밖. 개인정보 열람 이력이 필요해지면 별도 검토.
- 신규 패키지 추가 없음(의존성 점검 대상 없음).
