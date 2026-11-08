# 비밀번호 변경 — Backend 구현 기록

## 생성·수정 파일
- 생성 `backend/src/common/security/password-policy.ts` — `checkPasswordPolicy(password): string | null` (72바이트 초과 → 8자·영문·숫자 순, 위반 시 일본어 message)
- 생성 `backend/src/modules/auth/dto/change-password.dto.ts` — `changePasswordSchema`, `ChangePasswordDto`
- 수정 `backend/src/modules/auth/auth.repository.ts` — `findUserWithPasswordHashById`, `updatePasswordAndRevokeOtherTokens`(interactive tx, 조건부 UPDATE 0건이면 false·토큰 무효화 안 함)
- 수정 `backend/src/modules/auth/auth.service.ts` — `changePassword(userId, dto, currentRefreshToken)`, 모듈 내부 헬퍼 `invalidCurrentPassword()`(bcrypt 불일치·경합 두 곳에서 같은 에러 생성)
- 수정 `backend/src/modules/auth/auth.controller.ts` — `PATCH auth/password`(204), 쿠키 읽기는 logout과 동일 패턴
- 문서: `docs/02_REQUIREMENTS.md` FR-AUTH-003 규칙 확정, `docs/08_TEST_PLAN.md` UT-AUTH-01 입력·§12 확정, `docs/04_SCREEN_SPECIFICATIONS/SCR-009_PASSWORD.md` §5 72바이트 행 추가

## 미수행 (담당 밖)
- `password-policy.spec.ts`, `auth.service.spec.ts` mock 추가, `test/auth.e2e-spec.ts` — 테스트 코드는 backend 담당 규칙상 건드리지 않음. 테스트 담당이 작성 필요
- `docs/10_DEVELOPMENT_ROADMAP.md` 체크·갱신 이력 — 설계상 테스트 결과 확인 후에만 `[x]`이므로 미반영. 테스트 통과 후 반영 필요

## API 요약 (design과 동일, 차이 없음)
- `PATCH /api/v1/auth/password`, `Authorization: Bearer <accessToken>` 필수, mustChangePassword 사용자도 호출 가능
- 요청 JSON `{ currentPassword: string(1~128), newPassword: string(≤128) }`
- 성공 204 본문 없음, Set-Cookie 없음(현재 Refresh 쿠키·Access Token 유지). 이후 me는 `mustChangePassword: false`
- 에러
  - 400 VALIDATION_ERROR(+details): 필드 누락·비문자열·currentPassword 빈 문자열·128자 초과
  - 400 PASSWORD_POLICY_VIOLATION: `パスワードは72バイト以内で入力してください。` / `パスワードは8文字以上で、英字と数字を含めてください。`(newPassword 빈 문자열 포함) / `現在のパスワードと異なるパスワードを入力してください。`
  - 400 INVALID_CURRENT_PASSWORD `現在のパスワードが正しくありません。` (불일치 또는 동시 변경 경합)
  - 401 UNAUTHORIZED: 토큰 없음·무효·비활성/부재 사용자
- 검사 순서: 정책(DB 접근 전) → 사용자 조회 → bcrypt.compare → new===current → hash → 조건부 UPDATE
- 토큰 무효화: 현재 쿠키(형식 `^[A-Za-z0-9_-]{43}$`)의 해시를 제외한 본인의 유효 Refresh Token 전부 revoke. 쿠키 없음·형식 불량이면 전부 revoke(현재 세션도 다음 refresh 시 401)

## 프론트엔드가 알아야 할 것
- `apiFetch('/auth/password', { method: 'PATCH', body })` 그대로 사용(쿠키는 path `/api/v1/auth`라 자동 전송). 환경변수·CORS 변경 없음
- 정책 위반 3종은 code가 같으므로 화면 문구 분기가 필요하면 message 또는 클라이언트 측 사전 검증으로 구분
- 다른 세션의 Access Token은 최대 15분 유효(stateless JWT, 의도된 동작)

## 검증
- `npx tsc --noEmit`, `npm run lint`, `npx prettier --check src` 통과. 기존 unit(auth·common) 67건 통과. e2e는 미실행(테스트 담당)
- 개발 DB 데이터 변경 없음

## context.md 정정
- 없음

## Fix 1 (review.md Round 1, backend 담당 2건)
- [중간·문서불일치] `docs/10_DEVELOPMENT_ROADMAP.md` 갱신 (수치는 test-report.md Run 1 기준)
  - 61행 API-AUTH-005, 65행 SCR-009 → `[x]`. §1 요약표 인증 백엔드 `진행 중 → 완료`(백엔드 세부 항목 전부 `[x]`), 프론트·도메인은 `진행 중` 유지
  - 68행: `[ ]` 유지, `/password` 이동 완료와 `redirect`·`/dashboard` 남음을 명시
  - §10 화면 테스트 행: SCR-009(Vitest 15건, Playwright 2건 중 1건 실행·1건 E2E_ADMIN_PASSWORD 미설정 skip) 추가, 항목은 `[ ]` 유지
  - 갱신 이력 1행 추가(unit 96·e2e 124·frontend 34 통과, Playwright 1건만 실행). 최종 갱신일은 이미 2026-11-08이라 그대로
- [낮음·컨벤션] `backend/src/modules/auth/auth.controller.ts` — Refresh 쿠키 읽기 3곳(refresh·logout·changePassword)을 private `readRefreshCookie(req): string | undefined`로 정리. 동작 변경 없음
- 검증: `npx tsc --noEmit`, `npm run lint` 통과, unit 96/96, `test/auth.e2e-spec.ts` 85/85 통과(테스트 DB). 개발 DB 변경 없음
- API 변경 없음, 문서 갱신 예정 없음

## Fix 2 (review.md Round 2, backend 담당 1건)
- [중간·문서갱신] `docs/10_DEVELOPMENT_ROADMAP.md` 수치를 test-report.md Run 2 기준으로 정정
  - 149행 §10 화면 테스트: SCR-009 `Vitest 15건, Playwright 2건 중 1건 실행·1건 skip` → `Vitest 17건, Playwright 2건`. SCR-001(Vitest 18건, Playwright 7건)은 유지
  - 169행 갱신 이력: `frontend 34건 통과. Playwright 1건만 실행` → `frontend 36건 통과, Playwright 9건 통과`(login 7 + password 2, skip 0)
- 코드 변경 없음, API 변경 없음, 문서 갱신 예정 없음
