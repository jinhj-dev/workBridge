SECURITY: PASS

# E2E 전용 계정 — 보안 점검

## 점검 범위
- backend/prisma/e2e-account-data.ts, e2e-accounts.ts, initial-data.ts(assertValidPassword), package.json, .env.example
- frontend/e2e/accounts.ts, global-setup.ts, playwright.config.ts, 기존 spec 3개
- .github/workflows/ci.yml

## 이슈 (치명 0 / 높음 0 / 중간 1 / 낮음 2)

[중간] [담당: backend] backend/prisma/e2e-account-data.ts:53 — 운영 차단이 NODE_ENV=production 하나뿐이다. 알려진 사번(900001)의 ADMIN 계정이 만들어지는 스크립트인데, NODE_ENV가 미설정인 셸에서 DATABASE_URL이 공유·스테이징·운영 DB를 가리키면 그대로 실행된다. 악용 시나리오: 사번 900001은 공개된 값이라, 8자만 넘는 약한 E2E_ADMIN_PASSWORD로 실행한 DB에 추측 가능한 ADMIN 계정이 남는다. 수정 방향: DATABASE_URL의 호스트가 localhost 계열인지 확인해 아니면 중단한다. 또는 명시적 허용 변수를 요구한다. (Round 2에서 해소)

[낮음] [담당: backend] backend/prisma/e2e-account-data.ts:94 — E2E 계정 판별이 이름 일치뿐이다. 이름은 관리자가 바꿀 수 있어, 실제 사용자 사번이 900001/900002이고 이름이 'E2E管理者'이면 비밀번호와 role이 덮어써진다. 악용 경로는 좁다. 수정 방향: 권고만. DB 호스트 가드로 충분하다.

[낮음] [담당: frontend] frontend/e2e/global-setup.ts:20 — `env: process.env` 전체를 자식 프로세스로 넘긴다. 현재 CI는 E2E를 실행하지 않아 악용 경로는 없다. 수정 방향: 나중에 CI에 E2E를 추가할 때 필요한 변수만 넘기고, 비밀번호는 GitHub Secrets로 주입한다.

## 확인한 항목 (문제 없음)
- 비밀번호: bcrypt cost 12(BCRYPT_COST 재사용), 해시는 트랜잭션 밖에서 계산한다. 규칙(8자 이상, 영문+숫자, 72바이트 이하)은 assertValidPassword로 검증한다.
- 하드코딩·노출: 코드·.env.example·ci.yml에 비밀번호가 없다. 로그와 에러 메시지에 비밀번호·해시가 없다.
- 세션 무효화: 초기화 시 두 계정의 refresh_tokens를 삭제한다. 같은 트랜잭션 안에서 처리한다.
- 인젝션: Prisma 파라미터 바인딩만 사용하고 raw SQL이 없다. execSync의 명령은 고정 문자열이다.
- 롤백: 사번 충돌·ADMIN 선행조건 검사는 변경 전에 throw하고, 트랜잭션 하나로 묶어 부분 적용을 막는다.
- PLAYWRIGHT_BASE_URL 지정 시 자동 초기화를 건너뛴다.
- 의존성: 신규 패키지 추가 없음.
- API·인증 흐름 변경 없음.

---

# Round 2 (재점검: Fix C-1 assertLocalDatabaseUrl)

SECURITY: PASS (Round 1 중간 이슈 해소)

## 대상
- backend/prisma/e2e-account-data.ts (assertLocalDatabaseUrl), backend/prisma/e2e-accounts.ts, backend/prisma/e2e-account-data.spec.ts

## Round 1 이슈 처리 결과
- [중간] DB 접속처 제한 — 해소. e2e-accounts.ts:16에서 DATABASE_URL 존재 확인 직후, 설정 파싱과 DB 접속 이전에 호출한다. 호스트를 `new URL().hostname`으로 추출해 localhost / 127.0.0.1 / [::1]와 정확 일치로 비교하므로 `localhost.evil.com`, `127.0.0.1.evil.com`은 거부된다. 파싱 실패는 fail-closed로 거부한다. 에러 메시지에 접속 문자열(비밀번호)을 넣지 않으며, spec이 이를 2건으로 검증한다.
- [낮음] 이름 일치 판별 — 변경 없음. 권고 유지(호스트 가드로 노출 범위가 줄었다).
- [낮음] globalSetup의 env 전달 — 이번 대상 아님. 변경 없음.

## 신규 이슈 (치명 0 / 높음 0 / 중간 0 / 낮음 1)

[낮음] [담당: backend] backend/prisma/e2e-account-data.ts:58 — 호스트 검사가 URL의 authority 부분만 본다. 실제 접속은 `pg-connection-string`이 파싱하며, 쿼리 파라미터 `?host=원격호스트`가 authority의 호스트를 덮어쓸 수 있다. 악용 시나리오: DATABASE_URL이 `postgresql://u:p@localhost/db?host=prod.example.com` 형태이면 가드를 통과해 원격 DB에 접속한다. 다만 DATABASE_URL은 실행자 본인이 설정하는 .env 값이라 공격자가 끼어들 경로가 없고, 오설정을 막는 가드의 한계에 해당한다. 수정 방향: `new URL(...).searchParams`에 `host` / `hostaddr`가 있으면 거부한다. 해당 URL 케이스를 spec에 추가한다.

## 비보안 메모 (참고)
- e2e-accounts.ts:7의 import 한 줄이 100자를 넘는다. prettier 위반일 수 있으니 format:check 확인이 필요하다.
