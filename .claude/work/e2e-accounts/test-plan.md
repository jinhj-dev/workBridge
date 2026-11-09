# E2E 전용 계정 — 테스트 계획

근거: `docs/02_REQUIREMENTS.md#FR-AUTH-001`, `#FR-AUTH-003`, `docs/04_SCREEN_SPECIFICATIONS/`의 SCR-001·002·009 흐름, design-backend.md / design-frontend.md

## 1. 단위 — `backend/prisma/e2e-account-data.spec.ts` (Vitest)
| ID | 시나리오 | 기대 |
|---|---|---|
| U-E2E-01 | 두 비밀번호가 유효 | accounts 2건, 사번(`900001`/`900002`)·역할·mustChangePassword가 표와 일치, password는 env 값 |
| U-E2E-02 | E2E_ADMIN_PASSWORD 또는 E2E_INITIAL_PASSWORD 누락(각각) | throw, 메시지에 해당 변수명 |
| U-E2E-03 | 7자 / 영문 없음 / 숫자 없음 / 73바이트 | throw |
| U-E2E-04 | 경계: 8자 영숫자, 정확히 72바이트 | 통과 |
| U-E2E-05 | NODE_ENV=production | 비밀번호가 유효해도 throw |
- 회귀: 기존 `backend/prisma/initial-data.spec.ts`가 수정 없이 통과(assertValidPassword 추출 후 메시지 동일)

## 2. 통합 — `backend/test/db/e2e-accounts.e2e-spec.ts` (workbridge_test)
사번은 `uniqueSuffix`로 만든 값을 config에 넣는다. 성공 케이스용 "다른 활성 ADMIN"은 테스트가 만들고 afterAll에서 생성한 사용자·refresh token을 모두 삭제(seed.e2e-spec의 "활성 ADMIN 없음" 전제 유지).
| ID | 시나리오 | 기대 |
|---|---|---|
| I-E2E-01 | 다른 활성 ADMIN 없음 | throw, users 행 생성 0 |
| I-E2E-02 | 최초 실행 | 2건 created, role·mustChangePassword·isActive·approvalRequired·departmentId 기대값, bcrypt.compare(env 비밀번호) true |
| I-E2E-03 | 재실행(멱등) | 2건 updated, 사용자 행 수 불변 |
| I-E2E-04 | 상태가 바뀐 뒤 재실행: initial 계정을 비밀번호 변경·mustChangePassword=false로, admin을 isActive=false·EMPLOYEE로 바꿔 둠 | 모두 기대값으로 복구, 원래 비밀번호로 compare true |
| I-E2E-05 | 두 계정의 refresh_tokens(유효·폐기 각 1건) 존재 후 실행 | 해당 계정 토큰 0건, 다른 사용자 토큰은 그대로 |
| I-E2E-06 | 같은 사번의 일반 사용자(이름 다름) 존재 | throw, 그 사용자와 다른 E2E 계정 모두 변경 없음(트랜잭션) |

## 3. Playwright — spec 수정 (tester)
공통: `00001`·`EMP_ID` 상수 제거, `e2e/accounts.ts`의 `E2E_ADMIN` / `E2E_INITIAL_USER` 사용. skip 조건은 쓰는 계정의 비밀번호 환경변수.

- `login.spec.ts` (E2E_ADMIN)
  - 잘못된 비밀번호 / 숫자 아닌 사번 / 반응형: 기존 그대로
  - shouldKeepSessionAfterReloadWithRefreshCookie: mustChangePassword 분기 제거, `/dashboard`·대시보드 제목 고정 기대. 로그인 응답 `mustChangePassword === false` 단언
- `dashboard.spec.ts` (E2E_ADMIN): 로그인 후 4건 기존 검증 유지, 계정만 교체. 단언 메시지에서 "開発 DB の管理者" 문구를 E2E 계정 기준으로 수정
- `password.spec.ts` (E2E_INITIAL_USER)
  - P-PW-01 비로그인 → `/login?redirect=%2Fpassword` (기존)
  - P-PW-02 로그인 → `/password`, 안내문·로그아웃 표시·취소 없음, 재방문 유지, 확인 불일치 시 API 미호출(기존 검증 유지. route 차단은 이 단계에서만)
  - P-PW-03 신규: 실제 변경 성공. 새 비밀번호는 실행 시 생성(예: `crypto.randomUUID()` 기반 + 영문·숫자 보장, 코드에 고정값 금지) → 성공 토스트 + `/dashboard` 이동 → 로그아웃 → 새 비밀번호로 로그인 시 `/dashboard`(mustChangePassword=false) → 옛 비밀번호로 로그인 시 오류 문구
  - 파일 상단의 "開発 DB の管理者のパスワードは変えてはいけない" 주석은 "globalSetup が毎回初期化する" 취지로 교체
- 반복성 확인: `npx playwright test`를 **연속 2회** 실행해 둘 다 통과(globalSetup이 password.spec 변경을 복구하는지)
- 환경변수 미설정 시: 로그인 필요 테스트는 skip, globalSetup은 건너뜀, 비로그인 테스트는 통과

## 4. 실행 명령
- backend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run db:migrate:test` → `npm run test:e2e`
- 스크립트 수동: `npm run db:e2e-accounts` 2회(두 번째도 성공)
- frontend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `E2E_ADMIN_PASSWORD=… E2E_INITIAL_PASSWORD=… npx playwright test` ×2
- 루트 `npm run format:check`
