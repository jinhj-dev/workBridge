SECURITY: PASS

# 비밀번호 변경 — 보안 점검 (Round 1)

## 점검 범위
- backend: `src/common/security/password-policy.ts`, `src/modules/auth/dto/change-password.dto.ts`, `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, 관련 기존 모듈(`auth.constants.ts`, `guards/password-change.guard.ts`, `common/filters/all-exceptions.filter.ts`, `common/pipes/validation.pipe.ts`, `main.ts`)
- frontend: `src/app/password/PasswordChangeForm.tsx`, `src/lib/auth/AuthProvider.tsx`, `src/lib/api/client.ts`, `src/app/login/LoginForm.tsx`(이동 부분)
- 신규 의존성: 없음

## 확인 결과 (문제 없음)
- 해싱: bcrypt cost 12(`BCRYPT_COST`), 비교는 `bcrypt.compare`만 사용. 현재 비밀번호 검증 전에는 해시 갱신 없음
- 72바이트 상한: 서버 `Buffer.byteLength(..., 'utf8') <= 72`로 bcrypt 절단 문제 차단. DTO `max(128)`로 과대 입력도 bcrypt 전에 거부(해시 연산 DoS 완화)
- 동시 변경: `updateMany where { id, passwordHash: oldHash }` 조건부 UPDATE + 같은 트랜잭션 내 토큰 무효화. 경합 시 토큰 무효화도 하지 않음
- 토큰 무효화: keep 대상은 `userId`로 한정된 조건 안의 `NOT tokenHash`이므로 타인 쿠키를 보내도 영향 없음. 쿠키 없음·형식 불량이면 전부 무효화(안전 측)
- 인가: userId는 `@CurrentUser()`(검증된 JWT sub + DB 재조회)에서만 가져옴. 요청 본문으로 대상 사용자 지정 불가 → IDOR 없음. 비활성 사용자는 401
- `@AllowPasswordChangeRequired()`는 AuthController 클래스 단위, `@Public()` 미부여 확인. PasswordChangeGuard는 fail-closed
- CSRF: Bearer 헤더 필수(Access Token은 메모리 보관), Refresh 쿠키는 httpOnly·Secure·SameSite=Strict·path `/api/v1/auth`. 백엔드는 127.0.0.1 바인딩, Next 경유 동일 오리진
- 정보 노출: 응답 에러는 고정 일본어 message만, details는 zod issue의 field/message만(입력값 미포함). 비밀번호·해시·토큰 로깅 없음(필터는 5xx 스택만)
- 사용자 열거: 인증된 본인만 호출 가능하므로 해당 없음
- XSS: 서버 message는 React 텍스트 노드로만 렌더링(`FieldError`, Toast). `dangerouslySetInnerHTML` 없음
- 프론트 성공 시 입력값 state 초기화, `type="password"`·적절한 `autoComplete`

## 이슈

- [중간] [담당: backend] `backend/src/modules/auth/auth.controller.ts:97`, `auth.service.ts:162` — 현재 비밀번호 검증에 시도 횟수 제한·잠금 없음 / 탈취한 Access Token(최대 15분)이나 무인 상태의 로그인 세션으로 `PATCH /auth/password`에 현재 비밀번호를 대입해 맞히면 비밀번호를 바꾸고 피해자의 다른 세션을 전부 끊어 계정을 영구 탈취할 수 있음(bcrypt cost 12가 속도를 늦추지만 병렬 요청으로 우회 가능) / 설계상 범위 밖(login도 동일)이므로 이번엔 권고. 인증 공통 과제로 사용자 단위 실패 횟수 제한(예: N회 실패 시 일정 시간 429, 또는 세션 무효화)을 login과 함께 도입

- [낮음] [담당: backend] `backend/src/modules/auth/auth.repository.ts:62` (설계 §5 기재 사항) — 비밀번호 변경 후에도 다른 세션의 Access Token은 최대 15분 유효 / 비밀번호 유출을 눈치채고 변경해도 공격자가 이미 가진 Access Token으로 최대 15분간 API 사용 가능(이 기간 비밀번호 재변경은 새 비밀번호를 몰라 불가) / 의도된 동작으로 문서화됨. 필요 시 users에 `password_changed_at`(또는 token version)을 두고 Guard에서 `iat` 비교 — DB 변경이므로 별도 승인 사안

- [낮음] [담당: frontend] `frontend/src/app/password/PasswordChangeForm.tsx:79` — `/login?redirect=%2Fpassword`를 붙이지만 LoginForm은 아직 `redirect`를 읽지 않음(현재 악용 경로 없음) / 향후 redirect 처리 구현 시 검증 없이 `router.replace(redirect)`하면 오픈 리다이렉트(피싱 사이트로 유도) / 구현 시 `/`로 시작하고 `//`·`/\`로 시작하지 않는 동일 오리진 상대 경로만 허용

- [낮음] [담당: backend] `backend/src/common/filters/all-exceptions.filter.ts:33` — 5xx 시 예외 스택 전체를 로그에 출력. Prisma 오류 중 일부는 쿼리 인자를 메시지에 포함할 수 있어 `updateMany where.passwordHash`(bcrypt 해시)가 로그에 남을 가능성 / 이 기능에서 정상 경로로는 발생하지 않으며 해시 자체도 cost 12라 악용 가치 낮음 / 운영 로그 정책 수립 시 Prisma 오류는 code·meta만 남기도록 검토
