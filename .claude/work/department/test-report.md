RESULT: PASS (Run 5 병합 검증 기준. 임시 DB 마이그레이션·seed·리허설·백엔드 e2e 321건·unit·tsc·lint 전부 통과. 범위 밖 기존 Playwright 실패 7건은 Run 4 "범위 밖 실패"에 분리 기록)

# 부서 관리 — 테스트 결과 (Run 1)

Playwright E2E는 실행하지 못했다(아래 "미실행" 참고). 실행한 범위 안에서는 실패가 없다.

## 실행 환경
- 백엔드 e2e·DB 통합: 임시 DB `workbridge_tester_test`(마이그레이션 2건 + seed + E2E 계정 생성 후 검증, 검증 후 DROP). `backend/.env.test`는 임시로 이 DB를 가리키게 했다가 원본 바이트 그대로 복원했다(cmp 확인).
- 공용 `workbridge`(개발)·`workbridge_test` DB는 사용하지 않았다.
- 프론트 Vitest: 기본 설정(jsdom).

## 작성·수정한 테스트 파일
신규
- `backend/src/modules/departments/dto/department-dto.spec.ts` (code 정규화·거부, name trim·길이, PATCH 빈 객체, 검색 쿼리 길이·limit)

추가·수정
- `backend/test/admin-departments.e2e-spec.ts`: 권한(PATCH 403, PASSWORD_CHANGE_REQUIRED 403), details.field, updatedAt 갱신, 未所属 code 변경 거부, 비활성 사원 2명 이동·타 부서 불변, 활성+비활성 시 롤백, 재삭제 404, 경합 2건(IT-DEPT-16·17)
- `backend/test/db/schema.e2e-spec.ts`: departments.code UNIQUE(DB-DEPT-01), users.department_id NOT NULL(DB-DEPT-02), 마이그레이션 후 상태(DB-DEPT-04). DB-DEPT-03은 기존 케이스 유지
- `backend/test/db/seed.e2e-spec.ts`: 5개 부서가 code와 함께 생성되는지 확인
- `frontend/src/app/(app)/admin/departments/DepartmentsView.test.tsx`: 로딩 표시, 再試行 재조회, URL Query 복원, 삭제 성공 후 재조회, 404·409(PROTECTED) 시 모달 닫기·토스트·재조회. 409 재조회 검증을 `>=1`에서 `>=2`로 강화
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx`: 409 NAME → 이름 필드 메시지, 요청 중 제출 버튼 비활성
- `frontend/src/components/layout/AppShell.test.tsx`: EMPLOYEE가 `/admin/departments` 접근 시 `/dashboard` + 토스트 1회
- `frontend/e2e/departments.spec.ts`: 활성 사원이 있는 GA 행의 [削除] → 삭제 불가 토스트, 행 유지 (미실행)

Prettier로 위 백엔드 테스트 3개 파일과 AppShell.test.tsx 포맷을 맞췄다(AppShell은 원본이 포맷 통과 상태였음을 확인).

## 실행 결과
| 구분 | 실행 | 통과 | 실패 |
|---|---|---|---|
| 백엔드 unit (`npm test`) | 222 | 222 | 0 |
| 백엔드 e2e (`npm run test:e2e`, 12 파일) | 313 | 313 | 0 |
| 프론트 unit (`npx vitest run`, 24 파일) | 388 | 388 | 0 |
| 프론트 Playwright | 0 | - | - (미실행) |

- 신규/추가 테스트: 백엔드 unit 신규 1파일(23건 중 DTO 포함 모듈 전체), e2e 신규 12건(admin-departments 9, schema 3), 프론트 신규 9건(DepartmentsView 6, FormModal 2, AppShell 1). 백엔드 e2e 기준 이전 301건 → 313건.
- 타입체크: `frontend` `npx tsc --noEmit`, `backend` `npx tsc --noEmit` 통과.
- ESLint: 변경한 테스트 파일 통과.
- 경합 테스트(IT-DEPT-16, 17)는 `waitUntilSessionBlocked`로 pg_stat_activity에서 락 대기를 확인한 뒤 진행하므로 실제로 경합이 발생한 상태에서 검증된다.

## 실패 항목
없음.

## 미실행·미검증 항목
1. **Playwright E2E 미실행 (사유)**: 실행 환경에서 포트 3000(next dev, PID 110804)과 4000(backend dist/main, PID 126956)을 사용자의 기존 개발 서버가 점유하고 있다. 4000 백엔드는 개발 DB를 쓰는 것으로 보여 E2E를 거기에 붙이면 개발 DB에 데이터가 남는다. 또 next dev는 같은 프로젝트에서 두 번째 인스턴스를 띄우지 못한다(.next 락). 이 프로세스들은 종료하지 않았다. 임시 DB 백엔드(4100)와 프론트(3100) 조합도 시도했으나 next dev 락으로 3100이 기동하지 않아 중단했다. 임시로 띄운 4100 백엔드 프로세스는 정리했다. E2E를 돌리려면 개발 서버를 멈추거나 별도 작업 트리에서 실행해야 한다.
2. **`e2e-accounts`의 "seed 전 실행 시 에러"(DEV 부서 없음)**: 자동화하지 않았다. 테스트 DB에서 DEV 부서를 지워야 하는데 다른 테스트와 충돌하기 때문이다.
3. **IT-DEPT-16·17의 구현 범위**: 16은 실제 HTTP DELETE 요청을 사용한다. 17은 DELETE 서비스의 락 획득 순서를 그대로 재현한 테스트 측 트랜잭션(`SELECT ... FOR UPDATE` 후 DELETE)으로 검증한다. 앱의 DELETE 흐름을 락 직후에 멈출 방법이 없기 때문이다.
4. **E2E의 EMPLOYEE 리다이렉트 시나리오**: 900002는 비밀번호 변경 흐름이 필요해 E2E에 넣지 않았다. AppShell 단위 테스트로 대신 검증했다.
5. **Sidebar 단독 테스트 없음**: 메뉴 순서·권한별 표시는 AppShell.test.tsx에서 검증한다.
6. **Repository의 P2002·P2003 매핑**: 단위 테스트에서는 service를 mock하므로, e2e(409 CODE/NAME, 경합)로만 검증된다.
7. 모바일 레이아웃(md 미만 카드형)과 실제 브라우저 렌더링은 검증하지 않았다.

## 참고
- 공유 `workbridge_test`에는 다른 브랜치의 `hire_date` 마이그레이션이 적용되어 있어 이 브랜치 코드로는 사원 INSERT가 실패할 수 있다. 이번 검증은 마이그레이션이 이 브랜치 것만 적용된 임시 DB에서 수행했으므로, 공유 테스트 DB 기준으로는 확인하지 못했다.
- 기존 e2e 중 seed·e2e-accounts 테스트는 활성 ADMIN이 없는 DB를 전제로 한다. 시드를 넣은 DB에서 돌리면 실패하므로 전체 실행은 빈 테스트 DB에서 해야 한다.

---

# 부서 관리 — 테스트 결과 (Run 2)

RESULT: PASS (Run 2 기준. review.md Round 1의 tester 담당 낮음 항목 반영 후 전체 재실행. 실패 항목 없음)

## 실행 환경
- 백엔드 e2e·DB 통합: 임시 DB `workbridge_tester2_test`(마이그레이션 3건 적용, seed 없는 빈 DB). 실행 전후로 `backend/.env.test`의 DATABASE_URL만 임시로 바꿨고, 실행 후 백업본과 `cmp`로 원본 바이트 일치를 확인했다(sha256 9e2fba54…). 임시 DB는 DROP 완료.
- 공용 `workbridge`(개발)·`workbridge_test` DB는 사용·reset하지 않았다. 사용자의 3000/4000 개발 서버는 건드리지 않았다.
- 프론트 Vitest: 기본 설정(jsdom).

## 변경한 테스트 파일 (Run 2)
- `backend/test/admin-departments.e2e-spec.ts`
  - `shouldReturn404ForUnknownOrMalformedId`: GET 404(존재하지 않는 UUID·UUID 형식 아님) 모두 `code: NOT_FOUND`, `message: 「部署が見つかりません。」` assertion 추가 (Fix 1 반영 결과 검증)
  - `waitUntilSessionBlocked(queryPattern)`: 대상 세션을 `pg_stat_activity.query ILIKE` 패턴으로 좁힘. 경합 테스트 2건은 각각 `'%departments%'`(DELETE 대기), `'%users%'`(사원 INSERT 대기)를 지정
  - `shouldReturn409WhenMemberIsActivatedWhileDeleting`: 고정 300ms 대기를 제거하고, DELETE가 부서 행 잠금 대기에 들어간 것을 확인한 뒤 커밋하도록 변경
- `backend/src/modules/departments/departments.service.spec.ts`: 삭제 결과 매핑 it.each에 message 추가(NOT_FOUND·PROTECTED·DEPARTMENT_HAS_MEMBERS). `toBody()`로 statusCode·code·message 함께 검증
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx`: 수정 모드 409 PROTECTED_DEPARTMENT → 서버 message 토스트 + 모달 닫기 + 재조회 케이스 추가

## 실행 결과 (Run 2)
| 구분 | 실행 | 통과 | 실패 |
|---|---|---|---|
| 백엔드 unit (`npx vitest run`, 16 파일) | 222 | 222 | 0 |
| 백엔드 tsc (`npx tsc --noEmit`) | - | 통과 | 0 |
| 백엔드 e2e (`npm run test:e2e`, 12 파일) | 313 | 313 | 0 |
| 프론트 unit (`npx vitest run`, 24 파일) | 391 | 391 | 0 |
| 프론트 tsc·eslint (departments 폴더) | - | 통과 | 0 |
| 프론트 Playwright | 0 | - | - (미실행) |

- Run 1 대비: 백엔드 unit·e2e 수 동일(222/313), 프론트 388 → 391(Fix 1 FORBIDDEN 2건 + 이번 PROTECTED 1건).
- 경합 테스트 2건(IT-DEPT-16·17)과 신규 대기 조건은 `waitUntilSessionBlocked`가 락 대기 세션을 확인해야 통과하므로, 통과 자체가 경합이 실제로 발생했다는 증거다.
- 테스트 파일에 `.skip`·`.only`·TODO 없음(grep 확인).

## 실패 항목
없음.

## 미실행·미반영 항목
1. **Playwright E2E 미실행**: Run 1과 같은 사유. 3000/4000 포트를 개발 서버가 점유하고 개발 DB를 쓴다. 개발 서버 종료·개발 DB 사용을 금지받아 실행하지 않았다. 병합 전에 개발 DB에 마이그레이션 적용 후 실행이 필요하다(review 낮음 항목 frontend 담당, 그대로 유지).
2. **review 낮음 — e2e-accounts "seed 전 실행 시 에러"(DEV 없음) 단위 테스트**: 이번에는 반영하지 않았다. `resetE2eAccounts`의 fake client 단위 테스트가 필요해 범위가 커지고, 병합 후 seed 순서 문제이며 현 테스트 기준 위험이 낮다고 판단했다. 필요하면 다음 라운드에서 추가한다.
3. 기존 Run 1 미검증 항목(Sidebar 단독 테스트 없음, Repository P2002·P2003 매핑은 e2e로만 검증, 모바일 레이아웃 등)은 그대로 남는다.

---

# 부서 관리 — 테스트 결과 (Run 3)

RESULT: FAIL (Playwright 7건 실패. 원인은 아래 "실패 항목"의 테스트 환경·테스트 전제. 제품 코드 결함으로 확인된 실패는 없음)

## 변경한 테스트 파일 (Run 3)
- `backend/test/admin-departments.e2e-spec.ts`
  - GET/PATCH/DELETE malformed ID(`not-a-uuid`) → 400 `VALIDATION_ERROR`, `details[0].field === 'id'` (`expectMalformedIdError` 헬퍼). 기존 `shouldReturn404ForUnknownOrMalformedId`는 `shouldReturn404ForUnknownId`(정상 형식 없는 UUID 404)와 `shouldReturn400ForMalformedId`로 분리
  - `shouldMatchWildcardCharactersLiterallyInSearch` 추가: name에 `_`·`%`·`\`를 포함한 검색어가 문자 그대로 일치하는지 확인. 각 검색어마다 와일드카드로 해석되면 함께 걸리는 "おとり" 부서를 같이 만들어 `toEqual`로 정확히 1건만 나오는지 검증. code 검색 `E<suffix>%`는 0건(와일드카드 미해석 시 1건 나오도록 같은 접두 코드 부서를 함께 생성)
- 임시 파일 `frontend/e2e/tmp-tester3-screenshots.spec.ts`는 스크린샷 촬영 후 삭제함(삭제 확인)

## 실행 환경 (Run 3)
- 임시 DB 2개: `workbridge_tester3_test`(백엔드 e2e, 마이그레이션만 적용·seed 없음), `workbridge_tester3pw_test`(Playwright, 마이그레이션·seed·E2E 계정 900001/900002 생성). 검증 후 둘 다 DROP 완료(pg_database 목록으로 확인)
- 개발 DB `workbridge`·`workbridge_test`는 직접 사용·reset하지 않았다(아래 "주의" 참고)
- `backend/.env.test`: e2e 실행 동안만 DATABASE_URL을 임시 DB로 바꿨고(`loadEnvTest`가 `override: true`라 env 변수 주입이 불가), 실행 후 백업본과 `cmp` 바이트 일치 확인. sha256 `9e2fba54…` 그대로
- `backend/.env`, `frontend/.env.local` 등은 변경하지 않았다(sha256 `c316a6d0…` 동일). 임시 서버는 process env로 DATABASE_URL·PORT·BACKEND_URL을 주입
- 임시 서버: backend 4300(`.tester3-dist` 빌드 → node 직접 실행), frontend 3300(`next dev`, BACKEND_URL=4300). 검증 후 프로세스 트리째 종료, 포트 비어 있음 확인, 빌드 폴더 `backend/.tester3-dist` 삭제
- 사용자의 4000/4100 `backend\dist\main` 프로세스는 건드리지 않았다. 3000 포트는 비어 있었다. 세션 시작 때 4000 PID는 122108, 4100은 116380이었으나 실행 중 PID가 120916, 112876으로 바뀌어 있었다(내가 종료한 적 없음. 사용자 측 재시작으로 보임)
- `frontend/.next`에 next dev 캐시가 갱신됨(소스 변경 없음)

## 실행 결과 (Run 3)
| 구분 | 실행 | 통과 | 실패 |
|---|---|---|---|
| 백엔드 unit (`npm test`) | 222 | 222 | 0 |
| 백엔드 e2e (`npm run test:e2e`, 12 파일) | 317 | 317 | 0 |
| 백엔드 tsc·lint | - | 통과 | 0 |
| 프론트 unit (`npx vitest run`, 24 파일) | 391 | 391 | 0 |
| 프론트 tsc·lint | - | 통과 | 0 |
| Playwright 전체 (41건, 2차 실행) | 41 | 34 | 7 |
| Playwright attendance-status (fixture 수동 적용) | 6 | 6 | 0 |

- Run 2 대비: 백엔드 unit·e2e 수 동일(222/313→317, 신규 e2e 4건: malformed 3분리 + 와일드카드 1건), 프론트 391 동일
- 와일드카드 검색 테스트가 실제 Postgres에서 통과 → 서비스의 `escapeLikePattern`과 Prisma `contains`의 조합이 `%`·`_`·`\`를 문자 그대로 처리함을 확인
- 스크린샷: `.claude/work/department/screenshots/SCR-010_departments_desktop.png`(1440×900), `SCR-010_departments_mobile.png`(390×844, 카드형 목록). 데이터 표시와 「システム」 배지 확인

## 실패 항목 (Run 3)
1. **`frontend/e2e/attendance-status.spec.ts` 6건** (`shouldShowOnlyWorkingRecordsWhenWorkingButtonPressed`, `shouldShowOnlyDoneRecordsWhenDoneButtonPressed`, `shouldShowOnlyMissingClockOutRecordsWhenMissingButtonPressed`, `shouldShowRecordsOfAnySelectedStatusWhenMultipleButtonsPressed`, `shouldShowAllRecordsAgainWhenSelectedButtonPressedAgain`, `shouldKeepSelectedStatusAfterReload`)
   - 에러: 행 수 기대 5 → 실제 0
   - 원인: `runBackendScript`가 `PLAYWRIGHT_BASE_URL` 지정 시 fixture 투입을 건너뜀. 임시 DB에 6건이 없어서 발생. fixture를 임시 DB에 수동 투입한 뒤 같은 스펙을 돌리면 6/6 통과
   - [담당: tester] (테스트 하네스 전제. 제품 결함 아님)
2. **`frontend/e2e/leaves.spec.ts:51` `shouldShowSummaryAndHistoryWithoutLoadError`**
   - 에러: `getByRole('table')` not found
   - 원인: `LeaveHistoryList`는 항목이 0건이면 표가 아니라 빈 상태를 그림. 이 테스트는 이전 실행이 남긴 이력에 기대는 순서 의존 테스트. `beforeAll`의 `db:e2e-leaves-reset`은 `PLAYWRIGHT_BASE_URL` 지정 시 건너뛰어짐. 같은 DB에서 재실행하면 2027/03/01 신청이 중복되어 다른 3건도 실패하므로 스펙이 재실행 가능하지 않음
   - [담당: tester] (테스트 전제 수정 필요)
   - 참고(백엔드 담당 확인 필요): `backend/package.json`에 `db:e2e-leaves-reset` 스크립트가 없어 이 스펙의 `beforeAll`은 `PLAYWRIGHT_BASE_URL`을 지정하지 않은 기본 실행에서도 실패함. 이 브랜치의 변경이 아닌 기존 상태
   - 나머지 leaves 5건은 2차 실행에서 통과(1차에서도 동일)

## 주의: 개발 DB 접촉 가능성 (사용자 확인 필요)
- 1차 Playwright 실행(사유: 환경 변수 `DATABASE_URL` 미지정)에서 `frontend/e2e/attendance.spec.ts`의 `test.afterAll`이 `npm run db:e2e-accounts`를 실행했다. 이 호출에는 `PLAYWRIGHT_BASE_URL` 가드가 없어서 `backend/.env`(개발 DB `workbridge`)를 가리켰다
- 결과: `The column departments.code does not exist` 오류로 실패. 개발 DB에 이 브랜치의 마이그레이션이 아직 적용되지 않은 상태라 실패 지점은 부서 조회(트랜잭션 초기)로 보인다. 쓰기는 없었을 것으로 추정하지만 확인하지 못했다. 개발 DB를 읽는 조회는 권한 거부되어 실행하지 않았다
- 다른 스펙의 `beforeAll`(attendance-reset, attendance-fixture, leaves-reset)과 `global-setup`은 `PLAYWRIGHT_BASE_URL` 가드가 있어 개발 DB에 실행되지 않았다
- 2·3차 실행은 `DATABASE_URL`을 임시 DB로 지정해서 모든 hook이 임시 DB만 봤다
- 조치 제안: (a) 사용자가 개발 DB의 900001/900002 계정과 attendance 상태가 바뀌지 않았는지 확인, (b) `attendance.spec.ts` `afterAll`에 `PLAYWRIGHT_BASE_URL` 가드를 넣는 수정(tester 담당, 한 줄. 아직 적용하지 않음 — 적용 후 재실행 필요)

## 미실행·미검증 항목 (Run 3)
- 개발 DB `workbridge`에 이 브랜치 마이그레이션 적용 후 Playwright 실행은 하지 않음(사용자 지시에 따라 개발 DB 사용 금지)
- 모바일 레이아웃 시각 검증은 스크린샷 육안 확인 수준(카드형 표시)
- 이전 Run 1·2의 미검증 항목(Sidebar 단독 테스트, Repository P2002·P2003 매핑 등)은 그대로 남음

---

# 부서 관리 — 테스트 결과 (Run 4)

RESULT: PASS (부서관리 범위 기준. 범위 밖 기존 Playwright 실패 7건은 "범위 밖 실패"에 분리해 기록. 이번 Run은 개발 DB 접촉 방지 가드 추가만 검증)

## 변경한 파일 (Run 4)
- `frontend/e2e/attendance.spec.ts`: 一般社員 describe의 `test.afterAll`에서 `npm run db:e2e-accounts` 실행 전에 `if (process.env.PLAYWRIGHT_BASE_URL) return;` 가드 추가 (Run 3 "개발 DB 접촉" 조치 (b)). 2줄 추가, 다른 줄 변경 없음. 기존 beforeAll 가드와 같은 조건
- 구현 코드·다른 spec·docs 미변경

## 검증 (Run 4)
| 구분 | 실행 | 통과 | 실패 |
|---|---|---|---|
| 프론트 tsc (`npx tsc --noEmit`) | - | 통과 | 0 |
| 프론트 eslint (`e2e/attendance.spec.ts`) | - | 통과 | 0 |
| Playwright `e2e/attendance.spec.ts` (PLAYWRIGHT_BASE_URL 지정, 임시 서버·임시 DB) | 3 | 3 | 0 |

- 가드 동작 확인: 실행 로그에 global-setup의 "PLAYWRIGHT_BASE_URL 指定時は E2E アカウントを初期化しません" 메시지만 나오고, `npm run db:e2e-accounts` 실행 출력(`E2E アカウント(900001)を作成しました` 등)은 없었다. afterAll이 가드에서 return 했다는 근거다. 마지막 테스트(900002 비밀번호 변경)가 통과한 뒤 afterAll이 호출되는 구조라서, 가드가 막지 않았다면 같은 출력이 나왔어야 한다.
- 한계: 대조 실행(가드 없이 같은 spec을 돌려 출력이 나오는지 확인)은 하지 않았다. 포트 3000을 Playwright webServer가 띄우게 되어 사용자 환경과 충돌 우려가 있어 생략했다. 개발 DB를 직접 조회해 변화 여부를 확인하지도 않았다(권한 거부 이력). 따라서 "개발 DB에 접속하지 않음"은 로그 근거이며 DB 측 증거는 아니다.

## 실행 환경 (Run 4)
- 임시 DB `workbridge_tester4_pw`: `prisma migrate deploy` → `db:seed` → `db:e2e-accounts`(E2E 비밀번호는 명령줄 환경변수로만 주입, 파일에 기록하지 않음). 검증 후 DROP 확인(exists=false).
- 임시 backend 4300: `tsc -p tsconfig.build.json --outDir .tester4-dist` 후 `node .tester4-dist/main.js`, `DATABASE_URL`은 프로세스 env로 임시 DB 주입. 검증 후 프로세스 종료, `.tester4-dist` 삭제.
- 임시 frontend 3300: `next dev -p 3300`, `BACKEND_URL=http://localhost:4300`. 검증 후 프로세스 종료.
- 사용자 서버 4000·4100은 접촉하지 않았고 종료하지 않았다(실행 후에도 응답 유지). 3000은 실행 전부터 비어 있었다.
- env 파일: `backend/.env`(sha256 앞 16자 `c316a6d0f4e0f143`), `backend/.env.test`(`9e2fba54982ce43d`) 모두 Run 3과 동일. Run 4에서 env 파일은 수정하지 않았다(DATABASE_URL은 프로세스 env로만 주입).
- `frontend/.next`는 next dev가 캐시를 갱신했다(소스 변경 없음).

## 범위 밖 실패 (별도 작업. Run 4에서 고치지 않음. RESULT 판단과 분리)
Run 3에서 기록된 Playwright 7건 중 부서관리와 무관한 항목이다. 이번 Run에서 재실행하지 않았다.
1. `frontend/e2e/attendance-status.spec.ts` 6건: fixture 미투입. `runBackendScript`가 `PLAYWRIGHT_BASE_URL` 지정 시 `db:e2e-attendance-fixture`를 건너뛰는 것이 원인으로 추정. [별도 작업]
2. `frontend/e2e/leaves.spec.ts:51` `shouldShowSummaryAndHistoryWithoutLoadError`: 이전 실행이 남긴 이력에 기대는 순서 의존. `beforeAll`의 `db:e2e-leaves-reset`이 `backend/package.json`에 없어 기본 실행에서도 실패. [별도 작업]

부서관리 범위 Playwright(`frontend/e2e/departments.spec.ts`)는 Run 3 2차 실행에서 통과했다. Run 4에서는 재실행하지 않았다.

## 미검증 / 사용자 확인 필요
- Run 3 조치 (a): 개발 DB의 900001/900002 계정과 attendance 상태가 1차 실행으로 바뀌지 않았는지 사용자가 확인해야 한다. 이번 Run에서는 확인하지 않았다.
- 가드 대조 실행 미실시(위 한계 참고).
- 이번 세션에서 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 환경변수가 설정되어 있지 않아 임시 값을 명령줄에서만 주입했다. 개발 DB용 실제 값으로는 실행하지 않았다.

---

# 부서 관리 — 테스트 결과 (Run 5, 병합 검증)

RESULT: PASS (feature/department ← feature/add-hiredate 병합 전 상태(MERGE_HEAD 존재, unmerged 0건, staged 24건)를 검증. 실패 항목 없음)

## 목적과 범위
- 병합 결과 DB 마이그레이션 4건의 순서 적용, 기존 workbridge 상태(마이그레이션 1~3 + 부서 없는 사원)에서 4번째 마이그레이션의 이관 결과 리허설, 병합 후 전체 백엔드·프론트 테스트를 확인했다.
- 커밋·push·브랜치 변경 없음. 구현 코드·docs 미변경. 테스트 코드 수정 없음(Run 5에서 신규 작성·수정한 테스트 파일 0개).

## 실행 환경 (Run 5)
- 공용 DB 접촉 없음: `workbridge`, `workbridge_test`, `workbridge_department`에는 접속·마이그레이션·seed·reset을 하지 않았다. DB 조작은 전부 임시 DB에서 수행했다.
- 사용자 서버 4000·4100은 건드리지 않았다. Playwright는 생략했으므로 임시 서버도 띄우지 않았다.
- 임시 DB 4개(모두 DROP 완료, 최종 DB 목록이 원래 6개와 동일함을 확인):
  - `workbridge_v5_a`: 1단계. 마이그레이션 4건 → seed → e2e-accounts
  - `workbridge_v5_b`: 2단계 리허설
  - `workbridge_v5e2e_test`: 백엔드 e2e(빈 DB, 마이그레이션 4건, seed 없음)
  - `workbridge_v5_e2e`: 첫 시도에서 `*_test` 가드에 막혀 실패. 접속 없이 중단됨. 이후 DROP
- env 파일: `backend/.env.test`의 DATABASE_URL만 e2e 실행 동안 임시 DB로 바꿨고, 실행 후 백업본과 `cmp` 바이트 일치를 확인했다(sha256 `9e2fba54…`). `backend/.env`(sha256 `c316a6d0…`)와 `frontend/.env.local`은 변경하지 않았다. 세 파일 모두 원본 해시 일치를 확인했다.
- 비밀번호(SEED_ADMIN_PASSWORD, E2E_*)는 명령줄 환경변수로만 주입했고 파일에 기록하지 않았다.

## 1. 마이그레이션 순서·seed·e2e-accounts (임시 DB `workbridge_v5_a`)
- `prisma migrate deploy`: 4건 전부 적용, `_prisma_migrations`에 4건 모두 finished(rolled_back 없음). 순서는 init → split_leaves_rejected_check → add_users_hire_date → department_code_and_required_user_department.
- `prisma migrate diff`(DB → schema.prisma): 빈 마이그레이션 출력, 스키마 드리프트 없음.
- `npm run db:seed`: exit 0. 부서 5개 중 4개 신규 등록(未所属 포함), 初期 ADMIN 00001 등록.
- `npm run db:e2e-accounts`: exit 0. 900001·900002 생성.
- 결과: 부서 코드 `DEV, GA, HR, SALES, UNASSIGNED`(code UNIQUE). 모든 사원 department_id NOT NULL, hire_date 2026-01-01 확인.

## 2. 기존 workbridge 상태 리허설 (임시 DB `workbridge_v5_b`)
- 마이그레이션 1~3만 `prisma migrate deploy`로 적용(임시 prisma.config.ts를 scratchpad에 둠. 저장소 파일 변경 없음).
- 적용 전 샘플 INSERT: 부서 4개(総務部·開発部·営業部·人事部). 사원 5명:

| 사번 | 활성 | 적용 전 부서 | 적용 후 부서 | 기대 | 결과 |
|---|---|---|---|---|---|
| 00001 管理者(ADMIN) | 활성 | 総務部 | GA(総務部) | 유지 | 일치 |
| 10001 山田 | 활성 | 開発部 | DEV(開発部) | 유지 | 일치 |
| 10002 佐藤 | 활성 | なし | UNASSIGNED(未所属) | 이관 | 일치, updated_at 갱신 |
| 10003 鈴木 | **비활성** | なし | UNASSIGNED(未所属) | 이관 | 일치, updated_at 갱신 |
| 10004 田中 | 비활성 | 営業部 | SALES(営業部) | 유지 | 일치 |

- 4번째 마이그레이션 `prisma migrate deploy` 적용 성공. 확인 결과: `users.department_id` NULL 0건, `users.department_id` is_nullable=NO, `departments.code` is_nullable=NO, `departments_code_key` UNIQUE 인덱스 존재. 未所属 사원 2명(활성 1·비활성 1), 나머지 부서 사원 변화 없음.
- 미검증: 「未所属」이라는 이름의 부서가 이미 있을 때 UPDATE 분기(기존 부서가 UNASSIGNED 코드를 얻는 경로). 리허설에서는 그 분기를 만들지 않았다. 실제 workbridge에 그런 부서가 있는지는 DB를 읽지 않아 확인하지 못했다.

## 3. 전체 재실행 (병합 상태 기준)
| 구분 | 명령 | 실행 | 통과 | 실패 |
|---|---|---|---|---|
| 백엔드 e2e | `npm run test:e2e` (임시 DB `workbridge_v5e2e_test`, 12 파일) | 321 | 321 | 0 |
| 백엔드 unit | `npm test` (16 파일) | 222 | 222 | 0 |
| 백엔드 tsc | `npx tsc --noEmit` | - | 통과 | 0 |
| 백엔드 lint | `npm run lint` | - | 통과 | 0 |
| 프론트 unit | `npx vitest run` (24 파일) | 391 | 391 | 0 |
| 프론트 tsc | `npx tsc --noEmit` | - | 통과 | 0 |
| 프론트 lint | `npm run lint` | - | 통과 | 0 |
| Playwright | 생략(허용됨) | 0 | - | - |

- 백엔드 e2e 321건은 Run 3의 317건보다 4건 많다(Run 4는 e2e 미실행). 병합된 입사일(hire_date) 테스트가 추가된 결과로 보인다.
- 첫 e2e 시도는 DB 이름 `workbridge_v5_e2e`가 `*_test` 가드에 걸려 전 파일 실패했다. 테스트 실패가 아니라 임시 DB 이름 문제였다. 가드가 막은 것이므로 DB 접속은 없었다. 이름을 바꿔 재실행해 통과했다.
- `.skip`·`.only`·`xit`·TODO: 병합 변경분의 spec 4개(`backend/test/admin-departments.e2e-spec.ts`, `backend/test/db/e2e-accounts.e2e-spec.ts`, `schema.e2e-spec.ts`, `seed.e2e-spec.ts`)에 없음.

## 실패 항목
없음. 테스트 코드 오류(담당 tester) 없음.

## 병합 관련 확인 사항 (커밋 전 점검 권장, 테스트 결과와 별개)
1. `git status`에 ` M backend/prisma/e2e-attendance-reset.ts`(worktree 변경, staged 아님)가 남아 있다. 병합 커밋에 포함할지 확인이 필요하다. 이번 검증은 워크트리 파일 상태 그대로 수행했다.
   - 검증 도중 `docs/08_TEST_PLAN.md`가 한 번 `MM`(worktree 추가 변경)으로 보였으나, 재확인 시 다시 staged만(`M `) 남아 있었고 worktree diff는 없었다. 이 Run에서는 docs를 수정하지 않았다. 다른 작업이 동시에 파일을 건드린 것으로 보이며, 병합 커밋 전 `git status`를 다시 확인할 것.
2. `.claude/work/department/`(untracked)는 병합 커밋 대상이 아니다. 필요하면 제외 확인.
3. 기존 workbridge(개발 DB)는 이번 검증에서 열어보지 않았다. Run 3에서 `departments.code does not exist` 오류가 난 것은 개발 DB가 마이그레이션 3 상태라는 뜻으로 보이며, 리허설 2가 그 시나리오를 재현한다. 실제 적용 전에 백업을 권장한다.

## 미실행·미검증 (Run 5)
- Playwright 미실행(생략 허용). 부서관리 E2E와 기존 실패 7건(범위 밖, Run 4 참고) 모두 이번 Run에서 재실행하지 않았다.
- e2e-accounts의 "seed 전 실행 시 에러"(DEV 부서 없음) 자동화는 이번에도 하지 않았다(Run 1 미검증 항목 2).
- 리허설 2에서 「未所属」 동명 부서 분기 미검증(위 2번 참고).
- `frontend/.env.local`은 건드리지 않았다. 다만 `frontend/.next` 캐시를 쓰는 next dev는 이번에 기동하지 않아 변화가 없다.
