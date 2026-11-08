# 대시보드 — 프론트엔드 설계

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` — 전체(화면 구성·동작·상태 처리·문구 기준)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` — §4.4 휴가 상세 모달
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md` — §6 승인 처리, §7 반려 처리, §8 유효성 검증, §10 상태 처리
- `docs/03_SCREEN_LIST.md` — Screen Access Rules, Common UI Rules(인증 및 권한 처리, 상태 처리, 모달, 전역 내비게이션), Screen Flow
- `docs/09_DESIGN_SYSTEM.md` — §2 토큰, §3 레이아웃(App Shell, Page Header, Card Panel), §4 SCR-002 행, §5 확정된 결정(반응형), §6 구현된 공용 컴포넌트
- API 계약 상세: `.claude/work/dashboard/design-backend.md`
- Next.js 16 사용법은 `frontend/node_modules/next/dist/docs/` 확인(route group, `useSearchParams`와 Suspense, cacheComponents)

## 라우트 구조
- `src/app/(app)/layout.tsx` — 로그인 후 화면 공통 레이아웃. 클라이언트 `AppShell`로 감싼다(URL에 영향 없음)
- `src/app/(app)/dashboard/page.tsx` — 서버 컴포넌트(metadata) + `DashboardView`(`'use client'`)
- `/login`, `/password`는 셸 밖에 그대로 둔다(이번 범위 밖)

## 공통 셸 (03 전역 내비게이션, 09 §3 App Shell)
### AppShell (`src/components/layout/AppShell.tsx`)
- 라우트 가드(03 인증 및 권한 처리)
  - `status === 'loading'`: 전체 화면 중앙 Spinner(`role="status"` + sr-only `messages.common.loading`). 자식 렌더링 안 함
  - `unauthenticated`: `router.replace('/login?redirect=' + encodeURIComponent(pathname + search))`
  - `user.mustChangePassword`: `router.replace('/password')`
  - 로그아웃으로 인한 unauthenticated는 redirect 파라미터 없이 `/login`으로만 이동해야 한다(로그아웃 진행 플래그로 가드의 redirect 부착을 막을 것)
  - 비관리자 `/admin/*` 가드는 이번 범위 밖(관리자 화면 없음)
- 구성: TopBar(높이 68, 흰 배경+그림자) + Sidebar(너비 250) + 본문(`bg-general-30`)
### TopBar
- 좌: `Logo`, `lg` 미만에서 햄버거 버튼(`aria-label`, `aria-expanded`, `aria-controls`)
- 우: 사용자 메뉴 — 이름 버튼 → 드롭다운(비밀번호 변경 `/password` 링크, 로그아웃 버튼). 로그아웃: `useAuth().logout()`(실패해도 로컬 정보는 지워짐) 후 `router.replace('/login')`
### Sidebar
- 메뉴(03 표 순서·URL 그대로): 대시보드, 근태 관리, 휴가 관리, 휴가 승인 / ADMIN만: 사원 관리, 전체 근태
- 활성 항목: 현재 pathname 일치 시 `bg-primary-100 text-white`, `aria-current="page"`. 항목 높이 44, 좌우 margin 16(09 §2.3)
- 승인 대기 배지는 이번 범위 밖
- 반응형: `lg` 이상 고정 사이드바 / `lg` 미만은 드로어(햄버거로 열기, 배경 클릭·Esc·메뉴 선택 시 닫기). 이 결정은 문서 반영 대상
- 아이콘 라이브러리를 새로 추가하지 않는다(텍스트 메뉴, 필요 시 인라인 SVG)

## SCR-002 대시보드 (`/dashboard`)
`DashboardView`는 4개 영역 컴포넌트를 배치만 한다. 각 영역은 자기 API를 독립 조회하고 독립적으로 Loading/Error/Empty를 가진다(SCR-002 §6 마지막 줄).

| 영역 | 컴포넌트 | API | 표시 조건 |
|---|---|---|---|
| 상단(Page Header) | DashboardView 내부 | 없음(`useAuth().user`) | 항상 |
| 오늘 전체 현황 | `AdminSummarySection` | GET /admin/dashboard/summary | `user.role === 'ADMIN'`일 때만 **렌더링과 호출 모두** |
| 근태 현황 | `AttendanceSection` | GET /attendance/today, POST clock-in / clock-out | 항상 |
| 휴가 현황 | `LeaveBalanceSection` | GET /leaves/balance | 항상 |
| 승인 대기 현황 | `PendingApprovalsSection` | GET /leaves/pending-approval?scope=mine&limit=5 | 항상 |

### 상단
- 페이지 제목(Heading 5, `--text-h5` 토큰을 `globals.css` `@theme`에 추가 — 09 §6 방식), 사용자 이름·부서(부서 null이면 생략), 현재 날짜(Asia/Tokyo, `Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', ... })`, 요일 포함)

### 오늘 전체 현황 (ADMIN)
- Stat 카드 4개: 출근·미출근·휴가·승인 대기(09 §4: Modernize stats 카드 매핑, 수치는 Heading 6). 그리드 `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`
- 승인 대기 카드 전체가 `next/link` → `/leaves/approvals?scope=all`
- 승인·반려 처리 후 다시 조회(아래 "영역 간 갱신")

### 근태 현황
- 상태: 응답 `null`(또는 빈 본문으로 undefined) → 미출근 / `WORKING` → 근무 중 / `DONE` → 퇴근 완료
- 출근·퇴근 시간: `HH:mm`(Asia/Tokyo), 없으면 `—`
- [출근] 미출근일 때만 활성, [퇴근] 근무 중일 때만 활성(로딩·에러 중에는 둘 다 비활성)
- 클릭 → 확인 `Modal`(SCR-002 §4 문구) → 확인 버튼 요청 중 비활성+Spinner, 중복 제출 방지(ref) → 성공: 응답 Attendance로 상태 갱신, Toast success, 모달 닫기
- 실패: 409 ALREADY_CLOCKED_IN·NOT_CLOCKED_IN·ALREADY_CLOCKED_OUT → 서버 message Toast error + 오늘 근태 다시 조회 / 기타 ApiError → 서버 message Toast / NetworkError → 네트워크 Toast. 모두 모달 닫기

### 휴가 현황
- 부여·승인 완료·승인 대기·잔여(일 단위, 0.5 표시 가능: `10.5日`)
- `grantedDays === 0`이면 "부여 연차가 등록되지 않았습니다." 안내(DOC_ISSUES 결정)
- [휴가 신청] `next/link` → `/leaves?tab=apply`(버튼 스타일 링크)

### 승인 대기 현황
- 최대 5건. 컬럼: 신청자·부서·휴가 종류·기간(`시작 ~ 종료`, 같으면 하나)·일수·신청일(createdAt의 도쿄 날짜)
- `md` 이상 표(09 §2.3 Table 규칙), `md` 미만 카드형 목록(같은 정보). 각 행/카드는 버튼으로 클릭·키보드 접근 가능 → `LeaveDetailModal` 열기
- Empty: SCR-002 §7 문구. [전체보기] 링크 → `/leaves/approvals`

### 영역 간 갱신
- 모달에서 승인·반려(또는 409/403/404)가 끝나면 PendingApprovals와 (ADMIN이면) AdminSummary를 다시 조회. `DashboardView`가 `reload` 함수를 내려주거나 refresh 키를 증가시키는 방식 — 전역 상태 라이브러리 추가 금지

## 휴가 상세 모달 (신규 공용, `src/components/leave/LeaveDetailModal.tsx`)
- Props: `leaveId: string | null`(null이면 닫힘), `onClose()`, `onProcessed()`(목록 재조회 트리거)
- 열릴 때 GET /leaves/:id. 로딩 Skeleton, 조회 실패: 403·404 → 모달 닫고 Toast + `onProcessed()`(03 규칙), 그 외 → 모달 안 SectionError(다시 시도)
- 표시 항목: SCR-004 §4.4 표 그대로(승인자 null → "자동 승인", 처리자/처리 시간은 processedAt 있을 때, 반려 사유는 REJECTED일 때)
- 버튼: `canProcess = status === 'PENDING' && leave.user.id !== me.id && (leave.approver?.id === me.id || me.role === 'ADMIN')`일 때 [승인][반려], 항상 [닫기]. [취소] 버튼은 SCR-004 구현 때 추가(대시보드 경로에서는 본인 신청이 나오지 않음)
- 단계 전환(하나의 `Modal` 안에서 내용 교체, 중첩 dialog 사용 안 함)
  - 승인 확인: SCR-005 §6 문구(`{신청자}님의 휴가를 승인하시겠습니까?`) → PATCH approve → Toast "승인되었습니다." → 닫기 + `onProcessed()`
  - 반려: textarea(라벨, 필수, 최대 500자, 글자 수 표시 `n/500`) → 클라이언트 검증(SCR-005 §8 문구, 공백만이면 필수 오류) → PATCH reject → Toast "반려되었습니다." → 닫기 + `onProcessed()`. 400 VALIDATION_ERROR는 details를 textarea 아래 FieldError로
  - 409 ALREADY_PROCESSED → 서버 message Toast + 닫기 + `onProcessed()` / 403 FORBIDDEN → Toast(SCR-005 §10) + 닫기 + `onProcessed()` / 404 → Toast + 닫기 + `onProcessed()`
  - 요청 중 버튼 비활성+Spinner
- Modal 폭(최대 420)은 그대로 사용. Modal.tsx 수정이 꼭 필요하면 기존 사용처(Login·Password) 영향 확인

## 새로 만들 공용 컴포넌트 (09 §6에 없음)
| 파일 | 이유 |
|---|---|
| `components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`(사용자 메뉴 포함) | 03 전역 내비게이션. 09 §3 App Shell |
| `components/Card.tsx` — `Card({ title?, action?, children })` | 09 §3 Card Panel(흰 배경, radius 6, padding 28, `shadow-card`). 4개 영역 공통 |
| `components/Skeleton.tsx` | 03 Loading 스켈레톤. Figma에 없음(09 §4 △) → `bg-general-40` + `animate-pulse`, `aria-hidden` |
| `components/SectionError.tsx` — `SectionError({ onRetry })` | 03 Error(조회 실패) 문구 + [다시 시도]. Figma에 없음(09 §4 ✕) → secondaryButtonClass 사용 |
| `components/leave/LeaveDetailModal.tsx` | SCR-004 §4.4 공용 모달(SCR-004·005에서 재사용 예정) |
- 토큰은 `globals.css` `@theme`만 사용. 새 색상 추가 금지(09 §5-3)

## 데이터 접근
- `src/lib/api/types.ts`: `UserSummary`, `Leave`, `Attendance`, `Paginated<T>`, `LeaveBalance`, `AdminDashboardSummary`, `LeaveType`, `LeaveStatus`(06 §0 그대로)
- `src/lib/api/useApiQuery.ts`: `useApiQuery<T>(path: string | null)` → `{ status: 'loading'|'error'|'success', data, error, reload }`. path가 null이면 호출 안 함(ADMIN 아님). 언마운트 후 setState 방지
- `src/lib/format.ts`: `formatTokyoDate(iso)`, `formatTokyoTime(iso)`, `formatDays(n)`, `formatTodayLabel(now)` — 모두 Asia/Tokyo 고정
- 401 처리·refresh는 기존 `apiFetch`에 맡긴다. 403 PASSWORD_CHANGE_REQUIRED는 `/password`로 이동(03) — useApiQuery 또는 셸에서 공통 처리

## 로그인 화면 수정 (SCR-001, 03 Screen Flow)
- `LoginForm.tsx`: 임시 팝업(Modal, `temporaryDialog` 문구, `loggedInHere`·`dialogDismissed`) 제거
- `authenticated && !mustChangePassword` → `router.replace(safeRedirect(redirect) ?? '/dashboard')`. 로그인 상태로 `/login` 접근해도 동일(03 Screen Access Rules)
- `safeRedirect`: `/`로 시작하고 `//`·`/\`로 시작하지 않는 내부 경로만 허용, 그 외 무시(08 §7 SCR-001). `/login` 자신으로의 redirect도 무시
- `useSearchParams` 사용 시 Next 16 규칙(Suspense 경계)을 문서로 확인

## 문구 (`src/messages/ja.ts`)
- 추가: `nav`(메뉴명·사용자 메뉴·햄버거 aria), `dashboard`(영역 제목, 상태명, 버튼, 확인 모달, 토스트, Empty, 미등록 안내, 날짜/일수 형식), `leave`(종류·상태 라벨, 상세 모달 항목, 승인·반려 문구, 검증 문구), `common`(다시 시도, 조회 실패 문구 — 없으면 추가)
- 삭제: `login.temporaryDialog`
- 의미 기준은 SCR-002·SCR-004 §4.4·SCR-005 §6~8·03의 한국어 문구, 표시 문자열은 일본어. 하드코딩 금지

## 파일
신규
- `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`, `DashboardView.tsx`, `AdminSummarySection.tsx`, `AttendanceSection.tsx`, `LeaveBalanceSection.tsx`, `PendingApprovalsSection.tsx`, `DashboardView.test.tsx`
- `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `AppShell.test.tsx`
- `src/components/Card.tsx`, `Skeleton.tsx`, `SectionError.tsx`
- `src/components/leave/LeaveDetailModal.tsx`, `LeaveDetailModal.test.tsx`
- `src/lib/api/types.ts`, `src/lib/api/useApiQuery.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`
- `e2e/dashboard.spec.ts`
수정
- `src/app/login/LoginForm.tsx`, `LoginForm.test.tsx`(임시 팝업 검증 → 이동 검증으로 교체), `e2e/login.spec.ts`(로그인 후 `/dashboard` 확인)
- `src/messages/ja.ts`, `src/app/globals.css`(`--text-h5`, 필요 시 `--text-h6`)

재사용할 기존 코드
- `src/components/Modal.tsx`, `Toast.tsx`, `Spinner.tsx`, `Logo.tsx`, `form.tsx`
- `src/lib/api/client.ts`(`apiFetch`, `ApiError`, `NetworkError`), `src/lib/auth/AuthProvider.tsx`(`useAuth`)
- 폼·모달·테스트 작성 방식: `src/app/password/PasswordChangeForm.tsx`·`.test.tsx`, `src/app/login/LoginForm.test.tsx`

## 문서 갱신 예정 (구현 후 frontend.md에 확정 내용 기록)
- 09 §6: AppShell·Sidebar·TopBar·Card·Skeleton·SectionError·LeaveDetailModal, `text-h5` 토큰
- 03 전역 내비게이션: `lg` 미만 드로어 배치
- SCR-002: §3 "전역 헤더" 표현을 사이드바+상단바로, 좁은 폭 배치(카드 그리드·표→카드 목록), 부여 연차 미등록 판정(grantedDays=0)
- 10: §3 로그인 후 이동·로그아웃 UI, §4 라우트 가드(일부), §9 SCR-002, §10 화면 테스트 건수
