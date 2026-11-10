VERDICT: APPROVE

# 부서 관리 — 코드 리뷰 (Round 1)

대상 브랜치: feature/department. 읽은 범위: plan·decisions·design-backend·design-frontend·test-plan·backend·frontend·test-report, 변경 파일 전부(backend departments 모듈·DTO·마이그레이션·seed·e2e 계정·db-helpers·e2e/DB spec, frontend SCR-010 화면·모달·테스트·Sidebar·types·ja.ts·Playwright spec), 참고 문서 03 공통 UI 규칙, 04 SCR-003·006·008, 09 §4·§6.

Round 1 결과: CHANGES_REQUESTED

## 이슈

### 중간
- [중간] [담당: backend] [분류: 문서불일치] backend/src/modules/departments/departments.service.ts:32-34 — `new NotFoundException('部署が見つかりません。')`로 넘긴 message는 `AllExceptionsFilter`(common/filters/all-exceptions.filter.ts:42-48)가 버리고 「対象が見つかりません。」로 바꾼다. 그래서 설계 §4 표의 404 message와 다르고, backend.md에 적힌 "404 message는 「部署が見つかりません。」"도 사실과 다르다. 프론트 404 토스트에도 일반 문구가 나온다 / `new AppException('NOT_FOUND', HttpStatus.NOT_FOUND, '部署が見つかりません。')`로 바꾸거나, 설계·문서 갱신 예정을 「対象が見つかりません。」로 맞춘다(전자 권장). spec의 `NotFoundException` 판정도 함께 정리한다.
- [중간] [담당: frontend] [분류: 버그] frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx:93-107, DepartmentDeleteModal.tsx:37-48 — 403 FORBIDDEN(조작 중 권한 박탈)이면 토스트만 띄우고 모달을 열어 둔다. 03 공통 UI 규칙 "모달에서 발생하면 모달을 닫고 토스트"와 기존 `AttendanceEditModal.tsx:94-96`·`LeaveDetailModal` 처리와 다르다 / 403이면 `onClose()`를 호출한다(필요하면 목록도 재조회). 컴포넌트 테스트에 403 케이스를 추가한다.
- [중간] [담당: backend] [분류: 문서갱신] .claude/work/department/backend.md:38-43 (frontend.md:24-28 포함) — plan.md의 "프로젝트 문서 갱신 예정"에 들어 있는 `docs/08_TEST_PLAN.md`(IT-DEPT TC·권한 매트릭스에 `/admin/departments` 행 추가)가 어느 보고서에도 없다. 06 항목에는 404 message(위 첫 이슈 반영 결과)와 `GET /admin/departments` Query 제약(code 최대 20자, name 최대 100자, code 오름차순)도 적어야 한다 / 08 갱신 항목을 추가하고 06 항목을 실제 코드와 맞춘다.

### 낮음 (제안)
- [낮음] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:441-451 — `shouldReturn409WhenMemberIsActivatedWhileDeleting`는 `waitUntilSessionBlocked()` 대신 고정 300ms 대기를 쓴다. DELETE가 잠금 대기에 들어가기 전에 커밋되어도 409가 나오므로, 경합이 실제로 일어났는지 보장하지 못한다 / 다른 경합 테스트처럼 `waitUntilSessionBlocked()`를 쓴다.
- [낮음] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:97-107 — `waitUntilSessionBlocked`가 DB 전체에서 Lock 대기 세션이 하나라도 있으면 통과한다. 지금은 fileParallelism false라 괜찮지만, 대상 세션을 좁히면(예: `query ILIKE '%departments%'`) 더 확실하다.
- [낮음] [담당: tester] [분류: 테스트] backend/src/modules/departments/departments.service.spec.ts:99-103 — notFound 케이스는 `code: 'NOT_FOUND'`를 테스트 안에서 직접 넣고 있어 status만 실제로 검증한다. 첫 이슈를 AppException으로 고치면 `toBody()`로 code·message를 함께 검증할 수 있다. e2e 404 케이스(`shouldReturn404ForUnknownOrMalformedId`)에도 message assertion을 추가한다.
- [낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx — 수정 모드의 409 PROTECTED_DEPARTMENT(모달 닫기·재조회) 케이스가 없다. 현재 화면에서는 未所属 행에 [編集]이 없어 위험은 낮다.
- [낮음] [담당: tester] [분류: 테스트] test-plan §1 "E2E 계정: seed 전 실행 시 에러(DEV 없음)" 미검증. 공유 DB에서 DEV를 지울 수 없다는 사유는 타당하다. `resetE2eAccounts`에 tx를 흉내 낸 fake client를 넘기는 단위 테스트로 대체할 수 있다.
- [낮음] [담당: backend] [분류: 컨벤션] backend/prisma/migrations/20261110000000_... — 타임스탬프가 다른 브랜치의 `20261110144731_add_users_hire_date`보다 앞선다. 병합 순서에 따라 이미 적용된 DB에서 "과거 마이그레이션 누락" 경고가 날 수 있다. 병합 시 확인만 하면 된다(backend.md에 이미 적혀 있음).
- [낮음] [담당: frontend] [분류: 테스트] Playwright `frontend/e2e/departments.spec.ts`는 미실행이다(환경 사유, test-report §미실행 1). 병합 전에 개발 DB에 마이그레이션을 적용하고 한 번 실행해야 한다. 코드상 셀렉터 문제는 보이지 않았다(`getByRole('button', {name: t.edit})`는 aria-label의 부분 일치로 잡힌다).

## 추가 확인 요청: SCR-010 검색 버튼 「検索」 vs 기존 「照会」
판단: **「検索」 유지가 맞다. 이슈로 올리지 않는다.**
- 디자인 시스템(09)에는 버튼 문구 규칙이 없다. 따라서 일관성 판단 기준은 화면 명세와 의미 차이다.
- 기존 「照会」는 SCR-003·SCR-008 두 화면에서만 쓴다. 둘 다 "조회 기간"(`DateRangeFields`, 「照会期間」 문구 계열)이 핵심 조건인 근태 기록 조회이고, 04 명세에도 "조회 버튼"으로 적혀 있다.
- SCR-010은 코드·이름 키워드 검색이다. design-frontend가 기준으로 삼은 SCR-006(같은 "검색 조건 + 표 + 등록 모달" 구성) 명세는 "검색 버튼"이고, 같은 화면들의 Card 제목도 이미 「検索条件」이다. 일본어 업무 시스템에서도 기간·기록 조회는 照会, 키워드 조건 검색은 検索으로 구분해 쓰는 경우가 많다.
- 제안(낮음, 문서): SCR-010 명세(04 신규)에 버튼 문구 「検索」를 명시하고, 03 공통 UI 규칙에 "기간 조회 = 照会 / 키워드 조건 검색 = 検索" 한 줄을 두면 SCR-006 구현 때 다시 고민하지 않아도 된다.

## 확인한 것 (문제 없음)
- API 경로·메서드·상태 코드·에러 코드(DUPLICATE_DEPARTMENT_CODE/NAME, DEPARTMENT_HAS_MEMBERS, PROTECTED_DEPARTMENT, VALIDATION_ERROR)가 설계 §4와 일치. 프론트 `DepartmentDetail` 타입·호출 경로·Query(`code`/`name`/`page`/`limit=20`)가 백엔드와 일치
- 삭제 트랜잭션: 부서 행 `FOR UPDATE` → 활성 수 재확인 → 비활성 이동 → DELETE, P2003은 시그널 예외로 전체 롤백 후 409. raw SQL은 tagged template만 사용. Controller → Service → Repository 계층 준수
- 마이그레이션 1~7단계가 설계대로이고, FK는 init의 `ON DELETE RESTRICT` 그대로. seed·E2E 계정·db-helpers가 NOT NULL에 맞게 수정됨. `attendance.mapper.spec.ts` 수정은 타입 변경에 따른 최소 수정으로 타당
- 디자인 시스템: Card·Modal·Badge·Pagination·SectionError·SkeletonLines·Spinner·form.tsx·table.ts만 사용. hex·임의 px·radius·shadow 하드코딩 없음(Grep 확인). 버튼 크기 클래스는 AdminAttendanceView와 같은 패턴. 화면 전용 모달 2개는 화면 폴더에 있고 재사용 대상이 아니므로 09 §6 추가 불필요
- 사이드바 순서(社員管理 → 部署管理 → 全体勤怠), 未所属 행 배지·조작 숨김, memberCount>0 시 API 미호출 토스트, inactiveMemberCount 안내, 마지막 행 삭제 시 이전 페이지 이동 구현됨
- `docs/` 직접 수정 없음(git status 확인)
- "문서와 다른 점"(P2002 구분에 `driverAdapterError...constraint.index` 사용)은 adapter-pg 동작상 타당

## 담당별 이슈 수
- backend: 중간 2, 낮음 1
- frontend: 중간 1, 낮음 1
- tester: 낮음 5

---

# Round 2

Round 2 결과: **APPROVE**

읽은 범위: backend.md·frontend.md "Fix 1", test-report.md "Run 2", 수정 파일 `departments.service.ts`, `departments.service.spec.ts`, `DepartmentFormModal.tsx`, `DepartmentDeleteModal.tsx`, `DepartmentFormModal.test.tsx`, `DepartmentsView.test.tsx`(삭제 실패 it.each), `backend/test/admin-departments.e2e-spec.ts`(waitUntilSessionBlocked·404·경합 3건). 비교 기준으로 `AppException`, `AttendanceEditModal.tsx`의 403 처리를 다시 확인했다.

## Round 1 지적 반영 확인
- [중간·backend 404 message] 해결. `notFoundException()`이 `AppException('NOT_FOUND', 404, '部署が見つかりません。')`를 반환하고(departments.service.ts:32-34), 모듈 안에 `NotFoundException` 사용이 남아 있지 않다. spec은 `toBody()`로 statusCode·code·message를 검증하고(spec:61-79, 100-109), e2e `shouldReturn404ForUnknownOrMalformedId`는 존재하지 않는 UUID와 형식 오류 두 경우 모두 message까지 확인한다(e2e:268-279).
- [중간·frontend 403] 해결. FormModal `handleError`는 403·404·PROTECTED에서, DeleteModal은 403·404·409에서 토스트를 띄운 뒤 `onClose()`와 `onDone()`을 호출한다. 03 공통 UI 규칙, AttendanceEditModal:94-96과 처리 방식이 같다. 테스트는 FormModal `shouldCloseAndRefetchWhenPermissionIsRevoked`와 DepartmentsView 삭제 실패 it.each의 FORBIDDEN 케이스(모달 닫힘·토스트·재조회 2회 이상)로 확인한다.
- [중간·문서 갱신 예정] 해결. backend.md Fix 1에 08(IT-DEPT TC, 권한 매트릭스의 `/admin/departments` 행)이 추가됐다. 06 항목도 Query 제약(code 최대 20자, name 최대 100자, 부분 일치·대소문자 무시, code 오름차순)과 404 NOT_FOUND/「部署が見つかりません。」를 담고 있으며 실제 코드와 맞다. frontend.md에는 Round 1 제안(03 照会/検索 규칙, SCR-010 명세의 「検索」)이 추가됐다.
- [낮음·tester] 고정 300ms 대기를 `waitUntilSessionBlocked('%departments%')`로 바꿨다(e2e:461). 대기 조건은 `query ILIKE` 패턴으로 좁혔다(e2e:98-110). 패턴은 바인딩 파라미터로 넘어가므로 확인용 쿼리 자신은 매칭되지 않는다. 경합 테스트 3건의 패턴(DELETE의 부서 행 잠금 대기 → departments, FK 확인 중인 INSERT 대기 → users)도 각 테스트의 실제 대기 지점과 맞다. 수정 모드 409 PROTECTED 케이스도 추가됐다(FormModal.test:162-171).
- [낮음·tester] e2e-accounts "seed 전 실행 시 에러"는 미반영이다. 사유(범위 확대, 위험 낮음)가 적혀 있어 수용한다.
- [낮음·backend/frontend] 마이그레이션 타임스탬프와 Playwright 미실행은 병합 전 확인 사항으로 그대로 남는다.

## 이슈 (Round 2)

### 낮음 (제안)
- [낮음] [담당: frontend] [분류: 테스트] frontend/e2e/departments.spec.ts — Round 1에서 이어진 항목. Playwright가 여전히 미실행이다. 병합 전에 개발 DB에 마이그레이션을 적용하고 한 번 실행한다.
- [낮음] [담당: backend] [분류: 컨벤션] backend/prisma/migrations/20261110000000_... — Round 1에서 이어진 항목. hire_date 브랜치와 병합할 때 마이그레이션 순서와 createUser/seed의 hire_date 대응을 확인한다.
- [낮음] [담당: tester] [분류: 테스트] test-plan §1 "E2E 계정: seed 전 실행 시 에러" — Round 1에서 이어진 항목. 미반영이며 수용 가능하다. 필요하면 후속 작업에서 fake client 단위 테스트를 추가한다.

## 담당별 이슈 수 (Round 2)
- backend: 낮음 1
- frontend: 낮음 1
- tester: 낮음 1

---

# Round 3

Round 3 결과: **CHANGES_REQUESTED** (문서 갱신 예정의 API ID 오기 1건. 코드·테스트는 문제 없음)

읽은 범위: backend.md "Fix 2 (보안 권고)", test-report.md Run 3·Run 4, 수정 파일 `admin-departments.controller.ts`, `departments.service.ts`, `departments.repository.ts`, `departments.service.spec.ts`(이스케이프 케이스), `backend/test/admin-departments.e2e-spec.ts`(expectMalformedIdError·404/400 분리·와일드카드 검색), `frontend/e2e/attendance.spec.ts`(afterAll 가드). 비교 기준으로 `AllExceptionsFilter`, 현행 `docs/06_API_SPECIFICATION.md` §5 API-DEPT-001~006, `docs/08_TEST_PLAN.md` IT-DEPT를 확인했다. 범위 밖 Playwright 실패 7건(attendance-status 6, leaves 1)은 사용자 결정에 따라 별도 작업으로 보고 이슈로 올리지 않는다.

## Fix 2 확인
- LIKE 이스케이프: `escapeLikePattern`이 `\`·`%`·`_` 앞에 `\`를 붙이고(service.ts:14-16), `listDetails`에서 code·name 둘 다 적용한다. 빈 문자열·undefined는 `&&` 단락으로 그대로 넘어가 repository의 truthy 판정과 맞는다. 단위 spec(`shouldEscapeLikeWildcardsInSearchKeywords`)은 기대값 문자열이 정확하다. e2e `shouldMatchWildcardCharactersLiterallyInSearch`는 `_`·`%`·`\` 각각에 대해 와일드카드로 해석되면 함께 걸리는 decoy를 두고 `toEqual([id])`로 정확히 1건만 나오는지 확인한다(`\D` decoy `D부`도 LIKE 기본 이스케이프상 실제로 걸리는 조합이라 유효). code 쪽 `%` 0건 검증도 있다. 실제 Postgres에서 통과했다(Run 3).
- 未所属 부재 500: 트랜잭션 콜백 안에서 `AppException('INTERNAL_SERVER_ERROR', 500, 'サーバーでエラーが発生しました。')`를 던지므로 이동 전에 롤백된다. 응답 code·message는 `AllExceptionsFilter`의 기본 5xx 응답과 같고, 원인은 일본어 Logger.error로만 남는다(filter도 5xx면 stack을 남겨 로그는 2줄이 되지만 무해). 바깥 catch는 `DepartmentHasMembersSignal`만 잡고 나머지는 다시 던지므로 500이 그대로 나간다.
- ParseUUIDPipe: GET/PATCH/DELETE `:id` 3곳에 같은 인스턴스를 적용했고, `exceptionFactory`가 기존 VALIDATION_ERROR 형식(`details[{field,message}]`)으로 응답한다. 서비스의 `assertUuid`·zod import는 남아 있지 않다. id 생성은 Prisma `uuid()`(v4)·`gen_random_uuid()`(v4)라 기존 ID가 pipe에서 거부될 일은 없다. 프론트는 목록에서 받은 id만 쓰므로 400 경로에 영향이 없다.
- e2e: 정상 형식의 없는 UUID 404(message 포함)와 형식 오류 400(GET/PATCH/DELETE 3건)을 나눴다. 테스트 이름이 동작과 맞다.
- attendance.spec.ts afterAll: `PLAYWRIGHT_BASE_URL` 가드 2줄만 추가했다. beforeAll·global-setup과 같은 조건이고, 다른 줄은 바뀌지 않았다.

## 이슈 (Round 3)

### 중간
- [중간] [담당: backend] [분류: 문서갱신] .claude/work/department/backend.md:67 — Fix 2의 문서 갱신 예정에서 `:id`가 있는 API를 "API-DEPT-003/004/005"로 적었다. 06 §5의 실제 번호는 003 상세(GET), 004 등록(POST, `:id` 없음), 005 수정(PATCH), 006 삭제(DELETE)다. 이대로 반영하면 등록(004)에 id 형식 오류 400이 붙고 삭제(006)는 빠진다 / "API-DEPT-003/005/006"으로 고친다. 함께 정리할 것: 06의 "`:id`가 UUID 형식이 아닌 경우 포함" 문구는 세 곳(003 본문 425행, 005 표 451행, 006 표 462행)에 있으므로 셋 다 지우고 400 행을 추가한다고 적는다. 500 INTERNAL_SERVER_ERROR 추가 대상은 006이다.

### 낮음 (제안)
- [낮음] [담당: backend] [분류: 문서갱신] .claude/work/department/backend.md:67 — 08 갱신 대상을 "IT-DEPT에 malformed ID 400 반영"이라고만 적었다. 현행 08의 IT-DEPT-07(「상세: 존재하지 않는 id / UUID 형식 아님 → 404」, 176행)을 "없는 id → 404 / 형식 아님 → 400 VALIDATION_ERROR(details.field=id)"로 나누는 수정이라고 짚어 두면 architect가 놓치지 않는다. design-backend.md §4 표 73행의 "404(형식 오류 UUID 포함)"도 Fix 2 이후 실제와 다르다(작업 문서라 참고만).
- [낮음] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:82-85 — `expectMalformedIdError`는 code와 `details[0].field`만 본다. message(「入力内容に誤りがあります。」)와 `details[0].message`까지 확인하면 exceptionFactory 형식이 더 확실히 고정된다. 未所属 부재 500 경로도 테스트가 없다. DB에서 UNASSIGNED를 지울 수 없으니, 필요하면 repository를 쓰는 서비스 spec 대신 PrismaService mock으로 롤백·500 응답만 단위 확인하는 정도로 충분하다.
- [낮음] [담당: frontend] [분류: 테스트] 이어진 항목. `departments.spec.ts`는 Run 3에서 임시 환경으로 통과했다. 병합 전 개발 DB 마이그레이션 적용 후 실행은 여전히 남아 있다. Run 3에서 attendance.spec afterAll이 개발 DB를 향해 실행된 건(조치 (a): 900001/900002·근태 상태 확인)은 사용자 확인 사항으로 남는다.
- [낮음] [담당: backend] [분류: 컨벤션] 이어진 항목. 마이그레이션 타임스탬프·hire_date 병합 대응.

## 담당별 이슈 수 (Round 3)
- backend: 중간 1, 낮음 2
- frontend: 낮음 1
- tester: 낮음 1

---

# Round 4

Round 4 결과: **APPROVE**

읽은 범위: backend.md "Fix 3"(69-78행). 코드 변경은 없다. 대조 기준으로 현행 `docs/06_API_SPECIFICATION.md` §5(422-462행)와 `docs/08_TEST_PLAN.md` IT-DEPT(175-177행)를 Grep으로 다시 확인했다.

## Round 3 중간 이슈 반영 확인
- [중간·backend 문서 갱신 API ID] 해결. `:id`가 있는 API를 API-DEPT-003(상세)/005(수정)/006(삭제)로 바로잡았고, 004(등록)는 대상이 아니라고 밝혔다. 06 §5 제목 행(422 003, 427 004, 443 005, 456 006)과 맞다.
- 괄호 문구 "`:id`가 UUID 형식이 아닌 경우 포함"의 위치 3곳(425·451·462행)이 실제 06과 같다. 각각 괄호 삭제 + 400 VALIDATION_ERROR 추가로 적었다. 005는 기존 400 행(450행)에 사유를 덧붙이고, 006은 400 행이 없으므로 새로 추가한다고 구분했다. 이 내용도 현행 문서와 맞다.
- 500 INTERNAL_SERVER_ERROR 행은 006에만 추가하고, message 「サーバーでエラーが発生しました。」는 repository의 실제 AppException과 같다. 400 details 형식(`field:'id'`, 「部署 ID の形式が正しくありません。」)도 controller의 exceptionFactory(Fix 2)와 같다.
- "Fix 2와 충돌하면 Fix 3이 우선"이라고 적어 두어, 반영하는 쪽이 Fix 2 67행의 잘못된 번호를 따를 위험이 없다.
- Round 3 낮음 제안 중 08 IT-DEPT-07 분리 건도 함께 반영됐다(176행 → 404/400 2행. 번호 체계는 architect에게 맡김).

## 이슈 (Round 4)
새 이슈 없음.

### 남은 제안 (낮음, 이번 범위에서 반영하지 않기로 함. 재제기 아님)
- [낮음] [담당: tester] [분류: 테스트] `expectMalformedIdError`에 message·`details[0].message` assertion 추가, 未所属 부재 500 경로 단위 확인(Round 3).
- [낮음] [담당: frontend] [분류: 테스트] 병합 전 개발 DB 마이그레이션 적용 후 `departments.spec.ts` 실행. Run 3의 attendance.spec afterAll 개발 DB 영향은 사용자 확인 사항(Round 3).
- [낮음] [담당: backend] [분류: 컨벤션] 마이그레이션 타임스탬프·hire_date 브랜치 병합 대응(Round 1부터 이어짐).
- [낮음] [담당: backend] [분류: 문서갱신] design-backend.md §4 표 73행 "404(형식 오류 UUID 포함)"는 작업 문서라 참고만(Round 3).

## 담당별 이슈 수 (Round 4)
- backend: 0 (남은 제안 2)
- frontend: 0 (남은 제안 1)
- tester: 0 (남은 제안 1)
