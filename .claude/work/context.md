# workBridge 공통 컨텍스트

## 기술 스택
- 모노레포(npm, 루트 package.json은 명령 모음만). Node `^20.19 || ^22.12 || >=24`
- Backend: NestJS 12, TypeScript 6, ESM(`"type": "module"`, import에 `.js` 확장자 필수), Prisma 7.10(@prisma/adapter-pg, 생성물 `src/generated/prisma`), PostgreSQL(docker compose), zod 4(입력 검증), bcrypt 6(cost 12), @nestjs/jwt(HS256), cookie-parser
- Frontend: Next.js 16.4(App Router, `cacheComponents`), React 19.3, Tailwind 4(토큰은 `src/app/globals.css` `@theme`), 상태관리 라이브러리 없음(React Context)
- 테스트: backend Vitest 4 + Supertest(e2e는 실제 테스트 DB `workbridge_test`), frontend Vitest + Testing Library(jsdom) + Playwright(실제 백엔드·개발 DB 연동)

## 폴더 구조
- `docs/` 기준 문서(02 요구사항, 03 화면목록·공통 UI 규칙, 04 화면명세, 05 DB, 06 API, 07 아키텍처, 08 테스트, 09 디자인, 10 로드맵)
- `backend/src/modules/<domain>/` controller / service / repository / dto / guards / decorators
- `backend/src/common/` exceptions(AppException), filters(AllExceptionsFilter), pipes(zod 검증), security(credentials)
- `backend/src/config/` env 검증(zod), `backend/src/prisma/` PrismaService
- `backend/prisma/` schema.prisma, migrations, seed.ts
- `backend/test/` e2e(`*.e2e-spec.ts`), `test/db/db-helpers.ts`(createTestPrisma, TestDataTracker, uniqueSuffix)
- `frontend/src/app/<route>/` page.tsx(서버, metadata) + 클라이언트 폼 컴포넌트(`'use client'`) + `*.test.tsx`
- `frontend/src/components/` 공용 UI, `frontend/src/lib/` api·auth, `frontend/src/messages/ja.ts` 표시 문구 사전
- `frontend/e2e/` Playwright

## 컨벤션
- 코드 주석·UI 문구·에러 message·커밋은 **일본어**. 문서(docs, .claude/work)는 한국어. 식별자는 영어
- Controller는 HTTP만, Service는 업무 로직, Repository만 Prisma 접근(Controller → Repository 직접 호출 금지)
- 입력 검증: zod 스키마를 `dto/*.dto.ts`에 두고 `@Body({ schema })`로 적용. 실패 시 400 `VALIDATION_ERROR` + `details[{field,message}]`
- 업무 에러: `throw new AppException(code, HttpStatus.X, '日本語メッセージ')` → `{statusCode, code, message, details}`
- 인증 실패는 `UnauthorizedException`(401, 사유 비공개)
- API: prefix `/api/v1`, JSON camelCase, 204는 본문 없음
- 전역 Guard: `JwtAuthGuard`(APP_GUARD) → 내부에서 `PasswordChangeGuard` 호출. 공개 API는 `@Public()`, 비밀번호 변경 필요 사용자 허용은 `@AllowPasswordChangeRequired()`(AuthController 클래스에 이미 부여)
- 프론트 문구는 반드시 `messages`(ja.ts)에서 참조. 하드코딩 금지
- 테스트 이름: `shouldXxxWhenYyy` 또는 일본어 설명(기존 spec 참고)

## 공용 모듈
- `backend/src/common/exceptions/app.exception.ts` AppException, ErrorDetail
- `backend/src/common/security/credentials.ts` BCRYPT_COST, DUMMY_PASSWORD_HASH, EMP_ID_PATTERN
- `backend/src/modules/auth/decorators/current-user.decorator.ts` `@CurrentUser()` → AuthUser
- `backend/src/modules/auth/auth.constants.ts` 토큰 TTL, Refresh 쿠키 이름·옵션(path `/api/v1/auth`)
- `backend/src/modules/auth/auth.service.ts` `hashRefreshToken(token)` (SHA-256 hex)
- `frontend/src/lib/api/client.ts` `apiFetch<T>(path, init)`(401 시 1회 refresh 후 재시도), `ApiError{statusCode,code,message,details}`, `NetworkError`
- `frontend/src/lib/auth/AuthProvider.tsx` `useAuth()` → `{status:'loading'|'authenticated'|'unauthenticated', user, login, logout}`
- `frontend/src/components/` Logo, Modal(`<dialog>`), Spinner, Toast(`useToast().showToast(msg, 'success'|'error')`), form.tsx(inputClass, labelClass, primary/secondary/textButtonClass, FieldError) — 상세는 `docs/09_DESIGN_SYSTEM.md` §6
- `backend/test/db/db-helpers.ts` TestDataTracker.cleanup()은 leaves·attendance·leave_grants·refresh_tokens까지 FK 순서로 삭제
- `backend/src/common/time/` `Clock`(전역 TimeModule, 테스트는 `overrideProvider(Clock)`), `tokyo-date.ts`(도쿄 날짜·일시 변환) / `common/pagination/pagination.ts`(`paginationQuerySchema`, `toSkipTake`, `Page<T>`) / `common/mappers/user-summary.ts`(`USER_SUMMARY_SELECT`, `toUserSummary`)
- Role Guard: `@AdminOnly()`(`modules/auth/decorators/admin-only.decorator.ts`) + `AdminGuard`. JwtAuthGuard가 인증 → PasswordChange → Admin 순으로 호출
- `frontend/src/components/layout/AppShell.tsx`(`app/(app)/layout.tsx`에서 사용, 라우트 가드: 비로그인 → `/login?redirect=`, mustChangePassword → `/password`, 비관리자 `/admin`·`/admin/*` → 토스트 1회 + `/dashboard` replace), Card·Skeleton·SectionError·Badge·StatCard, `components/leave/LeaveDetailModal.tsx`, `lib/api/useApiQuery.ts`, `lib/api/types.ts`, `lib/format.ts`, `lib/auth/redirect.ts`(`safeRedirect`) — 상세는 09 §6
- `frontend/src/components/` Pagination, Tooltip, `table.ts`(thClass/tdClass), `form.tsx` selectClass, `attendance/`(ATTENDANCE_STATUS_BADGE, MISSING_ROW_CLASS, DateRangeFields) / `lib/date-range.ts`(기간 기본값·검증·URL Query 파싱), `lib/useSyncedState.ts` — 상세는 09 §6
- `backend/src/modules/attendance/attendance-rules.ts`(`resolveDateRange`, `assertValidTimeRange`, `MAX_RANGE_DAYS`) / `modules/departments/`(GET /departments)
- `backend/test/e2e-helpers.ts` FixedClock, 토큰 서명, leaves·attendance·leave_grants INSERT 헬퍼
- `frontend/src/components/Tabs.tsx` `Tabs({label,items,value,onChange})`(horizontal, roving tabIndex) / `components/layout/PendingApprovalCount.tsx` `PendingApprovalCountProvider`(AppShell이 감쌈)·`usePendingApprovalCount()`→`{count,refresh}`(승인·반려 후 `refresh()` 호출) / `LeaveDetailModal`의 `initialStep`(detail/approve/reject) — 상세는 09 §6

## 명령어
- DB: 루트 `npm run db:up` / backend `npm run db:migrate`, `npm run db:migrate:test`(e2e 전 필요), `npm run db:seed`, `npm run db:e2e-accounts`(개발 DB 전용, seed 후 실행. E2E 계정 900001/900002 생성·초기화, localhost DB만 허용), `npm run db:sample-attendance`(개발 DB 전용, 사원번호 00001의 2026년 10월 평일 22건 근태 샘플 INSERT. 페이지네이션·상태 검색 확인용. 이미 있는 날은 변경하지 않아 재실행해도 중복 없음, localhost만·production 거부), `npm run db:e2e-attendance-fixture`(개발 DB 전용, 900001의 attendance를 삭제 후 상태 확인용 6건으로 입력: 오늘 근무 중·1/3일 전 퇴근 누락·2/4일 전 퇴근 완료·40일 전 퇴근 완료. `frontend/e2e/attendance-status.spec.ts`가 실행), `npm run db:e2e-attendance-reset`(개발 DB 전용, E2E 관리자 900001의 attendance만 삭제, localhost만·production 거부. `frontend/e2e/attendance.spec.ts` beforeAll이 실행)
- Backend(`backend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`(unit), `npm run test:e2e`
- Backend 단일 파일: `npx vitest run src/modules/auth/auth.service.spec.ts`, e2e `npx vitest run --config ./vitest.config.e2e.ts test/auth.e2e-spec.ts`
- Frontend(`frontend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`, 단일 `npx vitest run src/app/login/LoginForm.test.tsx`, `npm run test:e2e`(globalSetup이 개발 DB의 E2E 계정 900001/900002를 자동 초기화. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 필요, 둘 다 없으면 초기화 skip·로그인 테스트 skip, `PLAYWRIGHT_BASE_URL` 지정 시 초기화 안 함)
- 포맷: 루트 `npm run format` / `npm run format:check`
- 개발 서버: 루트 `npm run dev:backend`(http://localhost:4000, API `/api/v1`) / `npm run dev:frontend`(http://localhost:3000, `/api/v1/*`를 `BACKEND_URL`로 rewrite)
- backend e2e는 `fileParallelism: false`(파일 순차 실행). Playwright는 개발 DB를 쓰므로 실행 시 데이터가 남는다

## 문서 맵
- `docs/01_PRD.md` — 제품 개요·범위·성공 기준 — reviewer
- `docs/02_REQUIREMENTS.md` — 업무 규칙 단일 기준(FR/NFR) — backend, tester, reviewer, security
- `docs/03_SCREEN_LIST.md` — 화면 목록, 접근 규칙, 공통 UI 규칙(상태 처리·전역 내비게이션) — frontend, tester, reviewer
- `docs/04_SCREEN_SPECIFICATIONS/SCR-00N_*.md` — 화면별 명세(구성·동작·문구·API) — frontend, tester
- `docs/05_DATABASE_DESIGN.md` — 테이블·제약·잠금·날짜 처리(§9) — backend, reviewer
- `docs/06_API_SPECIFICATION.md` — API 계약(경로·권한·입출력·에러 코드) — backend, frontend, tester, reviewer, security
- `docs/07_ARCHITECTURE.md` — 계층 구조, 인증·Guard 구성 — backend, reviewer, security
- `docs/08_TEST_PLAN.md` — 테스트 수준·TC 목록·권한 매트릭스 — tester, reviewer
- `docs/09_DESIGN_SYSTEM.md` — 디자인 토큰·구현된 공용 컴포넌트(§6) — frontend, reviewer
- `docs/10_DEVELOPMENT_ROADMAP.md` — 진행 상태 체크리스트(완료 시 갱신) — reviewer
