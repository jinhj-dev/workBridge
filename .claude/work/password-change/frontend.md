# 비밀번호 변경 — Frontend 구현 기록

## 생성·수정 파일
- 생성 `frontend/src/app/password/page.tsx`(metadata + 폼), `PasswordChangeForm.tsx`
- 생성 `frontend/src/components/Toast.tsx` — `ToastProvider` / `useToast().showToast(message, variant='success')`, 1개만·4초 자동 소멸·상단 중앙, `role="status"` `aria-live="polite"`
- 생성 `frontend/src/components/form.tsx` — LoginForm에 있던 `inputClass`·`labelClass`·`primaryButtonClass`·`ErrorIcon`·`FieldError`를 이동(내용 동일, LoginForm은 import만 변경)
- 수정 `frontend/src/lib/auth/AuthProvider.tsx` — `changePassword(current, next)` 추가(성공 시 `user.mustChangePassword=false`). **`AuthUser.id: number` → `string`(UUID) 수정**(architect 지적 기존 버그, 호출측 지시로 이번에 수정. 사용처 없음)
- 수정 `frontend/src/app/layout.tsx` — `<AuthProvider><ToastProvider>` 
- 수정 `frontend/src/app/login/LoginForm.tsx` — `authenticated && mustChangePassword`면 `router.replace('/password')`(useEffect), 임시 다이얼로그는 mustChangePassword=false일 때만 열림, 다이얼로그의 변경 필요 문구 제거
- 수정 `frontend/src/messages/ja.ts` — `password.*` 추가, `login.temporaryDialog.mustChangePassword` 삭제

## 화면 구성 (/password)
- status: loading → Spinner만 / unauthenticated → `router.replace('/login?redirect=%2Fpassword')`, null 렌더 / authenticated → 카드 폼
- 제목, (mustChangePassword) 안내문, 비밀번호 3개(type=password, autoComplete current/new/new), `変更する`(submittingRef+disabled+Spinner)
- mustChangePassword=false: `キャンセル`(흰 아웃라인, `router.back()`) / true: 취소 없음, 임시 `ログアウト` 텍스트 버튼(logout 실패해도 `/login`으로 이동)
- 클라이언트 검증: 설계 표대로(`validate` 순수 함수, 72바이트→8자·영문·숫자→현재와 동일, 확인 불일치), 첫 오류 필드 focus
- 응답: 성공→입력 초기화·성공 Toast·`/dashboard`(미구현이라 404 정상) / INVALID_CURRENT_PASSWORD→현재 필드 아래 / PASSWORD_POLICY_VIOLATION→새 필드 아래 `error.message` / 그 외 ApiError·NetworkError→에러 Toast

## 검증
- `npm run lint` 통과, `npx prettier --check src` 통과
- `npx tsc --noEmit`·`npm run build`: **`LoginForm.test.tsx`(194, 212행)가 삭제된 `temporaryDialog.mustChangePassword`를 참조해 타입 에러** → 테스트 수정 전까지 build 실패
- `npm test`: LoginForm.test.tsx 14건 실패(`invariant expected app router to be mounted` — `next/navigation` mock 필요)

## 테스트 담당에게 넘김 (테스트 코드는 규칙상 미수정)
- `LoginForm.test.tsx`: `next/navigation`(useRouter) mock 추가, `shouldMentionPasswordChangeWhenMustChangePassword`를 `/password` replace 기대로 변경
- 신규 `PasswordChangeForm.test.tsx`, `frontend/e2e/password.spec.ts` 작성(e2e는 개발 DB 관리자 비밀번호를 바꾸지 않는 계정/복원 방식 필요)
- 백엔드 수정 필요 사항 없음

## Fix 1 (review Round 1, frontend 담당 4건)
- [중간] 버튼 변형 공용화: `components/form.tsx`에 `secondaryButtonClass`(09 Button White, 기존 값 그대로 이동)·`textButtonClass`(텍스트 버튼, 로그아웃 인라인 class 이동 + `rounded`로 focus outline 모서리 정리) export. `PasswordChangeForm.tsx`는 import만, 로컬 상수 삭제
- [중간] `docs/09_DESIGN_SYSTEM.md`에 §6 "구현된 공용 컴포넌트 (frontend)" 추가(기존 1~5절 토큰·규칙 무변경, 추가만): form.tsx(inputClass·labelClass·3종 버튼 class·FieldError/ErrorIcon), Toast, Modal, Spinner, Logo의 파일·용도·변형·토큰·접근성 + `text-h4` + Auth Layout 카드 수치
- [낮음] Heading 4 토큰: `globals.css` `@theme`에 `--text-h4: 2rem` / `--text-h4--line-height: 2.75rem` 추가, `LoginForm.tsx`·`PasswordChangeForm.tsx`의 `text-[2rem]/11` → `text-h4`(빌드 CSS에서 `.text-h4` 생성 확인, 수치 동일)
- [낮음] 로딩 접근성: loading 상태 래퍼에 `role="status"` + `<span className="sr-only">{messages.common.loading}</span>`, `ja.ts` `common.loading: '読み込み中'` 추가
- 수정 파일: `frontend/src/components/form.tsx`, `frontend/src/app/password/PasswordChangeForm.tsx`, `frontend/src/app/login/LoginForm.tsx`, `frontend/src/app/globals.css`, `frontend/src/messages/ja.ts`, `docs/09_DESIGN_SYSTEM.md`
- 검증: `prettier --check src` / `npm run lint` / `npx tsc --noEmit` / `npm test`(34 passed) / `npm run build` 모두 통과
- impeccable 점검: 텍스트 버튼 focus outline이 각진 사각형으로 나오던 것을 radius 4(컨트롤 radius)로 맞춤. 그 외 레이아웃·문구 변경 없음
- 화면 확인: 생략 (브라우저 도구 없음). 개발 DB 비밀번호 변경 조작 안 함
- 참고: loading 중에는 Toast 영역과 합쳐 `role="status"`가 2개가 됨. 현재 테스트(`getByRole('status')`는 authenticated 상태에서만 사용)에는 영향 없음
