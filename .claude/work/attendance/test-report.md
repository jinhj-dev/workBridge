RESULT: PASS

# 근태 관리 — 테스트 보고 (Run 1)

## 요약
- 실행한 테스트는 모두 통과. 다만 계획의 백엔드 e2e·프론트 e2e 대부분이 미작성·미실행이라 RESULT는 FAIL.
- 실패 원인 1: 백엔드 e2e 실행 불가. 로컬 PostgreSQL(Docker 컨테이너)이 내려가 있음(`com.docker.service` Stopped, 5432 포트는 Docker 프록시만 열려 있고 연결이 응답하지 않음). `npm run db:migrate:test`도 P1001로 실패.
- 실패 원인 2: test-plan의 백엔드 e2e(`attendance.e2e-spec.ts` 추가분, `admin-attendance.e2e-spec.ts`, `departments.e2e-spec.ts`)와 프론트 Playwright(`frontend/e2e/attendance.spec.ts`)를 작성하지 않음. 이번 Run에서는 DB가 없어 작성해도 검증할 수 없었음.

## 실행 결과 (실행한 것만)
| 구분 | 명령 | 결과 |
|---|---|---|
| backend 단위 | `npx vitest run` | 13 파일 / 173건 통과 |
| backend 타입 | `npx tsc --noEmit` | 통과 |
| backend lint | `npm run lint` | 통과 |
| backend e2e | `npm run test:e2e` | 미실행 (DB 연결 불가) |
| frontend 단위 | `npx vitest run` | 13 파일 / 194건 통과 |
| frontend 타입 | `npx tsc --noEmit` | 통과 |
| frontend lint | `npm run lint` | 통과 |
| frontend build | `npm run build` | 통과 (BUILD_EXIT=0, /attendance, /admin/attendance 포함) |
| frontend e2e | `npm run test:e2e` | 미실행 (DB 및 E2E 계정 필요) |

## 작성·수정한 테스트 파일
신규
- `backend/src/modules/attendance/attendance-rules.spec.ts` (16건, U-01~U-08 대응. 기간 기본값·도쿄 경계, 366/367일, 시작>종료, 출퇴근 시각 검증, 24시간 경계)
- `frontend/src/lib/date-range.test.ts` (F-01 대응, 기본 기간·검증·URL Query 파싱)
- `frontend/src/components/Pagination.test.tsx` (F-32 대응)
- `frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx` (F-11~F-16 대응, 10건)
- `frontend/src/app/(app)/admin/attendance/AdminAttendanceView.test.tsx` (F-21·F-22 대응, 8건)
- `frontend/src/app/(app)/admin/attendance/AttendanceEditModal.test.tsx` (F-23~F-26 대응, 9건)

수정
- `frontend/src/lib/format.test.ts`: 勤怠 표시 함수 케이스 추가(F-02)
- `frontend/src/app/(app)/dashboard/DashboardView.test.tsx`: Attendance 목 데이터에 `modifiedAt: null` 추가 (tsc 실패 해소)
- `frontend/src/components/layout/AppShell.test.tsx`: `ToastProvider`로 감싸도록 수정(13건 실패 해소), 관리자 가드 테스트 3건 추가(F-31)

## 실패 항목
RESULT FAIL의 사유를 항목별로 적는다.

1. 백엔드 e2e 회귀 미확인
   - 항목: `backend/test/attendance.e2e-spec.ts` 기존 16건, `admin-dashboard`, `leaves`, `auth`, `common` e2e 전체
   - 에러 요약: `Can't reach database server at localhost:5432` (prisma), 테스트 DB 연결 시 요청이 타임아웃
   - 원인 추정: Docker Desktop 서비스 중지. DB 컨테이너가 떠 있지 않음. 코드 문제가 아니라 환경 문제
   - 담당: 환경 (`npm run db:up` 후 `npm run db:migrate:test` 재실행 필요). 사용자 확인 필요
2. 백엔드 e2e 미작성 (test-plan §2)
   - 항목: I-01~I-08, I-11~I-18, I-21~I-29, I-31
   - 담당: tester (다음 Run에서 작성 후 실행)
3. 프론트 Playwright e2e 미작성·미실행 (test-plan §4, E-01~E-03)
   - 담당: tester (DB 복구 후 작성·실행)
4. 프론트 미구현 테스트 항목
   - F-14 Loading 스켈레톤 노출 검증은 별도 assertion 없음(SectionError 재시도만 검증)
   - F-21 중 부서 Select 값 반영은 검증했으나 부서 필터 적용 시 쿼리 검증은 URL 파싱 단위에서만 확인
   - 담당: tester (보완 가능, 우선순위 낮음)

## 구현 코드 이슈
- 이번 Run에서 구현 코드 결함으로 판명된 항목은 없음.
- 참고: `frontend.md`의 "AppShell 13건 실패"는 테스트가 ToastProvider 없이 렌더링한 것이 원인이었음. 구현 변경 불필요.

## 미검증 항목
- 백엔드 e2e 전체 (DB 연결 불가)
- 프론트 Playwright e2e 전체
- 화면 레이아웃·모바일 폭 (브라우저 확인 안 함)
- `docs/06` 응답의 `modifiedAt` 값이 e2e에서 DB와 일치하는지 (미실행)

## 다음 Run에서 할 일
1. Docker 기동 후 `npm run db:up`, backend `npm run db:migrate:test`
2. backend e2e 3종 작성 (`attendance.e2e-spec.ts` 추가분, `admin-attendance.e2e-spec.ts`, `departments.e2e-spec.ts`) 및 전체 `npm run test:e2e` 회귀 실행
3. `frontend/e2e/attendance.spec.ts` 작성 후 `npm run test:e2e` 실행 (E2E 계정 비밀번호 환경변수 필요)

---

# 근태 관리 — 테스트 보고 (Run 2)

## 요약
- RESULT를 PASS로 갱신. Run 1의 FAIL 사유였던 DB 연결 불가(Docker 컨테이너 중지)는 `docker info`/`docker ps`로 확인 후 `npm run db:up`으로 복구되어 해소됨. DB 상태 정상(컨테이너 healthy, 테스트 DB 마이그레이션 최신).
- Run 1에서 미작성이던 백엔드 e2e(I-01~I-08, I-11~I-18, I-21~I-29, I-31)와 프론트 Playwright(E-01~E-03)를 작성·실행. 모두 통과.
- 구현 결함은 발견되지 않음. 실패는 전부 테스트 코드 쪽이었고 tester가 수정 후 재실행.

## 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend e2e (전체 회귀) | `npx vitest run --config ./vitest.config.e2e.ts` | 10 파일 / 227건 통과 |
| backend 단위 | `npx vitest run` | 13 파일 / 173건 통과 |
| backend 타입 | `npx tsc --noEmit` | 통과 |
| backend lint | `npm run lint` | 통과 |
| frontend 단위 | `npx vitest run` | 13 파일 / 195건 통과 |
| frontend 타입 | `npx tsc --noEmit` | 통과 |
| frontend lint | `npm run lint` | 통과 |
| frontend e2e (전체) | `npx playwright test` | 18건 통과 (attendance 3 + dashboard 5 + login 7 + password 3) |

## 작성·수정한 테스트 파일 (Run 2)
신규
- `backend/test/admin-attendance.e2e-spec.ts` — ATT-005 I-11~I-18(8건), ATT-006 I-21~I-29(9건), 합계 17건
- `backend/test/departments.e2e-spec.ts` — DEPT-001 I-31 (2건)
- `frontend/e2e/attendance.spec.ts` — E-01, E-02, E-03 (3건)

수정
- `backend/test/attendance.e2e-spec.ts` — ATT-004 I-01~I-08 추가(9건). `AttendanceBody`에 `modifiedAt` 추가(tsc 해소)
- `frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx` — F-14 로딩 스켈레톤 assertion 추가(`role="status"`, 「読み込み中」, 표·Empty 미표시)

## 실패 항목 (Run 2 중 발생, 해결 완료)
1. `frontend/e2e/attendance.spec.ts` E-01 1차 실행 타임아웃
   - 에러 요약: `Test timeout of 30000ms exceeded`
   - 원인: 출근 버튼은 근무 중일 때 숨겨지지 않고 `disabled`로만 표시됨. `isVisible()`이 true를 반환해 disabled 버튼을 클릭하려다 대기
   - 담당: tester (테스트 코드 오류). `isEnabled()` 판정으로 수정 후 전체 재실행 통과
2. `backend/test/attendance.e2e-spec.ts` tsc 오류 TS2339 (`modifiedAt` 없음)
   - 담당: tester. 타입 정의 보완으로 해소

## 구현 코드 이슈
- 없음.

## 환경·실행 메모 (중요)
- E2E 비밀번호 환경변수 `E2E_ADMIN_PASSWORD` / `E2E_INITIAL_PASSWORD`가 이 환경에 설정되어 있지 않았음. 이번 실행에서는 셸 안에서 실행마다 임의 값을 생성해 주입했고, 파일·로그에는 저장하지 않음. 개발 DB의 E2E 계정 900001/900002 비밀번호는 실행 때 이 값으로 초기화됨. 재실행 시 사용자가 값을 설정해야 함. 미설정이면 spec의 beforeEach가 명시적 메시지로 실패하며(skip 아님), 이 경우 E-01~E-03은 미검증으로 간주해야 함.
- E-03: 900002의 최초 로그인 비밀번호 변경 처리를 테스트 안에서 수행. 종료 후 `afterAll`에서 `npm run db:e2e-accounts`로 900002를 초기 상태로 되돌림(뒤에 실행되는 `password.spec.ts`가 초기 상태를 전제하므로). 실행 결과 password.spec 3건 모두 통과.
- E-02: 당일 기록에 퇴근을 넣은 뒤 퇴근 시각을 공란으로 되돌려 다음 실행의 E-01 전제(勤務中)를 유지. 중간 실패 시 복원이 빠질 수 있음(finally 미적용).
- E-01: 출근 상태에 따라 출근 등록을 건너뜀(개발 DB는 1일 1회). 실행 후 개발 DB의 900001 당일 기록은 근무 중(퇴근 없음) 상태로 확인.
- 개발 백엔드(4000)는 실행 후 종료함.

## 미검증 항목
- 화면 레이아웃·모바일 폭의 시각적 확인(스크린샷 비교 미수행)
- 시간대 경계(23:59 이후)의 출퇴근 등록 시나리오, 동시 수정 충돌은 test-plan 범위 밖이라 미작성
- 개발 DB에는 E2E 실행 데이터가 누적됨(정리 로직 없음, 설계상 허용)
- F-21의 부서 필터 쿼리 반영 검증은 Run 1과 동일하게 URL 파싱 단위에서만 확인(이번 요청 범위 밖)

---

# 근태 관리 — 테스트 보고 (Run 3)

## 요약
- RESULT: PASS. review.md Round 1의 tester 담당 항목 3건을 모두 반영하고 전체 스위트를 재실행. 실패 0건
- frontend Fix 1 반영 후 전체 재검증: frontend 단위·Playwright, backend 단위·e2e, tsc·lint 모두 통과
- 구현 코드 이슈 없음

## review.md tester 담당 항목 처리
1. [중간] F-13 툴팁 검증이 모바일 카드 텍스트로 통과하던 문제 → 수정
   - `AttendanceHistoryView.test.tsx` F-13: 모바일 문구 검색(`getAllByText(missingHint)`) 제거. 표(`role=table`) 안의 退勤なし 배지 트리거에 hover → 표 안의 `role=tooltip`에 문구가 나오고 트리거 `aria-describedby`가 그 id와 연결되는지 확인
   - 신규 `frontend/src/components/Tooltip.test.tsx` (7건): 상호작용 전 미표시·describedby 없음 / hover 표시·describedby 연결 / mouseLeave 닫힘 / focus 표시·blur 닫힘 / hover 중 Esc 닫힘·describedby 제거 / focus 중 Esc 후 재포커스 재표시 / Esc 외 키는 유지
2. [낮음] E-02 복원을 finally로 이동 → 수정
   - `frontend/e2e/attendance.spec.ts` E-02: 본 동작을 try, 복원(退勤 공란으로 되돌림 → 勤務中 확인)을 finally에 배치. 복원 여부는 「保存을 시도하기 직전에 세우는 플래그」로 결정하므로, 당일 기록이 없어 修正 버튼이 없는 실패에서는 복원이 시도되지 않음(의미 없는 대기 방지)
   - 참고: 실패 경로(finally가 실제로 실행되는 상황)는 강제로 실패시키지 않아 직접 확인하지 않음. 정상 경로만 실행 확인
3. [낮음] admin-attendance e2e에 ATT-005/006 403 PASSWORD_CHANGE_REQUIRED 추가 → 수정
   - `backend/test/admin-attendance.e2e-spec.ts`: ATT-005 1건(mustChangePassword ADMIN → 목록 403 PASSWORD_CHANGE_REQUIRED), ATT-006 1건(같은 조건 → PATCH 403 PASSWORD_CHANGE_REQUIRED, DB 변경 없음)

## 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend e2e (전체 회귀) | `npx vitest run --config ./vitest.config.e2e.ts` (`db:migrate:test` 선행, 마이그레이션 최신) | 10 파일 / 229건 통과 (Run 2: 227건, +2) |
| backend 단위 | `npx vitest run` | 13 파일 / 173건 통과 |
| backend 타입 | `npx tsc --noEmit` | 통과 (exit 0) |
| backend lint | `npm run lint` | 통과 |
| frontend 단위 | `npx vitest run` | 14 파일 / 202건 통과 (Run 2: 195건, +7 Tooltip) |
| frontend 타입 | `npx tsc --noEmit` | 통과 (exit 0) |
| frontend lint | `npm run lint` | 통과 (exit 0) |
| frontend e2e (전체) | `npx playwright test` (개발 백엔드 4000 기동 상태) | 18건 통과 (attendance 3 + dashboard 5 + login 7 + password 3) |

- 미실행: `npm run build` (test-plan §5에 있으나 이번 요청 범위 밖이라 생략)
- frontend 단위 실행 중 jsdom의 `Not implemented: navigation to another Document` 콘솔 메시지가 출력됨. 테스트는 모두 통과. 원인 파일은 특정하지 않음(후속 확인 대상)

## E2E 비밀번호 처리
- Run 2와 같은 방식: 실행 명령 안에서 `node crypto`로 임의 값을 생성해 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`에 주입. 파일·로그·보고서에 값 미저장. 셸 상태도 남기지 않음
- 개발 백엔드(4000)는 Playwright 실행 후 종료(포트 4000 해제 확인)

## 작성·수정한 테스트 파일 (Run 3)
신규
- `frontend/src/components/Tooltip.test.tsx` (7건)

수정
- `frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx` — F-13 툴팁 검증을 표 기준으로 변경
- `frontend/e2e/attendance.spec.ts` — E-02 복원을 try/finally로 이동
- `backend/test/admin-attendance.e2e-spec.ts` — ATT-005·006 403 PASSWORD_CHANGE_REQUIRED 각 1건 추가

## 실패 항목
- 없음

## 구현 코드 이슈
- 없음

## 미검증 항목
- E-02 finally의 실패 경로(복원이 실제로 실행되는 상황)는 강제 실패를 만들지 않아 확인하지 않음
- 화면 레이아웃·모바일 폭의 시각 확인(스크린샷 비교) 미수행
- `npm run build` 미실행
- 개발 DB에는 E2E 실행 데이터가 누적됨(E-01 출근, E-02 퇴근 입력 후 복원, E-03 900002 비밀번호 변경 후 `db:e2e-accounts`로 초기화)

---

# 근태 관리 — 테스트 보고 (Run 3 보충: build)

| 구분 | 명령 | 결과 |
|---|---|---|
| backend build | `npm run build` (`nest build`) | 통과 (BUILD_EXIT=0) |
| frontend build | `npm run build` (`next build`) | 통과 (BUILD_EXIT=0, 라우트 `/`, `/attendance`, `/admin/attendance`, `/dashboard`, `/login`, `/password` 생성) |

- 경고(실패 아님): Next.js가 workspace root를 `workBridge/package-lock.json`으로 추정하는 메시지. `turbopack.root` 설정으로 해소 가능하나 이번 범위 밖이라 미수정.
- 실패 항목: 없음. RESULT는 PASS 유지.
