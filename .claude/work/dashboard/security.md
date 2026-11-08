SECURITY: PASS

# 대시보드 — 보안 점검 (Round 1)

대상: backend.md·frontend.md 파일 목록(Role Guard, attendance·leaves·dashboard 모듈, 공통 pagination·mapper·time), frontend 셸·라우트 가드·useApiQuery·LeaveDetailModal·LoginForm·safeRedirect(Fix 1 반영본), 연관 기존 모듈(JwtAuthGuard·PasswordChangeGuard·AuthService.authenticateAccessToken·AllExceptionsFilter·validation pipe·apiFetch)

## 이슈

치명 0 / 높음 0 / 중간 0 / 낮음 3

- [낮음] [담당: backend] backend/src/modules/leaves/leaves.service.ts:88-97, leaves.repository.ts:100-103 — 권한 판정(조회 시점)과 조건부 UPDATE 사이 TOCTOU. UPDATE의 WHERE가 `id AND status = PENDING`뿐이라 판정 이후 `approver_id`가 바뀌어도 처리된다 / 현재 approver_id를 바꾸는 API가 없어 악용 경로 없음(향후 신청 수정·승인자 변경 기능이 생기면 이전 승인자가 처리 가능) / 그런 기능을 추가할 때 비ADMIN 처리는 WHERE에 `approverId = me`, 공통으로 `userId <> me`를 포함하는 방식 검토
- [낮음] [담당: backend] backend/src/common/pagination/pagination.ts:8 — `page` 상한 없음. `page=9000000000000000` 같은 값이면 skip이 안전 정수 범위를 넘거나 거대한 OFFSET이 되어 Prisma/DB 오류(500) 또는 불필요한 스캔 / 인증 사용자만 호출 가능하고 응답에 내부 정보는 노출되지 않음(필터가 숨김) — 영향 미미 / `page`에 합리적 상한(예: 10000)을 두거나 `(page-1)*limit`이 안전 정수인지 검사
- [낮음] [담당: backend] backend/src/modules/leaves/leaves.service.ts:64-68 — 존재 확인 후 권한 확인이라 404/403으로 휴가 ID 존재 여부가 구분된다 / ID가 UUID라 추측 불가, 06 계약(존재 → 권한 순)대로라 실질 악용 경로 없음 / 조치 불필요(기록만)

## 확인 결과 (문제 없음)

- 인증·인가
  - 신규 9개 API 모두 `@Public()` 없음 → 전역 JwtAuthGuard 적용. `@AllowPasswordChangeRequired()` 추가 없음 → mustChangePassword 사용자는 403 PASSWORD_CHANGE_REQUIRED
  - JwtAuthGuard: 인증(HS256 알고리즘 고정, sub UUID 검증, 매 요청 DB에서 활성·role 재조회) → PasswordChangeGuard → AdminGuard 순서 고정. role은 토큰이 아니라 DB 값이라 권한 강등이 즉시 반영
  - AdminGuard: 메타데이터 방식(경로 문자열 비교 없음 → `/ADMIN/...` 대소문자 우회 불가), user 없으면 401 fail-closed. `/admin/*` 컨트롤러는 AdminDashboardController 하나이며 클래스에 `@AdminOnly()` 부여
  - attendance·balance: 대상 사용자는 항상 `@CurrentUser().id`, 요청에서 userId를 받지 않음 → IDOR 불가
  - 휴가 상세: `canViewLeave`(신청자·할당 승인자·ADMIN), 승인·반려: `canProcessLeave`(본인 신청 금지 — ADMIN 포함, 할당 승인자 또는 ADMIN). Service에서 판정하며 프론트 표시와 무관
  - pending-approval `scope=all`은 비ADMIN 403(Service), `mine`은 `approverId = me`로 강제
  - 승인·반려·퇴근은 조건부 UPDATE + 0건 409, 출근은 UNIQUE 위반(P2002) → 409로 이중 처리 방지
- 입력 검증·인젝션
  - 전역 StandardSchemaValidationPipe로 `@Query({schema})`·`@Body({schema})` 적용(zod가 미정의 키 제거). year 2000~2100 정수, scope enum, limit 1~100, rejectReason trim 1~500
  - `:id`는 UUID 검증 후 조회(비UUID → 404, DB 오류 500 없음). 모든 DB 접근은 Prisma 파라미터 바인딩, raw SQL 없음
- 민감정보 노출
  - user 관계는 `USER_SUMMARY_SELECT`(id·name·empId·department.name)만 select → password_hash 등 미포함. Attendance도 동일 select 사용
  - 5xx는 AllExceptionsFilter가 내용 숨김(스택은 서버 로그만). 신규 코드에 로그 출력·하드코딩된 비밀값 없음
- CSRF·CORS
  - 신규 API는 Bearer 헤더 인증이라 CSRF 대상 아님. Refresh 쿠키(path `/api/v1/auth`)·CORS 설정 변경 없음
- 프론트엔드
  - `safeRedirect`(Fix 1): `/` 시작 + 제어 문자 거부 + `new URL` 파싱 후 origin 일치 + `/login` pathname 차단 + 정규화 값 재구성. `//`, `/\`, `\/`, `/\t/`, 스킴 URL 모두 차단됨을 코드로 확인 → 오픈 리다이렉트 해소
  - XSS: `dangerouslySetInnerHTML`·innerHTML 없음, 사용자 입력(reason·rejectReason·이름)은 React 텍스트 노드로 출력. 동적 href 없음(Link는 상수 경로)
  - Access Token은 메모리 보관 유지(localStorage·sessionStorage 사용 없음)
  - 라우트 가드(AppShell)·ADMIN 요약 숨김은 UX 목적이며 실제 보호는 서버 Guard가 담당 — 우회해도 데이터 접근 불가
- 의존성: backend·frontend `package.json` 변경 없음(신규 패키지 없음)
