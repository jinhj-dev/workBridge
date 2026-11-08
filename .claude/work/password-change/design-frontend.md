# 비밀번호 변경 — Frontend 설계 (SCR-009 `/password`)

공통 규칙은 `.claude/work/context.md`. API 상세는 `design-backend.md` §2. 화면 기준: `docs/04_SCREEN_SPECIFICATIONS/SCR-009_PASSWORD.md`, `docs/03_SCREEN_LIST.md` Common UI Rules. 문구는 모두 일본어로 `messages/ja.ts`에 추가.

## 1. 범위
- 포함: `/password` 화면, 로그인 성공 시 `mustChangePassword = true`면 `/password`로 이동, 최소 Toast 공용 컴포넌트
- 제외(로드맵 별도 항목): 전역 라우트 가드(다른 화면 접근 시 `/password` 강제), 전역 내비게이션, `/dashboard` 화면, 로그인 후 redirect 처리, API 403 `PASSWORD_CHANGE_REQUIRED` 전역 처리. 변경 완료 후 `/dashboard`로 이동하지만 대시보드가 아직 없어 404가 정상임
- 기존 `AuthUser.id: number`(실제는 UUID 문자열)는 이번에 고치지 않고 보고만

## 2. 호출 API
- `PATCH /auth/password` body `{ currentPassword, newPassword }` → 204. 에러 code: `INVALID_CURRENT_PASSWORD`, `PASSWORD_POLICY_VIOLATION`(message를 그대로 표시), `VALIDATION_ERROR`
- `POST /auth/logout`(기존 `useAuth().logout`)

## 3. 상태·로직
`frontend/src/lib/auth/AuthProvider.tsx`에 추가
- `changePassword(currentPassword: string, newPassword: string): Promise<void>` — `apiFetch<void>('/auth/password', { method: 'PATCH', body: JSON.stringify(...) })` 성공 후 `setState(s => s.user ? { ...s, user: { ...s.user, mustChangePassword: false } } : s)`. `AuthContextValue`에 추가
- Access Token 만료 시 `apiFetch`가 1회 refresh 후 재시도(기존). refresh 실패 시 status가 unauthenticated가 됨

Toast (신규 `frontend/src/components/Toast.tsx`)
- `ToastProvider`(children) + `useToast(): { showToast(message: string, variant?: 'success' | 'error'): void }`
- 한 번에 1개, 약 4초 후 자동 사라짐, 화면 상단 중앙/우측 floating(09 floating notification), `role="status"`, `aria-live="polite"`. 기능 추가 금지(큐·액션 버튼 없음)
- `frontend/src/app/layout.tsx`에서 `<AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>`
- 페이지 이동 후에도 보이도록 layout에 둠

## 4. 화면 (`frontend/src/app/password/`)
- `page.tsx`: metadata `title: \`${messages.password.title} | ${messages.app.name}\``, `<PasswordChangeForm />` 렌더(login/page.tsx와 동일 구조)
- `PasswordChangeForm.tsx`(`'use client'`), 레이아웃은 LoginForm 카드와 동일(입력·라벨·버튼 class, `FieldError`/`ErrorIcon` 모양). 공용화가 필요하면 LoginForm의 상수·FieldError를 `components/`로 옮겨도 되지만 LoginForm 동작을 바꾸지 말 것(선택, 하지 않아도 됨)
- `useAuth().status`
  - `loading`: 카드 자리에 Spinner만
  - `unauthenticated`: `router.replace('/login?redirect=%2Fpassword')` (useEffect), 아무것도 렌더하지 않음
  - `authenticated`: 폼
- 구성(위→아래): 제목 `パスワード変更`, (mustChangePassword일 때만) 안내 `初回ログインのため、パスワードを変更してください。`, 現在のパスワード / 新しいパスワード / 新しいパスワード（確認） — 모두 `type="password"`, autoComplete `current-password` / `new-password` / `new-password`, 버튼 `変更する`(primary, submit)
  - mustChangePassword = false: `キャンセル` 버튼(White 아웃라인) → `router.back()`
  - mustChangePassword = true: 취소 버튼 없음. 전역 메뉴가 아직 없으므로 임시로 `ログアウト` 텍스트 버튼 표시 → `await logout()` 후 `router.replace('/login')`(logout은 실패해도 로컬 정보 삭제)

입력 검증(제출 시, 클라이언트) — 필드별 1개 메시지, 첫 오류 필드에 focus
| 필드 | 조건 | 문구 |
|---|---|---|
| 3개 모두 | 빈 값 | パスワードを入力してください。 |
| 新しい | UTF-8 72바이트 초과(`new TextEncoder().encode(v).length > 72`) | パスワードは72バイト以内で入力してください。 |
| 新しい | `[...v].length < 8` 또는 `/[A-Za-z]/`·`/[0-9]/` 불충족 | パスワードは8文字以上で、英字と数字を含めてください。 |
| 新しい | 현재와 동일 | 現在のパスワードと異なるパスワードを入力してください。 |
| 確認 | 새 비밀번호와 불일치 | 新しいパスワードが一致しません。 |
- 규칙 판정 함수는 같은 파일 내 `validate(...)` 순수 함수로(LoginForm 패턴). 백엔드와 같은 순서·기준

제출·응답 처리
- 중복 제출 방지: `submittingRef` + 버튼 disabled + Spinner(LoginForm과 동일)
- 성공: 입력 초기화 → `showToast('パスワードを変更しました。', 'success')` → `router.replace('/dashboard')`
- `ApiError` `INVALID_CURRENT_PASSWORD`: 現在のパスワード 필드 아래 `現在のパスワードが正しくありません。`, 해당 필드 focus
- `ApiError` `PASSWORD_POLICY_VIOLATION`: 新しいパスワード 필드 아래 `error.message`
- 그 외 `ApiError`(VALIDATION_ERROR, 500 등): `showToast(error.message, 'error')`
- `NetworkError`: `showToast(error.message, 'error')`

## 5. 로그인 화면 수정 (`frontend/src/app/login/LoginForm.tsx`)
- `status === 'authenticated' && user?.mustChangePassword`이면 `router.replace('/password')`(useEffect; 로그인 직후와 복원된 경우 모두)
- 임시 다이얼로그는 mustChangePassword = false일 때만 열림(`dialogOpen` 조건에 추가). 다이얼로그 안의 mustChangePassword 문구와 `messages.login.temporaryDialog.mustChangePassword` 삭제(사용처 없어짐)
- 그 외 LoginForm 동작은 변경하지 않음

## 6. 문구 추가 (`frontend/src/messages/ja.ts`)
`password: { title, notice, currentPassword, newPassword, confirmPassword, submit, cancel, logout, validation: { required, tooLong, policy, sameAsCurrent, mismatch }, error: { invalidCurrent }, success }` — 값은 §4의 일본어. 확인 라벨은 `新しいパスワード（確認）`

## 7. 파일
생성: `frontend/src/app/password/page.tsx`, `PasswordChangeForm.tsx`, `PasswordChangeForm.test.tsx`, `frontend/src/components/Toast.tsx`, `frontend/e2e/password.spec.ts`
수정: `frontend/src/lib/auth/AuthProvider.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/login/LoginForm.tsx`, `LoginForm.test.tsx`(mustChangePassword 케이스 기대값 변경, `next/navigation` mock), `frontend/src/messages/ja.ts`
재사용: `frontend/src/components/Logo.tsx`, `Spinner.tsx`, `frontend/src/lib/api/client.ts`(apiFetch, ApiError, NetworkError)
