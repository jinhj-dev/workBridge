# 비밀번호 변경 — Backend 설계 (API-AUTH-005, FR-AUTH-003)

공통 규칙은 `.claude/work/context.md` 참조. DB 스키마·마이그레이션 변경 없음.

## 1. 데이터 모델 (기존 그대로 사용)
- `users.password_hash`(bcrypt, `BCRYPT_COST`=12), `users.must_change_password`
- `refresh_tokens`(token_hash = SHA-256 hex, revoked_at, expires_at). 05 §3 "비밀번호 변경: 현재 요청에서 사용 중인 토큰을 제외한 해당 사용자의 유효한 토큰을 모두 무효화"

## 2. API 계약
`PATCH /api/v1/auth/password` · USER · mustChangePassword 사용자도 호출 가능(AuthController 클래스의 `@AllowPasswordChangeRequired()`로 이미 충족, 추가 데코레이터 불필요). `@Public()` 붙이지 않음.

Request (JSON)
```json
{ "currentPassword": "Temp1234", "newPassword": "newPass123" }
```
Response 204 (본문 없음). Set-Cookie 없음(현재 Refresh 쿠키 유지).

| HTTP | code | message(일본어) | 조건 |
|---|---|---|---|
| 400 | VALIDATION_ERROR | 入力内容に誤りがあります。(+details) | 필드 누락·문자열 아님·`currentPassword` 빈 문자열·128자 초과 |
| 400 | PASSWORD_POLICY_VIOLATION | パスワードは8文字以上で、英字と数字を含めてください。 | 8자 미만 / 영문 없음 / 숫자 없음 |
| 400 | PASSWORD_POLICY_VIOLATION | パスワードは72バイト以内で入力してください。 | UTF-8 72바이트 초과 |
| 400 | PASSWORD_POLICY_VIOLATION | 現在のパスワードと異なるパスワードを入力してください。 | new === current |
| 400 | INVALID_CURRENT_PASSWORD | 現在のパスワードが正しくありません。 | bcrypt 불일치 또는 동시 변경으로 조건부 UPDATE 0건 |
| 401 | UNAUTHORIZED | (기존 Guard) | 토큰 없음·무효·비활성 사용자 |

## 3. 비밀번호 규칙 (확정: 8자 이상, 영문과 숫자 포함, 72바이트 이하)
신규 `backend/src/common/security/password-policy.ts` — 이후 사원 등록(초기 비밀번호, SCR-006)에서도 재사용.
- 시그니처: `export function checkPasswordPolicy(password: string): string | null` — 위반 시 일본어 message, 통과 시 null. (또는 위반 종류 union 반환 후 service에서 message 매핑 — 둘 중 하나, 단순한 쪽)
- 길이: 코드 포인트 수 `[...password].length >= 8`
- 영문: `/[A-Za-z]/`, 숫자: `/[0-9]/` (ASCII만. 전각 문자는 포함으로 치지 않음)
- 바이트: `Buffer.byteLength(password, 'utf8') <= 72` (bcrypt가 72바이트 이후를 무시하므로)
- 검사 순서: 72바이트 초과 → 8자·영문·숫자 → (service에서) 현재와 동일

## 4. 처리 로직 (AuthService.changePassword)
시그니처: `changePassword(userId: string, dto: ChangePasswordDto, currentRefreshToken: string | undefined): Promise<void>`
1. `checkPasswordPolicy(dto.newPassword)` 위반 → 400 PASSWORD_POLICY_VIOLATION (DB 접근 전)
2. `authRepository.findUserWithPasswordHashById(userId)`; null 또는 `!isActive` → `UnauthorizedException`
3. `bcrypt.compare(dto.currentPassword, row.passwordHash)` 불일치 → 400 INVALID_CURRENT_PASSWORD
4. `dto.newPassword === dto.currentPassword` → 400 PASSWORD_POLICY_VIOLATION(동일 message)
5. `newHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST)`
6. `keepTokenHash = currentRefreshToken && REFRESH_TOKEN_PATTERN.test(currentRefreshToken) ? hashRefreshToken(currentRefreshToken) : null`
7. `authRepository.updatePasswordAndRevokeOtherTokens({ userId, oldPasswordHash: row.passwordHash, newPasswordHash, keepTokenHash, now })` → false면 400 INVALID_CURRENT_PASSWORD

Repository 신규 메서드 (`auth.repository.ts`)
- `findUserWithPasswordHashById(id): Promise<UserWithPasswordHashRow | null>` — `findUserByEmpId`와 같은 select(`USER_SELECT + passwordHash`)
- `updatePasswordAndRevokeOtherTokens(params): Promise<boolean>` — interactive `$transaction`:
  - `user.updateMany({ where: { id: userId, passwordHash: oldPasswordHash }, data: { passwordHash: newPasswordHash, mustChangePassword: false } })` — count 0이면 false 반환(동시 변경 경합 대비, 토큰 무효화도 하지 않음)
  - `refreshToken.updateMany({ where: { userId, revokedAt: null, expiresAt: { gt: now }, ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}) }, data: { revokedAt: now } })`
  - true 반환
- 현재 쿠키가 없거나 형식 불량·타인 것이면 keep 대상이 없으므로 해당 사용자의 유효 토큰 전부 무효화(안전 측). 이 경우 브라우저는 다음 refresh 때 401 → 재로그인

Controller (`auth.controller.ts`)
```
@Patch('password') @HttpCode(204)
async changePassword(@CurrentUser() user, @Req() req, @Body({ schema: changePasswordSchema }) dto): Promise<void>
```
- 쿠키 읽기는 logout과 동일 패턴(`req.cookies?.[REFRESH_COOKIE_NAME]`, string일 때만). 쿠키는 path `/api/v1/auth`라 이 요청에 실려 옴
- Content-Type 검사는 하지 않음(Bearer 필수 API라 CSRF 대상 아님, logout과 동일)
- `REFRESH_TOKEN_PATTERN`은 service 내부 상수 → service 안에서 판정하므로 export 불필요

DTO 신규 `backend/src/modules/auth/dto/change-password.dto.ts`
- `changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().max(128) })`, `ChangePasswordDto = z.infer<...>`
- 규칙 위반은 DTO가 아니라 service에서 PASSWORD_POLICY_VIOLATION으로 (08 UT-AUTH-01 기대값). `newPassword` 빈 문자열도 정책 위반으로 처리됨

## 5. 보안 요구사항
- 비밀번호·해시·토큰을 로그/에러 details에 출력하지 않음
- 현재 비밀번호 검증 전에는 해시를 갱신하지 않음. 비교는 bcrypt.compare만 사용
- 다른 세션의 Access Token은 최대 15분 유효(stateless JWT, 요구사항은 Refresh Token만 대상) — 의도된 동작으로 문서화만
- 현재 세션: Access Token·Refresh 쿠키 그대로 유효. Guard가 매 요청 DB에서 mustChangePassword를 읽으므로 즉시 다른 API 사용 가능
- 현재 비밀번호 무차별 대입 제한(rate limit)은 범위 밖(기존 login도 없음). 보고만

## 6. 문서 갱신 (backend 담당이 함께 수행)
- `docs/02_REQUIREMENTS.md` 36행 → `- 새 비밀번호는 8자 이상이며 영문과 숫자를 포함하고, 72바이트 이하여야 한다.` ("잠정 기준, 확인 필요" 삭제)
- `docs/08_TEST_PLAN.md` UT-AUTH-01 입력에 `73바이트 문자열` 추가, §12 비밀번호 규칙 행을 "확정됨(8자 이상, 영문+숫자, 72바이트 이하)"으로
- `docs/04_SCREEN_SPECIFICATIONS/SCR-009_PASSWORD.md` §5에 `| 새 비밀번호 72바이트 이하 | 비밀번호는 72바이트 이내로 입력해주세요. |` 행 추가
- `docs/10_DEVELOPMENT_ROADMAP.md` 61행(API-AUTH-005)·65행(SCR-009) 체크, 갱신 이력 1행 추가(테스트 실행 결과 확인 후에만 `[x]`)
- 06·05는 변경 없음

## 7. 파일
생성
- `backend/src/common/security/password-policy.ts`, `password-policy.spec.ts`
- `backend/src/modules/auth/dto/change-password.dto.ts`
수정
- `backend/src/modules/auth/auth.controller.ts`(Patch import 포함), `auth.service.ts`, `auth.repository.ts`
- `backend/src/modules/auth/auth.service.spec.ts`(repository mock에 신규 메서드 추가), `backend/test/auth.e2e-spec.ts`
참고
- `backend/src/modules/auth/auth.service.ts` login/logout(bcrypt·쿠키·AppException 패턴), `auth.repository.ts` rotateRefreshToken(interactive tx·조건부 UPDATE 패턴)
- `backend/src/common/security/credentials.ts` BCRYPT_COST, `backend/src/modules/auth/dto/login.dto.ts`
