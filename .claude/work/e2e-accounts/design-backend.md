# E2E 전용 계정 — 백엔드 설계

## 참조 문서
- `docs/02_REQUIREMENTS.md#FR-AUTH-003: 비밀번호 변경` — 비밀번호 규칙(8자 이상, 영문+숫자, 72바이트 이하)
- `docs/05_DATABASE_DESIGN.md` §1(PK는 Prisma가 생성), users·refresh_tokens 정의
- `docs/08_TEST_PLAN.md#3. 테스트 환경과 데이터` — 테스트 DB 시드와 별개임(DOC_ISSUES)
- 참고 코드: `backend/prisma/seed.ts`, `backend/prisma/initial-data.ts`(parseSeedConfig 형식), `backend/prisma/initial-data.spec.ts`, `backend/test/db/seed.e2e-spec.ts`, `backend/test/db/db-helpers.ts`

## 데이터 모델
- 스키마·마이그레이션 변경 없음. 기존 `users`, `refresh_tokens`만 사용
- E2E 계정은 별도 플래그 컬럼 없이 **사번 + 이름**으로 식별한다

| 키 | empId | name | role | mustChangePassword | 비밀번호 환경변수 |
|---|---|---|---|---|---|
| admin | `900001` | `E2E管理者` | ADMIN | false | `E2E_ADMIN_PASSWORD` |
| initial | `900002` | `E2E初回ログイン` | EMPLOYEE | true | `E2E_INITIAL_PASSWORD` |

- 사번은 E2E 계정만 6자리로 정한 값이다. 시스템 전체 사원번호 규칙(숫자만, 최대 50자리)과 검증 로직은 바꾸지 않는다

공통: `approvalRequired=false`, `isActive=true`, `departmentId=null`

## 스크립트 동작 (`npm run db:e2e-accounts`)
진입점 `prisma/e2e-accounts.ts`(seed.ts와 같은 형태: `dotenv/config`, DATABASE_URL 확인, PrismaPg, finally `$disconnect`, 실패 시 `process.exitCode = 1`). 로직은 `prisma/e2e-account-data.ts`.

1. `parseE2eAccountConfig(env)` — 검증 실패는 일본어 메시지로 throw
   - `NODE_ENV === 'production'`이면 중단(「本番環境では E2E アカウントを作成できません。」)
   - `E2E_ADMIN_PASSWORD`, `E2E_INITIAL_PASSWORD` 둘 다 필수, 각각 비밀번호 규칙 검증
   - 반환: `{ accounts: E2eAccountSpec[] }` (`E2eAccountSpec = { empId, name, role, mustChangePassword, password }`). 사번·이름·역할은 위 표의 상수 `E2E_ACCOUNTS`에서 가져온다
2. `resetE2eAccounts(prisma, config): Promise<E2eResetResult>` — `prisma.$transaction` 하나로 처리
   - (a) 사번 충돌 검사: 대상 사번의 기존 사용자가 있고 `name`이 기대값과 다르면 **아무것도 바꾸지 않고** throw(「社員番号 X のユーザーは E2E アカウントではないため変更しません。」)
   - (b) 선행 조건: E2E 대상 사번을 제외한 활성 ADMIN이 0명이면 throw(「先に npm run db:seed で初期 ADMIN を登録してください。」). 이유: seed는 활성 ADMIN이 없을 때만 초기 ADMIN을 만드므로, E2E ADMIN이 먼저 생기면 초기 ADMIN이 영영 안 생김
   - (c) 각 계정 `upsert`(where empId): create/update 모두 위 표 값 + `passwordHash = bcrypt.hash(password, BCRYPT_COST)`로 덮어쓴다
   - (d) 두 계정의 `refresh_tokens`를 **삭제**(이전 세션 무효화 + 반복 실행 시 행 누적 방지)
   - 반환: 계정별 `'created' | 'updated'`
   - bcrypt 해시는 트랜잭션 밖에서 미리 계산해 트랜잭션을 짧게 유지
3. 진입점 로그: 계정별 「E2E アカウント(900001)を作成/初期化しました。」. **비밀번호·해시는 출력하지 않는다**

## 비밀번호 검증 공용화
- `initial-data.ts`의 비밀번호 검증을 `export function assertValidPassword(envName: string, value: string): void`로 추출하고 parseSeedConfig가 이를 호출하도록 한다. **기존 에러 메시지 문자열은 바뀌지 않아야 한다**(`SEED_ADMIN_PASSWORD` 부분만 envName으로 치환). initial-data.spec.ts가 그대로 통과해야 함
- e2e-account-data.ts는 이 함수를 재사용

## 보안 요구사항
- 비밀번호 하드코딩 금지(코드·테스트·예시 파일 모두). `.env.example`에는 빈 값만
- 운영 실행 차단(NODE_ENV), 기존 일반 사용자 덮어쓰기 금지, 로그에 비밀번호 미출력
- E2E 계정은 개발 DB에만 생긴다는 점을 진입점 주석에 명시

## 생성·수정 파일
- 신규 `backend/prisma/e2e-accounts.ts` — 실행 진입점
- 신규 `backend/prisma/e2e-account-data.ts` — `E2E_ACCOUNTS`, `parseE2eAccountConfig`, `resetE2eAccounts`
- 신규 `backend/prisma/e2e-account-data.spec.ts` — 설정 검증 단위 테스트(tester)
- 신규 `backend/test/db/e2e-accounts.e2e-spec.ts` — 테스트 DB 통합 테스트(tester)
- 수정 `backend/prisma/initial-data.ts` — `assertValidPassword` 추출
- 수정 `backend/package.json` — `"db:e2e-accounts": "tsx prisma/e2e-accounts.ts"`
- 수정 `backend/.env.example` — `E2E_ADMIN_PASSWORD=`, `E2E_INITIAL_PASSWORD=` + 주석(개발 DB 전용, Playwright 실행 시에도 같은 값을 환경변수로 넘김)

## 테스트 용이성
- `resetE2eAccounts`는 config의 accounts를 그대로 쓰므로, 통합 테스트는 `uniqueSuffix`로 만든 사번을 넘겨 테스트 DB의 다른 데이터와 충돌하지 않게 한다
