SECURITY: PASS

# 보안 점검 결과 (attendance) — Round 2 (프론트 보완)

심각도별 개수: 치명 0 / 높음 0 / 중간 0 / 낮음 4 (백엔드 2 + 이번 프론트·테스트 2)

## 이번에 읽은 범위
- frontend/src/components/layout/AppShell.tsx
- frontend/src/app/(app)/admin/attendance/AdminAttendanceView.tsx, AttendanceEditModal.tsx
- frontend/src/app/(app)/attendance/AttendanceHistoryView.tsx
- frontend/src/lib/date-range.ts, useSyncedState.ts, auth/redirect.ts
- frontend/e2e/*.ts, backend/test/**/*.e2e-spec.ts (비밀값 grep + 해당 파일 확인)

## 확인 결과 (문제 없음)
- AppShell /admin 가드: 비ADMIN 이면 isForbidden 동안 자식을 렌더링하지 않고(스피너만) /dashboard 로 이동한다. 관리자 API 호출이 발생하지 않는다. 비밀번호 변경 필요 상태(mustChangePassword)도 우선 처리된다. 이 가드는 UX 용이며 실제 인가는 서버(백엔드 점검에서 확인 완료)가 담당하는 구조라 문제 없다.
- 로그인 redirect: encodeURIComponent 로 인코딩하고, 로그인 후에는 safeRedirect 가 동일 오리저널 내부 경로만 허용한다(//, /\, 제어문자, 외부 origin 거부). 오픈 리다이렉트 경로 없음.
- URL Query 파싱(date-range.ts): 날짜는 형식과 실존 날짜를 검증하고, page 는 안전한 정수만, departmentId 는 UUID 정규식, status 는 허용 목록, name 은 trim 후 100자 제한이다. 불정 값은 기본값으로 대체된다. 요청 URL 은 URLSearchParams 로 조립하므로 인젝션 경로 없음. 서버에서도 재검증된다(백엔드 점검 결과).
- XSS: dangerouslySetInnerHTML / innerHTML 사용 없음. item.user.name, departmentName 등은 모두 React 텍스트 노드로 출력된다. Link href 는 `/admin/users/${user.id}` 이며 서버가 발급한 UUID 라 사용자 입력이 끼어들지 않는다.
- 토큰 저장: Access Token 은 메모리 보관(client.ts 주석), localStorage/sessionStorage 사용 없음.
- 수정 모달: 이중 전송을 ref 로 방지하고, 403/404/INVALID_TIME_RANGE 를 구분해 처리한다. 에러 문구는 서버가 내려준 message 를 텍스트로만 표시한다.
- useSyncedState: 보안 관련 동작 없음(상태 동기화만).
- E2E 비밀값: frontend/e2e 는 비밀번호를 process.env.E2E_ADMIN_PASSWORD / E2E_INITIAL_PASSWORD 에서 읽으며 하드코딩 없음. attendance.spec.ts 의 새 비밀번호는 randomUUID 로 생성한다. backend/test/*.e2e-spec.ts 직하(admin-attendance, departments 등)는 JWT 서명기(createTokenSigner)를 쓰고 평문 비밀번호 리터럴이 없다.

## 이슈 (모두 낮음, 권고)
1. [낮음] [담당: backend] backend/src/modules/attendance/attendance.repository.ts:84 — name 검색의 LIKE 와일드카드(%, _)가 이스케이프되지 않음. 악용 시나리오: 관리자가 `%` 로 전체 검색하는 정도이며 관리자 전용 + 파라미터 바인딩이라 인젝션은 아님. 수정 방향: %/_/\ 를 이스케이프(직전 점검에서 지적, 변동 없음).
2. [낮음] [담당: backend] 관리자 수정(PATCH /admin/attendance/:id) — 수정 잠금(동시 수정 보호)과 변경 감사 이력이 없음. 악용 시나리오: 관리자 계정이 탈취·오남용되어도 누가 무엇을 바꿨는지 추적 불가. 수정 방향: 수정자·수정 전후 값을 이력 테이블/로그에 남기는 것을 후속 과제로 검토(직전 점검에서 지적, 변동 없음).
3. [낮음] [담당: backend] backend/test/db/seed.e2e-spec.ts:14, backend/test/db/e2e-accounts.e2e-spec.ts:16-17, backend/test/auth.e2e-spec.ts:30,709 — 테스트용 비밀번호 리터럴(Seed1234pass, E2eAdmin1234, E2eInitial5678 등)이 코드에 있음. 악용 시나리오: 같은 값을 개발·운영 환경의 E2E 계정에 실제로 쓰면 저장소를 본 사람이 로그인 가능. 현재는 workbridge_test DB 안에서 만들고 지우는 값이라 악용 경로는 확인되지 않음. 수정 방향: 운영/공유 환경 계정에 이 값을 쓰지 말 것을 확인하고, 신경 쓰이면 randomUUID 기반으로 생성.
4. [낮음] [담당: frontend] frontend/src/components/layout/AppShell.tsx:28-33 — /admin 가드가 클라이언트 측 뿐임. 악용 시나리오: JS 를 조작해도 서버가 ADMIN 권한을 검사하므로 데이터 접근은 불가(화면 껍데기만 보임). 수정 방향: 현상 유지 가능. 서버 인가가 유지되는 한 조치 불필요.

## 참고
- Write 는 거부되지 않고 정상 수행됨.
- 의존성은 이번 범위에서 새로 확인하지 않음(프론트 변경에 신규 패키지 없음으로 판단, package.json 은 열람하지 않음).
