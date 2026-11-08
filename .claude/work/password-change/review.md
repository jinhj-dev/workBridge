VERDICT: APPROVE

# 비밀번호 변경 — 코드 리뷰 (Round 1)

## 요약
- Backend: API-AUTH-005 계약(경로·메서드·204·에러 코드 INVALID_CURRENT_PASSWORD / PASSWORD_POLICY_VIOLATION / VALIDATION_ERROR / 401)이 06 문서·design-backend와 일치. 정책 검사 → 조회 → bcrypt.compare → 동일 비교 → 조건부 UPDATE + 타 세션 토큰 무효화(1 트랜잭션) 순서도 설계대로. 버그 없음.
- Frontend: SCR-009 요소(안내 문구, 입력 3개, 변경, 취소 숨김, 로그아웃만 노출), 응답별 처리, 로그인 후 `/password` 이동 모두 구현. API 계약 일치.
- 테스트: test-plan 시나리오 전부 반영(unit 25, e2e 19, 컴포넌트 15, LoginForm 수정, Playwright 2). assertion이 DB 상태·토큰 상태까지 확인해 의미 있음.
- 남은 것은 문서 갱신 누락과 디자인 시스템 정리.

## 이슈

[중간] [담당: backend] [분류: 문서불일치] docs/10_DEVELOPMENT_ROADMAP.md:61,65,68,149,159~ — 테스트 통과(test-report RESULT: PASS)가 확인됐는데 API-AUTH-005·SCR-009 체크, 68행(로그인 후 `/password` 이동은 이번에 구현됨 — 부분 반영 표기), §10 화면 테스트 행, 갱신 이력, 최종 갱신일이 그대로임 / design-backend §6대로 `[x]` 처리하고 갱신 이력 1행(unit 96·e2e 124·frontend 34 통과, Playwright는 E2E_ADMIN_PASSWORD 미설정으로 1건만 실행) 추가. 68행은 `redirect`·`/dashboard` 이동이 남았으므로 `[ ]` 유지하되 `/password` 이동 완료를 명시.

[중간] [담당: frontend] [분류: 디자인시스템] frontend/src/app/password/PasswordChangeForm.tsx:51-52, 197 — 09 §3 Button의 White(아웃라인) 변형을 페이지 안 로컬 상수 `secondaryButtonClass`로, 텍스트 버튼(로그아웃)을 인라인 class로 일회성 정의함. 확인 모달의 취소 등 이후 화면에서 바로 재사용될 변형 / `primaryButtonClass`와 같이 `components/form.tsx`(또는 버튼 공용 모듈)로 옮겨 export하고 PasswordChangeForm은 import만 하도록.

[중간] [담당: frontend] [분류: 디자인시스템] docs/09_DESIGN_SYSTEM.md — 새 공용 컴포넌트 `components/Toast.tsx`(ToastProvider/useToast, 상단 중앙·4초·1건·success/error 토큰)와 `components/form.tsx`(inputClass·labelClass·버튼 class·FieldError)가 09에 기록되지 않음 / 09에 "구현된 공용 컴포넌트" 절(또는 §3 표의 비고)을 추가해 파일 위치·변형·사용 토큰·접근성(role=status, aria-live=polite, aria-invalid/aria-describedby)을 적는다. 기존 Modal·Spinner·Logo도 함께 적으면 이후 리뷰 기준이 생김.

[낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/app/password/PasswordChangeForm.tsx:163 — `text-[2rem]/11` 임의값(09 Heading 4 32/44). LoginForm에서 이어진 기존 패턴이라 이번 이슈로는 올리지 않지만, `@theme`에 Heading 4 토큰(`--text-h4` 등)을 두고 두 화면에서 쓰는 것을 제안.

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/app/password/PasswordChangeForm.tsx:156-159 — loading 상태가 `aria-hidden` Spinner만 있어 보조기기에 아무것도 전달되지 않음 / `role="status"` + 시각적으로 숨긴 문구(ja.ts) 추가를 제안.

[낮음] [담당: backend] [분류: 컨벤션] backend/src/modules/auth/auth.controller.ts:67-68, 94-95, 108-109 — Refresh 쿠키 읽기(`req.cookies` → string 판정)가 세 번째로 반복됨 / controller 내부 private 헬퍼(`readRefreshCookie(req)`)로 정리 제안(동작 변경 없음).

[낮음] [담당: tester] [분류: 테스트] frontend/src/app/password/PasswordChangeForm.test.tsx — 기타 ApiError(500, VALIDATION_ERROR) → 에러 토스트 분기는 테스트가 없음(네트워크 오류만 있음). test-plan 필수 항목은 아니므로 제안으로 남김.

## "문서와 다른 점" 타당성
- frontend.md: `AuthUser.id: number → string` 수정 — 실제 API(UUID)와 일치시키는 것이고 사용처가 없어 영향 없음. 타당.
- frontend.md: `components/form.tsx`로 LoginForm 상수 이동 — design-frontend §4에서 허용한 선택 사항. LoginForm 동작 변화 없음 확인. 타당.
- backend.md: 차이 없음.

---

# Round 2 (backend Fix 1 · frontend Fix 1 · test-report Run 2)

VERDICT: CHANGES_REQUESTED

## Round 1 이슈 처리 확인
- [중간·backend] 로드맵 체크·68행·§10·갱신 이력 — 반영됨(61·65행 `[x]`, 68행 부분 완료 명시, §1 요약표 백엔드 완료). 단, 수치가 Run 1 기준이라 Run 2 이후 다시 어긋남(아래 이슈 1).
- [중간·frontend] 버튼 변형 공용화 — 해소. `components/form.tsx`에 `secondaryButtonClass`·`textButtonClass` export, PasswordChangeForm은 import만. 값은 토큰만 사용.
- [중간·frontend] 09 기록 — 해소. §6 "구현된 공용 컴포넌트" 추가, 기존 1~5절 무변경. 내용(form.tsx·Toast·Modal·Spinner·Logo, text-h4, Auth 카드 수치)이 실제 코드와 일치.
- [낮음·frontend] `text-h4` 토큰 — 해소. `globals.css` `@theme`에 추가, LoginForm·PasswordChangeForm 모두 `text-h4`. `text-[...]` 임의값 잔존 없음(Grep 확인).
- [낮음·frontend] 로딩 접근성 — 해소. `role="status"` + `sr-only` `messages.common.loading`('読み込み中').
- [낮음·backend] `readRefreshCookie` — 해소. refresh·logout·changePassword 3곳 모두 헬퍼 사용, 동작 동일.
- [낮음·tester] 기타 ApiError 토스트 — 해소. it.each 2건(500, 400 VALIDATION_ERROR), error 변형·aria-invalid 없음·입력 유지·이동 없음·1회 호출·버튼 재활성화까지 확인해 assertion이 의미 있음.

## Playwright 전제 변경 (tester) 타당성
- test-plan §5의 "관리자 로그인 후 취소 버튼 표시"는 seed 관리자가 `must_change_password = true`라 성립하지 않음. 바뀐 테스트(로그인 직후 `/password` 이동, 안내문·로그아웃 표시, 취소 0건, 재읽기 후 복원, 불일치 클라이언트 오류, PATCH 0회)는 docs/08 §7 SCR-009 "최초 로그인 시 취소 버튼 미표시"에 오히려 더 맞음. 취소 표시는 컴포넌트 테스트가 담당. 타당.
- login.spec `shouldKeepSessionAfterReloadWithRefreshCookie` 기대값 변경도 새 동작(mustChangePassword면 다이얼로그 대신 `/password`)에 따른 것이고 쿠키 속성·스토리지·refresh/me 검증은 그대로 유지됨. 구현에 맞춰 기대값을 무작정 바꾼 경우가 아님. 타당.
- 변경 API는 `page.route` abort로 막혀 개발 DB 비밀번호가 바뀌지 않음. Run 2 데이터 기록에서도 확인됨.

## 이슈

[중간] [담당: backend] [분류: 문서갱신] docs/10_DEVELOPMENT_ROADMAP.md:149, 169 — Fix 1이 Run 1 수치로 적혀 있어 Run 2 결과와 다름. 149행 "SCR-009 Vitest 15건, Playwright 2건 중 1건 실행 — 1건 skip", 169행 "frontend 34건 통과, Playwright는 E2E_ADMIN_PASSWORD 미설정으로 1건만 실행" / Run 2 기준으로 고친다: SCR-009 Vitest 17건·Playwright 2건(전부 실행), frontend 36건 통과, Playwright 9/9 통과(login.spec 7 + password.spec 2, skip 0). 149행 SCR-001 "Playwright 7건"은 개수 그대로라 유지.

[낮음] [담당: tester] [분류: 테스트] .claude/work/password-change/test-plan.md:63 — §5 "취소 버튼 표시" 전제가 실제 테스트와 다르게 남아 있음. 변경 내용은 test-report Run 2에 기록돼 있으므로 제안으로만 남김(작업 문서 정리 차원에서 test-plan에 한 줄 정정 권장).

## 기타 확인
- `docs/` 수정은 Round 1 리뷰가 요청한 범위(10 로드맵, 09 §6 추가)뿐이고 다른 프로젝트 문서 변경 없음.
- API·화면 동작 변경 없음. frontend.md 참고에 적힌 loading 중 `role="status"` 2개(Toast 영역 + 로딩) 공존은 Toast 영역이 비어 있어 실사용 문제 없음.

---

# Round 3 (backend Fix 2 · test-report Run 3)

VERDICT: APPROVE

## Round 2 이슈 처리 확인
- [중간·backend] 로드맵 수치 — 해소. docs/10_DEVELOPMENT_ROADMAP.md 149행 "SCR-009 완료(Vitest 17건, Playwright 2건)", 169행 "frontend 36건 통과, Playwright 9건 통과"로 test-report Run 2(PasswordChangeForm 17, frontend 36/36, Playwright 9/9 skip 0)와 일치. SCR-001 "Vitest 18건, Playwright 7건"(149·168행) 유지됨. unit 96·e2e 124도 Run 2와 일치. 149행 `[ ]`는 08 §7의 다른 화면이 남아 있으므로 맞음.
- [낮음·tester] test-plan §5 전제 — 해소. 63행이 실제 password.spec(로그인 직후 `/password` 자동 이동, 안내문·로그아웃 표시, 취소 0건, 새로고침 후 복원, 불일치 클라이언트 오류, PATCH 0회)과 일치하고, 취소 표시는 컴포넌트 테스트 담당이라고 명시됨.

## 이슈
- 없음.

## 기타 확인
- 이번 라운드의 변경은 문서 2곳(10 로드맵 2줄, 작업 폴더 test-plan 1줄)뿐이고 코드·테스트·API 변경 없음. 재실행이 필요 없다는 Run 3 판단은 타당.
