# 대시보드 — 프론트엔드 구현 결과

## 파일 (`frontend/src/` 기준)
- 신규: `app/(app)/layout.tsx`, `app/(app)/dashboard/{page,DashboardView,AdminSummarySection,AttendanceSection,LeaveBalanceSection,PendingApprovalsSection}.tsx`, `components/layout/{AppShell,Sidebar,TopBar}.tsx`, `components/{Card,Skeleton,SectionError,Badge,StatCard}.tsx`, `components/leave/LeaveDetailModal.tsx`, `lib/api/{types,useApiQuery}.ts`, `lib/format.ts`, `lib/auth/redirect.ts`(safeRedirect)
- 수정: `app/login/LoginForm.tsx`(임시 팝업 제거 → 로그인 후 이동), `components/Modal.tsx`(제목 id를 `useId`로: 한 화면 다중 모달 id 중복 방지, Login·Password 영향 없음), `messages/ja.ts`(nav·dashboard·leave·common 추가, `login.temporaryDialog` 삭제), `app/globals.css`(`--text-h5`, `--text-h6`)

## 구현 화면 / 사용 시스템 컴포넌트
- SCR-002 대시보드(`/dashboard`) + 공통 셸(03 전역 내비게이션, 라우트 가드), SCR-004 §4.4 휴가 상세 모달(승인·반려 포함), SCR-001 로그인 후 이동
- 사용: Modal, Toast, Spinner, Logo, form(inputClass 계열·labelClass·primary/secondary/textButtonClass·FieldError·ErrorIcon), Card, Skeleton/SkeletonLines, SectionError, Badge, StatCard
- 영역별 독립 조회(useApiQuery). ADMIN 요약은 비ADMIN일 때 렌더링·호출 모두 안 함. 승인·반려 후 승인 대기 reload + (ADMIN) 요약을 key 변경으로 재조회
- 로그인: `authenticated && !mustChangePassword` → `safeRedirect(redirect) ?? '/dashboard'`. redirect는 effect 안에서 `window.location.search`로 읽어 useSearchParams/Suspense 불필요

## 새 시스템 컴포넌트
`components/Card.tsx`, `Skeleton.tsx`, `SectionError.tsx`, `Badge.tsx`, `StatCard.tsx`, `layout/AppShell.tsx`·`Sidebar.tsx`(SidebarNav)·`TopBar.tsx`, `leave/LeaveDetailModal.tsx`(+`LEAVE_STATUS_BADGE`). 훅 `lib/api/useApiQuery.ts`(`{status,data,error,reload,setData}`, 옵션 `onError`, 403 PASSWORD_CHANGE_REQUIRED → `/password`)

## 화면 리스트·설계와 다른 점
- Badge·StatCard를 추가로 만듦(설계 표에 없음): 근무 상태·휴가 상태 표시와 stats 카드를 시스템 컴포넌트로 두기 위해
- Badge success·danger 글자색을 General 100으로(09 §2.1은 Green 100 글자 → Green 40 배경 대비 2.7:1로 AA 미달). 사이드바 그룹 라벨도 General 60 → 80(대비)
- ADMIN stats 그리드 `grid-cols-2 xl:grid-cols-4`(설계는 `grid-cols-1 sm:grid-cols-2`): 375px에서 카드 4장이 세로로 길어져 2열로
- Card padding 모바일 20 / `sm` 이상 28. 사이드바에 ADMIN 메뉴 그룹 라벨 "管理者メニュー" 추가(09 §3 그룹 라벨)
- 근태 버튼: 누를 수 있는 쪽 Primary, 못 누르는 쪽 White(disabled)로 다음 동작을 명확히
- 반려 확정/승인 확인은 상세 모달 안 단계 전환(설계대로, 중첩 dialog 없음). 반려 사유 textarea 스타일은 inputClass와 같은 토큰으로 직접 지정(form.tsx에 textarea 클래스 없음)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: 위 새 컴포넌트 표 행(Card: title/action/children, padding 20→28·shadow-card / Skeleton·SkeletonLines: general-40 pulse, role=status / SectionError: onRetry / Badge: neutral·success·danger·dark, 높이 24 / StatCard: label·value·href? / AppShell: 가드·TopBar 68·Sidebar 250·`lg` 미만 드로어 / LeaveDetailModal: leaveId·onClose·onProcessed), 토큰 `text-h5`·`text-h6`, Badge 글자색·그룹 라벨 대비 결정, `useApiQuery` / Modal 행: 제목 id를 고정값에서 `useId()`로 변경(여러 모달 동시 존재 시 `aria-labelledby` 중복 방지)
- `docs/03_SCREEN_LIST.md` 전역 내비게이션: `lg` 미만 햄버거 드로어(배경 클릭·Esc·메뉴 선택 시 닫힘)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md`: §3 "전역 헤더" → 사이드바+상단바, 좁은 폭(stats 2열/4열, 표→`md` 미만 목록), 부여 연차 미등록 = `grantedDays === 0`
- `docs/10_DEVELOPMENT_ROADMAP.md`: §3 로그인 후 이동·로그아웃 UI, §4 라우트 가드(관리자 가드 제외), §9 SCR-002, §10 화면 테스트 건수(SCR-002 화면·휴가 상세 모달·셸 테스트 추가분, 건수는 test-report 기준) — 테스트·리뷰 후

## impeccable 점검 후 고친 점
- 모바일 승인 대기 목록에서 일수가 줄바꿈되던 것 → 일수를 우측 고정 열로 분리 / 모달 신청자 표기 전각 괄호 간격 정리 / stats 스켈레톤 높이를 실제 카드(92px)에 맞춤 / 모바일 목록 버튼의 aria-label 제거(내용을 그대로 읽게)
- 수치에 `tabular-nums`, 상태는 색+문구 병기, 모든 버튼·링크에 focus-visible outline

## 화면 확인 (Playwright 스크립트, API는 브라우저 단에서 mock, 기존 3000 dev 서버 사용)
- 1440·1024·375px, 기본/로딩/조회 실패/Empty+부여 0/EMPLOYEE/상세 모달/반려 필수 오류/드로어. 모든 폭 가로 overflow 0, 콘솔 오류 없음(실패 케이스의 500 제외)
- `screenshots/`: dashboard-1440.png, -1440-modal.png, -1440-reject-error.png, -1440-loading.png, dashboard-1024-empty-employee.png, dashboard-375.png, -375-modal.png, -375-reject-error.png, -375-drawer.png, -375-error.png

## 검증 / 남은 것
- `npx tsc --noEmit`·`npm run build`는 **`LoginForm.test.tsx`의 `temporaryDialog` 참조 3곳 때문에 실패**(테스트 파일 임시 제외 시 build 통과, `/dashboard` 정적 prerender OK). lint 통과. vitest 36개 중 실패 4개 = 모두 제거한 임시 팝업 검증 → tester가 이동 검증으로 교체 필요. `e2e/login.spec.ts`도 같은 이유로 갱신 필요
- 테스트 작성 시 주의: 승인 대기는 표(`md` 이상)와 목록(`md` 미만)이 jsdom에서 둘 다 렌더링됨 → `getAllBy*` 사용
- 범위 밖 그대로: `/`는 기존 헬스 체크 페이지, 비관리자 `/admin/*` 가드, 사이드바 승인 대기 배지, PasswordChangeForm의 임시 로그아웃 버튼

## Fix 1 (수정 루프 B, Round 1)
- 수정: `frontend/src/lib/auth/redirect.ts` — [높음] `safeRedirect` 오픈 리다이렉트 우회. 제어 문자(U+0000–001F, U+007F) 포함 시 거부 → `new URL(redirect, window.location.origin)`으로 파싱해 origin 일치 확인 → `/login` 판정은 파싱한 pathname 기준(`/dashboard/../login`도 차단) → 반환값은 `pathname + search + hash`로 재구성
- 임시 스크립트 확인: `/	/evil.example`·`/
/…`·`/
/…`·`\/evil`·`/\evil.example`·`//evil.example`·`https://evil.example`·`/login?x=1` → null, `/dashboard`·`/leaves?status=PENDING#a` → 그대로. `tsc --noEmit` 통과, eslint 통과, `src/app/login` vitest 20/20 통과
- 문서 갱신 예정 보완: 09 §6 Modal 행(`useId`), 10 §10 화면 테스트 건수 추가(위 섹션 반영)
- 테스트 코드 미수정(우회 케이스·`redirect.test.ts` 추가는 tester 담당). 다른 낮음 제안은 이번 회차 범위 밖으로 미처리
