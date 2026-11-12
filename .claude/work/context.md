# workBridge 공통 컨텍스트

## 기술 스택
- 모노레포(npm, 루트 package.json은 명령 모음만). Node `^20.19 || ^22.12 || >=24`
- Backend: NestJS 12, TypeScript 6, ESM(`"type": "module"`, import에 `.js` 확장자 필수), Prisma 7.10(@prisma/adapter-pg, 생성물 `src/generated/prisma`), PostgreSQL(docker compose), zod 4(입력 검증), bcrypt 6(cost 12), @nestjs/jwt(HS256), cookie-parser, @holiday-jp/holiday_jp 2.5.2(일본 공휴일 데이터, 1970~2050, `common/time/japanese-holiday.ts`에서만 import)
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
- `frontend/src/components/` Logo, Modal(`<dialog>`), Spinner, Toast(`useToast().showToast(msg, 'success'|'error')`), form.tsx(inputClass, labelClass, primary/secondary/textButtonClass, FieldError, `primaryOutlineButtonClass`·`modalPrimaryButtonClass`·`modalSecondaryButtonClass`(09 §6 미기록). 09 §3 Danger 버튼은 미구현) — 상세는 `docs/09_DESIGN_SYSTEM.md` §6
- `backend/test/db/db-helpers.ts` TestDataTracker.cleanup()은 leaves·attendance·leave_grants·refresh_tokens까지 FK 순서로 삭제
- `backend/src/common/time/` `Clock`(전역 TimeModule, 테스트는 `overrideProvider(Clock)`), `tokyo-date.ts`(도쿄 날짜·일시 변환) / `common/pagination/pagination.ts`(`paginationQuerySchema`, `toSkipTake`, `Page<T>`) / `common/mappers/user-summary.ts`(`USER_SUMMARY_SELECT`, `toUserSummary`)
- Role Guard: `@AdminOnly()`(`modules/auth/decorators/admin-only.decorator.ts`) + `AdminGuard`. JwtAuthGuard가 인증 → PasswordChange → Admin 순으로 호출
- `frontend/src/components/layout/AppShell.tsx`(`app/(app)/layout.tsx`에서 사용, 라우트 가드: 비로그인 → `/login?redirect=`, mustChangePassword → `/password`, 비관리자 `/admin`·`/admin/*` → 토스트 1회 + `/dashboard` replace), Card·Skeleton·SectionError·Badge·StatCard, `components/leave/LeaveDetailModal.tsx`, `lib/api/useApiQuery.ts`, `lib/api/types.ts`, `lib/format.ts`, `lib/auth/redirect.ts`(`safeRedirect`) — 상세는 09 §6
- 미구현 주의: SCR-006·007(`/admin/users`) 프론트 페이지·API-USER-* 없음(사이드바 링크만 존재). 공지·알림 기능 없음
- `frontend/src/components/` Pagination, Tooltip, `table.ts`(thClass/tdClass), `form.tsx` selectClass, `attendance/`(ATTENDANCE_STATUS_BADGE, MISSING_ROW_CLASS, DateRangeFields, StatusFilterButtons) / `lib/date-range.ts`(기간 기본값·검증·URL Query 파싱, SCR-003 md 미만용 `parseMyHistoryQuery`), `lib/useSyncedState.ts`, `lib/useMediaQuery.ts`(`useMediaQuery(query)`→`boolean|null`, 서버·hydration 중 null. SCR-003 `AttendanceView`가 md 기준으로 출근부/근태 이력 중 한쪽만 마운트) — 상세는 09 §6
- `backend/src/modules/attendance/attendance-rules.ts`(`resolveDateRange`, `assertValidTimeRange`, `MAX_RANGE_DAYS`) / `modules/departments/`(GET /departments, `admin-departments.controller.ts` 부서 CRUD·정렬·summary·`:id/members`·manager-candidates(API-DEPT-002~009), 부서 description·manager(책임자, 잠금 부서→사원), `department.constants.ts` `SYSTEM_DEPARTMENT_CODE='UNASSIGNED'`) , 프론트 SCR-010 `app/(app)/admin/departments/`(DepartmentsView·DepartmentFormModal·DepartmentDeleteModal·DepartmentMembersModal·DepartmentDetailModal·SortableTh·icons, 09 §6) / `TestDataTracker.createDepartment(overrides?)`는 고유 code 자동 부여, `createUser`는 departmentId 미지정 시 tracker 전용 부서 사용
- 직책·연락처: `backend/prisma/initial-data.ts` `JOB_TITLES`(seed 4개, tone), `TestDataTracker.createJobTitle(overrides?)`(cleanup은 users 뒤 job_titles). 役職·連絡先은 API-DEPT-008에서만 반환(05 §2-1, 06). `db:sample-users`·`db:e2e-accounts`는 직책이 필요하므로 `db:seed` 선행
- `backend/test/e2e-helpers.ts` FixedClock, 토큰 서명, leaves·attendance·leave_grants INSERT 헬퍼
- 셸: `components/layout/TopBar.tsx`(벨 = `/leaves/approvals` 링크·아바타 메뉴, 햄버거 없음), `layout/MobileTabBar.tsx`(`lg` 미만 하단 4탭 ホーム·出勤簿·休暇管理·メニュー, 「メニュー」가 드로어 토글. 休暇承認 메뉴·탭은 삭제, 승인 대기 배지는 休暇管理), `layout/navIcons.tsx`(셸 아이콘), `Sidebar.tsx` 아이콘·활성 `primary-30` — 09 §3·§6
- `frontend/src/components/Tabs.tsx` `Tabs({label,items,value,onChange})`(horizontal, roving tabIndex) / `components/layout/PendingApprovalCount.tsx` `PendingApprovalCountProvider`(AppShell이 감쌈)·`usePendingApprovalCount()`→`{count,refresh}`(승인·반려 후 `refresh()` 호출) / `LeaveDetailModal`의 `initialStep`(detail/approve/reject) — 상세는 09 §6
- `frontend/src/lib/leave-days.ts`(`countLeaveDays`, `parseLeavesQuery(params)`→`{appliedFrom,appliedTo,leaveType,status,page}`, `LEAVE_STATUSES`, `LEAVE_TYPES`, `isHalfDay`. `yearOptions`·`year` 해석은 삭제됨) / `lib/leave-calendar.ts`(SCR-004 캘린더 그리드·막대 배치) — 상세는 09 §6
- SCR-004 휴가 관리 = 경로 3개(`/leaves`·`/leaves/calendar`·`/leaves/approvals`), 페이지 안 탭 UI 없음 — 전환은 사이드바 休暇管理 개폐 하위 메뉴(`layout/SidebarSubmenu.tsx`, 하단 탭은 `/leaves` 링크). 承認 표시 판정은 `layout/ApprovalsAccess.tsx` `ApprovalsAccessProvider`(AppShell이 감쌈)·`useApprovalsVisible()`→`boolean|null`을 사이드바와 공유. `app/(app)/leaves/layout.tsx`→`LeaveManagementLayout`(헤더·신청 모달·承認 직접 접근 가드), `LeaveDataVersion.tsx` `useLeaveDataVersion()`→`{version,bump}` / 공용 `PageHeader`·`SearchInput`(`NavTabs`는 삭제됨), `components/leave/` `LeaveCategoryBadge`·`MonthNavigator`·`LeaveDayModal`·`leaveIcons`, `Card.tsx` `cardFrameClass`, `table.ts` `bandThClass`·`bandTdClass` — 09 §6
- `backend/src/modules/leaves/leave-calendar-rules.ts`(API-LEAVE-010 category·halfDay 변환), `leaves/dto/comma-separated-enum.ts`(쉼표 복수 enum 공용), `common/time/tokyo-date.ts` `tokyoDayStart`·`tokyoNextDayStart`(신청일 도쿄 날짜 범위)
- `frontend/src/lib/calendar.ts`(`shiftMonth`, `formatMonthLabel`, UTC 연산만. 출근부 사용. `MonthCalendar`·`buildMonthWeeks`는 삭제됨) / `Card({title,icon?,action?})` 헤더는 `flex-wrap`(action이 넘치면 다음 줄), radius 16·테두리·`shadow-card-soft` — 상세는 09 §6
- `frontend/src/components/DonutChart.tsx`(정적 SVG 도넛, 09 §5-4 예외) / `StatCard` `icon?`·`unit?`·`tone?` / `Badge` variant `info`·`positive`·`caution`·`violet`·`pink`(役職 배지, 토큰 `violet-30/110`·`pink-30/110`, 09 §5 8) / `LeaveStatusBadge` `soft` / `lib/greeting.ts`·`work-progress.ts`(진행률 `workProgressPercent`만, 退勤予定 目安 없음)·`attendance-rate.ts`, `format.ts` `formatHours` / 대시보드 전용 `app/(app)/dashboard/` `icons.tsx`·`CardLink`·`MetricValue` — 상세는 09 §6. 추가 토큰(`success-30/110`, `warning-30/110`, `violet-100/80`, `page-from/to`, `shadow-card-soft`, `text-greeting`, `text-stat`)은 09 §2
- `backend/src/common/validation/date-schema.ts` `dateSchema`(실재하는 `YYYY-MM-DD`만 허용, create-leave DTO 사용) / `modules/dashboard/dashboard.controller.ts`(USER용 `/dashboard/department-status` API-DASH-004만. API-DASH-002·003 캘린더는 제거), `dashboard/today-status-rules.ts`(오늘 3분류 집계 규칙) / `common/time/calendar-rules.ts`(`monthRange`, `isWeekend`)
- `frontend/src/components/Modal.tsx` `icon?`·`size?('md'|'lg'|'xl')`(xl = 800, 09 §6 기록) / `components/DetailTable.tsx`(`DetailTable`·`DetailTableRow({label})`, 2열 상세 표) — 09 §6 미기록(PR #18). `components/leave/LeaveStatusBadge.tsx`는 09 §6에 기록됨
- `frontend/src/components/leave/LeaveApplyModal.tsx`(공통 휴가 신청 모달, SCR-004만 사용(대시보드 신청 버튼 삭제), 열 때마다 `key` 변경. `LeaveFilterButtons`는 삭제됨) — 상세는 09 §6
- `backend/src/common/time/japanese-holiday.ts` `japaneseHolidaysInRange(start,end)` → `Map<'YYYY-MM-DD', 공휴일명>`(TZ 비의존, 범위 밖은 빈 Map. 출근부와 대시보드 집계 `isWorkday`가 사용) / `modules/attendance/attendance-sheet-rules.ts`(`legalBreakMinutes`, `placeBreak`, `nightMinutes`, `buildSheetDay`, `summarizeSheet`, 공휴일 Map 주입) + `attendance-sheet.service.ts`(API-ATT-007 조립)
- `frontend/src/components/attendance/WorkTimeline.tsx`(`WorkTimeline({segments,markerMinute?,label})`, `WorkTimelineAxis()`, 24시간 막대) / `lib/attendance-sheet.ts`(`parseSheetMonth`, `formatSheetDate`(`2日（月）`), `weekdayIndex`, `workPatternOf`, `toTimelineSegments`) / `components/attendance/workPattern.ts`(`WORK_PATTERN_BADGE`) / `Badge` `shape='pill'` / `table.ts` `compactTdClass`(행 36) / `lib/useHorizontalOverflow.ts` — 상세는 09 §6

## 명령어
- DB: 루트 `npm run db:up` / backend `npm run db:migrate`, `npm run db:migrate:test`(e2e 전 필요), `npm run db:seed`, `npm run db:e2e-accounts`(개발 DB 전용, seed 후 실행. E2E 계정 900001/900002 생성·초기화, DEV 부서 필요, localhost DB만 허용), `npm run db:sample-attendance`(개발 DB 전용, 사원번호 00001의 2026년 10월 평일 22건 근태 샘플 INSERT. 페이지네이션·상태 검색 확인용. 이미 있는 날은 변경하지 않아 재실행해도 중복 없음, localhost만·production 거부), `npm run db:e2e-attendance-reset`(개발 DB 전용, E2E 관리자 900001의 attendance만 삭제, localhost만·production 거부. `frontend/e2e/attendance.spec.ts` beforeAll이 실행), `npm run db:e2e-attendance-fixture`(개발 DB 전용, E2E 관리자 900001의 근태를 상태 확인용 6건으로 교체, localhost만·production 거부. `frontend/e2e/attendance-status.spec.ts`가 시작 시 실행)
- DB(개발 DB 전용, localhost만·production 거부): `npm run db:e2e-leaves-reset`(E2E 관리자 900001의 휴가 삭제, `frontend/e2e/leaves.spec.ts` beforeAll이 실행), `npm run db:e2e-leave-calendar-fixture -- --month=YYYY-MM`(샘플 사원 10001~10012의 지정 월 휴가 재생성, `db:sample-users` 선행, `e2e/leave-management.spec.ts` beforeAll이 실행), `npm run db:sample-users`(사원번호 10001~10100 샘플 사원 100명, `SEED_USER_PASSWORD` 필요, 재실행 시 중복 없음)
- Backend(`backend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`(unit), `npm run test:e2e`
- Backend 단일 파일: `npx vitest run src/modules/auth/auth.service.spec.ts`, e2e `npx vitest run --config ./vitest.config.e2e.ts test/auth.e2e-spec.ts`
- Frontend(`frontend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`, 단일 `npx vitest run src/app/login/LoginForm.test.tsx`, `npm run test:e2e`(globalSetup이 개발 DB의 E2E 계정 900001/900002를 자동 초기화. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 필요, 둘 다 없으면 초기화 skip·로그인 테스트 skip, `PLAYWRIGHT_BASE_URL` 지정 시 초기화 안 함)
- 포맷: 루트 `npm run format` / `npm run format:check`
- 개발 서버: 루트 `npm run dev:backend`(http://localhost:6000, API `/api/v1`) / `npm run dev:frontend`(http://localhost:3000, `/api/v1/*`를 `BACKEND_URL`로 rewrite)
- 주의: 6000은 Fetch 표준의 bad port라 브라우저 직접 접속·Node 내장 `fetch`(undici)로 `http://localhost:6000`을 호출하면 거부된다. API 확인은 프론트(3000) rewrite 경유 또는 curl·Supertest를 쓴다
- backend e2e는 `fileParallelism: false`(파일 순차 실행). Playwright는 개발 DB를 쓰므로 실행 시 데이터가 남는다

## 문서 맵
- `docs/01_PRD.md` — 제품 개요·범위·성공 기준 — reviewer
- `docs/02_REQUIREMENTS.md` — 업무 규칙 단일 기준(FR/NFR) — backend, tester, reviewer, security
- `docs/03_SCREEN_LIST.md` — 화면 목록, 접근 규칙, 공통 UI 규칙(상태 처리·전역 내비게이션) — frontend, tester, reviewer
- `docs/04_SCREEN_SPECIFICATIONS/SCR-0NN_*.md`(SCR-001~010) — 화면별 명세(구성·동작·문구·API) — frontend, tester
- `docs/05_DATABASE_DESIGN.md` — 테이블·제약·잠금·날짜 처리(§9) — backend, reviewer
- `docs/06_API_SPECIFICATION.md` — API 계약(경로·권한·입출력·에러 코드) — backend, frontend, tester, reviewer, security
- `docs/07_ARCHITECTURE.md` — 계층 구조, 인증·Guard 구성 — backend, reviewer, security
- `docs/08_TEST_PLAN.md` — 테스트 수준·TC 목록·권한 매트릭스 — tester, reviewer
- `docs/09_DESIGN_SYSTEM.md` — 디자인 토큰·구현된 공용 컴포넌트(§6) — frontend, reviewer
- `docs/10_DEVELOPMENT_ROADMAP.md` — 진행 상태 체크리스트(완료 시 갱신) — reviewer
