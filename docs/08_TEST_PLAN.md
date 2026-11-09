# 08. Test Plan

> 업무 규칙의 기준은 02_REQUIREMENTS.md, 화면 동작은 04_SCREEN_SPECIFICATIONS, API 계약은 06_API_SPECIFICATION.md이다. 이 문서는 그 기준이 실제로 지켜지는지 검증하는 방법과 케이스를 정의한다.

## 1. 목적과 범위

- 목적: PRD 성공 기준(01_PRD §7)의 "주요 기능에 대한 자동화 테스트가 존재한다"를 충족하고, 업무 규칙(잔여 연차, 날짜 중복, 승인 권한, 퇴근 누락 등)의 회귀를 막는다.
- 범위: 백엔드 API, 업무 규칙(Service), 프론트엔드 주요 화면 흐름, 권한 매트릭스.
- 범위 밖: 성능 부하 테스트(NFR-002는 수동 측정으로 갈음), 공휴일 처리(범위 밖으로 결정됨), 모바일 네이티브.

## 2. 테스트 수준

| 수준 | 대상 | 도구(권장) | 비율 목표 |
|---|---|---|---|
| 단위 테스트 | 업무 규칙 함수(일수 계산, 잔여 연차, 상태 전이, 시간 검증) | Vitest | 업무 규칙 전체 |
| 통합 테스트 | Controller + Service + Prisma + PostgreSQL 실제 DB | Vitest + Supertest, 테스트용 DB | 모든 API 엔드포인트 |
| 권한 테스트 | 역할·승인자·신청자별 접근 매트릭스 | 통합 테스트에 포함 | §5 매트릭스 전체 |
| 컴포넌트·흐름 테스트 | 주요 화면의 폼 검증, 상태(Loading/Empty/Error), 라우트 가드 | Testing Library (React) | SCR-001~009 주요 흐름 |
| E2E 테스트 | 핵심 사용자 여정 5개(§6) | Playwright | 여정 5개 |

테스트 DB는 PostgreSQL을 사용한다(Docker Compose). SQLite 등 다른 DB로 대체하지 않는다. 동시성 규칙(NFR-004)은 실제 PostgreSQL에서만 검증할 수 있다.

## 3. 테스트 환경과 데이터

- 환경: 로컬은 Docker Compose의 postgres(앱은 호스트에서 실행), CI(GitHub Actions)는 postgres 서비스 컨테이너로 실행
- 시간 고정: 근무일·주말·시작일 판정은 테스트 시간을 고정(예: `2026-11-09` 월요일 09:00 JST)하여 실행한다. 시계는 주입 가능한 Clock으로 분리한다.
- 시드 데이터(테스트 전용):

| 식별자 | 역할 | approvalRequired | 상태 | 비고 |
|---|---|---|---|---|
| admin1 | ADMIN | false | 활성 | 기본 관리자, 연차 15일 |
| admin2 | ADMIN | true | 활성 | 대리 처리·전체 조회 검증용 |
| emp1 | EMPLOYEE | true | 활성 | 승인 필요 사용자 |
| emp2 | EMPLOYEE | true | 활성 | emp1의 승인자 후보 |
| emp3 | EMPLOYEE | false | 활성 | 즉시 승인 사용자 |
| emp4 | EMPLOYEE | true | 비활성 | 로그인 차단 검증 |
| emp5 | EMPLOYEE | true | 활성, must_change_password = true | 최초 로그인 검증 |

- 각 테스트는 독립된 트랜잭션 또는 테이블 초기화로 격리한다.
- Playwright용 E2E 계정(개발 DB, 위 테스트 DB 시드와는 별개): 개발 DB에 `npm run db:seed` 후 `npm run db:e2e-accounts`(backend)로 생성/초기화한다. Playwright 실행 시 globalSetup이 자동으로 실행한다.

| 사원번호 | 이름 | 역할 | must_change_password | 비밀번호 환경변수 |
|---|---|---|---|---|
| 900001 | E2E管理者 | ADMIN | false | `E2E_ADMIN_PASSWORD` |
| 900002 | E2E初回ログイン | EMPLOYEE | true | `E2E_INITIAL_PASSWORD` |

- 실행할 때마다 비밀번호·플래그를 되돌리고 해당 사용자의 Refresh Token을 삭제한다. NODE_ENV=production이거나 DATABASE_URL 호스트가 localhost / 127.0.0.1 / ::1 이외이면 실행 불가.

## 4. 업무 규칙 단위 테스트 (02_REQUIREMENTS 기준)

| TC ID | 요구사항 | 입력 | 기대 결과 |
|---|---|---|---|
| UT-LV-01 | FR-LEAVE-001 일수 계산 | 월~금 (2026-11-09~13) ANNUAL | days = 5 |
| UT-LV-02 | FR-LEAVE-001 주말 제외 | 금~월 (2026-11-13~16) | days = 2 |
| UT-LV-03 | FR-LEAVE-001 반차 | HALF_AM, 시작 = 종료 = 평일 | days = 0.5 |
| UT-LV-04 | FR-LEAVE-001 반차 기간 | HALF_PM, 시작 ≠ 종료 | INVALID_DATE_RANGE |
| UT-LV-05 | FR-LEAVE-001 주말만 | 토~일 ANNUAL | NO_WORKING_DAYS |
| UT-LV-06 | FR-LEAVE-001 차감 대상 | SPECIAL, OTHER 각 5일 | 잔여 연차 변화 없음 |
| UT-LV-07 | FR-LEAVE-001 잔여 계산 | 부여 15, APPROVED 3, PENDING 2 | remainingDays = 10 |
| UT-LV-08 | FR-LEAVE-001 잔여 계산 | 부여 미등록 | grantedDays = 0 |
| UT-LV-09 | FR-LEAVE-001 잔여 계산 | REJECTED·CANCELLED 포함 | 차감에서 제외 |
| UT-LV-10 | FR-LEAVE-006 0.5 단위 | granted_days = 15.3 | 저장 거부 |
| UT-AUTH-01 | FR-AUTH-003 비밀번호 규칙 | "abcdefgh"(숫자 없음), "abc1234"(7자), 73바이트 문자열 | PASSWORD_POLICY_VIOLATION |
| UT-LV-12 | FR-LEAVE-002 상태 전이 | PENDING → APPROVED, PENDING → REJECTED | 허용 |
| UT-LV-13 | FR-LEAVE-002 상태 전이 | APPROVED → REJECTED 등 종료 상태 간 전이 | ALREADY_PROCESSED |
| UT-ATT-01 | FR-ATT-002 시간 검증 | clock_out ≤ clock_in | 거부 |
| UT-ATT-02 | FR-ATT-005 근무일 판정 | Asia/Tokyo 기준 자정 직전·직후 출근 | 같은 근무일 규칙 적용 |

## 5. 통합 테스트 (API 계약 및 업무 흐름)

### 5.1 인증·계정 (FR-AUTH, FR-USER)

| TC ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-AUTH-01 | 올바른 사원번호·비밀번호로 로그인 | 200, accessToken, Refresh 쿠키(httpOnly) |
| IT-AUTH-02 | 잘못된 비밀번호 | 401 INVALID_CREDENTIALS. 사원번호 존재 여부를 드러내지 않음 |
| IT-AUTH-03 | 비활성 계정(emp4) 로그인 | 403 ACCOUNT_DISABLED |
| IT-AUTH-04 | emp5 로그인 후 `/leaves` 호출 | 403 PASSWORD_CHANGE_REQUIRED |
| IT-AUTH-05 | emp5가 `PATCH /auth/password` 호출 | 204, 이후 mustChangePassword = false |
| IT-AUTH-06 | 현재 비밀번호와 같은 새 비밀번호 | 400 PASSWORD_POLICY_VIOLATION |
| IT-AUTH-07 | Refresh 후 로그아웃 → 같은 Refresh로 갱신 | 401 UNAUTHORIZED |
| IT-AUTH-08 | 만료된 Access Token으로 보호 API 호출 | 401 UNAUTHORIZED |
| IT-USER-01 | ADMIN이 사원 등록(초기 비밀번호) | 201, isActive = true, mustChangePassword = true |
| IT-USER-02 | 중복 사원번호 등록 | 409 DUPLICATE_EMP_ID |
| IT-USER-03 | 부서 미존재 ID로 등록 | 400 INVALID_DEPARTMENT |
| IT-USER-04 | 마지막 활성 ADMIN 비활성화 | 409 LAST_ADMIN |
| IT-USER-05 | 마지막 활성 ADMIN을 EMPLOYEE로 강등 | 409 LAST_ADMIN |
| IT-USER-06 | 활성 ADMIN이 2명일 때 한 명 비활성화 | 200 |
| IT-USER-07 | 사원 비활성화(emp1에게 PENDING 신청 있음) | 신청자 PENDING 건은 CANCELLED, processed_by = 비활성화한 ADMIN, 그 사원을 승인자로 둔 PENDING 건은 유지 |
| IT-USER-08 | 비활성화 시 발급된 Refresh Token | 모두 무효화되어 갱신 실패 |
| IT-USER-09 | 비활성 사용자를 승인자로 지정 시도 | 400 INVALID_APPROVER |
| IT-USER-10 | 부여 연차 저장(0.5 단위, 음수) | 0.5 단위는 200, 음수는 400 VALIDATION_ERROR |

### 5.2 근태 (FR-ATT)

| TC ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-ATT-01 | 당일 첫 출근 | 201, status = WORKING |
| IT-ATT-02 | 당일 출근 중복 | 409 ALREADY_CLOCKED_IN |
| IT-ATT-03 | 출근 없이 퇴근 | 409 NOT_CLOCKED_IN |
| IT-ATT-04 | 퇴근 후 재퇴근 | 409 ALREADY_CLOCKED_OUT |
| IT-ATT-05 | 전날 퇴근 누락 후 오늘 출근 | 201 허용(FR-ATT-001 개정). 전날 기록은 MISSING_CLOCK_OUT으로 조회 |
| IT-ATT-06 | 전날 퇴근 누락 상태에서 전날 퇴근 직접 등록 시도 | 근무일 불일치로 거부(사용자 직접 수정 불가) |
| IT-ATT-07 | ADMIN이 근태 수정(퇴근 시간 추가) | 200, modified_by·modified_at 저장 |
| IT-ATT-08 | 근태 수정 시 퇴근 ≤ 출근 | 400 INVALID_TIME_RANGE |
| IT-ATT-09 | 일반 사용자가 `PATCH /admin/attendance/:id` | 403 FORBIDDEN |
| IT-ATT-10 | 내 근태 이력 조회 기간 367일 | 400 INVALID_DATE_RANGE |
| IT-ATT-11 | 내 근태 이력에 다른 사용자 ID 지정 | 파라미터 없음. 본인 기록만 반환 |
| IT-ATT-12 | 관리자 전체 조회 상태 필터 MISSING_CLOCK_OUT | 전날 미퇴근 기록만 반환 |

### 5.3 휴가 신청 (FR-LEAVE-001)

| TC ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-LV-01 | emp1(승인 필요)이 승인자 emp2로 연차 신청 | 201, status = PENDING, approver = emp2 |
| IT-LV-02 | emp3(승인 불필요)이 연차 신청 | 201, status = APPROVED, autoApproved = true, approver = null, processed_by = emp3 |
| IT-LV-03 | 승인 필요 사용자가 승인자 미지정 | 400 APPROVER_REQUIRED |
| IT-LV-04 | 승인 불필요 사용자가 승인자를 보냄 | 승인자 무시, 201 |
| IT-LV-05 | 본인을 승인자로 지정 | 400 INVALID_APPROVER |
| IT-LV-06 | 사유 누락 / 501자 | 400 VALIDATION_ERROR |
| IT-LV-07 | 시작일 > 종료일 | 400 INVALID_DATE_RANGE |
| IT-LV-08 | 잔여 연차 15, 신청 16일 | 422 INSUFFICIENT_LEAVE_BALANCE |
| IT-LV-09 | 잔여 연차 초과 신청이 즉시 승인 사용자(emp3)인 경우 | 422 (즉시 승인 건도 차단) |
| IT-LV-10 | SPECIAL 휴가 20일 신청 | 201, 잔여 연차 불변 |
| IT-LV-11 | PENDING과 같은 날짜 재신청 | 409 LEAVE_CONFLICT |
| IT-LV-12 | APPROVED와 같은 날짜 신청 | 409 LEAVE_CONFLICT |
| IT-LV-13 | REJECTED·CANCELLED와 같은 날짜 신청 | 201 허용 |
| IT-LV-14 | 같은 날 HALF_AM과 HALF_PM 각각 신청 | 둘 다 201 |
| IT-LV-15 | 같은 날 연차 신청 후 반차 신청 | 409 LEAVE_CONFLICT |
| IT-LV-16 | 동시에 같은 사용자가 두 요청으로 잔여 연차 한도 소진 | 하나만 201, 하나는 422 (NFR-004, 실제 PostgreSQL) |
| IT-LV-17 | ADMIN이 휴가 신청 | 201 (D7: 신청 가능) |

### 5.4 승인·반려·취소 (FR-LEAVE-002, 004)

| TC ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-APV-01 | 할당된 승인자가 PENDING 승인 | 200, APPROVED, processed_by = 승인자 |
| IT-APV-02 | 할당되지 않은 사용자가 승인 시도 | 403 FORBIDDEN |
| IT-APV-03 | 신청자 본인이 자기 신청 승인 시도(ADMIN 포함) | 403 FORBIDDEN |
| IT-APV-04 | ADMIN이 다른 승인자 건을 대리 승인 | 200, processed_by = admin ≠ approver_id |
| IT-APV-05 | 반려 사유 없이 반려 | 400 VALIDATION_ERROR |
| IT-APV-06 | 반려 사유 포함 반려 | 200, REJECTED, reject_reason 저장 |
| IT-APV-07 | 이미 승인된 건 재승인 | 409 ALREADY_PROCESSED |
| IT-APV-08 | 동시에 두 승인자(또는 승인자와 ADMIN)가 같은 건 처리 | 하나만 성공, 나머지 409 ALREADY_PROCESSED (NFR-004) |
| IT-APV-09 | 즉시 승인 건을 승인 시도 | 409 ALREADY_PROCESSED |
| IT-APV-10 | 승인 대기 목록(scope=mine)에 다른 승인자 건 미포함 | 본인 할당 건만 반환 |
| IT-APV-11 | scope=all을 일반 사용자가 호출 | 403 FORBIDDEN |
| IT-APV-12 | scope=all을 ADMIN이 호출 | 모든 PENDING 반환, 즉시 승인 건 미포함 |
| IT-CAN-01 | 신청자가 PENDING 취소 | 200, CANCELLED, processed_by = 신청자 |
| IT-CAN-02 | 신청자가 시작일이 오늘보다 뒤인 즉시 승인 건 취소 | 200 |
| IT-CAN-02b | 신청자가 시작일이 오늘인 즉시 승인 건 취소 | 409 NOT_CANCELLABLE |
| IT-CAN-03 | 신청자가 시작일 지난 즉시 승인 건 취소 | 409 NOT_CANCELLABLE |
| IT-CAN-04 | 승인된 휴가 취소 | 409 NOT_CANCELLABLE |
| IT-CAN-05 | 다른 사용자가 취소 시도(ADMIN 포함) | 403 FORBIDDEN |
| IT-LV-DET-01 | 휴가 상세: 신청자 / 할당 승인자 / ADMIN | 200 |
| IT-LV-DET-02 | 휴가 상세: 관계없는 사용자 | 403 FORBIDDEN |

### 5.5 관리자 기능 및 대시보드 (FR-DASH-001)

| TC ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-DASH-01 | 일반 사용자가 `/admin/dashboard/summary` | 403 FORBIDDEN |
| IT-DASH-02 | ADMIN의 오늘 현황 집계 | 출근·미출근·휴가 인원, 전체 PENDING 수가 시드 데이터와 일치 |
| IT-DASH-03 | 미출근 집계에서 휴가 중인 사용자 제외 | 제외됨 |

## 6. 권한 매트릭스 테스트

화면 접근(03_SCREEN_LIST)과 API 권한(06)을 함께 검증한다. 각 셀은 HTTP 상태로 확인한다.

| 기능 | 비로그인 | EMPLOYEE(승인자 아님) | 승인자(할당됨) | ADMIN |
|---|---|---|---|---|
| 로그인 | 허용 | 허용 | 허용 | 허용 |
| 본인 근태 조회·출퇴근 | 401 | 허용 | 허용 | 허용 |
| 휴가 신청 | 401 | 허용 | 허용 | 허용 |
| 본인 휴가 이력 | 401 | 허용 | 허용 | 허용 |
| 휴가 상세 (타인 건) | 401 | 403 | 허용 | 허용 |
| 승인 대기 scope=mine | 401 | 허용(빈 목록) | 허용 | 허용 |
| 승인 대기 scope=all | 401 | 403 | 403 | 허용 |
| 승인·반려 (할당 건) | 401 | 403 | 허용 | 허용 |
| 사원 관리 `/admin/users` API | 401 | 403 | 403 | 허용 |
| 전체 근태 조회·수정 | 401 | 403 | 403 | 허용 |
| 오늘 전체 현황 | 401 | 403 | 403 | 허용 |

화면 접근 검증(E2E 또는 라우트 테스트):
- 비로그인이 `/dashboard` 접근 → `/login?redirect=/dashboard`
- EMPLOYEE가 `/admin/users` 접근 → `/dashboard`로 이동 + "접근 권한이 없습니다." 토스트
- mustChangePassword 사용자가 `/leaves` 접근 → `/password`로 이동

## 7. 화면 테스트 (04_SCREEN_SPECIFICATIONS 기준)

| 화면 | 검증 항목 |
|---|---|
| SCR-001 | 빈 값 제출 시 필드 메시지, 로그인 실패 시 비밀번호 필드 초기화, 로그인 후 redirect 파라미터 이동(내부 경로만 허용: 외부 URL 입력 시 무시), 로그인 상태에서 `/login` 접근 시 대시보드 |
| SCR-002 | 출근 버튼은 미출근일 때만, 퇴근은 근무 중일 때만 활성. 승인 대기 최대 5건. ADMIN 영역은 EMPLOYEE에게 렌더링되지 않음. 영역별 독립 실패(한 API 실패 시 나머지 표시) |
| SCR-003 | 시작일 > 종료일 검증, 기본 기간(이번 달), 퇴근 누락 행 강조 |
| SCR-004 | 반차 선택 시 종료일 자동 고정, 주말 제외 일수 미리보기, 즉시 승인 사용자는 승인자 필드 미표시, 잔여 초과 422 메시지, 중복 클릭 방지(요청 중 버튼 비활성), 취소 버튼 노출 조건 |
| SCR-005 | 반려 사유 필수, scope 전환(ADMIN만 노출), 본인 신청 건 버튼 비활성, 409 시 목록 재조회 |
| SCR-006 | 초기 비밀번호 규칙 검증, 중복 사원번호 메시지, 등록 후 목록 갱신 |
| SCR-007 | 활성→비활성 전환 시 확인 모달과 대기 건수 경고, 저장하지 않은 변경 있을 때 목록 이동 확인, 404 안내 |
| SCR-008 | 수정 모달 시간 검증, 기본 정렬(근무일 내림차순, 사원명 오름차순), 페이지 이동 시 검색 조건 유지 |
| SCR-009 | 확인 비밀번호 불일치, 최초 로그인 시 취소 버튼 미표시, 변경 후 대시보드 이동 |
| 공통 | Loading 스켈레톤, Error의 [다시 시도], 401 시 Refresh 1회 재시도, 네트워크 오류 토스트 |

## 8. E2E 핵심 여정

| ID | 여정 | 검증 |
|---|---|---|
| E2E-01 | 직원: 로그인 → 출근 → 퇴근 → 근태 이력에서 확인 | 대시보드 상태 변화, 이력 반영 |
| E2E-02 | 직원: 승인 필요 사용자가 휴가 신청 → 승인자 로그인 → 승인 → 신청자 이력에서 APPROVED 확인 | 상태 전이, 잔여 연차 감소 |
| E2E-03 | 승인 불필요 사용자: 신청 → 즉시 APPROVED, 승인 대기 목록 미표시 | FR-LEAVE-001 즉시 승인 흐름(추가-1) |
| E2E-04 | 관리자: 사원 등록 → 신규 사원 최초 로그인 → 비밀번호 변경 → 대시보드 | 초기 비밀번호 흐름 |
| E2E-05 | 관리자: 사원 비활성화 → 해당 사원 로그인 실패, 신청 건 취소 확인 | D11 계정 비활성화 흐름 |

## 9. 비기능 검증

| 항목 | 방법 | 기준 |
|---|---|---|
| NFR-001 보안 | 비밀번호 DB 저장값이 평문이 아님 확인, Refresh 쿠키 속성(httpOnly, Secure, SameSite) 확인, 보호 API 무인증 접근 차단(§6), 로그에 비밀번호·토큰 미출력 확인 | 전부 통과 |
| NFR-002 성능 | 일반 목록 API를 시드 10,000건 규모에서 호출 시간 측정 | 1초 이내 (목표) |
| NFR-003 유지보수 | 아키텍처 점검: Controller가 Repository를 직접 호출하지 않음 (lint 규칙 또는 코드 리뷰) | 위반 0건 |
| NFR-004 동시성 | IT-LV-16, IT-APV-08 | 중복 처리 0건 |

## 10. 자동화 및 실행 정책

- PR마다 단위·통합 테스트를 실행한다(GitHub Actions). 실패 시 병합 금지.
- E2E는 main 브랜치 병합 전과 배포 전에 실행한다.
- 테스트 코드에 `test.skip`, `.only`, 빈 테스트(본문 없음)를 남기지 않는다. 미구현 케이스는 목록에서 "미구현"으로 표시하고 이슈로 등록한다.
- 시간·난수 의존 테스트는 고정값을 사용한다.

## 11. 완료 기준 (Exit Criteria)

- §4~§8의 케이스가 모두 구현되어 통과한다.
- 02_REQUIREMENTS의 FR·NFR이 최소 1개 이상의 TC와 연결된다(추적성 표 작성).
- 권한 매트릭스 §6의 모든 셀이 검증된다.
- 보류 중인 잠정 정책(02의 "잠정 기준, 확인 필요" 항목)은 확정 후 해당 TC의 기대 결과를 갱신한다.

## 12. 미결 사항

| 항목 | 현재 가정 | 확정 필요 |
|---|---|---|
| 비밀번호 규칙 | 8자 이상, 영문+숫자, 72바이트 이하 (UT-AUTH-01) | 확정됨(8자 이상, 영문+숫자, 72바이트 이하) |
| 근태 조회 최대 기간 | 1년(366일) (IT-ATT-10) | 02 잠정 기준 |
| 즉시 승인 건 취소 가능 기준 | 시작일 > 오늘(Asia/Tokyo) (IT-CAN-02/02b/03) | 확정됨(D9, 경계 정리 완료) |
| 사원 비활성화 시 승인 대기 처리 | 대리 처리 유지(IT-USER-07) | 확정됨(D11-2) |

> 추적성 표(요구사항 ID ↔ TC ID)는 구현 단계에서 자동 생성 스크립트로 관리한다. 이 문서에는 대표 케이스만 기록한다.
