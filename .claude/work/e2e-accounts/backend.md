# E2E 전용 계정 — 백엔드 구현 결과

## 생성·수정 파일
- 신규 `backend/prisma/e2e-account-data.ts` — `E2E_ACCOUNTS`(admin 900001 / initial 900002, 각 비밀번호 환경변수명 포함), `parseE2eAccountConfig(env)`, `resetE2eAccounts(prisma, config)`, 타입 `E2eAccountSpec` / `E2eAccountConfig` / `E2eResetResult`
- 신규 `backend/prisma/e2e-accounts.ts` — 실행 진입점(seed.ts와 같은 형태, 개발 DB 전용 주석, 비밀번호·해시 미출력)
- 수정 `backend/prisma/initial-data.ts` — `assertValidPassword(envName, value)` 추출, parseSeedConfig가 호출(메시지 문자열은 기존과 동일)
- 수정 `backend/package.json` — `"db:e2e-accounts": "tsx prisma/e2e-accounts.ts"`
- 수정 `backend/.env.example` — `E2E_ADMIN_PASSWORD=`, `E2E_INITIAL_PASSWORD=`(빈 값) + 주석
- 테스트 파일(`e2e-account-data.spec.ts`, `test/db/e2e-accounts.e2e-spec.ts`)은 tester 담당이라 만들지 않음

## 동작 요약 (HTTP API 변경 없음)
- `parseE2eAccountConfig`: `NODE_ENV=production`이면 「本番環境では E2E アカウントを作成できません。」. 두 비밀번호 필수, 검증 순서 admin → initial. 메시지는 seed와 같은 형식(`環境変数 E2E_ADMIN_PASSWORD が設定されていません。…` / `… は 8 文字以上で、英字と数字を含めてください。` / `… は 72 バイト以下にしてください。`)
- `resetE2eAccounts`: bcrypt 해시를 트랜잭션 밖에서 계산 → `$transaction`(interactive) 안에서 (a) 사번 충돌(이름 불일치) 시 throw 「社員番号 X のユーザーは E2E アカウントではないため変更しません。」 (b) 대상 사번 제외 활성 ADMIN 0명이면 throw 「先に npm run db:seed で初期 ADMIN を登録してください。」 (c) upsert(name, passwordHash, role, approvalRequired=false, isActive=true, mustChangePassword, departmentId=null) (d) 해당 사용자 refresh_tokens deleteMany
- 반환: `{ accounts: [{ empId, status: 'created' | 'updated' }] }` (config.accounts 순서). 'updated' 판정은 트랜잭션 내 사전 조회 결과 기준
- 진입점 로그: 「E2E アカウント(900001)を作成しました。」/「…を初期化しました。」. 실패 시 「E2E アカウントの作成に失敗しました: <message>」 + exitCode 1

## 검증
- `npx tsc --noEmit`, `npm run lint`, `npm test`(140 passed, initial-data.spec.ts 포함) 통과
- 테스트 DB(`workbridge_test`)에서 scratchpad 스크립트로 확인 후 정리(잔여 데이터 0): 최초 created / 재실행 updated / 재실행 시 mustChangePassword·isActive 복원, 새 비밀번호 bcrypt.compare 일치, refresh_tokens 0건, id 유지 / 이름 다른 사번 충돌 시 throw + 다른 계정 해시 미변경(롤백) / 활성 ADMIN 없음 시 선행조건 에러
- 진입점을 테스트 DB 대상으로 실행: 선행조건 에러, production 차단, 비밀번호 누락 에러 모두 exitCode 1 확인(데이터 변경 없음). 개발 DB는 건드리지 않음

## API 문서와 다른 점
- 없음(HTTP API 변경 없음)

## 문서 갱신 예정
- `docs/08_TEST_PLAN.md` §3 테스트 환경과 데이터 — 「Playwright용 E2E 계정은 개발 DB에 `npm run db:seed` 후 `npm run db:e2e-accounts`로 생성/초기화한다. 900001 E2E管理者(ADMIN, 변경 불필요, `E2E_ADMIN_PASSWORD`) / 900002 E2E初回ログイン(EMPLOYEE, 초기 비밀번호 변경 필요, `E2E_INITIAL_PASSWORD`). 실행할 때마다 비밀번호·플래그를 되돌리고 Refresh Token을 삭제한다. 운영(NODE_ENV=production)에서는 실행 불가. 테스트 DB 시드와는 별개」 (DOC_ISSUES 설계안대로)
- `docs/10_DEVELOPMENT_ROADMAP.md` (Fix B-1, test-report.md 기준 Playwright 15건 통과)
  - 149행 "화면 테스트" 항목 — SCR-009 `Playwright 2건` → `Playwright 3건` (SCR-001 7 + SCR-009 3 + SCR-002 5 = 합계 15건, 기존 14건에서 +1)
  - 변경 이력 표 끝에 행 추가: `| 2026-11-09 | E2E 전용 계정 900001(ADMIN)/900002(최초 로그인 EMPLOYEE) 도입, `npm run db:e2e-accounts`를 Playwright globalSetup이 자동 실행해 매 실행 초기화(Playwright 15건 연속 2회 통과). 기존 "개발 DB 관리자 비밀번호 불일치"(14건 중 Run 2 미통과) 환경 문제 해소 |`
- `.claude/work/context.md` 명령어 — backend `npm run db:e2e-accounts`(개발 DB 전용, seed 후 실행) 추가

## 프론트엔드가 알아야 할 것
- Playwright 실행 전 개발 DB에 `npm run db:e2e-accounts` 실행 필요. 같은 `E2E_ADMIN_PASSWORD`, `E2E_INITIAL_PASSWORD` 값을 Playwright 환경변수로 넘긴다
- 900002는 스크립트 실행 시마다 mustChangePassword=true로 되돌아가므로, 비밀번호 변경 테스트는 실행 전 스크립트 재실행 전제
- 00001(초기 ADMIN)은 스크립트가 건드리지 않음

## context.md 정정
- 없음

## Fix C-1 (security.md 중간 이슈: DB 접속처 제한)
- 사전 확인: `backend/.env.example` DATABASE_URL 호스트 `localhost`, `docker-compose.yml` 포트 `127.0.0.1:5432:5432` → 조건 만족(중단 불필요)
- 수정 `backend/prisma/e2e-account-data.ts` — `assertLocalDatabaseUrl(databaseUrl)` 추가. URL 호스트가 localhost / 127.0.0.1 / `[::1]`(URL 파서상 표기) 이외이거나 URL 파싱 불가면 throw(일본어). 메시지에 접속 문자열(비밀번호)은 포함하지 않음. 호스트는 정확 일치 비교(`localhost.evil.com` 거부)
- 수정 `backend/prisma/e2e-accounts.ts` — DATABASE_URL 존재 확인 직후, `parseE2eAccountConfig`·DB 접속 이전에 호출(차단 시 DB 변경 없음, exitCode 1)
- `parseE2eAccountConfig`는 변경하지 않음(기존 spec이 DATABASE_URL 없이 호출하므로 호환 유지). 테스트는 tester 담당이라 미수정 — `assertLocalDatabaseUrl` 단위 테스트 추가 필요
- 검증: `tsc --noEmit`, `npm run lint` 통과. scratchpad 스크립트로 localhost/127.0.0.1/[::1] 허용, 외부 호스트·localhost.evil.com·불정형 문자열 거부 확인(삭제함)
- 문서 갱신 예정: `docs/08_TEST_PLAN.md` §3 E2E 계정 설명에 「NODE_ENV=production 및 DATABASE_URL 호스트가 localhost/127.0.0.1/::1 이외이면 실행 불가」 추가

## Fix (prettier)
- `backend/prisma/e2e-accounts.ts` に prettier --write を適用(フォーマットのみ、ロジック変更なし)。`npm run format:check` と `npm run lint` 通過を確認。
