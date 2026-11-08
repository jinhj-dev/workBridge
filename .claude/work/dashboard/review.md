VERDICT: APPROVE

# 대시보드 — 코드 리뷰 (Round 1)

## 이슈

- [높음] [담당: frontend] [분류: 버그] frontend/src/lib/auth/redirect.ts:3-10 — `safeRedirect`가 접두 문자열 검사만 해서 `/\t/evil.example`(`?redirect=%2F%09%2Fevil.example`) 같은 값을 통과시킨다. WHATWG URL 파서는 탭·개행을 제거하므로 `router.replace`에서 `//evil.example`(외부 오리진)로 해석되고, Next App Router는 외부 URL이면 `location.replace`로 이동한다. 08 §7 SCR-001의 "외부 redirect 무시" 요건을 우회하는 오픈 리다이렉트 / 수정 방향: `new URL(redirect, window.location.origin)`으로 파싱해 `origin`이 현재 오리진과 같은지 확인하고, 반환값은 `pathname + search + hash`로 다시 만든다(제어 문자가 있으면 거부해도 됨). `/login` 판정도 파싱한 pathname 기준으로 한다.
- [중간] [담당: tester] [분류: 테스트] frontend/src/app/login/LoginForm.test.tsx:213 — 위 우회 케이스가 없다. `'/\t/evil.example'`, `'/\n/evil.example'`, `'\\/evil'` 등 제어 문자·백슬래시 변형을 `it.each`에 추가하고, `safeRedirect` 단위 테스트(`src/lib/auth/redirect.test.ts`)도 둔다.

## 제안 (낮음)

- [낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/LeaveDetailModal.tsx:278 — 승인·반려 요청 중에도 Esc·X로 모달이 닫힌다(AttendanceSection은 `submittingRef`로 막음). 닫힌 뒤 응답이 오면 토스트·`onProcessed`는 정상이라 실害은 작지만, 요청 중에는 `handleClose`를 무시하는 쪽이 일관적이다.
- [낮음] [담당: frontend] [분류: 버그] frontend/src/lib/api/useApiQuery.ts:77-78 — 같은 path로 다시 열 때(A → null → A) 이전 결과(`state.path === path`)가 재조회 응답 전까지 그대로 보인다. path가 null이 되면 상태를 초기화하거나 effect 시작 시 loading으로 되돌리는 것을 검토.
- [낮음] [담당: frontend] [분류: 컨벤션] frontend/src/components/leave/LeaveDetailModal.tsx:224 — textarea 클래스가 `inputClass`와 같은 토큰 조합을 다시 적은 것. `form.tsx`에 `textareaClass`(또는 `inputClass`에서 높이만 뺀 기반 클래스)를 두고 09 §6에 함께 기록하면 SCR-004·005에서 재사용 가능.
- [낮음] [담당: backend] [분류: 버그] backend/src/modules/leaves/dto/reject-leave.dto.ts:5 — zod `.max(500)`은 UTF-16 코드 유닛 기준, 프론트(LeaveDetailModal.tsx:127)는 코드 포인트(`[...s].length`) 기준이라 이모지 등 서로게이트 문자가 섞이면 프론트는 통과·서버는 400이 된다. 기준을 하나로 맞추는 것(05의 컬럼 길이 기준 확인) 권장.
- [낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/dashboard/DashboardView.test.tsx — SCR-002 §4 "승인 대기 처리" 3단계(처리 후 승인 대기와 ADMIN 오늘 전체 현황 재조회)를 검증하는 테스트가 없다(test-plan에도 없음). ADMIN으로 상세→승인 후 `/leaves/pending-approval`·`/admin/dashboard/summary` 호출이 각각 2회인지 확인하는 케이스 추가 권장.
- [낮음] [담당: frontend] [분류: 문서갱신] .claude/work/dashboard/frontend.md "문서 갱신 예정" — 설계에 있던 10 §10(화면 테스트 건수)이 빠졌고, `Modal.tsx`의 제목 id `useId` 변경(09 §6 Modal 행)도 적혀 있지 않다. 추가 권장.
- [낮음] [담당: frontend] [분류: 컨벤션] .gitignore — `.playwright-mcp/` 추가는 승인 범위 밖 변경이지만 도구 산출물 제외라 무해. 의도한 것이면 보고서에 한 줄 남길 것.

## 확인 결과 (문제 없음)

- 백엔드: 9개 API 경로·권한·응답 형식·상태 코드·에러 코드가 06과 일치. 조건부 UPDATE(퇴근·승인·반려) + 0건 시 409, 출근 P2002 → 409, `:id` 비UUID → 404, `/attendance/today` JSON `null` 본문, Role Guard(`@AdminOnly()` 메타데이터, 인증 → 비번변경 → 역할 순서) 모두 설계대로. Controller → Service → Repository 계층 준수, `USER_SUMMARY_SELECT`로 민감 컬럼 미노출, "오늘"은 `Clock` + `toTokyoDate`로만 계산.
- 백엔드 "API 문서와 다른 점: 없음" 타당. "문서 갱신 예정"(06 5건, 07 §3, 10)이 실제 코드와 일치.
- 프론트: SCR-002 4영역(ADMIN 요약은 렌더링·호출 모두 조건부), 근태 버튼 활성 조건·확인 모달·409 재조회, 휴가 현황 미등록 안내, 승인 대기 5건·6컬럼·Empty·전체보기, 휴가 상세 모달 단계 전환과 403/404/409 처리, 셸·라우트 가드·로그아웃(redirect 없음)·드로어 구현 확인. 문구는 모두 `messages` 참조.
- 디자인 시스템: 변경 파일에서 hex·rgb·임의 px 값·인라인 style 없음(Grep). Modal·Toast·Spinner·form 클래스 재사용, 새 컴포넌트(Card·Skeleton·SectionError·Badge·StatCard·layout·LeaveDetailModal)는 `components/` 규칙대로 분리. Badge 글자색·그룹 라벨 대비 조정은 근거가 있고 문서 갱신 예정에 포함됨.
- `docs/` 직접 수정 없음(git status 기준).
- 테스트: test-plan의 U-01~11, E-ATT-01~13, E-LV-01~21, E-DS-01~06, F-DB-01~14, F-LM-01~08, F-SH-01~07, F-LG-01~05, P-01~05 반영 확인. 06 에러 코드(401·403 FORBIDDEN·403 PASSWORD_CHANGE_REQUIRED·404·409 4종·400 VALIDATION_ERROR)별 케이스 존재. `.only`/임의 skip 없음(Playwright의 환경 변수 skip은 기존 방식).
- test-report의 `password.spec.ts` 실패는 개발 DB 상태 전제 충돌로 이번 구현의 회귀가 아니라는 판단에 동의(별도 정리 필요).

---

# Round 2

대상: `frontend/src/lib/auth/redirect.ts`(frontend.md Fix 1), `frontend/src/app/login/LoginForm.test.tsx`, `frontend/src/lib/auth/redirect.test.ts`(test-report.md Run 2)

## Round 1 이슈 처리 결과

- [높음] 오픈 리다이렉트 우회 — **해결.** redirect.ts:4-17에서 `/` 시작 검사 → 제어 문자(U+0000–001F, U+007F) 거부 → `new URL(redirect, window.location.origin)` 파싱 후 origin 일치 확인 → `/login` 판정은 파싱한 pathname 기준(`/login`, `/login/…`) → `pathname + search + hash`로 재구성하는 순서로 바뀌었다. `/\evil`은 URL 파서가 `\`를 `/`로 취급해 `//evil`(외부 오리진)이 되어 origin 검사에서 걸리고, `/dashboard/../login`도 정규화 후 pathname 기준으로 차단된다. 반환값이 파서가 정규화한 값이라 `router.replace`가 다시 해석해도 결과가 같다. `safeRedirect`는 클라이언트 컴포넌트의 로그인 성공 핸들러(LoginForm.tsx:70)에서만 호출되므로 `window` 참조에 SSR 문제가 없다. catch 블록도 비어 있지 않고 null을 반환한다.
- [중간] 우회 케이스 테스트 누락 — **해결.** LoginForm.test.tsx:213-232 `it.each`에 `\t`·`\n`·`\r`·`\/evil`·`/dashboard/../login` 추가, `toHaveBeenCalledTimes(1)`로 `/dashboard` 외 이동이 없음을 함께 확인한다. 테스트 이름 서식을 `%j`로 바꿔 제어 문자가 보인다. redirect.test.ts에서 null/빈 값, 내부 경로 유지, 외부·비정상(스킴·`//`·백슬래시 변형·상대 경로), 제어 문자(앞·중간), 로그인 화면 변형, `/loginhistory` 경계, dot-segment 정규화까지 다룬다. assertion이 모두 구체적인 기대값이라 의미 없는 검증은 없다.
- 문서 갱신 제안(낮음) — frontend.md에 09 §6 Modal 행(`useId`)과 10 §10 화면 테스트 건수가 보완됐다.

## 새 이슈

없음.

## 남은 제안 (낮음, Round 1에서 이어짐)

Round 1 "제안 (낮음)" 중 LeaveDetailModal 요청 중 닫힘, useApiQuery 재조회 시 이전 결과 노출, textareaClass, 반려 사유 길이 기준, DashboardView 재조회 테스트, `.gitignore` 보고 — 이번 회차 범위 밖으로 미처리. 차단 사유는 아니며 후속 작업에서 검토 권장.
