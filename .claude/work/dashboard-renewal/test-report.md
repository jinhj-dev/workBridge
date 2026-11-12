RESULT: PASS (Run 9 기준: Playwright 63 통과 / 0 실패 / 0 skip. dashboard-renewal 14 + 기존 spec 49. backend·frontend vitest는 Run 8 결과 유지, 이번 Run에서 코드 변경 없음)

# test-report: dashboard-renewal

## Run 1 (2026-11-11, 브랜치 feature/dashboard-redesign, 미커밋)

### 실행 결과 요약
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend unit | `npx vitest run` | 21 파일 / 300 통과 / 0 실패 |
| Backend tsc | `npx tsc --noEmit` | 오류 없음 |
| Backend lint | `npm run lint` | 오류 없음 |
| Backend e2e | `npm run test:e2e` | **미실행** (테스트 DB 차단, 아래 참고) |
| Frontend vitest | `npx vitest run` | 40 파일 / 556 통과 / 0 실패 |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 오류 없음 |
| Playwright (dashboard, login, attendance, attendance-sheet-layout, attendance-status, approvals, leaves, departments, password) | `npx playwright test ...` (E2E_ADMIN_PASSWORD=test0000, E2E_INITIAL_PASSWORD=test0000, PLAYWRIGHT_BASE_URL 미설정) | 50 중 50 통과 (최종, 수정 후 재실행 기준) |

### 작성·수정한 테스트 파일
- 신규 작성 없음. test-plan.md의 backend unit·e2e, frontend 컴포넌트 테스트는 구현 쪽에서 이미 작성되어 있어 그대로 실행했다.
- 수정: `frontend/e2e/password.spec.ts` — 대시보드 진입 확인을 `ダッシュボード` h1 일치에서 `/、.+さん$/`(挨拶 + 氏名 형식의 h1) 판정으로 변경 (2곳). 원인은 대시보드 h1 변경(frontend.md, `login.spec.ts`와 동일 규칙)에 따른 테스트 측 stale 기대값. 검증 기준(대시보드 진입)은 약화하지 않음. 이 수정 후 `password.spec.ts` 3/3 통과.
- 초기 Playwright 1회차: 50 중 49 통과, 1 실패(`password.spec.ts:61 shouldChangePasswordAndLoginOnlyWithNewPassword`). 위 수정으로 해결.

### 실패 / 미실행 항목
1. **[미실행] Backend e2e 전체 (`test/*.e2e-spec.ts`, 특히 admin-dashboard, dashboard-department-status, attendance-monthly)**
   - 에러 요약: `npm run db:migrate:test` 가 P3009 (failed migration `20261110150000_department_code_and_required_user_department`, 2026-11-10 16:37 UTC 실패 기록) 로 중단.
   - 원인 추정: 테스트 DB(`workbridge_test`)에 과거 실행 때 실패한 마이그레이션 기록이 남아 있음. 마이그레이션 SQL 자체는 uncommitted 변경이 아니다.
   - 시도: `prisma migrate reset --force` (테스트 DB 대상, 가드 통과) 를 실행하려 했으나 Prisma가 사용자 명시 동의(PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION)를 요구하며 차단. 동의 없이 우회하지 않았다.
   - 담당: tester (환경 조치 필요: 사용자 동의 후 테스트 DB reset 또는 `prisma migrate resolve` 결정 필요).
   - 이 항목이 해결되기 전까지 E-01~E-42 (admin-dashboard, dashboard-department-status 등 백엔드 e2e) 는 검증되지 않았다.
2. **[미작성] test-plan §4 Playwright 신규 spec `frontend/e2e/dashboard-renewal.spec.ts`** (P-01~P-10: 4폭 스크린샷, EMPLOYEE 403 API 직접 호출, 승인 미리보기 행 클릭→모달 승인·반려, 출근 후 수치 증가분 등). 파일 자체가 없어 실행하지 않았다. 담당: tester. 주요 시나리오(승인 흐름, 일반 사원 403) 중 일부는 기존 `dashboard.spec.ts`·`approvals.spec.ts`가 간접 커버하지만 P-xx 전체 커버리지는 아님.
3. **[확인 필요] test-plan 개별 항목 (E-xx, F-xx) 과 기존 테스트 이름의 1:1 대조는 미실시.** 실행 결과 기준 통과는 확인했으나, 계획서 항목이 빠짐없이 테스트되었는지는 별도 대조가 필요하다.

### 개발 DB 데이터 영향
- Playwright 실행으로 E2E 계정(900001/900002) 초기화(global-setup), `db:e2e-leaves-reset`으로 900001의 휴가 0건 삭제가 실행되었다. 900001 휴가 외 다른 사용자 데이터는 건드리지 않았다.

### 최종 판정
- Backend 단위·Frontend 단위·tsc·lint·대시보드 관련 Playwright 50건은 통과.
- 백엔드 e2e 전체 미실행, test-plan §4 신규 Playwright spec 미작성 때문에 **전체 RESULT는 FAIL** (성공으로 보고할 수 없음).

## Run 2 (2026-11-11 ~ 11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·안전 조치
- 테스트 DB 확인: `backend/.env.test` = `localhost:5432/workbridge_test`. 접속 전 `assertTestDatabaseUrl`로 *_test·localhost 검증 통과.
- 테스트 DB 초기화: `DROP SCHEMA public CASCADE` 후 `prisma migrate deploy`(4개 마이그레이션 적용). `prisma migrate reset`은 이 Prisma 버전에서 `--skip-seed`를 지원하지 않아 seed가 실행되므로 쓰지 않음. `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`은 사용하지 않음. 대상은 workbridge_test뿐.
- 개발 DB(`workbridge`)와 기존 개발 서버(3000, 6000)는 건드리지 않음. 개발 DB 쪽 `db:e2e-accounts`/globalSetup 경로도 호출하지 않음(Run 1은 globalSetup으로 개발 DB를 초기화했음).
- Playwright는 격리 스택으로 실행: 백엔드 `localhost:6100`(workbridge_test), 프런트 `localhost:3100`(frontend 복사본, `BACKEND_URL=http://localhost:6100`, turbopack root만 복사본 설정에서 조정). `PLAYWRIGHT_BASE_URL` 지정으로 globalSetup 자동 초기화는 스킵. spec별 DB 준비(attendance-reset, attendance-fixture, leaves-reset, e2e-accounts)는 `DATABASE_URL`=test로 수동 실행.
- 종료 후 임시 파일 정리 완료(`backend/.e2e-tmp`, `.e2e-tmp-dist`, 프런트 복사본 junction은 rmdir로 해제). 테스트 DB는 빈 마이그레이션 상태로 재초기화(seed 없음, 백엔드 e2e의 "활성 ADMIN 없음" 전제 유지).

### 작성한 테스트 파일
- 신규: `frontend/e2e/dashboard-renewal.spec.ts` (P-01, P-02, P-04~P-10, 9개 테스트)
- 수정 없음. 구현 코드·docs 변경 없음. 커밋·브랜치 변경 없음.
- 임시 데이터(테스트 DB만): 900002 → 900001 승인자 PENDING 특별휴가 2건(P-06·P-07 대상), 900001 2026년 연차 부여 10일, 900002 mustChangePassword=false(P-02·P-05·P-10 로그인용, 이후 e2e-accounts로 복구).
- 정리 범위: 900001 휴가·근태만 삭제 헬퍼 사용. 다른 사용자 데이터는 변경하지 않음.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend unit | `npx vitest run` | 21 파일 / 300 통과 / 0 실패 |
| Backend e2e (테스트 DB, 초기화 후 전체) | `npm run test:e2e` | 14 파일 / 363 통과 / 0 실패 |
| Backend tsc·lint | `npx tsc --noEmit`, `npm run lint` | 오류 없음 (Run 1 기준, 코드 변경 없음) |
| Frontend vitest | `npx vitest run` | 40 파일 / 556 통과 / 0 실패 |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 오류 없음 |
| Playwright 신규 | `e2e/dashboard-renewal.spec.ts` | 9 통과 / 0 실패 (P-01, P-02, P-04, P-05, P-06, P-07, P-08, P-09, P-10) |
| Playwright 기존 | dashboard, login, attendance, attendance-sheet-layout, attendance-status, approvals, leaves, departments, password | 50 통과 / 0 실패 (그룹별 DB 준비 후 실행) |

### 실패 항목과 조치 (실행 중 발생, 모두 해결 후 재실행)
1. P-06·P-07: 목록 로딩 전에 행 수를 읽음 → 로딩 완료 대기(`waitForPendingListSettled`) 추가. 담당 tester, 해결.
2. P-08: 부서 행 첫 셀이 rowheader라 출근 인원 셀 인덱스 오류 → `cell.nth(1)`로 수정. 담당 tester, 해결.
3. P-09: 메시지 키 경로 오류(`messages.leave.apply` → `messages.leaves.apply`). 담당 tester, 해결. 이후 같은 날짜 신청 중복(겹침) 실패 → 실행 전 `db:e2e-leaves-reset`으로 900001 휴가 정리하도록 절차화.
4. 기존 spec 실패 10건(Run 2 초기): 원인은 코드가 아닌 실행 방식. ① `PLAYWRIGHT_BASE_URL` 지정 시 attendance·attendance-status·leaves spec이 자체 DB 준비/정리(afterAll·beforeAll)를 건너뛰어 앞선 spec 상태가 누적됨 ② attendance.spec:161은 900002의 초기 비밀번호를 전제하는데 password.spec이 변경한 값이 남음. 두 건 모두 실행 순서·DB 준비로 해결. 기존 spec 코드는 수정하지 않음.
5. 프런트 복사본 1차 빌드는 webpack 경로라 Tailwind가 컴파일되지 않아 스크린샷이 무스타일이었음 → Turbopack으로 재빌드 후 재촬영. 이 스크린샷 기준으로만 판단함(무효 산출물은 폐기).

### 미실행·미검증 항목 (RESULT FAIL 사유)
- P-03 참조 이미지 대조(8↔admin-1440, 9↔admin-390, 10↔employee-1440, 11↔employee-390): 참조 이미지 파일 위치를 저장소에서 찾지 못해 대조 미실행. 확인한 것은 390px 관리자 화면 1장(카드 순서·열 수·제목 1줄·가로 넘침 없음)뿐. 참조 이미지 경로를 알려주면 tester가 대조.
- P-06 사이드바 배지 갱신 확인: spec에 미구현(통계 件数 −1만 검증).
- P-01/P-02 스크린샷 저장 위치: `frontend/test-results/dashboard-renewal-*/attachments/`(testInfo.outputPath, 4폭 × 관리자·사원 8장).

### 설계상 주의
- P-08 실행 전에 900001 당일 근태가 없어야 함(`db:e2e-attendance-reset`). P-08은 출근을 등록하므로 개발 DB에서 재실행하면 다음 날까지 실패할 수 있음.
- P-05·P-02·P-10은 900002가 강제 비밀번호 변경이 없는 상태를 전제. 개발 DB에서는 globalSetup 후 900002가 변경 필요 상태이므로 fixture 적용이 필요함.

### 최종 판정
- 실행한 모든 자동 테스트(백엔드 unit·e2e, 프런트 vitest·tsc·lint, Playwright 신규 9건, 기존 50건)는 통과.
- 미실행 2건(P-03 참조 대조, P-06 배지)이 남아 있어 RESULT는 FAIL로 둠. 두 항목이 확인되면 PASS로 바꿀 수 있음.

## Run 3 (디자인 재현 검증, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·데이터 조치 (개발 DB)
- (1) `npm run db:e2e-accounts` 1회 실행(사용자 승인 범위). 900001·900002 모두 초기화 완료. 로그인 확인: 900001 `test0000` 성공(ADMIN, mustChangePassword=false). 900002 `test0000` 성공, 단 **mustChangePassword=true**(E2E 계정 설정상 초기 상태).
- 900002 처리: `/password` 흐름과 같은 API(`PATCH /api/v1/auth/password`, 204)로 `test0000` → `NewPass123` 변경. 이후 `NewPass123` 로그인 성공, mustChangePassword=false. **개발 DB의 900002 비밀번호는 현재 NewPass123**. 다음 정식 실행(globalSetup 또는 `npm run db:e2e-accounts`)에서 test0000·mustChangePassword=true로 복구됨.
- 승인 대기 데이터 생성 시도: 900002로 SPECIAL 휴가 2건(2026-12-21, 12-22, 승인자 900001) 신청 → 900002가 `approvalRequired=false`(E2E 설정)라 자동 승인됨. 대기 건이 되지 않아 즉시 `PATCH /leaves/:id/cancel`로 2건 모두 CANCELLED 처리. CANCELLED 레코드 2건이 남아 있음. 900001의 승인 대기는 **0건**.
- 대기 건 생성에는 900002의 `approvalRequired` 변경(E2E 설정 변경, DB 직접 수정)이 필요해 승인 범위 밖으로 보고 하지 않음.
- 임시 spec(`frontend/e2e/design-capture.spec.ts`)으로 캡처 후 삭제 완료(저장소에 남기지 않음).
- (5) 중 `npm run db:e2e-attendance-reset`, `npm run db:e2e-leaves-reset`(개발 DB 쓰기) 및 그 뒤의 dashboard 관련 Playwright 실행은 **권한 분류기에서 거부되어 실행하지 않음**. 승인된 범위는 db:e2e-accounts뿐이라 재시도하지 않음.

### (2) 스크린샷 (`.claude/work/dashboard-renewal/screenshots/`)
| 파일 | 내용 |
|---|---|
| design-admin-1440.png / -1024.png / -390.png / -360.png | 관리자 대시보드 전체 페이지 |
| design-employee-1440.png / -1024.png / -390.png / -360.png | 사원 대시보드 전체 페이지 |
| other-attendance-1440.png, other-leaves-1440.png, other-approvals-1440.png, other-departments-1440.png | (4) 다른 화면, 관리자 1440 |
| design-overflow.json | 가로 넘침 측정 원자료 |

### 가로 넘침 측정 (documentElement scrollWidth vs clientWidth)
| 역할 | 1440 | 1024 | 390 | 360 |
|---|---|---|---|---|
| 관리자 | 1440 / 1440 | 1024 / 1024 | 390 / 390 | 360 / 360 |
| 사원 | 1440 / 1440 | 1024 / 1024 | 390 / 390 | 360 / 360 |

- 페이지 레벨 가로 넘침 없음(모든 폭 scrollWidth = clientWidth).
- 단, 390 관리자 화면의 **「各部署の状況」 표는 카드 안에서 잘림**(休暇·未出勤 열이 카드 밖으로 밀려 카드 내부 스크롤). 사원 390 화면도 같은 표가 잘림(「休」「未」 열). 페이지 전체 넘침은 아니므로 측정에 잡히지 않음. 360은 같은 구조로 추정하나 요소 단위 측정은 하지 않음(미검증).
- 참고: 1440 fullPage 캡처에서 좌측 사이드바 배경이 900px에서 끊김. 개발 모드의 "1 Insight" 오버레이(Next.js dev indicator)가 모든 캡처에 보임. 제품 결함 아님.

### (3) 참조 이미지 대조 (8=관리자 데스크톱, 9=관리자 모바일, 10=사원 데스크톱, 11=사원 모바일)
| 항목 | 참조 | 현재 구현 | 판정 |
|---|---|---|---|
| 앱 셸(사이드바·헤더) | 아이콘 있는 사이드바, 벨·아바타, 모바일은 하단 탭바 | 텍스트만 있는 사이드바, 상단 바, 모바일은 햄버거 | 차이 큼(셸 유지 결정으로 의도된 차이일 수 있음, 디자인 결정 필요) |
| 8 관리자 데스크톱 배치 | 상단 3카드 → 출근 + 승인대기 → 전사 도넛 + 월간 → 휴가·부서·직근 3열 → お知らせ | 상단 3카드 → 출근 + 승인대기 → 전사 도넛 + 월간 → 휴가·부서·직근 3열 | 일치 |
| 8 승인대기 행 | 이름·부서·종류 배지·기간 4열 + 화살표 | 빈 상태(「承認待ちの申請はありません。」) | 데이터 없음으로 미비교 |
| 8 부서 표 | 5열(부서·인원·출근·휴가·미출근) | 5열(출근은 「(率)」 포함) | 근사 일치 |
| 8 お知らせ | 있음 | 없음 | 의도된 차이(plan: 공지 기능 없음) |
| 8 상단 3카드 | 아이콘 + 라벨 + 큰 숫자 | 동일 구조 | 일치 |
| 9 관리자 모바일 | 3카드 가로 배치, 도넛+범례, 승인대기 리스트 | 3카드, 도넛+범례, 승인대기 빈 상태, 부서 표 잘림 | 부서 표 잘림이 차이(결함 후보) |
| 9 모바일 헤더 | 「管理者ダッシュボード」 소제목 + 큰 인사 + 일러스트 | 인사 2줄, 소제목 없음 | 차이(작음) |
| 10 사원 데스크톱 배치 | 좌: 출근 / 우: 월간+휴가 / 하단: 부서·직근 | 동일 | 일치 |
| 10 월간 4지표 단위 | 休日出勤 「0日」 | 休日出勤 「0時間」(F-32 계획 문구) | 차이: 참조는 日, 계획은 時間. 결정 필요 |
| 10 휴가 카드 | 「8日 / 12日」 + 「今年の取得日数」 + 링크 없음 | 「0日 / 0日(承認済み)」 + 「休暇を申請」 버튼 | 차이: 라벨(今年の取得日数 vs 承認済み). F-33은 「今年の取得日数」 없음이라 계획과 참조가 상충. 결정 필요 |
| 10 부서 표 | アラート 열(「1件」 빨간 배지) 있음 | アラート 열 없음(출근(率) 열) | 차이 |
| 10 직근 | 상태 배지 + 날짜 | 동일 구조 | 근사 일치 |
| 10 お知らせ | 있음 | 없음 | 의도된 차이 |
| 11 사원 모바일 | 큰 인사, 출근 카드, 월간 3지표(休日出勤 없음), 휴가 「休暇管理へ」, 최근 신청 리스트(아이콘·2줄) | 큰 인사, 출근, 월간 4지표(休日出勤 포함), 휴가(「休暇履歴を見る」, 신청 버튼), 부서 표 카드(사원 모바일에 없음), 직근 리스트 | 차이: 월간 지표 4개, 부서 카드 노출, 링크 문구, 리스트 아이콘 없음 |
| 11 하단 탭바 | 있음 | 없음 | 셸 차이 |
| 색·카드·radius | 연한 파랑 배경, 큰 라운드, 부드러운 그림자 | 유사한 톤 | 근사 일치 |

- 의도된 차이(계획 기준): 캘린더·お知らせ 없음, 셸 유지, 10.png 세로 묶음 미재현.
- 판정 필요: 셸(아이콘·하단 탭), 휴가 카드 라벨·버튼, 休日出勤 단위, 부서 표 アラート 열, 사원 모바일의 부서 카드 노출.

### frontend 전달 목록 (Round 1, 제품 코드 수정은 하지 않음)
1. [frontend] 390/360 폭에서 「各部署の状況」 표가 카드 밖으로 잘림. 표 열을 줄이거나 모바일 카드형으로 바꾸거나 카드 내부 가로 스크롤을 명시. (관리자·사원 공통)
2. [frontend] 사원 화면 휴가 카드: 라벨 「承認済み」를 「今年の取得日数」로 할지 결정(참조 10·11 기준). 「休暇を申請」 버튼 노출 여부도 결정. 기존 계획 F-33과 충돌하므로 설계 결정 필요.
3. [frontend] 休日出勤 단위: 참조는 「0日」, 계획(F-32)은 「0時間」. 결정 필요.
4. [frontend] 사원 모바일에서 부서 카드를 숨길지 결정(참조 11에는 없음). 데스크톱 참조 10에는 있음.
5. [frontend, 결정 필요] 셸: 참조는 아이콘 사이드바·모바일 하단 탭. 현재는 텍스트 사이드바·햄버거. 셸 유지가 확정이면 참조 차이는 의도된 것으로 기록.
6. [frontend] 부서 표에 アラート 열 추가 여부(참조 10). 계획에 없어 결정 필요.

### 실행 결과 (Run 3)
| 구분 | 명령 | 결과 |
|---|---|---|
| (1) E2E 계정 초기화 | `npm run db:e2e-accounts` | 900001·900002 초기화 성공 |
| (2)(4) 캡처 | 임시 spec (`design-capture.spec.ts`) | 3 passed (관리자 4폭, 사원 4폭, 관리자 다른 화면 4개) |
| Frontend vitest | `npx vitest run` | 40 파일 / 556 통과 / 0 실패 |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Frontend lint | `npm run lint` | 출력 없음(오류 없음) |
| Playwright 읽기 전용 | `e2e/login.spec.ts`, `e2e/attendance-sheet-layout.spec.ts` (PLAYWRIGHT_BASE_URL=http://localhost:3000, DB 초기화 없음) | 15 통과 / 0 실패 |
| Playwright dashboard-renewal | 미실행 | 개발 DB 준비(attendance·leaves reset) 권한 거부로 미실행 |
| Playwright dashboard | 미실행 | 같은 사유 |
| Backend e2e | 미실행 | 사용자 지시에 따라 생략 가능(Run 2에서 363 통과 기록). 이번 변경은 프런트·E2E 데이터만 |

### 미실행·미검증 (RESULT FAIL 사유)
- dashboard-renewal.spec 전체 (P-01~P-10): DB 준비 명령 거부로 미실행. P-06·P-07은 승인 대기 0건이라 개발 DB에서는 원리상 실행 불가(승인자 설정 변경 필요).
- dashboard.spec: 미실행.
- 승인 대기 상태(참조 8·9의 리스트) 비교: 데이터 없음으로 미검증.
- 360px 요소 단위 넘침(카드 내부 표): 미측정.
- 사이드바 배지 갱신(P-06): 미검증.

### 판정
- 페이지 레벨 가로 넘침 없음(4폭 × 2역할 확인), 다른 화면 4개 깨짐 없음(관리자 1440 육안 확인).
- 참조 대조에서 레이아웃 근사 일치(데스크톱 배치), 그러나 셸·휴가 카드·休日出勤 단위·부서 표 열·390 표 잘림 등 차이 존재. frontend 전달 목록 6건.
- 미실행 항목이 남아 있어 전체 RESULT는 **FAIL**.


## Run 4 (디자인 재현 2차, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경
- 격리 스택: 백엔드 `localhost:6100`(workbridge_test, 컴파일본 `backend/.e2e-tmp-dist` 실행, 정리 완료), 프런트 `localhost:3100`(`frontend/.e2e-3100` 복사본, `BACKEND_URL=http://localhost:6100`, turbopack root만 조정, 정리 완료). 개발 서버 3000·6000과 개발 DB는 건드리지 않음.
- 테스트 DB 조치(이전 승인 범위 내): 스키마 상태 확인(마이그레이션 4건 up to date), `prisma db seed`(SEED_ADMIN_PASSWORD=test0000, 관리자 00001 + 부서 4건 생성), `db:e2e-accounts`(900001·900002 생성, test0000). 이후 테스트용 데이터: 900001 2026년 연차 부여 10일, 900002→900001 PENDING 특별휴가 2건(2026-12-21·22, 승인·반려 대상). 각 spec 실행 전 `db:e2e-leaves-reset`·`db:e2e-attendance-reset`·`db:e2e-attendance-fixture`를 테스트 DB 기준으로 수동 실행.
- 900002 비밀번호: test0000 기준. dashboard-renewal(P-02·P-05·P-10) 실행용으로 테스트 DB의 mustChangePassword를 false로 바꾼 뒤, password.spec 실행 전후로 `db:e2e-accounts`(테스트 DB)로 복구. 최종 상태: test0000, mustChangePassword=true(E2E 기준 초기 상태). 개발 DB의 900002는 Run 3에서 변경된 NewPass123 상태 그대로 두었음(되돌리지 않음, 다음 db:e2e-accounts 실행 시 복구).
- 개발 DB: 이번 Run에서 쓰기 없음. 휴가·근태를 쓰지 않음.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend vitest | `npx vitest run` | 40 파일 / 556 통과 / 0 실패 |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Frontend lint | `npx eslint src e2e` (스크립트 `npm run lint`는 격리 복사본의 .next 산출물을 잡아 실패하므로 소스 대상으로 실행) | 오류 없음 (exit 0) |
| Playwright 읽기 | login, dashboard, attendance-sheet-layout | 20 통과 / 0 실패 |
| Playwright 신규 | dashboard-renewal (P-01~P-10) | 9 통과 / 0 실패 (최종 실행) |
| Playwright | approvals, departments | 9 통과 / 0 실패 |
| Playwright | leaves | 8 통과 / 0 실패 |
| Playwright | attendance-status | 6 통과 / 0 실패 (fixture 적용 후) |
| Playwright | password | 3 통과 / 0 실패 (`db:e2e-accounts` 복구 후) |
| Backend e2e | 생략 | 이번 Run에서 백엔드 코드 변경 없음(프런트·E2E spec·테스트 DB 데이터만 변경). 직전 Run 2에서 363 통과 기록 |
| Backend unit·tsc | 생략 | 백엔드 변경 없음 |

Playwright 실행 중 발생한 실패와 조치(모두 테스트 측 문제, 구현 코드는 수정하지 않음)
1. P-06·P-07·P-08: `readStat`이 통계 라벨의 `span.min-w-0` 조상을 찾지만, 현재 DOM은 승인대기 카드가 `a`(링크), 출근 카드가 `div`. → 조상 locator를 `ancestor::*[self::a or self::div or self::span][1]`로 갱신. 담당 tester, 해결. assertion은 변경하지 않음.
2. P-09: 「休暇が承認されました。」 토스트 미표시 → 원인은 테스트 DB에 900001 연차 부여가 없어 잔여 부족으로 신청 거부. 테스트 DB에 2026년 부여 10일 입력 후 통과. 담당 tester(데이터 준비), 해결.
3. P-06·P-07 fixture 소진: 한 번 실행하면 PENDING 2건이 소진되므로 재실행 전 fixture 재삽입 필요(절차화).
4. attendance-status 6건 실패: 1차 실행에서 `envt` 헬퍼가 frontend 디렉터리에서 `.env.test`를 찾아 fixture 적용이 되지 않은 상태로 실행. 백엔드 디렉터리에서 재실행해 6/6 통과. 담당 tester(실행 절차), 해결.
5. password 2건 실패: 앞선 dashboard-renewal 준비로 900002 mustChangePassword가 false로 남아 있었음. `db:e2e-accounts` 복구 후 3/3 통과.

### 디자인 재현 캡처 (screenshots/, 파일명 design2-*)
- 관리자: `design2-admin-1440.png`, `-1024.png`, `-390.png`, `-360.png`, 드로워 `design2-admin-390-drawer.png`
- 사원: `design2-employee-1440.png`, `-1024.png`, `-390.png`, `-360.png`, 드로워 `design2-employee-390-drawer.png`
- 다른 화면(관리자, 1440·390): `design2-other-attendance-*.png`, `design2-other-leaves-*.png`, `design2-other-approvals-*.png`, `design2-other-departments-*.png`
- 원자료: `design2-overflow.json`(대시보드), `design2-other-screens.json`(다른 화면)
- 주의: 캡처에 보이는 "1 Insight" 오버레이는 Next dev indicator, 1440 fullPage의 사이드바 배경 끊김과 390 fullPage의 하단 탭 중간 노출은 캡처 방식에 따른 아티팩트. 제품 결함 아님.

### (4) 가로 넘침·「各部署の状況」 표 실측 (documentElement, 표 요소 단위)
| 역할·폭 | 문서 scrollWidth/clientWidth | 표 scrollWidth/clientWidth | 표가 카드 밖으로 나감 | 래퍼 overflow-x | 표 헤더 |
|---|---|---|---|---|---|
| 관리자 1440 | 1440/1440 | 328/328 | 아니오 | auto(넘침 없음) | 部署・在籍人数・出勤（率）・休暇・未出勤 |
| 관리자 1024 | 1024/1024 | 644/644 | 아니오 | auto(넘침 없음) | 同上 |
| 관리자 390 | 390/390 | 316/316 | 아니오 | auto(넘침 없음) | 同上 |
| 관리자 360 | 360/360 | 286/286 | 아니오 | auto(넘침 없음) | 同上 |
| 사원 1440 | 1440/1440 | 452/452 | 아니오 | auto(넘침 없음) | 同上 |
| 사원 1024 | 1024/1024 | 644/644 | 아니오 | auto(넘침 없음) | 同上 |
| 사원 390 | 390/390 | 316/316 | 아니오 | auto(넘침 없음) | 同上 |
| 사원 360 | 360/360 | 286/286 | 아니오 | auto(넘침 없음) | 同上 |

- Run 3에서 390 표가 카드 밖으로 잘린다고 기록했던 항목은 이번 측정에서 해소(표 폭이 카드 안에 맞고 내부 스크롤도 없음). 단 390에서 「出勤（率）」 셀이 2줄로 줄바꿈되어 읽기 어려움(육안 확인).
- 아래 「アラート」 열은 현재 구현에 없음(참조 10에만 있음).

### (3) 모바일 하단 탭·드로워·다른 화면
- 390·360: 하단 탭바(`nav[aria-label=モバイルメニュー]`) 노출, 높이 64, top 780. 본문 최하단 요소 bottom 732로 탭과 겹침 없음(main의 pb-28 확보). 관리자·사원 모두 동일.
- 1440·1024: 하단 탭 숨김(lg 미만 전용 구조 확인).
- 햄버거(`メニューを開く`) → `#app-drawer` 열림, 링크 표시, Escape로 닫힘. 관리자·사원 모두 동작 확인.
- 다른 화면(근태 `/attendance`, 휴가 `/leaves`, 승인 `/leaves/approvals`, 부서 `/admin/departments`): 1440·390 모두 가로 넘침 없음(doc 폭 일치), 탭과 본문 겹침 없음, 육안 캡처 1440 확인에서 깨짐 없음.

### (2) 참조 이미지 대조 (8=관리자 데스크톱, 9=관리자 모바일, 10=사원 데스크톱, 11=사원 모바일)
| 항목 | 참조 | 현재 구현 | 판정 |
|---|---|---|---|
| 셸(사이드바) | 아이콘 있는 사이드바, 브랜드 WorkFlow | 텍스트 사이드바, workBridge 로고 | 차이(셸 유지 결정 시 의도된 차이, 사용자 결정 필요) |
| 상단 바 | 벨·아바타 | 벨·사용자명 드롭다운 | 차이(작음) |
| 8 상단 3카드 | 全社員数·本日の出勤者·承認待ちの申請 | 동일 | 일치 |
| 8 배치(1440 3열 조합) | 출근+승인 / 전사+월간 / 휴가·부서·직근 | 동일 | 일치 |
| 8 승인대기 행 | 이름·부서·종류 배지·기간 + 하단 안내 줄 「承認管理ページに移動」 | 이름·부서·종류·기간, 하단 안내 줄 없음 | 차이(작음) |
| 8 출근 카드 | 勤務中 상태 | 未出勤(데이터 상태 차이) | 데이터 차이, 판정 제외 |
| 8 월간 지표 | 勤務日数·総労働時間·残業時間 (3개) | 4개(休日出勤 추가) | 차이. 계획 F-32 기준. 사용자 결정 필요 |
| 8 휴가 카드 | 有給休暇 残日数 / 今年の取得日数 | 残日数 / 今年の取得日数 + 休暇を申請 버튼 | 라벨 일치, 버튼은 차이(사용자 결정) |
| 8 부서 표 | 部署・在籍人数・出勤・休暇・未出勤 | 동일 구조(출근은 「(率)」 포함) | 근사 일치 |
| 8 直近の申請履歴 | 행 2~3개 + 상태 배지 | 빈 상태(데이터 없음) | 데이터 차이, 판정 제외 |
| お知らせ | 있음 | 없음 | 의도된 차이(공지 기능 없음, plan 제외) |
| 9 모바일 헤더 | 「管理者ダッシュボード」 소제목 + 큰 인사 | 인사 2줄, 소제목 없음 | 차이(작음) |
| 9 상단 3카드 | 가로 3열 | 가로 3열 | 일치 |
| 9 도넛+범례 | 있음 | 있음 | 일치 |
| 9 승인대기 리스트 | 4행, 큰 행 | 2행(데이터), 행 내 이름이 4줄로 줄바꿈되어 가독성 낮음 | 차이: 390에서 「E2E初回ログイン」이 4줄 줄바꿈. 결함 후보(frontend 확인 필요) |
| 9 하단 탭 | 있음(홈·出勤簿·休暇管理·社員情報·各種設定) | 있음(ホーム·出勤簿·休暇管理·休暇承認·メニュー) | 탭 항목 구성 차이(셸·계획 결정) |
| 10 사원 데스크톱 배치 | 좌: 출근 / 우: 월간+휴가 / 하단: 部署・直近 | 동일 | 일치 |
| 10 월간 4지표 단위 | 休日出勤 「0日」 | 「0時間」 | 차이. 단위 결정 필요(F-32는 時間) |
| 10 휴가 카드 | 「今年の取得日数」 + 링크 없음 | 同 라벨 + 「休暇を申請」 버튼, 「付与日数が登録されていません」 안내 | 버튼 차이(사용자 결정). 안내는 데이터 상태 |
| 10 부서 표 | アラート 열(「1件」 배지) | 없음(출근(率)·休暇·未出勤) | 차이(계획에 없음, 사용자 결정) |
| 10 直近 | 날짜 우측 + 상태 배지 | 상태 배지 + 날짜 | 근사 일치 |
| 11 사원 모바일 | 큰 인사 2줄, 출근, 월간 3지표(休日出勤 없음), 휴가「休暇管理へ」, 최근 신청 리스트(아이콘 2줄) | 큰 인사, 출근, 월간 4지표, 휴가(「休暇履歴を見る」 링크 아님·버튼 있음), 부서 표 카드 노출, 직근 리스트 | 차이: 월간 4지표, 부서 카드 노출(참조 11에는 없음), 리스트 아이콘 없음 |
| 11 하단 탭 | 있음 | 있음 | 항목 구성 차이 |
| 색·카드·radius | 연한 파랑 배경, 큰 라운드 | 유사 톤 | 근사 일치 |

- 의도된 차이(계획 기준): 캘린더·お知らせ 없음, 셸 유지(텍스트 사이드바·햄버거 구조), 10.png 세로 묶음 미재현.
- 판정 필요(사용자 결정): (a) 셸 아이콘·하단 탭 항목, (b) 휴가 카드의 「休暇を申請」 버튼 노출, (c) 休日出勤 단위(時間 vs 日), (d) 부서 표 アラート 열 추가 여부, (e) 사원 모바일 부서 카드 숨김 여부, (f) 월간 지표 4개 vs 3개.
- 구현 측 확인 권장(결함 후보): 390 승인대기 행의 이름 줄바꿈(4줄), 390 부서 표 「出勤（率）」 2줄 줄바꿈.

### (5) 확인 항목: 사원 휴가 카드 「今年の取得日数」(approvedDays) 정의
- `backend/src/modules/leaves/leaves.service.ts` `getBalance`: `approvedDays = sumDeductibleDaysByStatus(APPROVED)`의 합.
- `leaves.repository.ts` `groupDeductibleDays`: 조건은 `userId`, 공제 대상 휴가 종류, `status in (APPROVED, PENDING)`, `startDate ∈ [해당 연도 1/1, 12/31]`. 기준일(오늘) 조건 없음.
- 결론: 미래 날짜의 APPROVED 휴가도 approvedDays에 포함됨. 「今年の取得日数」 값은 "올해 승인된 전체 일수(미래 포함)"이며, D12 의미("기준일까지 취득한 일수"로 해석될 여지)와 어긋날 수 있음 → **사용자 결정 필요**. 이번 Run에서는 값을 바꾸지 않음.
- 참고: dashboard 사원 카드 라벨 「今年の取得日数」는 messages(ja.ts) 라벨과 일치.

### 이번 Run에서 테스트 파일 변경
- 수정: `frontend/e2e/dashboard-renewal.spec.ts` `readStat` 조상 locator 1곳(통계 카드 DOM 변경 반영). assertion·기대값은 변경 없음.
- 임시 생성 후 삭제: `frontend/e2e/design2-capture.spec.ts`(캡처 전용). 저장소에 남기지 않음.
- 구현 코드·docs·커밋·브랜치 변경 없음.

### 미검증·남은 항목
- P-06 사이드바 승인 배지 갱신: spec 미구현(통계 件数 −1만 검증). 미검증.
- 360 이하 카드 내부 표 요소 단위 넘침: 측정 완료(넘침 없음). 
- 참조 대조 중 데이터 의존 항목(승인 행 리스트 세부, 직근 리스트, 출근 상태 등)은 데이터 상태 차이로 판정 제외.
- Backend e2e 미실행(변경 없음으로 생략).

### 최종 판정
- 자동 테스트(vitest 556, tsc, lint, Playwright 대시보드·관련 spec 전부)는 모두 통과.
- 그러나 디자인 재현 기준(참조 8·9·10·11)에 남은 차이가 있고, 그중 여러 항목은 사용자 결정이 필요함. 또한 approvedDays 정의 확인 결과 사용자 결정 필요.
- 따라서 RESULT: FAIL (테스트 실패는 0건. 사유는 디자인 차이 잔존 및 사용자 결정 대기 항목).


## Run 5 (최종, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·데이터 조치
- 테스트 DB(`workbridge_test`)만 사용. 개발 DB(`workbridge`)와 개발 서버 3000·6000은 건드리지 않음(개발 서버는 실행 중 그대로 확인).
- 테스트 DB 스키마 DROP 후 `db:migrate:test`(마이그레이션 4건) → `db:seed`(SEED_ADMIN_PASSWORD=test0000) → `db:e2e-accounts`. 백엔드 e2e 실행 후 격리 스택 기동 전에 같은 절차로 재초기화.
- 격리 스택: 백엔드 `localhost:6100`(컴파일본 `backend/.e2e-tmp-dist`, `workbridge_test`), 프런트 `localhost:3100`(`frontend/.e2e-3100` 복사본, `BACKEND_URL=http://localhost:6100`, turbopack root는 저장소 루트). 종료 후 프로세스·임시 디렉터리 정리 완료.
- 모든 DB 준비 스크립트는 `DATABASE_URL`을 테스트 DB로 명시해 실행(`dotenv`가 `.env`(개발 DB)를 읽지 않도록).
- 테스트 DB 전용 준비: 900002→900001 PENDING 특별휴가 2건(2026-12-21·22), 900001 2026년 연차 부여 10일, 900002 mustChangePassword는 spec 요구에 따라 false/true 전환. 최종적으로 `db:e2e-accounts`로 복구(900002 test0000, mustChangePassword=true).
- spec이 `PLAYWRIGHT_BASE_URL` 지정 시 DB 준비·정리 hook을 건너뛰는 설계라, attendance·attendance-status·leaves·approvals 계열은 실행 전 준비 스크립트를 수동으로 실행함(Run 2·4와 동일 절차). assertion은 변경하지 않음.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend unit | `npx vitest run` | 21 파일 / 300 통과 / 0 실패 |
| Backend e2e (테스트 DB, 초기화 후 전체) | `npm run test:e2e` | 14 파일 / 358 통과 / 0 실패 (Run 2의 363은 dashboard-leave-calendar spec 삭제·dashboard-department-status 신규 반영 전 수치) |
| Backend tsc | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Backend lint | `npm run lint` | 오류 없음 (exit 0) |
| Frontend vitest | `npx vitest run` | 40 파일 / 554 통과 / 0 실패 (Run 4의 556에서 2 감소: LeaveCalendarSection.test.tsx 삭제분) |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Frontend lint | `npm run lint` | 오류 없음 (exit 0) |
| Playwright 읽기 | login, dashboard, attendance-sheet-layout | 20 통과 / 0 실패 |
| Playwright | dashboard-renewal | 9 통과 / 0 실패 |
| Playwright | approvals, departments | 9 통과 / 0 실패 |
| Playwright | leaves | 7 통과 / 0 실패 |
| Playwright | attendance | 4 통과 / 0 실패 |
| Playwright | attendance-status | 6 통과 / 0 실패 |
| Playwright | password | 3 통과 / 0 실패 |
| Playwright 합계 | 대상 9개 spec | 58 통과 / 0 실패 / 0 skip |

자동 테스트 실패는 0건이다. 실행 중 발생한 실패는 모두 실행 절차(DB 준비 누락, 이전 실행이 바꾼 비밀번호·데이터 잔존, 드로어 열림 판정 방식)에서 나온 것이며 테스트 측 절차로 해결했다. 구현 코드와 assertion은 바꾸지 않았다. 임시 spec(캡처·측정용)은 작성 후 삭제했다.

### 작성·수정한 테스트 파일
- 신규·수정 없음(이번 Run). 임시 `frontend/e2e/final-capture.spec.ts`, `final-pending.spec.ts`는 측정 후 삭제.

### 스크린샷·실측 (`.claude/work/dashboard-renewal/screenshots/`)
- 전체 페이지: `final-admin-1440.png`, `final-admin-1024.png`, `final-admin-390.png`, `final-admin-360.png`, `final-employee-1440.png`, `final-employee-1024.png`, `final-employee-390.png`, `final-employee-360.png`
- 드로어(390·360): `final-admin-390-drawer.png`, `final-admin-360-drawer.png`, `final-employee-390-drawer.png`, `final-employee-360-drawer.png`
- 원자료: `scratchpad/final-measure.json`, `scratchpad/final-pending.json` (C:\Users\JINHYE~1\AppData\Local\Temp\claude\980a315307d2503d\4f46290f-7da7-4634-8a07-b2cc59afa1c7\scratchpad\)

가로 넘침(documentElement scrollWidth = clientWidth): 관리자·사원 × 1440·1024·390·360 전부 넘침 없음.

「各部署の状況」 표(요소 단위):
| 역할·폭 | 표가 카드 안 | 래퍼 overflow-x | 셀 잘림 | 비고 |
|---|---|---|---|---|
| 관리자 1440/1024/390 | 예 | auto, 스크롤 없음 | 없음 | 「1名（50.0%）」 2줄 줄바꿈 |
| 관리자 360 | 예 | auto, 스크롤 없음 | 없음 | 부서명 2줄 줄바꿈 |
| 사원 1440/1024/390 | 예 | auto, 스크롤 없음 | 없음 | 동일 |
| 사원 360 | 예 | auto, 스크롤 없음 | 없음 | 동일 |

승인 대기 행(요소 단위, 관리자):
- 1440: 테이블 행, 이름·부서·종류·기간 모두 1줄, 잘림 없음.
- 390·360: 목록형 행. 이름「E2E初回ログイン」과 부서「開発部」가 1줄로 잘리고(clipped=true, 말줄임) 화면상 「E2…」「開…」로만 보임. 줄바꿈으로 4줄이 되던 Run 4 상태는 해소됐으나 **이름이 식별 불가할 정도로 잘림** → 결함 후보(frontend).
- 사원 화면에는 승인 대기 목록이 없음.

모바일 셸:
- 390·360: 하단 탭 노출(top 780, height 64), 본문과 겹침 없음. 관리자 탭 「ホーム・出勤簿・休暇管理・休暇承認(承認待ち2件 배지)・メニュー」, 사원 탭 「ホーム・出勤簿・休暇管理・休暇承認・メニュー」.
- 「メニュー」 탭 → `#app-drawer` hidden 해제 확인(390·360, 관리자·사원). 드로어 항목: 관리자 7개(ダッシュボード·出勤簿·休暇管理·休暇承認(2)·社員管理·部署管理·全体勤怠), 사원 4개. Esc로 닫는 동작은 키 입력만 보냈고 닫힘 상태는 측정하지 않음(미검증).
- 1440·1024: 하단 탭 숨김 확인(visible=false).

### 확인 항목 (4)
| 항목 | 결과 |
|---|---|
| 사원 휴가 카드 라벨 「承認済み日数」 | 확인됨 (4폭 모두, 사원 DOM에 존재). 참조 10·11의 「今年の取得日数」와 다름 → 사용자 확인 대기 |
| 「休暇を申請」 버튼 없음 | 확인됨 (관리자·사원, 4폭 전부 부재) |
| 부서 표 アラート 열 없음 | 확인됨 (4폭 전부 헤더 부재) |
| 월간 지표 4개 | 확인됨 (관리자·사원 모두 勤務日数·総労働時間·残業時間·休日出勤 4개). 참조 8·11은 3개 |
| 셸 하단 탭 「休暇承認」·「メニュー」 | 확인됨. 단 사원 탭에도 「休暇承認」이 있음(참조 11은 사원 탭 4개). 사용자 확인 대기 |
| 셸 탭 「社員情報」·「各種設定」 | 미구현 상태 그대로(드로어에는 社員管理·部署管理·全体勤怠). 사용자 확인 대기 |

### 디자인 차이 최종 목록 (참조 8·9·10·11 대비)
구분: [결함] 수정 필요 후보, [결정] 사용자 결정 대기, [의도] 계획상 의도된 차이, [데이터] 데이터 상태 차이로 판정 제외.

| # | 대상 | 참조 | 현재 구현 | 구분 |
|---|---|---|---|---|
| 1 | 390·360 승인 대기 행 | 이름·부서 한 줄 이상 전체 표시 | 이름·부서가 1줄로 잘려 「E2…」「開…」 | [결함] frontend |
| 2 | 8 승인 대기 하단 안내 줄 「承認管理ページに移動」 | 있음 | 없음 | [결정] 계획 확인 |
| 3 | 8·10·11 월간 지표 개수 | 3개(勤務日数·総労働時間·残業時間) | 4개(休日出勤 추가) | [결정] F-32 기준 |
| 4 | 10 休日出勤 단위 | 「0日」 | 「0時間」 | [결정] 단위 |
| 5 | 10·11 휴가 카드 라벨 | 「今年の取得日数」 | 「承認済み日数」 | [결정] approvedDays 정의와 함께 확인 |
| 6 | 11 휴가 카드 링크 | 「休暇管理へ」 | 「休暇履歴を見る」 | [결정] |
| 7 | 10 부서 표 アラート 열 | 있음(「1件」 배지) | 없음 | [결정] 체크 항목 4와 상충, 사용자 결정 |
| 8 | 11 사원 모바일 부서 카드 | 없음 | 있음 | [결정] |
| 9 | 9·11 하단 탭 항목 | ホーム·出勤簿·休暇管理·社員情報·各種設定 | ホーム·出勤簿·休暇管理·休暇承認·メニュー | [결정] 셸 |
| 10 | 셸 사이드바 아이콘·브랜드 | 아이콘 있는 사이드바, WorkFlow | 텍스트 사이드바, workBridge | [결정] 셸 유지 여부 |
| 11 | 9 모바일 헤더 소제목 「管理者ダッシュボード」 | 있음 | 없음 | 차이(작음) |
| 12 | 8·10 お知らせ | 있음 | 없음 | [의도] 공지 기능 없음 |
| 13 | 8 출근 카드 상태 | 勤務中 | 未出勤 | [데이터] 판정 제외 |
| 14 | 8·10 직근 신청·승인 대기 데이터 | 행 있음 | 데이터 상태 차이 | [데이터] 판정 제외 |
| 15 | 10 휴가 카드 「付与日数が登録されていません」 안내 | 없음 | 있음(데이터 상태) | [데이터] |

- 레이아웃 근사 일치: 8·10 데스크톱 배치, 상단 3카드, 도넛+범례, 390·360 가로 넘침 없음, 부서 표 카드 내 수용.
- 사원 11·관리자 9는 육안 전체 대조를 하지 않았고, 위 표는 DOM 실측과 관리자 390 캡처 육안 확인에 근거한다. 사원 390 캡처의 육안 대조는 미실시.

### 사용자 확인 대기 항목 (판정 조건 아님, 결과에 명시만)
1. 社員情報·各種設定 탭 대체(셸 항목 구성)
2. approvedDays(「今年の取得日数」/「承認済み日数」) 정의: 현재 값은 올해 APPROVED 전체 일수(미래 날짜 포함) 기준
3. 로드맵(docs/10) 상태 갱신 여부

### 최종 판정
- 자동 테스트: 백엔드 unit 300·e2e 358, 프런트 vitest 554, Playwright 대상 58 전부 통과, tsc·lint 전부 통과. 실패 0건.
- 디자인 재현: 결함 1건(390·360 승인 대기 이름·부서 잘림, [결함] frontend 담당)과 사용자 결정 대기 항목 다수가 남아 있어 전체 RESULT는 FAIL로 둔다.
- 담당: #1 frontend. 나머지 [결정] 항목은 사용자 결정 후 frontend 작업.

## Run 6 (frontend 4차 수정 검증, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·안전 조치
- 개발 DB(`workbridge`) 쓰기 없음. `db:e2e-accounts`도 실행하지 않음. 모든 DB 작업은 테스트 DB(`workbridge_test`)에만 수행(명령마다 `backend/.env.test` 값을 환경변수로 명시).
- 개발 서버 3000은 그대로 유지. 6000은 Run 6 중 건드리지 않았고, 종료 점검 시 LISTEN 중인 것을 확인(내가 기동하지 않음).
- 격리 스택: 백엔드 `localhost:6100`(`backend/dist/main.js`를 `workbridge_test`로 기동), 프런트 `localhost:3100`(`frontend/.e2e-3100` 복사본, `BACKEND_URL=http://localhost:6100`). 종료 후 두 프로세스 종료와 `.e2e-3100`·`backend/.e2e-tmp-dist` 삭제 완료.
- `backend/dist`는 `tsc -p tsconfig.build.json` 실행으로 현재 소스 기준 재생성됨(백엔드 소스 변경 없음, 빌드 산출물).
- 테스트 DB 준비: 스키마 DROP → `db:migrate:test` → `prisma db seed`(SEED_ADMIN_PASSWORD=test0000) → `db:e2e-accounts`. 이후 900002 `approval_required=true`, 900002→900001 PENDING 특별휴가 2건(2026-12-21·22), 900001 2026년 부여 10일(SQL, 테스트 DB만). 900001 근태 reset(`db:e2e-attendance-reset`), 900002 `must_change_password=false`(dashboard-renewal P-02·P-05·P-10 요구).
- 실행 종료 시점 테스트 DB 상태: 900002 must_change_password=false, PENDING 일부가 spec에서 처리됨. 다음 실행 전 `db:e2e-accounts`와 SQL 재준비 필요.

### (1) 390·360 승인 대기 행 실측 (관리자 900001, 승인 대기 PENDING 2건 표시 상태)
측정 방법: 임시 spec(측정 후 삭제)으로 요소 텍스트 `E2E初回ログイン`·`開発部`의 DOM 실측(Range 기반 줄 수, scrollHeight/clientHeight, scrollWidth/clientWidth, 우측 경계). 원자료: `scratchpad/run6-pending.json`.

| 폭 | 이름「E2E初回ログイン」 | 부서「開発部」 | 잘림 | 문서 가로 넘침 |
|---|---|---|---|---|
| 390 | 박스 133px, 1줄 | 1줄 | 없음(clipped false) | 없음(390/390) |
| 360 | 박스 103px, **2줄**(「E2E初回ログ」「イン」) | 1줄 | 없음(scrollHeight = clientHeight 48) | 없음(360/360) |

- 390·360 모두 이름·부서 전체 글자가 노출되고 잘림이 없음. Run 5의 「E2…」「開…」 잘림은 해소.
- 2줄 허용 여부: 현재 구현은 `line-clamp-2`(최대 2줄)이며, 360에서 이름이 2줄로 감김. 3줄째로 넘어가는 경우 말줄임이 되므로 이 데이터(9자)는 2줄 안에 전부 들어감. 2줄 허용 기준으로 PASS 판정.
- 스크린샷: `.claude/work/dashboard-renewal/screenshots/run6-admin-390-pending.png`, `run6-admin-360-pending.png`(행 단위), `run6-admin-390.png`, `run6-admin-360.png`(전체 페이지).
- 육안: 390은 이름 1줄, 360은 이름 2줄(「E2E初回ログ/イン」), 부서 1줄, 우측 유형 배지·기간·일수와 쉐브론 모두 보임.

### (2) 자동 테스트
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend vitest | `npx vitest run` | 40 파일 / 554 통과 / 0 실패 |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| Frontend lint | `npm run lint` (원본 frontend, 복사본 삭제 후 재실행) | 오류 없음 (exit 0) |
| Playwright (격리 스택 3100, PLAYWRIGHT_BASE_URL 지정) | `npx playwright test e2e/dashboard-renewal.spec.ts e2e/dashboard.spec.ts e2e/login.spec.ts e2e/attendance-sheet-layout.spec.ts` | 29 통과 / 0 실패 / 0 skip (dashboard-renewal 9, dashboard·login·attendance-sheet-layout 20) |

- 참고: 복사본 프런트에서 `npm run lint`를 돌리면 `.e2e-3100/.next` 산출물까지 잡혀 실패함. 그래서 복사본 실행 중에는 `npx eslint src e2e`(exit 0)로 소스만 확인했고, 복사본 삭제 후 `npm run lint`로 최종 확인함.
- 임시 spec(`frontend/e2e/tester-run6-pending.spec.ts`)은 측정 후 삭제. 저장소에 남은 spec 변경 없음.

### (3) 백엔드 — 생략
- 이번 Run 대상인 4차 수정은 frontend(`PendingApprovalsSection.tsx`)만 변경. 백엔드 소스 변경 없음.
- 백엔드 unit·e2e는 Run 5 결과(unit 300, e2e 358 통과)를 그대로 유지. Run 6에서는 실행하지 않음(사용자 지시에 따라 생략 가능).

### (4) 결과 요약
- 자동 테스트: 프런트 vitest 554, tsc·lint 통과, Playwright 대시보드 관련 29 통과. 실패 0, 미실행 0(백엔드 제외, 사유 위 (3)).
- 390·360 승인 대기 결함: **해소**(이름「E2E初回ログイン」·부서「開発部」 전체 노출, 잘림 없음, 360은 이름 2줄).

### 남은 차이 목록 (사용자 결정 확정 항목은 판정 제외)
사용자 확정으로 판정 대상 아님: 하단 탭 休暇承認·メニュー, workBridge 브랜드, 「休暇履歴を見る」, 월간 4개, 休日出勤 시간, 부서 アラート 없음, 휴가 카드 「承認済み日数」.

판정 대상이 아닌 확정 전 항목(Run 5 목록 기준, 결정 필요):
1. 8 승인 대기 하단 안내 줄 「承認管理ページに移動」 없음(계획 확인 필요)
2. 사원 모바일 부서 카드 노출 여부(참조 11에는 없음)
3. 9 모바일 헤더 소제목 「管理者ダッシュボード」 없음(차이 작음)
4. 셸 탭 「社員情報」·「各種設定」 미구현(사용자 확인 대기)
5. approvedDays 정의(「今年の取得日数」 대 「承認済み日数」 라벨과 연결, 미래 APPROVED 포함 여부) 사용자 확인 대기
6. 로드맵(docs/10) 상태 갱신 여부 사용자 확인 대기
- 데이터 상태 차이(판정 제외): 8 출근 상태(未出勤), 직근 신청 데이터, 10 휴가 카드 안내 문구.

### 미검증
- 사원(900002) 390·360 승인 대기 목록은 사원 화면에 없으므로 해당 없음.
- Playwright P-03 참조 이미지 픽셀 대조는 수행하지 않음(Run 2에서 파일 위치 미확인으로 미실행 기록). 이번 Run은 DOM·스크린샷 육안 확인까지.

## 리뷰 보강 (review.md Round 1, tester 담당 항목)

실행일 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋. frontend 소스는 수정하지 않았고 테스트 파일만 작성·수정했다.

### 작성·수정한 테스트 파일
| 파일 | 구분 | 내용 |
|---|---|---|
| `frontend/src/app/(app)/dashboard/DashboardView.test.tsx` | 추가 | 「承認待ち(件数・却下・処理後の状態)」 describe 7건: F-02 배지 count 조회 실패 시 카드 없음, F-25 반려 사유 공백·공백만·501자 검증 메시지(API 미호출), F-25 정상 반려(trim 후 전송, 토스트, 목록 재조회), F-26 승인 409 ALREADY_PROCESSED(토스트, 모달 닫힘, 목록·배지 재조회), F-27 마지막 1건 승인 후 카드 소멸·토스트 유지 |
| `backend/src/modules/dashboard/today-status-rules.spec.ts` | 추가 | U-01 토요일 공휴일(2028-01-01) false, U-03 1/3→33.3, 2/3→66.7 |
| `backend/test/admin-dashboard.e2e-spec.ts` | 교체·추가 | 동어반복 `shouldReturnAttendanceRateWithOneDecimalPlace` 삭제 → `…FromFixedData`: 2025-06-02(월, 입사일 2025-01-01 3명, 기대 total 3 / 出勤 1 / 休暇 1 / 未出勤 1 / 33.3). 응답 키 8개 정확 일치. 비근무일(토 2026-11-14)에서 totalEmployeeCount가 평일(11-16)과 같음(IT-DASH-18) |
| `backend/test/dashboard-department-status.e2e-spec.ts` | 추가·수정 | 부서 코드 오름차순 정렬(IT-DASH-21, 작성 순서와 반대로 생성), 부서 합계 = GET /admin/dashboard/summary(같은 Clock, IT-DASH-22), 제거 캘린더 API 404를 EMPLOYEE·ADMIN 모두 확인(IT-DASH-26) |

기존 테스트의 기대값은 바꾸지 않았다. 동어반복 테스트는 고정 기대값 검증으로 대체했다(의도한 교체).

### 설계 메모
- 공유 테스트 DB라 전체 summary 절대값은 고정할 수 없다. 그래서 고정 수치 검증은 2025-06-02(다른 테스트 데이터가 없는 날짜, 입사일 2025로 만든 사용자만 집계)에서 하고, 시작 시 `totalEmployeeCount === 0`을 가드로 확인한다.
- 이 과정에서 `attendanceRate`의 비교 대상으로 쓴 승인자 self-approval은 DB CHECK(`leaves_approver_not_self_check`)로 막혀 있어 승인자를 별도 사용자로 바꿨다.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend vitest (전체) | `npx vitest run` | 40 파일 / 561 통과 / 0 실패 (DashboardView.test.tsx 45건 중 신규 7건 포함) |
| Frontend tsc | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npx eslint` (DashboardView.test.tsx) | 오류 없음 |
| Backend unit (전체) | `npx vitest run` | 21 파일 / 302 통과 / 0 실패 (이전 300에서 +2: U-01 Saturday, U-03) |
| Backend tsc | `npx tsc --noEmit` | 오류 없음 |
| Backend lint | `npx eslint` (변경 spec 3개) | 오류 없음 |
| Backend e2e 대시보드 2개 | `npx vitest run --config ./vitest.config.e2e.ts test/admin-dashboard… test/dashboard-department-status…` | 2 파일 / 25 통과 / 0 실패 |
| Backend e2e 전체 | `npx vitest run --config ./vitest.config.e2e.ts` | 14 파일 중 12 통과, **2 실패 파일**, 354 통과 / 8 skipped / 실패 3건 |
| Prettier | 변경 테스트 4개 파일 `--check` | 통과 |

### 실패 / 미실행 항목
1. **[실패] `backend/test/db/e2e-accounts.e2e-spec.ts > resetE2eAccounts`, `backend/test/db/seed.e2e-spec.ts > seedInitialData`(2건)**
   - 에러 요약: `테스트 DB에 활성 ADMIN이 2 건 남아 있습니다` (사전 조건 검사에서 중단)
   - 원인 추정: 테스트 DB(`workbridge_test`)에 seed 계열 실행이 남긴 ADMIN 2명(사원번호 00001 「管理者」, 900001 「E2E管理者」, 생성 2026-11-12 10:30 JST, 이번 작업 이전)이 있다. 대시보드 변경과 무관하다(해당 spec은 대시보드 코드를 쓰지 않음). 이번 작업의 테스트가 만든 ADMIN은 tracker가 정리하므로 원인이 아니다. 테스트 DB 잔존 데이터 3명·3건(leaves)을 확인했다.
   - 담당: 환경(테스트 DB 정리). 테스트 코드 오류가 아니므로 tester가 임의로 지우지 않았다. 개발 DB는 건드리지 않았다. 테스트 DB 잔존 행 삭제 여부는 사용자 결정이 필요하다.
   - 정리 후 재실행하면 되는 것으로 보이나 확인하지는 못했다.
2. **[미확인] Backend e2e 전체 8건 skipped**: 소스에 `skip`·`skipIf` 표기가 없다. 실패한 beforeAll 뒤의 건너뜀으로 추정하지만 확인하지 않았다.
3. **[미실행] Playwright**: 이번 보강 범위가 아니므로 실행하지 않았다.

### 리뷰 항목 대응표
| review.md 항목 | 처리 |
|---|---|
| 중간: F-02 | 완료 (통과) |
| 중간: F-25 반려 검증 | 완료 (통과) |
| 중간: F-26 승인 409 | 완료 (통과) |
| 중간: F-27 마지막 건 소멸 | 완료 (통과, 목록을 상태 변화하는 mock으로 검증) |
| 중간: IT-DASH-21 정렬 | 완료 (통과) |
| 중간: IT-DASH-22 합계 | 완료 (통과) |
| 중간: IT-DASH-02 33.3·키 8개 | 완료 (통과) |
| 중간: IT-DASH-18 비근무일 total 불변 | 완료 (통과) |
| 중간: 동어반복 rate 테스트 교체 | 완료 (2025 고정 데이터, 통과) |
| 낮음: U-01 토요일 공휴일 | 완료 (통과) |
| 낮음: U-03 1/3·2/3 | 완료 (통과) |
| 낮음: 제거 API 404 ADMIN | 완료 (통과) |

## Run 7 (리뷰 보강 후, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·안전 조치
- 브랜치 확인: `feature/dashboard-redesign`. 커밋·push 없음.
- 테스트 DB 확인: `backend/.env.test`의 DATABASE_URL이 `workbridge_test`임을 확인하고, 모든 DB 작업을 이 값으로만 수행. 개발 DB(`workbridge`) 미접촉.
- 테스트 DB 초기화: `DROP SCHEMA public CASCADE` → `public` 재생성 → `npm run db:migrate:test` → `npm run db:seed`(SEED_ADMIN_PASSWORD) → `npm run db:e2e-accounts`(E2E 비밀번호는 환경변수로만 전달) → 테스트 DB 전용 SQL로 Playwright 픽스처 삽입(900002 approval_required=true, must_change_password=false / 900001 2026년 부여 10일 / 900002→900001 PENDING 특별휴가 2건 2026-12-21·22).
- 백엔드 e2e는 DB에 활성 ADMIN이 없어야 하므로(seed·e2e-accounts 스펙의 beforeAll 전제), e2e 실행 전 테스트 DB를 다시 초기화(drop → migrate만)한 뒤 실행. 이후 Playwright용으로 재구성.
- 격리 스택: 백엔드 `127.0.0.1:6100`(`backend/dist/main.js`, `workbridge_test`), 프런트 `localhost:3100`(`frontend/.e2e-3100` 임시 복사본, node_modules는 junction, `BACKEND_URL=http://127.0.0.1:6100`). 종료 후 두 프로세스 종료, junction 해제 후 복사본 삭제 완료. 개발 서버 3000·6000은 LISTEN 유지(내가 기동·종료하지 않음).
- `backend/dist`는 `tsc -p tsconfig.build.json`으로 현재 소스 기준 재생성(gitignore 대상 빌드 산출물). tsx로 직접 기동하면 Nest 데코레이터 메타데이터가 없어 500이 나므로 dist 사용.

### 8 skipped 원인 (백엔드 e2e)
- 소스에 `skip`·`skipIf` 표기 없음. 실행 환경 문제였음.
- `test/db/seed.e2e-spec.ts`(2)와 `test/db/e2e-accounts.e2e-spec.ts`(6)의 `beforeAll`이 「테스트 DB에 활성 ADMIN이 0명이어야 함」을 확인하는데, 초기 DB에 seed로 만든 ADMIN(00001, 900001)이 남아 있어 전제 실패 → 나머지 8건 skip.
- 조치: 테스트 DB를 초기화(migrate만, seed 없이)한 뒤 실행하자 8건 모두 통과. 테스트 코드 변경 없음.

### (2) 백엔드
| 구분 | 명령 | 결과 |
|---|---|---|
| unit | `npx vitest run` | 21 파일 / 302 통과 / 0 실패 |
| e2e (전체) | `npx vitest run --config ./vitest.config.e2e.ts` (clean 테스트 DB) | 14 파일 / 362 통과 / 0 실패 / 0 skipped |
| tsc | `npx tsc --noEmit` | exit 0 |
| lint | `npm run lint` | exit 0 |
- 1차 e2e(seed 잔존 상태)는 354 통과 / 8 skipped / 2 파일 실패였고, 위 원인으로 설명됨.

### (3) 프런트
| 구분 | 명령 | 결과 |
|---|---|---|
| vitest (전체) | `npx vitest run` | 40 파일 / 561 통과 / 0 실패 (3회 실행: 1차 1건 실패, 수정 후 2회 연속 561/561) |
| tsc | `npx tsc --noEmit` | exit 0 |
| lint | `npm run lint` | exit 0 |
| Playwright (격리 3100, PLAYWRIGHT_BASE_URL) | `npx playwright test e2e/dashboard-renewal.spec.ts e2e/dashboard.spec.ts e2e/login.spec.ts e2e/attendance-sheet-layout.spec.ts` | 29 통과 / 0 실패 / 0 skipped |

- 1차 vitest 실패 1건: `AttendanceSheetView.test.tsx > shouldMakeTimelineRegionFocusableOnlyWhenItOverflows`(`tabindex` null). 단독 실행 2회와 전체 재실행 1회에서는 통과. 원인 추정: `renderLayout`이 텍스트 등장만 기다리고, `useHorizontalOverflow`의 effect 후 state 갱신이 그보다 늦게 반영되는 테스트 측 경쟁 조건. 담당: tester(테스트 코드 수정).
- 조치: 같은 assertion을 `waitFor`로 감쌈(기대값 `tabindex="0"` 그대로, 약화 없음). 파일: `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx`(588행 부근).

### (4) 결과 요약
- 자동 테스트 실패 0건, 미실행 0건(요청 범위 전부 실행).
- 백엔드 unit 302 / e2e 362(skip 0), 프런트 vitest 561 / Playwright 29, tsc·lint 전부 통과.
- 수정 파일: 테스트 파일 1개(`AttendanceSheetView.test.tsx`). 구현·docs 수정 없음.

### 미검증·참고
- 테스트 DB는 Playwright 픽스처 상태로 남아 있음(다음 실행 전 재구성 필요).
- Run 6에서 기록한 디자인 차이 목록(사용자 결정 항목)은 이번 Run의 판정 범위가 아니므로 그대로 유지.
- 프런트 `frontend/test-results`, `backend/dist`는 실행 산출물(gitignore 대상).

## Run 8 (최종, 리뷰 수정 반영, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·안전 조치
- 브랜치 확인: `feature/dashboard-redesign`. 커밋·push 없음. 저장소 추적 파일 변경 없음(git status 항목 수 90, Run 8 전후 동일).
- 테스트 DB 초기화: `backend/.env.test`의 DATABASE_URL이 `workbridge_test`(localhost)임을 코드로 검사한 뒤 `DROP SCHEMA public CASCADE` → `npm run db:migrate:test`(migrate 4건 적용). seed(`db:seed`)는 실행하지 않음.
- 개발 DB(`workbridge`)·개발 서버(3000·6000): 접촉 없음. 6000·3000 LISTEN 유지(내가 기동·종료하지 않음).
- Playwright용 최소 준비(seed 대체, 테스트 DB 전용): 00001 初期 ADMIN(bootstrap INSERT, 비밀번호는 무작위 생성 후 미출력), 「開発部」DEV·「総務部」GA 부서 INSERT, 00001을 GA에 배치(departments spec의 「GA 활성 멤버」 전제), `npm run db:e2e-accounts`(DATABASE_URL을 테스트 DB로 명시 지정), 900002 `approval_required=true`·`must_change_password=false`, 900001 2026년 부여 10일, 900002→900001 PENDING 특별휴가 2건(2026-12-21·22).
- 격리 스택: 백엔드 `127.0.0.1:6100`(`backend/dist/main.js`, `workbridge_test`), 프런트 `localhost:3100`(`frontend/.e2e-3100` 임시 복사본 next build·start, BACKEND_URL=http://127.0.0.1:6100). 종료 후 두 프로세스 종료, node_modules junction은 Delete()로 링크만 해제(원본 357항목 확인), 복사본 삭제 완료.
- 기존 backend e2e가 실행 중 만든 DB 상태(ADMIN 존재)가 있으면 8건 skip이 재현되므로, e2e 직전 clean 초기화 상태에서 실행(Run 7 원인과 동일하게 해소).

### (1) 백엔드
| 구분 | 명령 | 결과 |
|---|---|---|
| unit (전체) | `npx vitest run` | 21 파일 / 302 통과 / 0 실패 |
| e2e (전체, clean 테스트 DB) | `npx vitest run --config ./vitest.config.e2e.ts` | 14 파일 / 362 통과 / 0 실패 / **0 skipped** |
| tsc | `npx tsc --noEmit` | exit 0 |
| lint | `npm run lint` | exit 0 |
- 시계 복원 테스트: `backend/test/admin-dashboard.e2e-spec.ts`의 try/finally 복원 대상(`shouldKeepTotalEmployeeCountOnNotWorkday` 포함. 파일 내 finally 블록 6곳 존재 확인) 파일이 전체 e2e 362건 통과에 포함. 파일 단독 로그 대신 전체 실행 결과로 확인.
- 8 skipped 원인 재확인(Run 7 기록): 테스트 코드의 skip 표기는 없음. 활성 ADMIN이 남아 있으면 seed·e2e-accounts 테스트의 beforeAll 전제가 깨져 8건이 건너뛰어짐. Run 8은 clean DB로 실행하여 0 skipped.

### (2) 프런트
| 구분 | 명령 | 결과 |
|---|---|---|
| vitest (전체) | `npx vitest run` | 40 파일 / 561 통과 / 0 실패 |
| tsc | `npx tsc --noEmit` | exit 0 |
| lint | `npm run lint` | exit 0 |

Playwright (격리 3100, `PLAYWRIGHT_BASE_URL=http://localhost:3100`, 대상 9 spec):
| 실행 묶음 | spec | 결과 |
|---|---|---|
| A | attendance-sheet-layout, attendance-status, approvals, dashboard, departments, leaves, login | 42 통과 / 0 실패 / 0 skip |
| B | dashboard-renewal | 9 통과 / 0 실패 / 0 skip |
| C | password | 3 통과 / 0 실패 / 0 skip |
| 합계 | 9 spec | **54 통과 / 0 실패 / 0 skip** |

- 묶음을 나눈 이유(실패가 아닌 실행 조건): `PLAYWRIGHT_BASE_URL` 지정 시 globalSetup과 spec별 DB 스크립트(`runBackendScript`, leaves의 reset, `e2e-accounts` 호출)가 모두 건너뛰어진다. 그래서 spec 간 상태 의존을 직접 맞춰야 했다.
  - attendance-status 픽스처(900001 당일 근태 6건)가 남으면 dashboard-renewal P-08(未出勤 시작)이 실패 → B 실행 전 `db:e2e-attendance-reset`.
  - 900001 기존 휴가가 남으면 P-09 신청 날짜 충돌 → B·leaves 전 `db:e2e-leaves-reset`.
  - password spec은 실행 시작 시 900002가 `mustChangePassword=true`여야 함. dashboard-renewal P-02는 false를 요구하므로 password는 별도 묶음(C)으로 `db:e2e-accounts` 후 실행.
  - 단일 호출로 9 spec을 한 번에 돌리면 위 상태 충돌로 실패가 나므로, 이번 결과는 묶음별 준비 후 실행한 결과임.
- 이전 실패 로그(run1~run5)는 전부 위 상태 충돌(픽스처 미적용, 잔존 데이터)에서 나온 것이며 코드 결함은 확인되지 않았다.
- 개발 DB 안전: 1~2차 Playwright 실행 시 셸 env에 백엔드 `.env`의 DATABASE_URL(개발 DB)이 로드된 상태였으나, `PLAYWRIGHT_BASE_URL`이 지정되어 spec의 DB 스크립트 호출은 전부 건너뛰어졌다(코드 가드 확인). 이후 모든 DB 스크립트는 DATABASE_URL을 `.env.test` 값으로 명시해 실행. 개발 DB에 대한 스크립트 실행은 없음.

### (3) 변경 반영 확인
- 도넛 休暇 색: `frontend/src/app/(app)/dashboard/CompanyAttendanceSection.tsx`의 休暇 `text-violet-100`(`--color-violet-100: #7c5cf0`). 격리 스택 대시보드(900001)에서 `svg circle.text-violet-100` computed color = `rgb(124, 92, 240)` 확인. 스크린샷 1장: `.claude/work/dashboard-renewal/screenshots/run8-donut-violet100.png`(全社の出勤状況, 出勤·未出勤·休暇 3구간, 休暇 보라색 렌더 확인). 이 확인을 위해 테스트 DB에 오늘(2026-11-12) 승인된 연차 1건(900002)을 추가 INSERT함(테스트 DB 전용, 임시 spec은 복사본에만 두었고 삭제 완료).
- 시계 복원 테스트 통과: 위 (1) 참조.

### (4) 결과 요약
- 자동 테스트 실패 0건, 미실행 0건, skip 0건.
- 백엔드 unit 302 / e2e 362 / tsc·lint 통과. 프런트 vitest 561 / Playwright 54(9 spec) / tsc·lint 통과. 도넛 休暇 violet-100 렌더 확인, 시계 복원 테스트 포함 e2e 전체 통과.
- RESULT: PASS.

### 남은 사항·주의
- 테스트 DB(`workbridge_test`)는 Playwright 픽스처와 bootstrap 데이터가 남아 있는 상태. 다음 백엔드 e2e 전에는 DROP SCHEMA → migrate(seed 없이) 재초기화가 필요.
- 격리 스택(3100, 6100) 종료·임시 복사본 삭제 완료. `backend/dist`(gitignore 대상 빌드 산출물)는 유지.
- seed 없이 최소 준비한 부분(bootstrap ADMIN·GA/DEV 부서·픽스처 SQL)은 seed 기반 실행과 데이터 구성이 다를 수 있음. 이번 결과는 위 준비 기준으로 검증된 것.

## Run 9 (UI 수정 5종 화면 확인, 2026-11-12, 브랜치 feature/dashboard-redesign, 미커밋)

### 환경·준비 기록
- 실행 전 `PLAYWRIGHT_BASE_URL`: 셸에 미설정(unset). 이번 Run은 명령마다 `PLAYWRIGHT_BASE_URL=http://localhost:3100`을 지정해 실행. globalSetup의 개발 DB 초기화는 실행되지 않음.
- 격리 스택: 백엔드 `127.0.0.1:6100`(backend를 `.e2e-tmp-dist`로 tsc 빌드, `workbridge_test`), 프런트 `localhost:3100`(`frontend/.e2e-3100` 임시 복사본, `BACKEND_URL=http://127.0.0.1:6100`으로 next build·start). 개발 서버 `dist/`는 건드리지 않음.
- 테스트 DB 초기화: `DROP SCHEMA public CASCADE` → `npm run db:migrate:test`(4 마이그레이션) → 최소 준비(seed 미사용): 開発部(DEV)·総務部(GA) 부서, 初期管理者 00001(GA 배치, 비밀번호 무작위 생성·미출력) → `npm run db:e2e-accounts`(DATABASE_URL을 테스트 DB로 명시, 900001·900002 비밀번호 test0000) → fixture(900002 承認必須·初回変更済み, 900001 2026年 付与 10日, 900002→900001 PENDING 特別休暇 2件 2026-12-21·22).
- 개발 DB(`workbridge`)·개발 서버(3000, 6000): 접촉 없음. 단, 6000 리스닝 프로세스 PID가 실행 중 46136 → 46748로 바뀌었다(생성 12:51:53, 원인 미확인. 내가 6000 프로세스를 종료·기동한 적 없음. 현재 응답 정상, 401 확인).
- 픽스처 DB 스크립트 정리: 각 spec 전에 `db:e2e-attendance-reset`, `db:e2e-leaves-reset`, `db:e2e-attendance-fixture`(attendance-status용), `db:e2e-accounts`를 spec 그룹별 조건에 맞춰 수동 실행(PLAYWRIGHT_BASE_URL 지정 시 spec 내부 준비가 건너뛰어짐).

### 작성·수정한 테스트 (frontend/e2e/dashboard-renewal.spec.ts)
| 항목 | 내용 |
|---|---|
| P-11 신규 | 관리자 퇴근: 390 전·1440 전·1440 후·390 후 캡처, 「退勤時刻」 `--:--` → 등록 후 リロードなし에 HH:mm 즉시 반영 |
| P-15 신규 | 사원 출근(필요 시)→퇴근, 동일 검증 및 캡처 |
| P-12 신규 | 直近の申請履歴: 행 구분선(border-top) 존재, 행 `cursor: pointer`, hover 시 배경 변화, 클릭 시 상세 모달이 열리고 URL은 변하지 않음 |
| P-13 신규 | 承認待ち 0件: 見出し「承認待ちの申請（0件）」 + 本文「承認待ちの申請はありません。」(P-06·P-07 이후 배치) |
| P-14 신규 | 관리자 기타 화면(/attendance, /leaves, /leaves/approvals, /admin/attendance, /admin/departments) × 1440·1024·390·360: h1 표시, 로드 오류 없음, 페이지 가로 넘침 없음, 전체 캡처 |
| P-01·P-02 | 캡처 폭에 360 추가(기존 1440·1024·390·375 유지) |

- 테스트 작성 중 실패와 조치(모두 테스트 측 담당 `tester`, 해결 후 재실행):
  1. P-13 1차: 見出しを「承認待ちの申請」(件数なし)로 기대 → 실패. SCR-002 명세 표의 제목 규칙은 「承認待ちの申請（{totalCount}件）」이므로 구현이 맞고 기대값을 `titleWithCount(0)`로 수정.
  2. P-12 1차: 直近の申請 로딩 전에 행 수를 읽음 → `expect.poll`로 대기.
  3. P-15 1차: 出勤ボタン 상태를 로딩 전에 읽어 출근을 건너뜀 → 출근/退勤 버튼 중 하나가 보일 때까지 대기 후 분기.
  4. P-13 재실행 실패: 픽스처 호출이 누적되어 承認待ち 잔여 PENDING이 남음 → 테스트 DB 픽스처 스크립트에 "900001 승인자 PENDING 삭제 후 삽입"(멱등화) 추가.
- 기존 spec 코드는 수정하지 않음(assertion 약화·skip 없음). `prettier --write`는 신규 spec 파일에만 적용. eslint 통과, `tsc --noEmit` 오류 0.

### 실행 결과 (Playwright, 격리 3100, workers 1)
| 묶음 | spec | 결과 |
|---|---|---|
| B | dashboard-renewal (P-01·02·04·05·06·07·08·09·10·11·12·13·14·15) | 14 통과 / 0 실패 / 0 skip (최종, 포맷 후 재실행 포함 확인) |
| A | approvals, attendance-sheet-layout, dashboard, departments, leaves, login | 36 통과 / 0 실패 |
| A' | attendance (출퇴근 시나리오·관리자 퇴근 수정 포함) | 4 통과 / 0 실패 (attendance-reset 후) |
| A'' | attendance-status (fixture 수동 적용 후 실행) | 6 통과 / 0 실패 |
| C | password (e2e-accounts 초기화 후) | 3 통과 / 0 실패 |
| 합계 | 9 spec, dashboard-renewal 포함 | **63 통과 / 0 실패 / 0 skip** |

- attendance.spec 1차 실행 1건 실패(:161 `/password` 리다이렉트 기대): 원인은 앞 묶음 픽스처가 900002의 must_change_password를 false로 바꾼 상태라는 테스트 전제 충돌. `db:e2e-accounts`로 900002를 초기 상태로 되돌린 뒤 4/4 통과. 코드 결함 아님.

### 확인 항목별 결과 (요청 5종)
| 항목 | 확인 방법 | 결과 |
|---|---|---|
| 今日の出勤状況 「退勤時刻」 라벨, 퇴근 전 `--:--` | P-08, P-11, P-15 | 통과 |
| 퇴근 처리 후 실제 HH:mm 즉시 반영 | P-11, P-15: 리로드 없이 polling으로 `^\d{2}:\d{2}$` 확인 | 통과 |
| 直近の申請履歴 구분선·행 hover cursor-pointer·클릭 | P-12 (computed style, hover 배경 변화) | 통과. 단 클릭 시 **페이지 이동이 아니라 상세 모달**이 열림. 요청의 "클릭 이동"이 모달을 뜻하는지 확인 필요 |
| 承認待ち 0件 헤더와 본문 | P-13 | 통과. 헤더는 SCR-002 규칙대로 「（0件）」 포함 |
| 사원 출퇴근 카드 하단 여백 | 전후 스크린샷 육안 확인 | 수치 측정은 하지 않음. 육안상 하단 여백 정상 |
| 공용 Card 여백 축소 후 다른 화면 | P-14 (5화면 × 4폭 overflow·h1·로드 오류), attendance·leaves·approvals·departments spec | 자동 검증 통과. 카드 내부 잘림·여백 픽셀 비교는 기준 스냅샷이 없어 미실시 |

### 스크린샷
- 저장 위치: `.claude/work/dashboard-renewal/screenshots/final2-*.png` (38장)
  - 관리자 final2-admin-{1440,1024,390,375,360}.png, 사원 final2-employee-{1440,1024,390,375,360}.png
  - 퇴근 전·후: final2-{admin,employee}-clockout-{before,after}-{1440,390}.png (퇴근 전 390·1440, 퇴근 후 1440·390)
  - 다른 화면 final2-other-{attendance,leaves,leaves_approvals,admin_attendance,admin_departments}-{1440,1024,390,360}.png
- 참조 이미지 대조 메모 (8=관리자 데스크톱, 10=사원 데스크톱. 9·11 모바일은 이번 Run 미대조):
  - 8 vs final2-admin-1440: 배치(상단 3카드 → 출근+승인대기 → 도넛+월간 → 휴가·부서·직근)는 일치. 차이: 아이콘 사이드바 없음(텍스트 메뉴), お知らせ 없음(계획상 의도된 차이), 부서 표에 アラート 열 없음, 승인대기 행 표는 구현되어 있으나 참조와 열 구성 차이 있음.
  - 10 vs final2-employee-clockout-after-1440: 배치 근사 일치. 차이: 休日出勤 단위 「0時間」(참조 「0日」, 계획 F-32), 휴가 카드 라벨「承認済み日数」(참조 「今年の取得日数」), 부서 표 アラート 열 없음.
  - 캡처 아티팩트(제품 결함 아님으로 추정, 미확인): 1440 fullPage 캡처에서 좌측 사이드바 배경이 약 900px에서 끊겨 보임.

### 미검증·남은 사항
- 9·11(모바일 참조) 대조 미실시. 390 관리자 「各部署の状況」 표가 카드 안에서 잘리는 문제(Run 3 기록)는 이번 Run에서 재측정하지 않음. P-14는 페이지 단위 overflow만 보므로 카드 내부 잘림은 잡지 못함.
- backend unit·e2e, frontend vitest는 이번 Run에서 재실행하지 않음(백엔드 코드·단위 테스트 변경 없음). Run 8 결과를 유지.
- 프로세스 주의: 6000 PID 변경(위 환경 기록) 원인 미확인.
- frontend/test-results는 Playwright 산출물로 남김(gitignore 대상).

### 정리
- 격리 백엔드(6100)·프런트(3100) 프로세스 종료 완료. 3000·6000 리스닝은 유지.
- `frontend/.e2e-3100` 삭제 완료. node_modules junction은 rmdir로 링크만 해제했고 원본 node_modules(353 항목) 유지 확인. `backend/.e2e-tmp-dist` 삭제 완료. `/tmp`에 남긴 파일 없음(빈 파일 `/tmp/x` 즉시 삭제).
- 테스트 DB(`workbridge_test`)는 마지막 실행 후 상태(픽스처 + E2E 계정 + 당일 테스트 근태·휴가 잔존). 다음 백엔드 e2e 전에는 DROP → migrate 재초기화 필요.
- 커밋·push·브랜치 변경 없음.

### 최종 판정
- 요청한 Playwright 범위(dashboard-renewal, dashboard, login, attendance-sheet-layout, attendance, attendance-status, approvals, leaves, departments, password)는 실행 완료, 63/63 통과.
- RESULT: PASS (Run 9 범위). 단 "클릭 이동"은 모달 동작으로 구현되어 있어 의도 확인이 필요하고, 모바일 참조 대조와 Card 여백 픽셀 검증은 미실시로 남김.
