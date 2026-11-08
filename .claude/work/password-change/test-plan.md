# 비밀번호 변경 — 테스트 계획

기준: docs/08 UT-AUTH-01, IT-AUTH-05·06, §7 SCR-009. 실행 명령은 `.claude/work/context.md`.

## 1. 단위 — `backend/src/common/security/password-policy.spec.ts`
| 입력 | 기대 |
|---|---|
| `abcdefgh`(숫자 없음), `12345678`(영문 없음), `abc1234`(7자), `''` | 정책 위반(8자·영문·숫자 message) |
| `abcd1234`(정확히 8자), `Temp1234` | 통과 |
| ASCII 72바이트(영문+숫자) | 통과 |
| ASCII 73바이트 / `あ`×24+`a1`(74바이트) | 72바이트 message |
| `ａｂｃｄ１２３４`(전각만) | 정책 위반(ASCII 영문·숫자 없음) |

## 2. 단위 — `backend/src/modules/auth/auth.service.spec.ts` (repository mock)
- 정상: 해시 갱신 호출 인자(oldPasswordHash = 현재 해시, newPasswordHash가 새 비밀번호로 bcrypt.compare true), keepTokenHash = 쿠키의 SHA-256
- 쿠키 없음 / 형식 불량 → keepTokenHash = null
- 현재 비밀번호 불일치 → INVALID_CURRENT_PASSWORD(400), 갱신 메서드 미호출
- 새 = 현재 → PASSWORD_POLICY_VIOLATION, 갱신 미호출
- 정책 위반 → PASSWORD_POLICY_VIOLATION, findUser 미호출(DB 접근 전 차단)
- 사용자 없음 / 비활성 → UnauthorizedException
- 조건부 UPDATE false(동시 변경) → INVALID_CURRENT_PASSWORD

## 3. API 통합 — `backend/test/auth.e2e-spec.ts`에 describe 추가 (실제 테스트 DB)
사용자는 테스트에서 직접 생성(EMPLOYEE, bcrypt cost 4 해시, TestDataTracker로 정리).
| 시나리오 | 기대 |
|---|---|
| IT-AUTH-05: mustChangePassword=true 사용자 로그인 → PATCH | 204, DB `must_change_password=false`, 해시 변경(새 비밀번호 bcrypt 일치), 평문 미저장 |
| 변경 후 새 비밀번호로 로그인 200 / 이전 비밀번호 401 INVALID_CREDENTIALS | |
| 변경 후 같은 Access Token으로 `/test-protected` | 200(PASSWORD_CHANGE_REQUIRED 해제 즉시 반영) |
| 다른 세션 무효화: 같은 사용자로 2회 로그인(세션 A·B), A의 쿠키로 PATCH | A의 토큰 revoked_at NULL 유지 → A refresh 200, B refresh 401 |
| 쿠키 없이 PATCH | 204, 해당 사용자 유효 토큰 전부 revoked |
| 다른 사용자의 토큰은 영향 없음 | 타 사용자 refresh 200 |
| IT-AUTH-06: 새 = 현재 | 400 PASSWORD_POLICY_VIOLATION, DB 변경 없음 |
| 현재 비밀번호 불일치 | 400 INVALID_CURRENT_PASSWORD, DB 변경 없음, 토큰 무효화 없음 |
| 정책 위반(`abcdefgh`, `abc1234`, 73바이트) | 400 PASSWORD_POLICY_VIOLATION |
| 필드 누락 / 숫자 타입 / 129자 | 400 VALIDATION_ERROR(details.field) |
| Authorization 없음 | 401 |
| 동시 PATCH 2건(같은 현재 비밀번호, 다른 새 비밀번호) | 하나 204, 하나 400 INVALID_CURRENT_PASSWORD. 최종 해시는 성공한 쪽 |
| 응답·에러 본문에 비밀번호·해시 미포함 | |

## 4. 컴포넌트 — `frontend/src/app/password/PasswordChangeForm.test.tsx` (Vitest + Testing Library)
`fetch` stub(기존 LoginForm.test 방식), `next/navigation`의 `useRouter` mock, AuthProvider + ToastProvider로 감싸 렌더. 초기 refresh/me 응답으로 사용자 상태 설정.
- 빈 값 제출 → 3필드 각각 필수 문구, API 미호출
- 규칙 위반(`abcdefgh`) / 73바이트 / 현재와 동일 → 해당 문구, API 미호출
- 확인 불일치 → `新しいパスワードが一致しません。`
- mustChangePassword=true: 안내 문구 표시, キャンセル 미표시, ログアウト 표시
- mustChangePassword=false: 안내 미표시, キャンセル 클릭 → `router.back()`
- 성공 204 → PATCH 요청 body 확인, 토스트 `パスワードを変更しました。`, `router.replace('/dashboard')`
- 400 INVALID_CURRENT_PASSWORD → 현재 필드 아래 문구 / 400 PASSWORD_POLICY_VIOLATION → 새 필드 아래 서버 message
- 네트워크 오류 → 네트워크 토스트
- 요청 중 버튼 disabled(연속 클릭 시 fetch 1회)
- 미로그인(refresh 401) → `router.replace('/login?redirect=%2Fpassword')`

`frontend/src/app/login/LoginForm.test.tsx` 수정·추가
- 로그인 응답 mustChangePassword=true → `router.replace('/password')`, 임시 다이얼로그 미표시
- mustChangePassword=false → 기존대로 다이얼로그(회귀)

`frontend/src/components/Toast` — 위 컴포넌트 테스트로 충분(별도 파일 불필요)

## 5. Playwright — `frontend/e2e/password.spec.ts`
개발 DB의 관리자(00001) 비밀번호를 바꾸면 안 되므로 **제출하지 않는** 케이스만.
- 비로그인 `/password` 접근 → `/login?redirect=%2Fpassword`
- 관리자 로그인 직후 `/password`로 자동 이동(seed 관리자는 `must_change_password = true`) → 안내문·로그아웃 표시, 취소 버튼 0건, 새로고침 후에도 복원, 확인 불일치 클라이언트 오류 표시(PATCH 0회). 취소 버튼 표시는 컴포넌트 테스트가 담당 (Run 2에서 정정)
- E2E-04(사원 등록 → 최초 로그인 → 변경 → 대시보드)는 사원 등록·대시보드 미구현으로 이번 범위 밖 — 보고에 미검증으로 명시

## 6. 회귀
- backend `npm test`, `npm run test:e2e` 전체(기존 login·refresh·logout·Guard)
- frontend `npm test`, `npx tsc --noEmit`, `npm run lint`, 양쪽 lint·build
