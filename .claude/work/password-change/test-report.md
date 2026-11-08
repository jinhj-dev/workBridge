RESULT: PASS

# 비밀번호 변경 — 테스트 보고 (Run 1)

## 작성·수정한 테스트 파일
- 생성 `backend/src/common/security/password-policy.spec.ts` — 10건 (UT-AUTH-01)
- 수정 `backend/src/modules/auth/auth.service.spec.ts` — `changePassword` describe 추가 15건 (repository mock에 `findUserWithPasswordHashById`·`updatePasswordAndRevokeOtherTokens` 추가)
- 수정 `backend/test/auth.e2e-spec.ts` — `PATCH /api/v1/auth/password` describe 추가 19건 (IT-AUTH-05·06), 헤더 주석 갱신
- 생성 `frontend/src/app/password/PasswordChangeForm.test.tsx` — 15건
- 수정 `frontend/src/app/login/LoginForm.test.tsx` — `next/navigation` mock(vi.hoisted router), user.id를 UUID 문자열로, 삭제된 `temporaryDialog.mustChangePassword` 참조 제거, `shouldMentionPasswordChange…` → `shouldRedirectToPasswordWithoutDialogWhenMustChangePassword`로 교체, 복원 시 리다이렉트 1건 추가, 다이얼로그 회귀 테스트에 `router.replace` 미호출 확인 추가 (15건)
- 생성 `frontend/e2e/password.spec.ts` — 2건 (제출 없음, 변경 API는 route abort로 차단·횟수 확인)

## 실행 결과
| 대상 | 결과 |
|---|---|
| backend `npm test`(unit) | 96 / 96 통과 (신규 25) |
| backend `npm run test:e2e` | 124 / 124 통과 (신규 19). 동시 PATCH 테스트 3회 반복 실행 모두 통과 |
| backend `npx tsc --noEmit`, `npm run lint`, `prettier --check src test` | 통과 |
| frontend `npm test` | 34 / 34 통과 (LoginForm 15, PasswordChangeForm 15, 기타 4) |
| frontend `npx tsc --noEmit`, `npm run lint`, `prettier --check src e2e`, `npm run build` | 통과 (기존 타입 에러 2건 해소, `/password` 정적 생성 확인) |
| frontend Playwright `password.spec.ts` + `login.spec.ts` | 1 통과 / 8 skip (E2E_ADMIN_PASSWORD 미설정) |

실패: 없음

## 미검증
- Playwright `shouldShowCancelAndRejectMismatchWithoutCallingApi` 및 login.spec 전체: E2E_ADMIN_PASSWORD 미설정으로 skip. 설정 후 `npm run test:e2e` 재실행 필요
- E2E-04(사원 등록 → 최초 로그인 → 변경 → 대시보드): 사원 등록·대시보드 미구현으로 범위 밖
- 토스트 4초 자동 소멸·교체 동작은 별도 검증하지 않음(test-plan상 컴포넌트 테스트로 충분 판단)

## 데이터
- 개발 DB(workbridge) 변경 없음. 백엔드 e2e는 workbridge_test에서 EMPLOYEE만 생성하고 TestDataTracker로 정리(활성 ADMIN 미생성)
- Playwright는 변경 API를 `page.route`로 abort하므로 실행되더라도 관리자 비밀번호는 바뀌지 않음


# Run 2 (review Round 1 tester 항목 반영 + Fix 1 이후 재실행)

RESULT: PASS

## 작성·수정한 테스트 파일
- 수정 `frontend/src/app/password/PasswordChangeForm.test.tsx` — `shouldShowServerMessageAsErrorToastWhenOtherApiError` it.each 2건 추가(500 INTERNAL_SERVER_ERROR, 400 VALIDATION_ERROR): 서버 message가 role=status 영역에 error 변형(`bg-danger-30`)으로 표시, 항목 aria-invalid 없음, 입력값 유지, 이동 없음, PATCH 1회, 버튼 재활성화 확인 (15 → 17건)
- 수정 `frontend/e2e/password.spec.ts` — `shouldShowCancelAndRejectMismatchWithoutCallingApi` → `shouldMoveToPasswordAfterLoginAndRejectMismatchWithoutCallingApiWhenMustChange`로 교체 (아래 실패 1 참고)
- 수정 `frontend/e2e/login.spec.ts` — `shouldKeepSessionAfterReloadWithRefreshCookie`의 로그인 후·재읽기 후 기대값을 다이얼로그 → `/password` 화면으로 변경(쿠키 속성·스토리지 미사용·refresh/me 요청 확인은 그대로). 스크린샷 파일명 `login-success-password.png`

## 실행 결과
| 대상 | 결과 |
|---|---|
| backend `npm test`(unit) | 96 / 96 통과 |
| backend `npm run test:e2e`(workbridge_test, migrate:test 후) | 124 / 124 통과. 실행 후 workbridge_test 활성 ADMIN 0건 확인 |
| backend `npx tsc --noEmit`, `npm run lint`, `npm run build` | 통과 |
| frontend `npm test` | 36 / 36 통과 (PasswordChangeForm 17, LoginForm 15, 기타 4) |
| frontend `npx tsc --noEmit`, `npm run lint`, `prettier --check src e2e`, `npm run build` | 통과 |
| frontend Playwright 전체(login.spec 7 + password.spec 2), E2E_ADMIN_PASSWORD 설정 | 1차 7 통과 / 2 실패 → 테스트 수정 후 9 / 9 통과, skip 0 |

## 실패 (1차 Playwright, 수정 후 해소)
1. `password.spec.ts › shouldShowCancelAndRejectMismatchWithoutCallingApi` / 로그인 후 `getByRole('dialog')` 미발견(화면은 `/password`, 안내문 표시) / 개발 DB 관리자 00001은 seed 그대로 `must_change_password = true`(seed가 "초회 로그인 시 변경 필요"로 생성). 이번 기능으로 이런 사용자는 로그인 직후 `/password`로 이동하므로 다이얼로그·취소 버튼이 나오지 않는 것이 정상. test-plan §5의 "취소 버튼 표시" 전제가 개발 데이터와 맞지 않았음 `[담당: tester]` → 실제 상태(안내문·로그아웃 표시, 취소 없음, 재읽기 후 복원, 불일치 클라이언트 오류, 변경 API 0회)를 검증하도록 교체. 취소 표시(변경 불필요 사용자)는 컴포넌트 테스트 `shouldHideNoticeAndGoBackOnCancelWhenNotRequired`가 담당
2. `login.spec.ts › shouldKeepSessionAfterReloadWithRefreshCookie` / 같은 원인으로 `loggedInTitle` 다이얼로그 미발견 / 이번 기능 이전에 작성된 기대값(로그인 후 항상 다이얼로그)이 새 동작과 어긋남 `[담당: tester]` → `/password` 이동·다이얼로그 없음·재읽기 후 `/password` 유지로 교체. 변경 불필요 사용자의 다이얼로그는 LoginForm 컴포넌트 테스트가 담당

## 실행 환경 메모
- 3000(next dev, PID 36164)·4000(backend dist/main, PID 51924)에 기존 서버가 떠 있어(이번 작업에서 띄운 것 아님) 건드리지 않음. next dev는 같은 폴더 중복 실행이 막혀서, 최신 코드로 `npm run build` 후 백엔드 `PORT=4100 node dist/main`, 프론트 `BACKEND_URL=http://localhost:4100` 빌드 + `next start -p 3100`, `PLAYWRIGHT_BASE_URL=http://localhost:3100`으로 실행
- 종료: 3100·4100 서버 종료 확인. 프론트 `.next`는 기본 `BACKEND_URL`(.env.local)로 다시 빌드해 원상 복구
- E2E_ADMIN_PASSWORD는 backend/.env의 SEED_ADMIN_PASSWORD를 셸 변수로만 전달(출력·기록 없음)

## 미검증
- 변경 불필요 사용자의 `/password` 취소 버튼·로그인 다이얼로그의 실제 브라우저 확인: 개발 DB에 해당 사용자가 없고 데이터 변경 불가라 Playwright 범위 밖(컴포넌트 테스트로 대체)
- E2E-04(사원 등록 → 최초 로그인 → 변경 → 대시보드): 사원 등록·대시보드 미구현
- 토스트 4초 자동 소멸·교체: 별도 검증 없음(Run 1과 동일)

## 데이터
- 개발 DB(workbridge): users 1건(00001) `must_change_password = t`, `updated_at`이 이번 실행 이전 값 그대로. 변경 API는 `page.route` abort로 0회. 로그인·refresh에 따른 refresh_tokens만 생성됨
- workbridge_test: e2e 후 활성 ADMIN 0건

# Run 3 (review Round 2 tester 항목)
- test-plan.md §5 Playwright 전제를 실제 password.spec(최초 로그인 → `/password` 자동 이동, 취소 0건)에 맞게 한 줄 정정. 코드·테스트 변경 없음, 재실행 없음 — 결과는 Run 2(PASS) 그대로
