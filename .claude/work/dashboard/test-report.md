RESULT: PASS

# 대시보드 — 테스트 결과 (Run 1)

## 작성·수정한 테스트 파일
### backend
- 수정 `src/modules/auth/guards/guards.spec.ts` — JwtAuthGuard 생성자에 `new AdminGuard(new Reflector())` 전달(tsc 오류·실패 2건 해소) + U-10 AdminGuard 4건, U-11 순서 검증 5건 추가
- 신규 `src/common/time/tokyo-date.spec.ts` (U-01~03)
- 신규 `src/modules/attendance/attendance.mapper.spec.ts` (U-04)
- 신규 `src/modules/leaves/leave-rules.spec.ts` (U-05·06·08, canViewLeave)
- 신규 `src/common/pagination/pagination.spec.ts` (U-09)
- 신규 `test/e2e-helpers.ts` — FixedClock(`overrideProvider(Clock)`), 토큰 서명, leaves·attendance·leave_grants 직접 INSERT 헬퍼
- 신규 `test/attendance.e2e-spec.ts` (E-ATT-01~13)
- 신규 `test/leaves.e2e-spec.ts` (E-LV-01~21, U-07 포함)
- 신규 `test/admin-dashboard.e2e-spec.ts` (E-DS-01~06)

### frontend
- 수정 `src/app/login/LoginForm.test.tsx` — `temporaryDialog` 검사 4건을 이동 검증으로 교체(F-LG-01~05: `/dashboard`, `redirect=/leaves`, 외부/`//`/`/\`/`/login` redirect 무시, 복원 시 `/dashboard`, mustChangePassword → `/password`)
- 수정 `e2e/login.spec.ts` — 로그인 후 dialog 대신 이동 검증. 로그인 응답의 `mustChangePassword`에 따라 `/password` 또는 `/dashboard`를 기대(개발 DB 상태에 의존하지 않도록)
- 신규 `src/app/(app)/dashboard/DashboardView.test.tsx` (F-DB-01~14 + 상세 모달 열기)
- 신규 `src/components/leave/LeaveDetailModal.test.tsx` (F-LM-01~08)
- 신규 `src/components/layout/AppShell.test.tsx` (F-SH-01~07 + 쿼리 포함 redirect, 로그아웃 후 재렌더링 시 redirect 미부여)
- 신규 `src/lib/format.test.ts`
- 신규 `e2e/dashboard.spec.ts` (P-01~05. 비로그인 P-01은 항상 실행, 나머지는 E2E_ADMIN_PASSWORD 없으면 skip)

## 실행 결과
| 대상 | 명령 | 결과 |
|---|---|---|
| backend 타입 | `npx tsc --noEmit` | 오류 0 |
| backend lint | `npm run lint` | 통과 |
| backend unit | `npm test` | 11 파일 / 140 통과 / 실패 0 |
| backend e2e | `npm run db:migrate:test` → `npm run test:e2e` | 7 파일 / 193 통과 / 실패 0 (신규 69건: attendance 16, leaves 46, admin-dashboard 7) |
| frontend 타입 | `npx tsc --noEmit` | 오류 0 |
| frontend lint | `npm run lint` | 통과 |
| frontend unit | `npm test` | 7 파일 / 98 통과 / 실패 0 (DashboardView 19, LeaveDetailModal 19, AppShell 13, format 6, LoginForm 20 포함) |
| frontend build | `npm run build` | 통과(`/dashboard` 정적 prerender) |
| 포맷 | 루트 `npm run format:check` | 통과 |
| Playwright | `npx playwright test` (실행 중인 backend 4000 + dev 3000, E2E_ADMIN_PASSWORD는 로컬 `backend/.env`의 seed 값을 환경변수로 전달) | 14건 중 13 통과 / 1 실패(아래, 기능 범위 밖 환경 문제) |

## 실패
- `e2e/password.spec.ts` › shouldMoveToPasswordAfterLoginAndRejectMismatchWithoutCallingApiWhenMustChange
  - 에러: `expect(page).toHaveURL(/\/password$/)` — 실제 `http://localhost:3000/dashboard`
  - 원인 추정: 개발 DB의 관리자 00001이 이미 `mustChangePassword=false`(API로 확인). 이 테스트는 "초기 ADMIN이 mustChangePassword=true"를 전제한다. 이번 변경 전에도 같은 상태라면 임시 팝업으로 `/login`에 머물러 실패했을 것이라 이번 구현의 회귀가 아님
  - `[담당: 환경]` — 코드 결함 아님. 개발 DB를 재seed하면 통과하지만, 그때는 `e2e/dashboard.spec.ts`의 로그인 후 4건이 "비밀번호 변경을 마친 관리자" 전제로 실패한다(두 spec의 전제가 서로 반대). 이 spec은 이번 작업 범위 밖이라 고치지 않음. 정리 방향(예: 상태별 분기 또는 전용 E2E 계정) 결정 필요

## 메모 (계획 대비)
- E-DS-03: notClockedIn 증감이 계획표의 +1(B)이 아니라 **+2**. 테스트 데이터로 만든 승인자(활성·출근 없음·휴가 없음)도 미출근에 포함되기 때문(구현 정상). E(비활성)는 출근·APPROVED 휴가가 있어도 어느 수에도 포함되지 않음을 확인
- E-DS-06: `/api/v1/ADMIN/dashboard/summary`를 EMPLOYEE가 호출 시 403/404 중 하나(200 아님) 확인
- E-LV-04: `year=2025`는 2025년 시작 휴가만 집계(부여 미등록이라 remaining -2) 확인. `abc`·`1999`·`2101`·`2026.5`는 400
- E-LV-17·E-ATT-05 동시성: 각각 200/201 1건 + 409 1건, DB 행·처리자 일치 확인
- U-07(Repository 조건)은 단위가 아닌 e2e E-LV-03에서 실제 DB로 확인
- 관리자 현황·scope=all은 DB 전체 대상이라 기준값 대비 증감 / 포함·미포함으로 검증. 생성한 ADMIN은 afterAll `TestDataTracker.cleanup()`으로 삭제(seed e2e의 "활성 ADMIN 없음" 전제 유지, 전체 e2e 통과로 확인)
- 출근·퇴근 클릭은 계획대로 Playwright에서 제외

---

# Run 2 (수정 루프 B, Round 1)

## 작성·수정한 테스트 파일
- 수정 `frontend/src/app/login/LoginForm.test.tsx` — 외부 redirect 무시 `it.each`에 `'/\t/evil.example'`, `'/\n/evil.example'`, `'/\r/evil.example'`, `'\/evil'`(백슬래시 시작), `'/dashboard/../login'` 5건 추가. 제어 문자가 보이도록 테스트 이름 서식을 `%s` → `%j`로 변경
- 신규 `frontend/src/lib/auth/redirect.test.ts` — `safeRedirect` 단위 테스트 26건
  - null/빈 문자열 → null
  - 내부 경로 유지: `/dashboard`, `/leaves?status=PENDING#a`, `/leaves/abc?page=2`
  - 외부·비정상: `https://…`, `http://…`, `javascript:`, 상대 경로 `dashboard`, `//evil.example`, `/\evil.example`, `\/evil`, `\\evil.example` → null
  - 제어 문자: `\t`, `\n`, `\r`, `\u0000`, `\u007f`(경로 앞), `/dash\tboard`(경로 중간) → null
  - 로그인 화면: `/login`, `/login?x=1`, `/login#a`, `/login/`, `/login/sub`, `/dashboard/../login` → null
  - 경계: `/loginhistory`는 로그인 화면이 아님(그대로 반환), `/leaves/../dashboard?x=1` → 정규화된 `/dashboard?x=1` 반환

## 실행 결과
| 대상 | 명령 | 결과 |
|---|---|---|
| 신규·수정 테스트 | `npx vitest run src/lib/auth/redirect.test.ts src/app/login/LoginForm.test.tsx` | 2 파일 / 51 통과(redirect 26, LoginForm 25) / 실패 0 |
| frontend 타입 | `npx tsc --noEmit` | 오류 0 |
| frontend lint | `npm run lint` | 통과 |
| frontend unit | `npm test` | 8 파일 / 129 통과 / 실패 0 (Run 1의 98 + 31) |
| 포맷 | 루트 `npm run format:check` | 통과(LoginForm.test.tsx는 prettier --write로 정렬) |
| backend unit | `npm test` | 11 파일 / 140 통과 / 실패 0 (이번 회차 backend 변경 없음, 회귀 확인용) |
| backend e2e | `npm run test:e2e` | 7 파일 / 193 통과 / 실패 0 |
| Playwright | `npx playwright test` (실행 중인 dev 서버, E2E_ADMIN_PASSWORD=backend/.env의 SEED_ADMIN_PASSWORD) | 14건 중 8 통과 / 6 실패(환경, 아래) |

## 실패
- Playwright 로그인 필요 6건: `dashboard.spec.ts` › ログイン後 4건, `login.spec.ts` › shouldKeepSessionAfterReloadWithRefreshCookie, `password.spec.ts` › shouldMoveToPasswordAfterLogin…
  - 에러: `TypeError: Cannot read properties of undefined (reading 'mustChangePassword')` / password.spec은 `/login`에 머묾
  - 원인 추정: 개발 DB 관리자 00001의 비밀번호가 seed 값과 다르다(`POST /auth/login`을 seed 비밀번호로 직접 호출하면 401 INVALID_CREDENTIALS). Run 1 이후 개발 DB에서 비밀번호가 바뀐 것으로 보이며, 이번 회차 변경(`redirect.ts`, 테스트 2파일)은 로그인 API와 무관
  - `[담당: 환경]` — 코드 결함 아님. 개발 DB 재seed(또는 현재 비밀번호를 E2E_ADMIN_PASSWORD로 전달) 후 재실행 필요. 개발 DB 데이터를 바꾸는 작업이라 tester가 임의로 하지 않음
  - 미검증: 실제 브라우저에서의 로그인 후 redirect 이동(P-03 shouldReturnToRedirectTargetAfterLogin). jsdom 단위·컴포넌트 테스트로는 검증됨

## 메모
- review.md 낮음 제안(tester 담당 DashboardView 재조회 검증 등)은 지시에 따라 이번 회차 미처리
