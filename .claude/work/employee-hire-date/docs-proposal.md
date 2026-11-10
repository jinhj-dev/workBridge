# docs-proposal (employee-hire-date)

기준: backend.md「文書更新予定」. 1문서씩 승인 후 반영한다. 아직 docs/는 수정하지 않았다.
`[선택]` 표시는 "문서 갱신 예정"에 없지만 정합성 때문에 제안하는 항목(승인 시에만 반영).

## 1/7: docs/05_DATABASE_DESIGN.md

§2 Table: users — 컬럼 표(department_id 다음, schema.prisma의 순서와 같음)
```diff
 | department_id | UUID | | YES | 부서 ID |
+| hire_date | DATE | | NO | 입사일 (Asia/Tokyo 기준 날짜). 기본값 없음 |
 | created_at | TIMESTAMPTZ | | NO | 생성일 |
```
§2 Constraints 다음(표 아래 메모)
```diff
 - 활성 ADMIN이 최소 1명 존재해야 한다(서비스 계층에서 검증, FR-USER-002). 동시성 처리는 §8을 따른다.
+
+hire_date는 마이그레이션 `add_users_hire_date`에서 기존 행을 `2026-01-01`로 채운 뒤 NOT NULL로 바꿨다. seed 초기 ADMIN과 E2E 계정도 같은 고정값 `2026-01-01`을 쓴다.
```
[선택] §9 DATE 컬럼 목록에 hire_date 추가
```diff
-- DATE 컬럼(work_date, start_date, end_date)은 Prisma에서 ...
+- DATE 컬럼(work_date, start_date, end_date, hire_date)은 Prisma에서 ...
```

## 2/7: docs/06_API_SPECIFICATION.md

§5 API-USER-001: 사원 목록
```diff
-- Query: `name`, `empId`, `departmentId`, `role`, `approvalRequired`(true/false), `isActive`(true/false), `page`, `limit`
+- Query: `name`, `empId`, `departmentId`, `role`, `approvalRequired`(true/false), `isActive`(true/false), `hireDateFrom`, `hireDateTo`, `page`, `limit`
 - `isActive`를 생략하면 ...(유지)
+- `hireDateFrom`·`hireDateTo`: YYYY-MM-DD, 양끝 포함, 한쪽만 지정 가능. 형식 오류이거나 `hireDateFrom > hireDateTo`이면 400 VALIDATION_ERROR
+- 정렬: 입사일 오름차순, 같은 날이면 사원번호 오름차순
 (Response 예시)
-{ "id": "uuid", "name": "홍길동", "empId": "00001", "departmentId": "uuid", "departmentName": "개발팀",
+{ "id": "uuid", "name": "홍길동", "empId": "00001", "hireDate": "2026-04-01", "departmentId": "uuid", "departmentName": "개발팀",
```
§5 API-USER-002: 사원 등록
```diff
-{ "name": "홍길동", "empId": "00001", "initialPassword": "Temp1234", "departmentId": "uuid",
+{ "name": "홍길동", "empId": "00001", "initialPassword": "Temp1234", "hireDate": "2026-04-01", "departmentId": "uuid",
-- name, empId, initialPassword, role, approvalRequired 필수 / departmentId 선택
+- name, empId, initialPassword, hireDate, role, approvalRequired 필수 / departmentId 선택
+- hireDate: YYYY-MM-DD, 실재하는 날짜, 미래 날짜 허용, 기본값 없음. 누락·형식 오류는 400 VALIDATION_ERROR
```
§5 API-USER-003: 응답은 "목록 항목 + ..."이므로 hireDate가 자동 포함 → 본문 변경 없음
§5 API-USER-004: 사원 수정
```diff
-- Request(변경할 필드만): `name`, `empId`, `departmentId`, `role`, `approvalRequired`, `isActive`
+- Request(변경할 필드만): `name`, `empId`, `hireDate`, `departmentId`, `role`, `approvalRequired`, `isActive`
+- `hireDate`를 지정하면 API-USER-002와 같은 규칙으로 검증한다(null 불가)
```

## 3/7: docs/02_REQUIREMENTS.md

FR-USER-001: 사원 조회 및 등록 (관리자)
```diff
-- ADMIN은 사원 목록을 이름, 사원번호, 부서, 권한, 승인 필요 여부, 계정 상태로 검색할 수 있다.
+- ADMIN은 사원 목록을 이름, 사원번호, 부서, 권한, 승인 필요 여부, 계정 상태, 입사일 기간으로 검색할 수 있다.
-- ADMIN은 이름, 사원번호, 초기 비밀번호, 부서, 권한, 승인 필요 여부를 입력하여 사원을 등록할 수 있다.
+- ADMIN은 이름, 사원번호, 초기 비밀번호, 입사일, 부서, 권한, 승인 필요 여부를 입력하여 사원을 등록할 수 있다.
+- 입사일은 필수이며 기본값이 없다. 미래 날짜도 입력할 수 있다.
```
FR-USER-002: 사원 정보 수정 (관리자)
```diff
-- ADMIN은 사원의 이름, 사원번호, 부서, 권한, 승인 필요 여부, 계정 상태, 부여 연차를 수정할 수 있다.
+- ADMIN은 사원의 이름, 사원번호, 입사일, 부서, 권한, 승인 필요 여부, 계정 상태, 부여 연차를 수정할 수 있다.
```

## 4/7: docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md

전제: 작업 트리의 사용자 초안(목록 입사일 컬럼, §5 검색 조건, 등록 입사일 행, §6 검증, §10 정렬)을 유지하고 그 위의 차분만 적는다.
§3 검색 조건(계정 상태 다음)
```diff
 | 계정 상태 | Select | 전체 / 활성 / 비활성 (기본: 활성) |
+| 입사일 기간 | Date ~ Date | 시작일 ~ 종료일, 양끝 포함. 한쪽만 입력 가능 |
```
§4 목록 구성
```diff
-입사일 오름차순으로 표시한다.
+입사일 오름차순, 같은 날이면 사원번호 오름차순으로 표시한다.
```
§5 사원 조회 5번(초안의 4항목 목록을 확정 내용으로 교체)
```diff
-5. 검색 조건은 밑과 같다.
- - 이름
- - 입사일
- - 부서
- - 휴가 승인
+5. 검색 조건은 §3의 항목(기존 6개 + 입사일 기간)이다.
```
§5 신규 사원 등록 표
```diff
-   | 입사일 | Date | O | 기본: 필요 |
+   | 입사일 | Date | O | 기본값 없음(직접 선택). 미래 날짜 허용 |
```
§10 완료 조건
```diff
-- 초기화면에서 입사일 오름차순으로 데이터가 나열된다.
+- 초기화면에서 입사일 오름차순(같은 날이면 사원번호 오름차순)으로 데이터가 나열된다.
```
[선택] §6 유효성 검증(SCR-008과 같은 문구. 화면 동작은 미결정이므로 승인 시에만)
```diff
+| 입사일 기간: 시작일 ≤ 종료일 | 시작일은 종료일보다 늦을 수 없습니다. |
```

## 5/7: docs/04_SCREEN_SPECIFICATIONS/SCR-007_USER_DETAIL.md

§3.1 기본 정보(사원번호 다음, 타입 표기는 SCR-006 초안의 `Date`에 맞춤)
```diff
 | 사원번호 | Input | O | 숫자만, 최대 50자리, 중복 불가 |
+| 입사일 | Date | O | 미래 날짜 허용 |
 | 부서 | Select | X | 소속 부서 |
```
§6 유효성 검증(문구는 SCR-006 §6 초안과 같음)
```diff
 | 사원번호 숫자만 | 사원번호는 숫자로 입력해주세요. |
+| 입사일 필수 | 입사일을 선택해주세요. |
 | 부여 일수 0 이상, 0.5 단위 | 부여 일수는 0.5일 단위로 입력해주세요. |
```

## 6/7: docs/08_TEST_PLAN.md

§7 화면 테스트
```diff
-| SCR-006 | 초기 비밀번호 규칙 검증, 중복 사원번호 메시지, 등록 후 목록 갱신 |
+| SCR-006 | 초기 비밀번호 규칙 검증, 입사일 필수 검증, 중복 사원번호 메시지, 등록 후 목록 갱신 |
```
[선택] SCR-007 행에 "입사일 필수 검증" 추가(SCR-007에 필수 규칙이 생기므로)
```diff
-| SCR-007 | 활성→비활성 전환 시 확인 모달과 ...
+| SCR-007 | 입사일 필수 검증, 활성→비활성 전환 시 확인 모달과 ...
```
확인 필요: 마이그레이션·DB 검증(MIG-01~03, DB-HD-01~04)
- 08에는 DB·마이그레이션 테스트 절이 없다(DB 통합 테스트는 10 §2에서만 관리).
- 안 1(권장): 08에는 넣지 않는다. 결과는 작업 문서(test-plan.md, test-report.md)에 이미 기록됨.
- 안 2: §3 끝에 "users.hire_date 마이그레이션 확인(MIG-01~03): 건수 동일, NULL 0건, 전 행 2026-01-01" 1줄을 추가한다.

## 7/7: docs/10_DEVELOPMENT_ROADMAP.md

§3 갱신 이력(마지막 행 다음). 체크박스·§1 요약·기능 8 상태는 변경하지 않는다(진행 중 유지).
```diff
+| 2026-11-10 | 사원 입사일: `users.hire_date`(DATE, NOT NULL, 기본값 없음)와 마이그레이션 `add_users_hire_date` 추가(기존 행·seed 초기 ADMIN·E2E 계정은 2026-01-01). 02·05·06·SCR-006·SCR-007·08에 입사일 계약 반영. API-USER-001~004·SCR-006/007 구현은 기능 8에서 진행(backend unit 185건, e2e 238건 통과) |
```
- "최종 갱신: 2026-11-10"은 이미 오늘 날짜이므로 변경 없음.
